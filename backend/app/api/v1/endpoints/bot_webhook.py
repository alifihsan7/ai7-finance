from fastapi import APIRouter, HTTPException

router = APIRouter()


@router.post("/webhook/{secret}")
async def retired_custom_bot_webhook(secret: str):
    raise HTTPException(410, "Gunakan bot Tillfold melalui pengaturan integrasi Telegram.")
