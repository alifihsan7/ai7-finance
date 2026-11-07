import pytest
from datetime import date
from unittest.mock import patch, MagicMock, mock_open
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi import Request, HTTPException
from fastapi.testclient import TestClient

from app.db.session import Base, get_db
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.paycheck import PaycheckConfig, PaycheckBucket
from app.core.rate_limit import SimpleRateLimiter
from app.bot.bot import (
    get_safe_to_spend_snippet,
    handle_pacing,
    handle_gajian,
    handle_obsidian,
)
from typing import Optional
from app.api.deps import get_current_user
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
    u = User(
        id=1,
        username="alif",
        full_name="Alif Ihsan",
        hashed_password="hash",
        telegram_chat_id=111111,
        telegram_bot_token="111111:TEST_BOT_TOKEN",
        telegram_webhook_secret="test_secret_abc123",
        is_active=True,
    )
    db_session.add(u)
    db_session.commit()
    db_session.refresh(u)
    return u

def create_mock_request(client_host: str = "127.0.0.1", headers: Optional[dict] = None):
    raw_headers = []
    if headers:
        for k, v in headers.items():
            raw_headers.append((k.lower().encode("latin-1"), v.encode("latin-1")))
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/test",
        "headers": raw_headers,
        "client": (client_host, 12345),
    }
    return Request(scope)

# ============================================================================
# F-01: AttributeError cfg.total_salary Remediation Tests
# ============================================================================

def test_f01_paycheck_config_total_salary_property():
    """Verify PaycheckConfig defines safe total_salary property returning None."""
    cfg = PaycheckConfig(id=1, user_id=1, pocket_account="Mandiri")
    assert hasattr(cfg, "total_salary")
    assert cfg.total_salary is None
    assert getattr(cfg, "total_salary", None) is None

def test_f01_bot_safe_to_spend_zero_income_no_crash(db_session, test_user):
    """
    Verify get_safe_to_spend_snippet does not raise AttributeError
    when pocket_income_row is 0 and PaycheckConfig is present.
    """
    cfg = PaycheckConfig(
        id=1,
        user_id=test_user.id,
        pocket_account="Mandiri",
        cycle_days=14,
        cycle_start_date=date.today(),
    )
    db_session.add(cfg)
    db_session.commit()

    snippet = get_safe_to_spend_snippet(db_session, user_id=test_user.id)
    assert "Safe-to-Spend" in snippet
    assert "Rp" in snippet

def test_f01_bot_handlers_no_crash(db_session, test_user):
    """
    Verify handle_pacing, handle_gajian, and handle_obsidian execute safely
    without AttributeError when cfg.total_salary is evaluated.
    """
    cfg = PaycheckConfig(
        id=1,
        user_id=test_user.id,
        pocket_account="Mandiri",
        cycle_days=14,
        cycle_start_date=date.today(),
    )
    bucket = PaycheckBucket(
        id=1,
        config_id=1,
        account="Mandiri",
        percentage=55.0,
        purpose="Saku",
        category="Gajian",
    )
    db_session.add(cfg)
    db_session.add(bucket)
    db_session.commit()

    with patch("app.bot.bot.send_message") as mock_send, \
         patch("os.makedirs"), patch("builtins.open", mock_open()):
        handle_pacing(chat_id=111111, db=db_session, user=test_user)
        assert mock_send.called

        mock_send.reset_mock()
        handle_gajian(chat_id=111111, text="/gajian", db=db_session, user=test_user)
        assert mock_send.called

        mock_send.reset_mock()
        handle_obsidian(chat_id=111111, db=db_session, user=test_user)
        assert mock_send.called

def test_f01_analytics_dashboard_zero_income_no_crash(db_session, test_user):
    """
    Verify /api/v1/analytics/dashboard endpoint returns 200 OK without
    crashing on cfg.total_salary when user has zero income transactions.
    """
    cfg = PaycheckConfig(
        id=1,
        user_id=test_user.id,
        pocket_account="Mandiri",
        cycle_days=14,
        cycle_start_date=date.today(),
    )
    acc = Account(
        id=1,
        user_id=test_user.id,
        name="Mandiri",
        type="operasional",
        initial_balance=1000000,
    )
    db_session.add(cfg)
    db_session.add(acc)
    db_session.commit()

    app.dependency_overrides[get_current_user] = lambda: test_user
    app.dependency_overrides[get_db] = lambda: db_session

    try:
        client = TestClient(app)
        response = client.get("/api/v1/analytics/summary?period_type=cycle")
        assert response.status_code == 200
        data = response.json()
        assert "safe_to_spend" in data
        assert data["safe_to_spend"] is not None
        assert data["safe_to_spend"]["pocket_budget"] >= 0
        assert data["safe_to_spend"]["safe_daily"] >= 0
    finally:
        app.dependency_overrides.clear()

