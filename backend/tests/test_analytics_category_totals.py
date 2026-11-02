from datetime import date

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.deps import get_current_user
from app.api.v1.endpoints.analytics import router
from app.db.session import Base, get_db
from app.models.transaction import Transaction
from app.models.user import User


@pytest.fixture
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(id=1, username="category-test", full_name="Test User", hashed_password="not-a-login", is_active=True)
        other = User(id=2, username="other-test", full_name="Other Test User", hashed_password="not-a-login", is_active=True)
        db.add_all([user, other])
        db.flush()
        rows = [
            (1, "income", "Lainnya", 100, date(2026, 11, 1)),
            (1, "income", "Lainnya", 200, date(2026, 11, 30)),
            (1, "income", "Gaji", 700, date(2026, 11, 2)),
            (1, "expense", "Lainnya", 50, date(2026, 11, 2)),
            (1, "expense", "Makan", 150, date(2026, 11, 3)),
            (1, "transfer_in", "Lainnya", 9000, date(2026, 11, 3)),
            (1, "transfer_out", "Lainnya", 9000, date(2026, 11, 3)),
            (2, "income", "Lainnya", 9999, date(2026, 11, 3)),
            (1, "income", "Lainnya", 9999, date(2026, 10, 31)),
            (1, "income", "Lainnya", 9999, date(2026, 12, 1)),
        ]
        db.add_all(Transaction(user_id=uid, type=kind, category=category, amount=amount,
                               date=day, account="Akun uji", description="Data pengujian")
                   for uid, kind, category, amount, day in rows)
        db.commit()
        app = FastAPI()
        app.include_router(router, prefix="/analytics")
        app.dependency_overrides[get_db] = lambda: db
        app.dependency_overrides[get_current_user] = lambda: user
        with TestClient(app) as test_client:
            yield test_client
    engine.dispose()


def test_income_categories_are_scoped_and_do_not_change_expense_categories(client):
    response = client.get("/analytics/summary", params={
        "period_type": "custom", "start": "2026-11-01", "end": "2026-11-30",
    })
    assert response.status_code == 200, response.text
    result = response.json()
    income = {item["category"]: item for item in result["income_categories"]}
    expenses = {item["category"]: item for item in result["categories"]}
    assert result["income"] == 1000
    assert result["expense"] == 200
    assert income["Lainnya"] == {"category": "Lainnya", "total": 300, "count": 2, "percentage": 30.0}
    assert income["Gaji"]["percentage"] == 70.0
    assert expenses["Lainnya"] == {"category": "Lainnya", "total": 50, "count": 1, "percentage": 25.0}
    assert "Gaji" not in expenses
    assert "Makan" not in income


def test_empty_period_returns_empty_category_lists(client):
    response = client.get("/analytics/summary", params={
        "period_type": "custom", "start": "2030-01-01", "end": "2030-01-31",
    })
    assert response.status_code == 200, response.text
    result = response.json()
    assert result["income_categories"] == []
    assert result["categories"] == []
    assert result["income"] == 0
