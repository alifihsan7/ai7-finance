import logging
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.models.user import User
from app.schemas.user import UserCreate
from app.core.security import (
    encrypt_token,
    decrypt_token,
    hash_password,
    verify_password,
)
from app.core.rate_limit import login_limiter, register_limiter
from app.api.deps import get_current_user, get_strict_current_user
from main import app

# In-memory SQLite for deterministic, isolated test execution
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
    login_limiter.requests.clear()
    register_limiter.requests.clear()
    yield
    Base.metadata.drop_all(bind=engine)
    login_limiter.requests.clear()
    register_limiter.requests.clear()


@pytest.fixture
def db_session():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    test_client = TestClient(app)
    yield test_client
    app.dependency_overrides.clear()


# ============================================================================
# 1. AT-REST TOKEN ENCRYPTION & DECRYPTION (FERNET)
# ============================================================================

def test_token_encryption_roundtrip_deterministic():
    """Deterministic symmetric encryption and decryption round-trip."""
    raw_token = "123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
    ciphertext = encrypt_token(raw_token)

    assert ciphertext is not None
    assert ciphertext != raw_token
    assert raw_token not in ciphertext
    assert ciphertext.startswith("gAAAAA")

    decrypted = decrypt_token(ciphertext)
    assert decrypted == raw_token


def test_token_encryption_none_and_empty():
    """None and empty string handling must be pass-through without exceptions."""
    assert encrypt_token(None) is None
    assert decrypt_token(None) is None
    assert encrypt_token("") == ""
    assert decrypt_token("") == ""


def test_token_decryption_backward_compatibility():
    """Unencrypted legacy tokens or invalid ciphertext strings gracefully return plaintext."""
    legacy_token = "111111:LEGACY_PLAIN_TOKEN_NOT_ENCRYPTED"
    decrypted = decrypt_token(legacy_token)
    assert decrypted == legacy_token

    random_noise = "not-a-valid-fernet-token"
    assert decrypt_token(random_noise) == random_noise


def test_token_encryption_idempotency():
    """Encrypting an already encrypted token should not double-encrypt."""
    raw_token = "555555:SOME_TELEGRAM_TOKEN"
    ciphertext = encrypt_token(raw_token)
    re_encrypted = encrypt_token(ciphertext)

    assert re_encrypted == ciphertext
    assert decrypt_token(re_encrypted) == raw_token


