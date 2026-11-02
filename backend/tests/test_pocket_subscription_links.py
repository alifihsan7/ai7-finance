import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user
from app.api.v1.endpoints import jago_pockets, subscriptions
from app.db.pocket_schema import ensure_pocket_subscription_schema
from app.db.session import Base, get_db
from app.models.account import Account
from app.models.jago_pocket import JagoPocket
from app.models.subscription import Subscription
from app.models.user import User


@pytest.fixture
def linked_client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        db.add_all([User(id=i, username=f"link_user_{i}", full_name=f"Link test {i}", hashed_password="unused", is_active=True) for i in (1, 2)])
        db.add_all([Account(id=i, user_id=1 if i < 3 else 2, name=name, type="operasional", initial_balance=0) for i, name in ((1, "Bank A"), (2, "Bank B"), (3, "Bank Asing"))])
        db.add_all([JagoPocket(id=i, user_id=1 if i < 4 else 2, account_id=1 if i < 3 else i-1, name=f"Kantong {i}", slug=f"manual-{i}", target_amount=700000) for i in (1, 2, 3, 4)])
        for i, account, active, owner in ((1, "Bank A", True, 1), (2, "Bank B", True, 1), (3, "Bank A", True, 2), (4, "Bank A", False, 1)):
            db.add(Subscription(id=i, user_id=owner, name="Gym", account=account, amount=300000, category="Tagihan", is_active=active))
        db.commit()
        app = FastAPI()
        app.include_router(jago_pockets.router, prefix="/pockets")
        app.include_router(subscriptions.router, prefix="/subscriptions")
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_user] = lambda: db.get(User, 1)
        with TestClient(app) as client:
            yield client, db
    engine.dispose()


def pocket_summary(client, account=1):
    response = client.get(f"/pockets?account_id={account}")
    assert response.status_code == 200
    return {item["id"]: item for item in response.json()["pockets"]}


def test_explicit_link_follows_amount_and_unlink_keeps_last_target(linked_client):
    client, db = linked_client
    response = client.put("/pockets/1/subscription", json={"subscription_id": 1})
    assert response.status_code == 200
    assert pocket_summary(client)[1]["target_amount"] == 300000
    assert pocket_summary(client)[2]["target_amount"] == 700000
    assert client.put("/subscriptions/1", json={"amount": 450000, "billing_cycle": "yearly"}).status_code == 200
    assert db.get(JagoPocket, 1).target_amount == 450000
    item = pocket_summary(client)[1]
    assert (item["target_amount"], item["subscription_billing_cycle"], item["subscription_status"]) == (450000, "yearly", "active")
    assert client.put("/pockets?account_id=1", json=[{"id": 1, "target_amount": 999999}]).status_code == 200
    assert pocket_summary(client)[1]["target_amount"] == 450000
    assert client.put("/pockets/1/subscription", json={"subscription_id": None}).status_code == 200
    item = pocket_summary(client)[1]
    assert item["subscription_id"] is None
    assert item["target_amount"] == 450000
    assert client.put("/pockets/1", json={"target_amount": 500000}).status_code == 200
    assert db.get(JagoPocket, 1).target_amount == 500000


@pytest.mark.parametrize("pocket_id,bill_id,expected", [(1, 2, 400), (1, 3, 404), (1, 4, 400), (4, 1, 404), (999, 1, 404), (1, 999, 404), (1, -1, 422)])
def test_link_rejects_other_account_tenant_inactive_and_missing(linked_client, pocket_id, bill_id, expected):
    client, db = linked_client
    assert client.put(f"/pockets/{pocket_id}/subscription", json={"subscription_id": bill_id}).status_code == expected
    assert db.get(JagoPocket, 1).subscription_id is None


def test_duplicate_link_and_moving_or_deleting_linked_bill_are_blocked(linked_client):
    client, _ = linked_client
    assert client.put("/pockets/1/subscription", json={"subscription_id": 1}).status_code == 200
    assert client.put("/pockets/2/subscription", json={"subscription_id": 1}).status_code == 409
    assert client.put("/subscriptions/1", json={"account": "Bank B"}).status_code == 409
    assert client.put("/pockets/1", json={"account_id": 2}).status_code == 409
    assert client.delete("/subscriptions/1").status_code == 409
    assert client.put("/pockets/1/subscription", json={"subscription_id": None}).status_code == 200
    assert client.delete("/subscriptions/1").status_code == 200


def test_inactive_bill_has_zero_commitment_and_manual_pockets_stay_manual(linked_client):
    client, _ = linked_client
    assert client.put("/pockets/1/subscription", json={"subscription_id": 1}).status_code == 200
    assert client.put("/subscriptions/1", json={"is_active": False}).status_code == 200
    item = pocket_summary(client)[1]
    assert (item["target_amount"], item["subscription_status"]) == (0, "inactive")
    assert client.post("/pockets/sync-commitments?account_id=1").status_code == 200
    assert pocket_summary(client)[2]["target_amount"] == 700000
    assert client.put("/pockets/1/subscription", json={"subscription_id": None}).status_code == 200
    assert pocket_summary(client)[1]["target_amount"] == 0


def test_subscription_schema_upgrade_is_idempotent():
    engine = create_engine("sqlite://")
    with engine.begin() as connection:
        connection.execute(text("CREATE TABLE subscriptions (id INTEGER PRIMARY KEY)"))
        connection.execute(text("CREATE TABLE jago_pockets (id INTEGER PRIMARY KEY, user_id INTEGER)"))
        connection.execute(text("INSERT INTO jago_pockets (id, user_id) VALUES (1, 1), (2, 1)"))
    ensure_pocket_subscription_schema(engine)
    ensure_pocket_subscription_schema(engine)
    assert "subscription_id" in {column["name"] for column in inspect(engine).get_columns("jago_pockets")}
    assert any(index["name"] == "uq_pocket_subscription" and index["unique"] for index in inspect(engine).get_indexes("jago_pockets"))
    with engine.connect() as connection:
        assert connection.execute(text("SELECT COUNT(*) FROM jago_pockets WHERE subscription_id IS NULL")).scalar() == 2
    engine.dispose()
