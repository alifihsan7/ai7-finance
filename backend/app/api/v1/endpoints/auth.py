from typing import Optional
import secrets
import hmac
import hashlib
import json
import time
from urllib.parse import parse_qsl
import requests
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy import or_
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserResponse,
    TokenResponse,
    LinkTelegramRequest,
    LinkTelegramCustomRequest,
    GoogleAuthRequest,
    TelegramWebAppAuthRequest,
)
from app.core.security import hash_password, verify_password, create_access_token
from app.core.config import settings
from app.core.rate_limit import login_limiter, register_limiter
from app.api.deps import get_strict_current_user

router = APIRouter()

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, request: Request, db: Session = Depends(get_db)):
    register_limiter.check(request)
    # Check existing username or email
    clean_username = payload.username.strip().lower()
    existing = db.query(User).filter(
        or_(
            User.username == clean_username,
            (User.email == payload.email) if payload.email else False
        )
    ).first()

    if existing:
        if existing.username == clean_username:
            raise HTTPException(status_code=400, detail="Username sudah digunakan oleh akun lain")
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")

    hashed_pw = hash_password(payload.password)
    user = User(
        username=clean_username,
        email=payload.email.strip() if payload.email else None,
        full_name=payload.full_name.strip(),
        hashed_password=hashed_pw,
        telegram_chat_id=payload.telegram_chat_id,
        is_active=True,
        is_onboarded=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )

@router.post("/login", response_model=TokenResponse)
def login(payload: UserLogin, request: Request, db: Session = Depends(get_db)):
    login_limiter.check(request)
    login_id = payload.username_or_email.strip().lower()
    user = db.query(User).filter(
        or_(
            User.username == login_id,
            User.email == login_id
        )
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Username atau password salah",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun ini telah dinonaktifkan",
        )

    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.from_orm(user)
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(user: User = Depends(get_strict_current_user)):
    return UserResponse.from_orm(user)

