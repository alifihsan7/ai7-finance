from sqlalchemy import Column, Integer, String, Boolean, DateTime, BigInteger
from sqlalchemy.sql import func
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=True, index=True)
    full_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    telegram_chat_id = Column(BigInteger, unique=True, nullable=True, index=True)
    telegram_bot_token = Column(String(200), nullable=True)
    telegram_bot_username = Column(String(100), nullable=True)
    telegram_webhook_secret = Column(String(64), unique=True, nullable=True, index=True)
    telegram_mode = Column(String(20), default="shared", nullable=False)
    google_id = Column(String(100), unique=True, nullable=True, index=True)
    avatar_url = Column(String(255), nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    is_onboarded = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
