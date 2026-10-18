from typing import List
from datetime import datetime, date
import zoneinfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.db.session import get_db
from app.models.account import Account
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.account import AccountCreate, AccountResponse
from app.api.deps import get_current_user
from app.core.config import settings

router = APIRouter()
WIB = zoneinfo.ZoneInfo(settings.TIMEZONE)

DEFAULT_ACCOUNTS = [
    {"name": "Mandiri", "type": "operasional", "tag": "Saku Operasional (55%)", "color": "amberGold", "initial_balance": 38972},
    {"name": "Bank Jago", "type": "operasional", "tag": "Subs & Tagihan (18.3%)", "color": "purpleLock", "initial_balance": 0},
    {"name": "Bibit", "type": "investasi", "tag": "Investasi Portofolio (13.3%)", "color": "teal", "initial_balance": 2200000},
    {"name": "BRI 1", "type": "darurat", "tag": "Hub & Dana Darurat (6.7%)", "color": "cyanHub", "initial_balance": 756660},
    {"name": "BRI 2", "type": "tabungan", "tag": "Tabungan Terkunci (6.7%)", "color": "purpleLock", "initial_balance": 900000},
    {"name": "Cash", "type": "operasional", "tag": "Uang Tunai Fisik", "color": "amberGold", "initial_balance": 0},
]

def ensure_default_accounts(db: Session, user_id: int):
    if user_id == 1:
        for d in DEFAULT_ACCOUNTS:
            exists = db.query(Account).filter(Account.user_id == 1, Account.name == d["name"]).first()
            if not exists:
                acc = Account(
                    user_id=1,
                    name=d["name"],
                    type=d["type"],
                    tag=d["tag"],
                    color=d["color"],
                    initial_balance=d["initial_balance"],
                )
                db.add(acc)
        db.commit()

@router.get("", response_model=List[AccountResponse])
def get_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ensure_default_accounts(db, current_user.id)
    
    # Hitung saldo riil all-time per akun dari ledger transaksi milik user ini
    acc_rows = db.query(
        Transaction.account,
        func.sum(
            case(
                (Transaction.type.in_(["income", "transfer_in"]), Transaction.amount),
                (Transaction.type.in_(["expense", "transfer_out"]), -Transaction.amount),
                else_=0
            )
        ).label("balance")
    ).filter(Transaction.user_id == current_user.id).group_by(Transaction.account).all()

    balance_map = {r.account: int(r.balance or 0) for r in acc_rows}

    accounts = db.query(Account).filter(Account.user_id == current_user.id).order_by(Account.id.asc()).all()
    results = []
    for acc in accounts:
        curr_bal = balance_map.get(acc.name, 0)
        results.append(AccountResponse(
            id=acc.id,
            name=acc.name,
            type=acc.type,
            tag=acc.tag,
            color=acc.color,
            initial_balance=acc.initial_balance,
            current_balance=curr_bal,
            created_at=acc.created_at
        ))
    return results

@router.post("", response_model=AccountResponse, status_code=status.HTTP_201_CREATED)
def create_account(
    account_in: AccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    name_clean = account_in.name.strip()
    if not name_clean:
        raise HTTPException(status_code=400, detail="Nama rekening tidak boleh kosong")

    existing = db.query(Account).filter(
        Account.user_id == current_user.id,
        func.lower(Account.name) == name_clean.lower()
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Rekening '{name_clean}' sudah terdaftar")

    new_acc = Account(
        user_id=current_user.id,
        name=name_clean,
        type=account_in.type,
        tag=account_in.tag or f"Akun {name_clean}",
        color=account_in.color or "amberGold",
        initial_balance=account_in.initial_balance
    )
    db.add(new_acc)
    db.commit()
    db.refresh(new_acc)

    # Jika ada saldo awal > 0, catat otomatis sebagai transaksi 'income' (Saldo Awal)
    if account_in.initial_balance > 0:
        now_wib = datetime.now(WIB)
        init_tx = Transaction(
            user_id=current_user.id,
            type="income",
            amount=account_in.initial_balance,
            account=new_acc.name,
            category="Saldo Awal",
            description=f"Saldo Awal Akun {new_acc.name}",
            date=now_wib.date(),
            raw_text=f"init_account: {new_acc.name} {account_in.initial_balance}"
        )
        db.add(init_tx)
        db.commit()

    return AccountResponse(
        id=new_acc.id,
        name=new_acc.name,
        type=new_acc.type,
        tag=new_acc.tag,
        color=new_acc.color,
        initial_balance=new_acc.initial_balance,
        current_balance=account_in.initial_balance,
        created_at=new_acc.created_at
    )
