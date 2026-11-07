import hashlib
import secrets
from datetime import datetime, timedelta

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user import TelegramLink, User


def create_link(db: Session, user: User) -> str:
    db.query(User).filter(User.id == user.id).with_for_update().one()
    token = secrets.token_urlsafe(24)
    link = db.get(TelegramLink, user.id)
    if link is None:
        link = TelegramLink(user_id=user.id)
        db.add(link)
    link.token_hash = hashlib.sha256(token.encode()).hexdigest()
    link.expires_at = datetime.utcnow() + timedelta(minutes=10)
    db.commit()
    return token


def consume_link(db: Session, token: str, chat_id: int) -> bool:
    link = db.query(TelegramLink).filter(
        TelegramLink.token_hash == hashlib.sha256(token.encode()).hexdigest(),
        TelegramLink.expires_at > datetime.utcnow(),
    ).first()
    if link is None:
        return False
    user = db.query(User).filter(User.id == link.user_id, User.is_active == True).with_for_update().first()
    link = db.query(TelegramLink).filter(
        TelegramLink.token_hash == hashlib.sha256(token.encode()).hexdigest(),
        TelegramLink.expires_at > datetime.utcnow(),
    ).with_for_update().first()
    if link is None:
        db.rollback()
        return False
    existing = db.query(User).filter(User.telegram_chat_id == chat_id, User.id != link.user_id).first()
    if user is None or existing is not None:
        db.rollback()
        return False
    # Consume in the same transaction as the account link so retries cannot reassign it.
    consumed = db.query(TelegramLink).filter(
        TelegramLink.user_id == link.user_id, TelegramLink.token_hash == link.token_hash,
    ).delete(synchronize_session=False)
    if consumed != 1:
        db.rollback()
        return False
    user.telegram_chat_id = chat_id
    user.telegram_mode = "shared"
    user.telegram_bot_token = None
    user.telegram_bot_username = None
    user.telegram_webhook_secret = None
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        return False
    return True
