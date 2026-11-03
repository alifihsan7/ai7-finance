from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user
from app.api.v1.endpoints import accounts, analytics, paycheck, transactions
from app.db.session import Base, get_db
from app.models.account import Account
from app.models.paycheck import PaycheckConfig, PaycheckBucket
from app.models.transaction import Transaction
from app.models.user import User


@pytest.fixture
def ledger():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(id=1, username="ledger-test", full_name="Test User", hashed_password="unused", is_active=True)
        db.add(user)
        db.add_all([Account(user_id=1, name=name, type="operasional", tag="Test", color="amberGold", initial_balance=0)
                    for name in ("Bank", "Cash")])
        db.commit()
        app = FastAPI()
        app.include_router(transactions.router, prefix="/transactions")
        app.include_router(accounts.router, prefix="/accounts")
        app.include_router(analytics.router, prefix="/analytics")
        app.include_router(paycheck.router, prefix="/paycheck")
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_user] = lambda: user
        with TestClient(app, raise_server_exceptions=False) as client:
            yield client, db
    engine.dispose()


def balances(client):
    response = client.get("/accounts")
    assert response.status_code == 200, response.text
    return {row["name"]: row["current_balance"] for row in response.json()}


def summary(client):
    response = client.get("/analytics/summary", params={"period_type": "custom", "start": "2026-11-01", "end": "2026-11-30"})
    assert response.status_code == 200, response.text
    return response.json()


def create(client, kind, amount, account="Bank"):
    response = client.post("/transactions", json={"type": kind, "amount": amount, "account": account,
                           "category": "Test", "description": "Data uji", "date": "2026-11-02"})
    assert response.status_code == 200, response.text
    return response.json()


def test_salary_is_recorded_once_and_allocation_is_a_paired_transfer(ledger):
    client, db = ledger
    payload = {
        "request_key": "f73dd60b-c10a-4634-9e67-87808d01b9f8",
        "total_amount": 1_000_000, "date": date.today().isoformat(),
        "account": "Bank", "cycle_type": "biweekly",
    }
    first = client.post("/paycheck/record", json=payload)
    assert first.status_code == 201, first.text
    data = first.json()
    assert client.post("/paycheck/record", json=payload).json()["id"] == data["id"]
    assert balances(client)["Bank"] == 1_000_000
    assert client.get("/paycheck/record/latest").json()["id"] == data["id"]

    allocation = data["allocations"][0]
    url = f"/paycheck/record/{data['id']}/transfer/{allocation['account_id']}"
    assert client.post(url).status_code == 200
    assert client.post(url).status_code == 200
    assert balances(client)["Bank"] == 500_000
    assert balances(client)["Cash"] == 500_000
    assert sorted(tx.type for tx in db.query(Transaction).all()) == ["income", "transfer_in", "transfer_out"]
    assert client.get("/paycheck/record/latest").json() is None

    payload.update(request_key="b401d1cf-4d31-49c6-a4fc-8a9a13f4daf4", start_cycle=False)
    supplemental = client.post("/paycheck/record", json=payload)
    assert supplemental.status_code == 201
    assert supplemental.json()["cycle_end"] is None
    assert db.get(Transaction, supplemental.json()["id"]).category == "Gaji tambahan"


def test_paycheck_cycle_override_and_saved_default(ledger):
    client, db = ledger
    first = client.post("/paycheck/session/start", json={
        "total_amount": 1_000_000, "date": "2026-10-01",
        "cycle_type": "custom", "cycle_days": 19,
    })
    assert first.status_code == 200, first.text
    assert client.get("/paycheck/config").json()["config"]["cycle_type"] == "monthly_date"
    report = client.get("/analytics/summary", params={"period_type": "cycle", "start": "2026-10-01"}).json()
    assert report["end_date"] == "2026-10-19"
    assert report["safe_to_spend"]["cycle_days"] == 19
    active = db.get(paycheck.PaycheckSession, first.json()["id"])
    active.status = "completed"
    db.commit()

    second = client.post("/paycheck/session/start", json={
        "total_amount": 1_000_000, "date": "2026-11-01",
        "cycle_type": "weekly", "save_cycle_default": True,
    })
    assert second.status_code == 200, second.text
    cfg = client.get("/paycheck/config").json()["config"]
    assert (cfg["cycle_type"], cfg["cycle_days"]) == ("weekly", 7)
    periods = client.get("/analytics/periods").json()["cycles"]
    ends = {period["start"]: period["end"] for period in periods}
    assert ends["2026-10-01"] == "2026-10-19"
    assert ends["2026-11-01"] == "2026-11-07"


