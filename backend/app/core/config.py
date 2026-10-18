import os
import secrets
from typing import Optional
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI7 Finance API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:postgres@localhost:5432/ai7_finance"
    )
    
    # Telegram Bot
    BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
    ALLOWED_USER_ID: int = int(os.getenv("ALLOWED_USER_ID", "0"))
    
    # Web App URL
    APP_BASE_URL: str = os.getenv("APP_BASE_URL", "http://localhost:8080")

    # Timezone
    TIMEZONE: str = "Asia/Jakarta"

    # Google Sheets Integration
    GOOGLE_SERVICE_ACCOUNT_FILE: str = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "credentials_google.json")
    GOOGLE_SHEETS_SPREADSHEET_ID: str = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID", "")

    # AI Media Extraction (OCR & Voice Notes via 9router)
    AI_ROUTER_URL: str = os.getenv("AI_ROUTER_URL", "http://127.0.0.1:20128/v1")
    AI_ROUTER_KEY: str = os.getenv("AI_ROUTER_KEY", "")
    AI_ROUTER_MODEL: str = os.getenv("AI_ROUTER_MODEL", "ag/gemini-3.8-flash")

    # JWT Authentication - Loaded securely from environment or auto-generated cryptographically
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "") or secrets.token_hex(32)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    # Google OAuth Sign-In (Web)
    GOOGLE_CLIENT_ID: Optional[str] = os.getenv("GOOGLE_CLIENT_ID", None)

    class Config:
        case_sensitive = True

settings = Settings()
