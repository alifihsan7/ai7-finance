import os
import sys
import hmac
import hashlib
import json
import time
from urllib.parse import urlencode

# Ensure backend directory is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi import HTTPException

from app.db.session import Base
from app.models.user import User
from app.core.config import settings
from app.schemas.user import TelegramWebAppAuthRequest
from app.api.v1.endpoints.auth import telegram_webapp_auth

def sign_init_data(data: dict, bot_token: str) -> str:
    pairs = []
    for k, v in data.items():
        if isinstance(v, (dict, list)):
            v = json.dumps(v, separators=(',', ':'))
        pairs.append((k, str(v)))
    
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs))
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    hash_val = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    
    # URL encode all fields including hash
    query_dict = dict(pairs)
    query_dict["hash"] = hash_val
    return urlencode(query_dict)

def run_tests():
    print("=== STARTING SEC-01 VERIFICATION ===")
    
    # In-memory SQLite engine for isolated verification
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = TestingSession()

    SHARED_TOKEN = "123456:SHARED_BOT_TOKEN_FOR_TESTING"
    settings.TELEGRAM_BOT_TOKEN = SHARED_TOKEN

    ATTACKER_BOT_TOKEN = "666666:ATTACKER_EVIL_BOT_TOKEN"
    CUSTOM_USER_BOT_TOKEN = "777777:LEGIT_CUSTOM_BOT_TOKEN"

    victim = User(
        id=1,
        username="victim_admin",
        full_name="Victim Admin",
        hashed_password="hash",
        telegram_chat_id=111111,
        telegram_bot_token=None,
        telegram_mode="shared",
        is_active=True
    )
    attacker = User(
        id=2,
        username="attacker_user",
        full_name="Attacker",
        hashed_password="hash",
        telegram_chat_id=222222,
        telegram_bot_token=ATTACKER_BOT_TOKEN,
        telegram_mode="custom",
        is_active=True
    )
    legit_custom = User(
        id=3,
        username="legit_custom_user",
        full_name="Legit Custom",
        hashed_password="hash",
        telegram_chat_id=333333,
        telegram_bot_token=CUSTOM_USER_BOT_TOKEN,
        telegram_mode="custom",
        is_active=True
    )
    db.add_all([victim, attacker, legit_custom])
    db.commit()

    now = int(time.time())

    # TEST 1: Attacker attempts signature confusion against victim (shared token user)
    print("\n[Test 1] Attacker signs victim's chat_id (111111) with attacker's bot token...")
    init_data_exploit1 = sign_init_data({
        "auth_date": now,
        "query_id": "AAHdF60gAAAAAN0XrSC3wB8x",
        "user": {"id": 111111, "first_name": "Victim Admin", "username": "victim_admin"}
    }, ATTACKER_BOT_TOKEN)

    try:
        telegram_webapp_auth(TelegramWebAppAuthRequest(init_data=init_data_exploit1), db=db)
        print("FAIL: Exploit succeeded! Vulnerability is still present!")
        sys.exit(1)
    except HTTPException as e:
        print(f"PASS: Exploit blocked with HTTP {e.status_code}: {e.detail}")
        assert e.status_code == 401

    # TEST 2: Attacker attempts signature confusion against another custom bot user
    print("\n[Test 2] Attacker signs user 3's chat_id (333333) with attacker's bot token...")
    init_data_exploit2 = sign_init_data({
        "auth_date": now,
        "query_id": "AAHdF60gAAAAAN0XrSC3wB8y",
        "user": {"id": 333333, "first_name": "Legit Custom", "username": "legit_custom_user"}
    }, ATTACKER_BOT_TOKEN)

    try:
        telegram_webapp_auth(TelegramWebAppAuthRequest(init_data=init_data_exploit2), db=db)
        print("FAIL: Exploit against custom bot user succeeded!")
        sys.exit(1)
    except HTTPException as e:
        print(f"PASS: Exploit blocked with HTTP {e.status_code}: {e.detail}")
        assert e.status_code == 401

    # TEST 3: Attacker authenticates as themselves with their own bot token
    print("\n[Test 3] Attacker authenticates as themselves (chat_id 222222) with own bot token...")
    init_data_legit_attacker = sign_init_data({
        "auth_date": now,
        "query_id": "AAHdF60gAAAAAN0XrSC3wB8z",
        "user": {"id": 222222, "first_name": "Attacker", "username": "attacker_user"}
    }, ATTACKER_BOT_TOKEN)

    res3 = telegram_webapp_auth(TelegramWebAppAuthRequest(init_data=init_data_legit_attacker), db=db)
    print(f"PASS: Custom bot user authenticated successfully: user_id={res3.user.id}, username={res3.user.username}")
    assert res3.user.id == 2

    # TEST 4: Victim authenticates with shared bot token
    print("\n[Test 4] Victim authenticates with shared bot token...")
    init_data_victim_shared = sign_init_data({
        "auth_date": now,
        "query_id": "AAHdF60gAAAAAN0XrSC3wB8w",
        "user": {"id": 111111, "first_name": "Victim Admin", "username": "victim_admin"}
    }, SHARED_TOKEN)

    res4 = telegram_webapp_auth(TelegramWebAppAuthRequest(init_data=init_data_victim_shared), db=db)
    print(f"PASS: Shared bot user authenticated successfully: user_id={res4.user.id}, username={res4.user.username}")
    assert res4.user.id == 1

    print("\n=== ALL SEC-01 VERIFICATION TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