def test_user_model_at_rest_encryption_and_property(db_session):
    """User model stores encrypted bot token at rest in DB and decrypts via property."""
    raw_token = "888888:SECRET_BOT_TOKEN_2026"
    encrypted = encrypt_token(raw_token)

    user = User(
        id=10,
        username="bot_owner",
        full_name="Bot Owner",
        hashed_password=hash_password("password123"),
        telegram_mode="custom",
        telegram_bot_token=encrypted,
        telegram_webhook_secret="sec_12345",
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Raw database column holds ciphertext
    assert user.telegram_bot_token == encrypted
    assert user.telegram_bot_token != raw_token
    assert raw_token not in user.telegram_bot_token

    # Property transparently decrypts
    assert user.decrypted_bot_token == raw_token
    assert decrypt_token(user.telegram_bot_token) == raw_token


# ============================================================================
# 2. REGISTRATION PASSWORD POLICY (MINIMUM 8 CHARACTERS)
# ============================================================================

def test_register_password_too_short_rejected(client):
    """Registration rejects password shorter than 8 characters with HTTP 422."""
    short_payload = {
        "username": "shortpass_user",
        "email": "short@example.com",
        "full_name": "Short Password User",
        "password": "1234567",  # 7 chars
    }
    response = client.post("/api/v1/auth/register", json=short_payload)
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data
    # Ensure password field triggered validation error
    error_fields = [err.get("loc")[-1] for err in data["detail"] if "loc" in err]
    assert "password" in error_fields


def test_register_password_schema_validation_direct():
    """UserCreate Pydantic model directly enforces min_length=8 constraint."""
    with pytest.raises(ValidationError):
        UserCreate(
            username="direct_user",
            full_name="Direct User",
            password="short",  # 5 chars
        )

    # 8 chars should succeed
    valid_schema = UserCreate(
        username="direct_user",
        full_name="Direct User",
        password="12345678",
    )
    assert valid_schema.password == "12345678"


def test_register_password_valid_succeeds(client):
    """Registration succeeds when password has at least 8 characters."""
    valid_payload = {
        "username": "valid_user_2026",
        "email": "valid@example.com",
        "full_name": "Valid User",
        "password": "strong_password_123",  # 19 chars
    }
    response = client.post("/api/v1/auth/register", json=valid_payload)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["user"]["username"] == "valid_user_2026"


# ============================================================================
# 3. AUTH FAILURE STRUCTURED LOGGING ([AUTH_FAIL])
# ============================================================================

def test_login_failure_wrong_password_logs_warning(client, db_session, caplog):
    """Failed login with wrong password emits [AUTH_FAIL] structured warning."""
    user = User(
        username="existing_user",
        email="existing@example.com",
        full_name="Existing User",
        hashed_password=hash_password("correct_password_123"),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    with caplog.at_level(logging.WARNING):
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username_or_email": "existing_user",
                "password": "wrong_password_xyz",
            },
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Username atau password salah"

    assert any(
        "[AUTH_FAIL]" in record.message and "username=existing_user" in record.message
        for record in caplog.records
    )


def test_login_failure_nonexistent_user_logs_warning(client, caplog):
    """Failed login with nonexistent username emits [AUTH_FAIL] structured warning."""
    with caplog.at_level(logging.WARNING):
        response = client.post(
            "/api/v1/auth/login",
            json={
                "username_or_email": "phantom_user",
                "password": "any_password_123",
            },
        )
        assert response.status_code == 401
        assert response.json()["detail"] == "Username atau password salah"

    assert any(
        "[AUTH_FAIL]" in record.message and "username=phantom_user" in record.message
        for record in caplog.records
    )


def test_login_failure_logs_real_client_ip(client, caplog):
    """Failed login extracts and logs real IP from reverse proxy headers if trusted."""
    client_ip = "198.51.100.77"
    with caplog.at_level(logging.WARNING):
        response = client.post(
            "/api/v1/auth/login",
            headers={"X-Forwarded-For": client_ip},
            json={
                "username_or_email": "attacker_candidate",
                "password": "bad_password",
            },
        )
        assert response.status_code == 401

    expected_log_snippet = f"[AUTH_FAIL] IP={client_ip} username=attacker_candidate"
    assert any(expected_log_snippet in record.message for record in caplog.records)


# ============================================================================
# 4. BOT TOKEN ENCRYPTION IN TELEGRAM INTEGRATION FLOWS
# ============================================================================

def test_custom_bot_registration_is_retired(client, db_session):
    """The shared-bot flow never stores user-provided bot tokens."""
    user = User(
        username="custom_bot_user",
        full_name="Custom Bot User",
        hashed_password=hash_password("password_ok_123"),
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    app.dependency_overrides[get_strict_current_user] = lambda: user

    plain_token = "999888:AAFfakeTelegramBotTokenXYZ"
    mock_me = MagicMock()
    mock_me.json.return_value = {"ok": True, "result": {"username": "MySpecialBot"}}

    mock_set_wh = MagicMock()
    mock_set_wh.json.return_value = {"ok": True}

    mock_cmd = MagicMock()
    mock_cmd.json.return_value = {"ok": True}

    with patch("requests.get", return_value=mock_me), \
         patch("requests.post", side_effect=[mock_set_wh, mock_cmd]):
        resp = client.post(
            "/api/v1/auth/link-telegram-custom",
            json={"bot_token": plain_token, "telegram_chat_id": 555444},
        )
        assert resp.status_code == 410

    db_session.refresh(user)
    assert user.telegram_bot_token is None


def test_legacy_webhook_never_dispatches_custom_credentials(db_session, client):
    """Stored legacy credentials cannot dispatch through the retired webhook."""
    plain_token = "333333:CUSTOM_BOT_FOR_WEBHOOK"
    encrypted = encrypt_token(plain_token)
    webhook_secret = "webhook_secret_998877"

    user = User(
        username="webhook_user",
        full_name="Webhook User",
        hashed_password=hash_password("password1234"),
        telegram_mode="custom",
        telegram_bot_token=encrypted,
        telegram_webhook_secret=webhook_secret,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()

    payload = {"update_id": 1, "message": {"text": "/start", "chat": {"id": 12345}}}

    with patch("app.bot.bot.process_update") as mock_process:
        resp = client.post(f"/api/v1/bot/webhook/{webhook_secret}", json=payload)
        assert resp.status_code == 410
        mock_process.assert_not_called()