@router.put("/me", response_model=UserResponse)
def update_profile(
    payload: UserUpdate,
    user: User = Depends(get_strict_current_user),
    db: Session = Depends(get_db)
):
    if payload.full_name:
        user.full_name = payload.full_name.strip()
    if payload.email:
        # Check email uniqueness
        existing = db.query(User).filter(User.email == payload.email, User.id != user.id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email sudah digunakan akun lain")
        user.email = payload.email.strip()
    if payload.password:
        user.hashed_password = hash_password(payload.password)

    db.commit()
    db.refresh(user)
    return UserResponse.from_orm(user)

@router.post("/link-telegram", response_model=UserResponse)
def link_telegram_chat(
    payload: LinkTelegramRequest,
    user: User = Depends(get_strict_current_user),
    db: Session = Depends(get_db)
):
    # Check if chat ID already linked to another user
    tg_id = int(payload.telegram_chat_id)
    existing = db.query(User).filter(User.telegram_chat_id == tg_id, User.id != user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Telegram Chat ID ini sudah ditautkan ke akun lain")
    
    user.telegram_chat_id = tg_id
    user.telegram_mode = "shared"
    db.commit()
    db.refresh(user)

    # Kirim salam konfirmasi ke bot shared jika berhasil terhubung
    try:
        from app.bot.bot import send_message
        greeting = f"""🎉 **Akun AI7 Finance Berhasil Terhubung!**

Halo, **{user.full_name or user.username}**! Akun Telegram kamu kini telah terhubung ke AI7 Finance Dashboard dalam mode **Shared Bot**.

Kamu bisa langsung mencatat pengeluaran di sini:
• `makan siang warteg 25k`
• `tf 100k mandiri ke jago`
• Kirim foto struk kasir / QRIS
• Kirim voice note pengeluaran

Ketik `/menu` atau buka tombol keyboard untuk navigasi cepat!"""
        send_message(payload.telegram_chat_id, greeting)
    except Exception as e:
        print(f"Warning: gagal kirim pesan konfirmasi shared bot: {e}")

    return UserResponse.from_orm(user)

@router.post("/link-telegram-custom", response_model=UserResponse)
def link_telegram_custom_bot(
    payload: LinkTelegramCustomRequest,
    user: User = Depends(get_strict_current_user),
    db: Session = Depends(get_db)
):
    token = payload.bot_token.strip()
    if not token or ":" not in token:
        raise HTTPException(status_code=400, detail="Format token bot Telegram tidak valid. Contoh format: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ")

    # 1. Validasi token ke Telegram API
    try:
        me_resp = requests.get(f"https://api.telegram.org/bot{token}/getMe", timeout=10)
        me_data = me_resp.json()
        if not me_data.get("ok"):
            err_desc = me_data.get("description", "Token bot ditolak oleh Telegram API.")
            raise HTTPException(status_code=400, detail=f"Token tidak valid: {err_desc}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal menghubungi Telegram API: {str(e)}")

    bot_info = me_data.get("result", {})
    bot_username = bot_info.get("username", "")

    # 2. Siapkan webhook secret unik
    secret = user.telegram_webhook_secret or secrets.token_urlsafe(32)
    webhook_url = f"{settings.APP_BASE_URL.rstrip('/')}/api/v1/bot/webhook/{secret}"

    # 3. Daftarkan webhook ke Telegram API
    try:
        wh_resp = requests.post(
            f"https://api.telegram.org/bot{token}/setWebhook",
            json={
                "url": webhook_url,
                "drop_pending_updates": True,
                "allowed_updates": ["message"]
            },
            timeout=10
        )
        wh_data = wh_resp.json()
        if not wh_data.get("ok"):
            raise HTTPException(status_code=400, detail=f"Gagal mendaftarkan Webhook Telegram: {wh_data.get('description')}")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Gagal setup webhook bot: {str(e)}")

    # 4. Daftarkan menu commands pada custom bot
    try:
        commands = [
            {"command": "saldo", "description": "Lihat rincian saldo semua rekening & net worth"},
            {"command": "rekap", "description": "Ringkasan pengeluaran & pacing belanja"},
            {"command": "goals", "description": "Target finansial & milestone tabungan"},
            {"command": "subs", "description": "Daftar tagihan rutin & langganan aktif"},
            {"command": "transaksi", "description": "Riwayat transaksi terakhir"},
            {"command": "transfer", "description": "Catat transfer antar rekening"},
            {"command": "batal", "description": "Batalkan transaksi terakhir"},
            {"command": "menu", "description": "Buka papan tombol navigasi cepat"},
            {"command": "help", "description": "Panduan & format pencatatan keuangan"}
        ]
        requests.post(f"https://api.telegram.org/bot{token}/setMyCommands", json={"commands": commands}, timeout=10)
    except Exception as e:
        print(f"Warning: gagal setMyCommands pada custom bot: {e}")

    # 5. Simpan ke database user
    user.telegram_bot_token = token
    user.telegram_bot_username = bot_username
    user.telegram_webhook_secret = secret
    user.telegram_mode = "custom"
    if payload.telegram_chat_id:
        user.telegram_chat_id = int(payload.telegram_chat_id)

    db.commit()
    db.refresh(user)

    # 6. Kirim pesan pengujian jika chat ID tersedia
    if user.telegram_chat_id:
        try:
            from app.bot.bot import send_message
            greeting = f"""🎉 **Bot Pribadi Berhasil Terhubung!**

Halo, **{user.full_name or user.username}**! Bot `@{bot_username}` kini terhubung langsung ke akun AI7 Finance kamu.

Semua pencatatan transaksi melalui bot ini bersifat eksklusif untuk akun kamu:
• `kopi susu 22k mandiri`
• `tf 200k mandiri ke jago`
• Foto struk / screenshot QRIS
• Voice note pengeluaran

Ketik `/menu` atau buka tombol keyboard untuk mulai! 🚀"""
            send_message(int(user.telegram_chat_id), greeting, bot_token=token)
        except Exception as e:
            print(f"Warning: gagal kirim pesan tes ke custom bot: {e}")

    return UserResponse.from_orm(user)

@router.post("/unlink-telegram", response_model=UserResponse)
def unlink_telegram(
    user: User = Depends(get_strict_current_user),
    db: Session = Depends(get_db)
):
    if user.telegram_bot_token:
        # Hapus webhook dari Telegram API jika memakai custom bot
        try:
            requests.post(f"https://api.telegram.org/bot{user.telegram_bot_token}/deleteWebhook", timeout=10)
        except Exception as e:
            print(f"Warning: gagal deleteWebhook: {e}")

    user.telegram_chat_id = None
    user.telegram_bot_token = None
    user.telegram_bot_username = None
    user.telegram_webhook_secret = None
    user.telegram_mode = "shared"
    db.commit()
    db.refresh(user)
    return UserResponse.from_orm(user)

@router.get("/google/config")
def get_google_auth_config():
    return {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "is_configured": bool(settings.GOOGLE_CLIENT_ID)
    }

@router.post("/google", response_model=TokenResponse)
def google_auth(payload: GoogleAuthRequest, db: Session = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google Sign-In belum dikonfigurasi di server (GOOGLE_CLIENT_ID belum diatur di .env)",
        )

    try:
        id_info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            settings.GOOGLE_CLIENT_ID
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token autentikasi Google tidak valid: {str(e)}",
        )

    google_id = str(id_info.get("sub"))
    email = id_info.get("email")
    full_name = id_info.get("name") or "Pengguna Google"
    avatar = id_info.get("picture")

    if not email:
        raise HTTPException(status_code=400, detail="Akun Google Anda tidak menyediakan alamat email")

    # 1. Cari user berdasarkan google_id
    user = db.query(User).filter(User.google_id == google_id).first()
    if not user:
        # 2. Cari user berdasarkan email yang cocok
        user = db.query(User).filter(User.email == email).first()
        if user:
            # Tautkan akun Google ke user eksisting
            user.google_id = google_id
            if avatar and not user.avatar_url:
                user.avatar_url = avatar
            db.commit()
            db.refresh(user)
        else:
            # 3. Buat user baru
            base_username = email.split("@")[0].lower()
            clean_username = "".join(c for c in base_username if c.isalnum() or c in ("_", "-")) or "user"
            candidate = clean_username
            counter = 1
            while db.query(User).filter(User.username == candidate).first():
                candidate = f"{clean_username}{counter}"
                counter += 1

            random_pw = hash_password(secrets.token_urlsafe(32))
            user = User(
                username=candidate,
                email=email,
                full_name=full_name,
                hashed_password=random_pw,
                google_id=google_id,
                avatar_url=avatar,
                is_active=True,
                is_onboarded=False, # Baru mendaftar -> picu Onboarding Wizard
            )
            db.add(user)
            db.commit()
            db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Akun ini telah dinonaktifkan")

    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user,
    )

