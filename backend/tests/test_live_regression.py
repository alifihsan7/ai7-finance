import os
import sys
import hmac
import hashlib
import json
import time
from urllib.parse import urlencode
import requests

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import SessionLocal
from app.models.user import User
from app.core.config import settings

def sign_init_data(data: dict, bot_token: str) -> str:
    pairs = []
    for k, v in data.items():
        if isinstance(v, (dict, list)):
            v = json.dumps(v, separators=(',', ':'))
        pairs.append((k, str(v)))
    
    data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(pairs))
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    hash_val = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
    
    query_dict = dict(pairs)
    query_dict["hash"] = hash_val
    return urlencode(query_dict)

def test_live():
    print("=== STARTING LIVE END-TO-END REGRESSION & EXPLOIT TESTS ===")
    db = SessionLocal()
    user = db.query(User).filter(User.telegram_chat_id.isnot(None), User.is_active == True).first()
    if not user:
        print("No user found.")
        sys.exit(1)
    
    now = int(time.time())

    # 1. LIVE REGRESSION TEST: Legitimate shared bot login
    print(f"\n[Test 1] Legitimate shared bot login for user {user.username} (chat_id: {user.telegram_chat_id})...")
    init_data_legit = sign_init_data({
        "auth_date": now,
        "query_id": "AAHdF60gAAAAAN0XrSC3wB8z",
        "user": {
            "id": user.telegram_chat_id,
            "first_name": user.full_name or "Test User",
            "username": user.username
        }
    }, settings.TELEGRAM_BOT_TOKEN)

    resp_legit = requests.post(
        "http://127.0.0.1:8080/api/v1/auth/telegram-webapp",
        json={"init_data": init_data_legit},
        headers={"Content-Type": "application/json"}
    )
    print(f"HTTP Status: {resp_legit.status_code}")
    assert resp_legit.status_code == 200, f"Legit login failed: {resp_legit.text}"
    data = resp_legit.json()
    assert data.get("user", {}).get("id") == user.id
    print(f"PASS: Legitimate user authenticated with HTTP 200! User ID: {data.get('user', {}).get('id')}")

    # 2. LIVE EXPLOIT TEST: Attacker signs payload with rogue token claiming victim's chat_id
    print(f"\n[Test 2] Exploit attempt: Rogue bot signs victim's chat_id ({user.telegram_chat_id})...")
    ROGUE_BOT_TOKEN = "999999:ROGUE_ATTACKER_BOT_TOKEN"
    init_data_exploit = sign_init_data({
        "auth_date": now,
        "query_id": "AAHdF60gAAAAAN0XrSC3wB8x",
        "user": {
            "id": user.telegram_chat_id,
            "first_name": "Victim",
            "username": user.username
        }
    }, ROGUE_BOT_TOKEN)

    resp_exploit = requests.post(
        "http://127.0.0.1:8080/api/v1/auth/telegram-webapp",
        json={"init_data": init_data_exploit},
        headers={"Content-Type": "application/json"}
    )
    print(f"HTTP Status: {resp_exploit.status_code}, Response: {resp_exploit.text}")
    assert resp_exploit.status_code == 401, f"Exploit was NOT blocked! Got status {resp_exploit.status_code}"
    print("PASS: Exploit blocked by live service with HTTP 401 Unauthorized!")

    print("\n=== ALL LIVE SERVICE TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    test_live()
