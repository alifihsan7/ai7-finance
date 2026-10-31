import pytest
from datetime import date, timedelta
from unittest.mock import patch
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.paycheck import PaycheckConfig
from app.api.deps import get_current_user
from app.bot.bot import get_user_cycle_info
from app.core.rate_limit import auth_limiter
from main import app

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    # Reset auth_limiter state for deterministic tests
    with auth_limiter.lock:
        auth_limiter.requests.clear()
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture
def test_user(db_session):
    user = User(
        id=1,
        username="testuser",
        hashed_password="dummy_hashed_password",
        telegram_chat_id=123456,
        full_name="Test User",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user

@pytest.fixture
def client(db_session, test_user):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    def override_get_current_user():
        return test_user

    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()

def test_hsts_header_present(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert "Strict-Transport-Security" in response.headers
    assert response.headers["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains"

def test_telegram_webapp_auth_limiter(client):
    # auth_limiter allows max 10 requests per 60 seconds
    for _ in range(10):
        resp = client.post(
            "/api/v1/auth/telegram-webapp",
            json={"init_data": "invalid_data"}
        )
        # Should be 401 or 503, but not 429
        assert resp.status_code in (401, 503)

    # 11th request must be rate limited
    limit_resp = client.post(
        "/api/v1/auth/telegram-webapp",
        json={"init_data": "invalid_data"}
    )
    assert limit_resp.status_code == 429
    assert "Terlalu banyak permintaan" in limit_resp.json()["detail"]

def test_bot_cycle_paycheck_query_harmonization(db_session, test_user):
    # Setup PaycheckConfig for 14-day cycle
    cfg = PaycheckConfig(
        user_id=test_user.id,
        cycle_type="biweekly",
        cycle_days=14,
        pocket_account="Mandiri"
    )
    db_session.add(cfg)

    # Add transaction with category 'Gaji' (not 'Uang Saku Ortu')
    tx1 = Transaction(
        user_id=test_user.id,
        account="Mandiri",
        amount=1500000,
        type="income",
        category="Gaji",
        description="Penerimaan gaji periode 1",
        date=date(2026, 10, 1)
    )
    db_session.add(tx1)
    db_session.commit()

    cycle_info = get_user_cycle_info(db_session, user_id=test_user.id)
    assert cycle_info["latest_paycheck"] is not None
    assert cycle_info["latest_paycheck"].id == tx1.id
    assert cycle_info["cycle_start"] == date(2026, 10, 1)
    assert cycle_info["cycle_end"] == date(2026, 10, 14)

    # Add transaction with description containing 'pemasukan'
    tx2 = Transaction(
        user_id=test_user.id,
        account="Mandiri",
        amount=2000000,
        type="income",
        category="Lain-lain",
        description="Bonus pemasukan tengah bulan",
        date=date(2026, 10, 15)
    )
    db_session.add(tx2)
    db_session.commit()

    cycle_info2 = get_user_cycle_info(db_session, user_id=test_user.id)
    assert cycle_info2["latest_paycheck"] is not None
    assert cycle_info2["latest_paycheck"].id == tx2.id
    assert cycle_info2["cycle_start"] == date(2026, 10, 15)

def test_analytics_safe_daily_overdue_grace_period(client, db_session, test_user):
    # Setup Mandiri operational account
    acc = Account(
        user_id=test_user.id,
        name="Mandiri",
        type="operasional",
        initial_balance=1500000
    )
    db_session.add(acc)

    # 14-day cycle from 2026-10-01 to 2026-10-14
    tx_income = Transaction(
        user_id=test_user.id,
        account="Mandiri",
        amount=1400000,
        type="income",
        category="Gajian",
        description="Gajian 2-mingguan",
        date=date(2026, 10, 1)
    )
    # Expense 800.000 -> pocket_remaining = 600.000
    tx_expense = Transaction(
        user_id=test_user.id,
        account="Mandiri",
        amount=800000,
        type="expense",
        category="Makanan",
        description="Makan harian",
        date=date(2026, 10, 5)
    )
    db_session.add_all([tx_income, tx_expense])
    db_session.commit()

    # Case A: Day 15 (1 day overdue, overdue_days = 1) -> grace_divisor = 3
    # safe_daily should be 600,000 // 3 = 200,000
    mock_now_day15 = date(2026, 10, 15)
    with patch("app.api.v1.endpoints.analytics.datetime") as mock_dt:
        mock_dt.now.return_value.date.return_value = mock_now_day15
        mock_dt.strptime = lambda s, f: date.fromisoformat(s)
        resp15 = client.get("/api/v1/analytics/summary?period_type=cycle&start=2026-10-01&end=2026-10-14")
        assert resp15.status_code == 200
        safe15 = resp15.json()["safe_to_spend"]
        assert safe15["days_remaining"] == 0
        assert safe15["pocket_remaining"] == 600000
        assert safe15["safe_daily"] == 200000

    # Case B: Day 16 (2 days overdue, overdue_days = 2) -> grace_divisor = 2
    # safe_daily should be 600,000 // 2 = 300,000
    mock_now_day16 = date(2026, 10, 16)
    with patch("app.api.v1.endpoints.analytics.datetime") as mock_dt:
        mock_dt.now.return_value.date.return_value = mock_now_day16
        mock_dt.strptime = lambda s, f: date.fromisoformat(s)
        resp16 = client.get("/api/v1/analytics/summary?period_type=cycle&start=2026-10-01&end=2026-10-14")
        assert resp16.status_code == 200
        safe16 = resp16.json()["safe_to_spend"]
        assert safe16["days_remaining"] == 0
        assert safe16["pocket_remaining"] == 600000
        assert safe16["safe_daily"] == 300000
