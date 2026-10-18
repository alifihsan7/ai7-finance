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

    class Config:
        case_sensitive = True

settings = Settings()
