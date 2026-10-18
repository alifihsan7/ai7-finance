import traceback
from fastapi import APIRouter, Request, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User

router = APIRouter()

@router.post("/webhook/{secret}")
async def telegram_bot_webhook(secret: str, request: Request, db: Session = Depends(get_db)):
    """
    Webhook receiver for Bring Your Own Bot (BYOB) custom Telegram bots.
    Processes incoming Telegram updates using the corresponding user's credentials and tenant context.
    """
    user = db.query(User).filter(User.telegram_webhook_secret == secret).first()
    if not user or not user.telegram_bot_token:
        # Return 200 OK so Telegram stops retrying dead/revoked webhooks
        return {"ok": False, "detail": "User or custom bot token not found"}

    try:
        payload = await request.json()
    except Exception:
        return {"ok": False, "detail": "Invalid JSON"}

    # Process the update with this specific user context and bot token
    try:
        # Import lazily to avoid circular imports during startup
        from app.bot.bot import process_update
        process_update(payload, bot_token=user.telegram_bot_token, user_override=user)
    except Exception as e:
        print(f"[Webhook Error] User {user.id} ({user.username}): {e}")
        traceback.print_exc()

    return {"ok": True}
