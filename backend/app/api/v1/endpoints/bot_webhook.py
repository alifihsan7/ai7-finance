import traceback
from fastapi import APIRouter, Request, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.models.user import User
from app.core.security import decrypt_token

router = APIRouter()

@router.post("/webhook/{secret}")
async def telegram_bot_webhook(secret: str, request: Request, db: Session = Depends(get_db)):
    """
    Webhook receiver for Bring Your Own Bot (BYOB) custom Telegram bots.
    Processes incoming Telegram updates using the corresponding user's credentials and tenant context.
    Offloads blocking I/O and synchronous bot execution to worker threadpool to prevent freezing the event loop.
    """
    user = db.query(User).filter(User.telegram_webhook_secret == secret).first()
    bot_token = decrypt_token(user.telegram_bot_token) if user else None
    if not user or not bot_token:
        # Return 200 OK so Telegram stops retrying dead/revoked webhooks
        return {"ok": False, "detail": "User or custom bot token not found"}

    try:
        payload = await request.json()
    except Exception:
        return {"ok": False, "detail": "Invalid JSON"}

    # Process the update non-blockingly with this specific user context and bot token
    try:
        # Import lazily to avoid circular imports during startup
        from app.bot.bot import process_update
        await run_in_threadpool(
            process_update,
            payload,
            bot_token=bot_token,
            user_override=user
        )
    except Exception as e:
        print(f"[Webhook Error] User {user.id} ({user.username}): {e}")
        traceback.print_exc()

    return {"ok": True}
