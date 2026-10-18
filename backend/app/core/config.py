import os
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
        "postgresql://alifihsan:ai7finance2026@127.0.0.1:5432/ai7_finance"
    )
    
    # Telegram Bot
    BOT_TOKEN: str = os.getenv("BOT_TOKEN", "8897030564:AAGxRBWe4WJgSUsdqi-HuwHwwHBSbPPTppg")
    ALLOWED_USER_ID: int = int(os.getenv("ALLOWED_USER_ID", "1357550611"))
    
    # Timezone
    TIMEZONE: str = "Asia/Jakarta"

    # Google Sheets Integration
    GOOGLE_SERVICE_ACCOUNT_FILE: str = os.getenv("GOOGLE_SERVICE_ACCOUNT_FILE", "/home/alifihsan/ai7-finance/credentials_google.json")
    GOOGLE_SHEETS_SPREADSHEET_ID: str = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID", "")

    # AI Media Extraction (OCR & Voice Notes via 9router)
    AI_ROUTER_URL: str = os.getenv("AI_ROUTER_URL", "http://127.0.0.1:20128/v1")
    AI_ROUTER_KEY: str = os.getenv("AI_ROUTER_KEY", "")
    AI_ROUTER_MODEL: str = os.getenv("AI_ROUTER_MODEL", "ag/gemini-3.8-flash")

    # JWT Authentication
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "ai7_finance_super_secret_jwt_key_2026_obsidian_slate_production")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 30  # 30 days

    class Config:
        case_sensitive = True

settings = Settings()
