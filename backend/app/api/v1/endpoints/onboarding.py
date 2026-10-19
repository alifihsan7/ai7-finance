from datetime import datetime, date
import zoneinfo
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.paycheck import PaycheckConfig, PaycheckBucket
from app.schemas.user import OnboardingRequest, UserResponse
from app.api.deps import get_strict_current_user
from app.core.config import settings

router = APIRouter()
WIB = zoneinfo.ZoneInfo(settings.TIMEZONE)

@router.post("/complete", response_model=UserResponse)
def complete_onboarding(
    payload: OnboardingRequest,
    user: User = Depends(get_strict_current_user),
    db: Session = Depends(get_db)
):
    try:
        now_wib = datetime.now(WIB)
        tx_date = payload.cycle_start_date or now_wib.date()

        # 1. Create Accounts
        for acc in payload.initial_accounts:
            existing_acc = db.query(Account).filter(Account.user_id == user.id, Account.name == acc.name).first()
            if not existing_acc:
                new_acc = Account(
                    user_id=user.id,
                    name=acc.name,
                    type=acc.type,
                    tag=acc.tag,
                    color=acc.color,
                    initial_balance=acc.initial_balance,
                )
                db.add(new_acc)
                db.flush()

                # Record initial balance transaction if > 0
                if acc.initial_balance > 0:
                    init_tx = Transaction(
                        user_id=user.id,
                        type="income",
                        amount=acc.initial_balance,
                        account=acc.name,
                        category="Saldo Awal",
                        description=f"Saldo Awal Onboarding ({acc.name})",
                        raw_text=f"Saldo Awal {acc.name} Rp {acc.initial_balance:,}",
                        date=tx_date,
                    )
                    db.add(init_tx)

        # 2. Create or Update PaycheckConfig
        cfg = db.query(PaycheckConfig).filter(PaycheckConfig.user_id == user.id).first()
        if not cfg:
            cfg = PaycheckConfig(
                user_id=user.id,
                source_account=payload.source_account,
                use_gate=payload.use_gate,
                gate_name=payload.gate_name or "Direct Transfer",
                cycle_type=payload.cycle_type,
                cycle_days=payload.cycle_days,
                paycheck_day=payload.paycheck_day or (tx_date.day if tx_date else 25),
                cycle_start_date=tx_date,
                pocket_account=payload.pocket_account,
                is_active=True,
            )
            db.add(cfg)
            db.flush()
        else:
            cfg.source_account = payload.source_account
            cfg.use_gate = payload.use_gate
            cfg.gate_name = payload.gate_name or "Direct Transfer"
            cfg.cycle_type = payload.cycle_type
            cfg.cycle_days = payload.cycle_days
            cfg.paycheck_day = payload.paycheck_day or (tx_date.day if tx_date else 25)
            cfg.cycle_start_date = tx_date
            cfg.pocket_account = payload.pocket_account

        # 3. Create Buckets
        db.query(PaycheckBucket).filter(PaycheckBucket.config_id == cfg.id).delete()
        for idx, b in enumerate(payload.buckets):
            bucket = PaycheckBucket(
                config_id=cfg.id,
                account=b.account,
                percentage=b.percentage,
                via_gate=b.via_gate,
                via_secondary=b.via_secondary,
                purpose=b.purpose,
                sort_order=idx + 1,
            )
            db.add(bucket)

        # 4. Mark user as onboarded
        user.is_onboarded = True
        db.commit()
        db.refresh(user)

        return user
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Gagal menyelesaikan onboarding: {str(e)}"
        )