def verify_telegram_init_data(init_data: str, bot_token: str) -> Optional[dict]:
    """
    Validates data received from Telegram WebApp via HMAC-SHA256 signature check.
    """
    try:
        parsed_data = dict(parse_qsl(init_data, keep_blank_values=True))
        if "hash" not in parsed_data:
            return None
        
        received_hash = parsed_data.pop("hash")
        data_check_string = "\n".join(f"{k}={v}" for k, v in sorted(parsed_data.items()))
        
        secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
        computed_hash = hmac.new(secret_key, data_check_string.encode("utf-8"), hashlib.sha256).hexdigest()
        
        if not hmac.compare_digest(computed_hash, received_hash):
            return None

        # Check auth_date within 7 days
        auth_date = int(parsed_data.get("auth_date", 0))
        if time.time() - auth_date > 86400 * 7:
            return None
            
        if "user" in parsed_data:
            parsed_data["user"] = json.loads(parsed_data["user"])
            
        return parsed_data
    except Exception as e:
        print(f"Error validating Telegram WebApp initData: {e}")
        return None

@router.post("/telegram-webapp", response_model=TokenResponse)
def telegram_webapp_auth(payload: TelegramWebAppAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticate a user directly from Telegram Mini App initData without password.
    """
    if not settings.TELEGRAM_BOT_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram Bot Token belum dikonfigurasi di server",
        )

    # 1. Coba verifikasi dengan shared bot token
    validated = verify_telegram_init_data(payload.init_data, settings.TELEGRAM_BOT_TOKEN)

    # 2. Jika gagal, cek apakah user menggunakan custom BYOB token
    if not validated:
        custom_users = db.query(User).filter(User.telegram_bot_token.isnot(None)).all()
        for cu in custom_users:
            if cu.telegram_bot_token:
                validated = verify_telegram_init_data(payload.init_data, cu.telegram_bot_token)
                if validated:
                    break

    if not validated or "user" not in validated:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Data autentikasi Telegram WebApp tidak valid atau telah kedaluwarsa",
        )

    tg_user = validated["user"]
    tg_id = tg_user.get("id")
    if not tg_id:
        raise HTTPException(status_code=400, detail="Data Telegram tidak memuat ID pengguna")

    # 1. Cari user yang sudah terhubung dengan telegram_chat_id ini
    user = db.query(User).filter(User.telegram_chat_id == int(tg_id)).first()
    
    if not user:
        # Buat user baru secara otomatis untuk pengguna Telegram baru
        tg_username = tg_user.get("username")
        first_name = tg_user.get("first_name") or "Pengguna Telegram"
        
        base_username = (tg_username or f"tg_{tg_id}").lower()
        clean_username = "".join(c for c in base_username if c.isalnum() or c in ("_", "-")) or f"tg_{tg_id}"
        candidate = clean_username
        counter = 1
        while db.query(User).filter(User.username == candidate).first():
            candidate = f"{clean_username}{counter}"
            counter += 1

        random_pw = hash_password(secrets.token_urlsafe(32))
        user = User(
            username=candidate,
            full_name=first_name,
            hashed_password=random_pw,
            telegram_chat_id=int(tg_id),
            is_active=True,
            is_onboarded=False,
        )
        db.add(user)
        db.commit()
        db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=403, detail="Akun ini telah dinonaktifkan")

    token = create_access_token(subject=user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.from_orm(user),
    )