def test_add_edit_delete_updates_accounts_and_summary(ledger):
    client, _ = ledger
    create(client, "income", 1000000)
    expense = create(client, "expense", 100000)
    assert balances(client)["Bank"] == 900000
    assert summary(client)["expense"] == 100000
    response = client.put(f'/transactions/{expense["id"]}', json={"amount": 250000, "account": "Cash"})
    assert response.status_code == 200, response.text
    assert balances(client) == {"Bank": 1000000, "Cash": -250000}
    assert summary(client)["total_balance"] == 750000
    assert client.delete(f'/transactions/{expense["id"]}').status_code == 200
    assert balances(client) == {"Bank": 1000000, "Cash": 0}
    assert summary(client)["expense"] == 0


def test_transfer_edit_and_delete_preserve_total_balance(ledger):
    client, _ = ledger
    create(client, "income", 1000000)
    response = client.post("/transactions/transfer", json={"from_account": "Bank", "to_account": "Cash", "amount": 200000, "date": "2026-11-02"})
    assert response.status_code == 200, response.text
    pair = response.json()
    response = client.put(f'/transactions/{pair["out_transaction_id"]}', json={"amount": 300000, "date": "2026-11-03"})
    assert response.status_code == 200, response.text
    assert balances(client) == {"Bank": 700000, "Cash": 300000}
    totals = summary(client)
    assert (totals["income"], totals["expense"], totals["total_balance"]) == (1000000, 0, 1000000)
    rows = client.get("/transactions").json()
    assert {row["date"] for row in rows if row["type"].startswith("transfer")} == {"2026-11-03"}
    response = client.delete(f'/transactions/{pair["in_transaction_id"]}')
    assert response.status_code == 200
    assert len(response.json()["deleted_ids"]) == 2
    assert balances(client) == {"Bank": 1000000, "Cash": 0}


def test_legacy_zero_amount_does_not_break_initial_transaction_load(ledger):
    client, db = ledger
    db.add(Transaction(user_id=1, type="income", amount=0, account="Bank", category="Gajian",
                       description="Alokasi lama nol", date=date(2026, 10, 1)))
    db.commit()
    create(client, "income", 1000000)
    response = client.get("/transactions", params={"limit": 100})
    assert response.status_code == 200, response.text
    assert any(row["amount"] == 0 for row in response.json())
    assert client.post("/transactions", json={"type": "income", "amount": 0, "account": "Bank", "category": "Test", "description": "Invalid"}).status_code == 422


def test_transfer_cannot_be_converted_to_expense_or_same_account(ledger):
    client, _ = ledger
    pair = client.post("/transactions/transfer", json={"from_account": "Bank", "to_account": "Cash", "amount": 200000}).json()
    assert client.put(f'/transactions/{pair["out_transaction_id"]}', json={"type": "expense"}).status_code == 400
    assert client.put(f'/transactions/{pair["out_transaction_id"]}', json={"account": "Cash"}).status_code == 400
    assert balances(client) == {"Bank": -200000, "Cash": 200000}


def test_paycheck_does_not_create_zero_allocation_transactions(ledger):
    client, db = ledger
    cfg = PaycheckConfig(user_id=1, source_account="Bank", cycle_days=14)
    db.add(cfg)
    db.flush()
    db.add_all([PaycheckBucket(config_id=cfg.id, account="Bank", percentage=0, purpose="Test", sort_order=0),
                PaycheckBucket(config_id=cfg.id, account="Cash", percentage=100, purpose="Test", sort_order=1)])
    db.commit()
    response = client.post("/transactions/paycheck", json={"total_amount": 1000000, "date": "2026-11-02"})
    assert response.status_code == 200, response.text
    assert [row["amount"] for row in response.json()["created_transactions"]] == [1000000]
    assert db.query(Transaction).filter(Transaction.amount == 0).count() == 0
    assert client.get("/transactions").status_code == 200
    assert balances(client) == {"Bank": 0, "Cash": 1000000}
