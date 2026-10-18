from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.db.session import get_db
from app.models.user import User
from app.schemas.user import (
    UserCreate,
    UserLogin,
    UserUpdate,
    UserResponse,
    TokenResponse,
    LinkTelegramRequest,
)
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_strict_current_user

router = APIRouter()

@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
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
def login(payload: UserLogin, db: Session = Depends(get_db)):
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
    existing = db.query(User).filter(User.telegram_chat_id == payload.telegram_chat_id, User.id != user.id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Telegram Chat ID ini sudah ditautkan ke akun lain")
    
    user.telegram_chat_id = payload.telegram_chat_id
    db.commit()
    db.refresh(user)
    return UserResponse.from_orm(user)