# ============================================================================
# F-02: Non-blocking Webhook Event Loop Remediation Tests
# ============================================================================

def test_retired_webhook_rejects_previously_valid_secret(db_session, test_user):
    """
    A stored custom-bot secret no longer permits dispatch.
    """
    app.dependency_overrides[get_db] = lambda: db_session

    try:
        client = TestClient(app)
        payload = {
            "update_id": 999,
            "message": {
                "message_id": 1,
                "from": {"id": test_user.telegram_chat_id, "username": test_user.username},
                "chat": {"id": test_user.telegram_chat_id},
                "text": "/saldo",
            }
        }

        with patch("app.bot.bot.process_update") as mock_process:
            response = client.post(
                f"/api/v1/bot/webhook/{test_user.telegram_webhook_secret}",
                json=payload
            )
            assert response.status_code == 410
            mock_process.assert_not_called()
    finally:
        app.dependency_overrides.clear()

def test_f02_webhook_rejects_unknown_secret(db_session):
    """Retired webhooks reject unknown secrets too."""
    app.dependency_overrides[get_db] = lambda: db_session
    try:
        client = TestClient(app)
        response = client.post("/api/v1/bot/webhook/invalid_secret_key", json={"update_id": 1})
        assert response.status_code == 410
    finally:
        app.dependency_overrides.clear()

# ============================================================================
# SEC-2026-01: Rate-Limiter Spoofing via Unverified Proxy Headers Tests
# ============================================================================

def test_sec_2026_01_rate_limiter_rejects_spoofed_headers_from_untrusted_peer():
    """
    An untrusted direct client (e.g. 198.51.100.99) cannot bypass rate limits
    by forging CF-Connecting-IP or X-Forwarded-For headers.
    The limiter must bind to the socket peer IP (198.51.100.99).
    """
    limiter = SimpleRateLimiter(max_requests=2, window_seconds=60)

    # Attacker tries to bypass by rotating CF-Connecting-IP
    req1 = create_mock_request(client_host="198.51.100.99", headers={"CF-Connecting-IP": "1.1.1.1"})
    req2 = create_mock_request(client_host="198.51.100.99", headers={"CF-Connecting-IP": "2.2.2.2"})
    req3 = create_mock_request(client_host="198.51.100.99", headers={"CF-Connecting-IP": "3.3.3.3"})

    limiter.check(req1)
    limiter.check(req2)

    # 3rd request from same physical client must trigger 429 despite spoofed header
    with pytest.raises(HTTPException) as exc_info:
        limiter.check(req3)
    assert exc_info.value.status_code == 429

    # Attacker tries again with X-Forwarded-For
    req_xff = create_mock_request(client_host="198.51.100.99", headers={"X-Forwarded-For": "4.4.4.4, 10.0.0.1"})
    with pytest.raises(HTTPException) as exc_info2:
        limiter.check(req_xff)
    assert exc_info2.value.status_code == 429

def test_sec_2026_01_rate_limiter_trusts_loopback_and_cidrs():
    """
    Trusted reverse proxies (127.0.0.1, ::1, or configured CIDR) must have
    their proxy headers trusted and properly isolated per client IP.
    """
    limiter = SimpleRateLimiter(max_requests=2, window_seconds=60, trusted_proxies={"10.10.0.0/16"})

    # IPv4 loopback proxy
    req_loopback1 = create_mock_request(client_host="127.0.0.1", headers={"CF-Connecting-IP": "203.0.113.11"})
    req_loopback2 = create_mock_request(client_host="127.0.0.1", headers={"CF-Connecting-IP": "203.0.113.22"})
    limiter.check(req_loopback1)
    limiter.check(req_loopback2)

    # IPv6 loopback proxy with X-Forwarded-For
    req_ipv6 = create_mock_request(client_host="::1", headers={"X-Forwarded-For": "203.0.113.33, 10.0.0.1"})
    limiter.check(req_ipv6)

    # Configured CIDR proxy
    req_cidr = create_mock_request(client_host="10.10.5.1", headers={"CF-Connecting-IP": "203.0.113.44"})
    limiter.check(req_cidr)

    # Exceeding limit on 203.0.113.11 triggers 429
    req_overflow = create_mock_request(client_host="127.0.0.1", headers={"CF-Connecting-IP": "203.0.113.11"})
    limiter.check(req_overflow)
    with pytest.raises(HTTPException) as exc:
        limiter.check(req_overflow)
    assert exc.value.status_code == 429
