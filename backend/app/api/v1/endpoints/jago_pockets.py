import calendar
import re
import zoneinfo
from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional, Union

from fastapi import APIRouter, Body, Depends, HTTPException, Query, status
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.config import settings
from app.db.session import get_db
from app.models.account import Account
from app.models.jago_pocket import JagoPocket
from app.models.paycheck import PaycheckConfig
from app.models.subscription import Subscription
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.jago_pocket import (
    JagoPocketItemResponse,
    JagoPocketsBatchUpdate,
    JagoPocketsSummaryResponse,
    JagoPocketTargetUpdate,
    JagoPocketUpdate,
)

router = APIRouter()
WIB = zoneinfo.ZoneInfo(settings.TIMEZONE)

DEFAULT_POCKET_SPECS = [
    {
        "slug": "gym",
        "name": "GYM",
        "default_target": 225_000,
        "subscription_keywords": ["gym", "fitness", "fithub", "membership"],
    },
    {
        "slug": "claude",
        "name": "Subscription Claude",
        "default_target": 75_000,
        "subscription_keywords": ["claude", "anthropic"],
    },
    {
        "slug": "kuota",
        "name": "Kuota",
        "default_target": 50_000,
        "subscription_keywords": ["kuota", "pulsa", "paket data", "internet"],
    },
    {
        "slug": "visa",
        "name": "VISA",
        "default_target": 50_000,
        "subscription_keywords": ["visa", "online debit"],
    },
    {
        "slug": "utama",
        "name": "Kantong Utama",
        "default_target": 0,
        "subscription_keywords": [],
    },
]


def get_monthly_date_bounds(ref_date: date, payday: int) -> tuple[date, date]:
    """Calculate (cycle_start, cycle_end) for monthly cycle anchored to payday."""
    if ref_date.day >= payday:
        start_year, start_month = ref_date.year, ref_date.month
    else:
        if ref_date.month == 1:
            start_year, start_month = ref_date.year - 1, 12
        else:
            start_year, start_month = ref_date.year, ref_date.month - 1

    _, max_days_start = calendar.monthrange(start_year, start_month)
    start_date = date(start_year, start_month, min(payday, max_days_start))

    if start_month == 12:
        next_year, next_month = start_year + 1, 1
    else:
        next_year, next_month = start_year, start_month + 1

    _, max_days_next = calendar.monthrange(next_year, next_month)
    end_date = date(next_year, next_month, min(payday, max_days_next)) - timedelta(days=1)
    return start_date, end_date


def get_current_cycle_bounds(db: Session, user_id: int, ref_date: Optional[date] = None) -> tuple[date, date]:
    """Deterministically determine the active financial cycle date range for user."""
    if ref_date is None:
        ref_date = datetime.now(WIB).date()

    cfg = db.query(PaycheckConfig).filter(PaycheckConfig.user_id == user_id).first()
    cycle_days = cfg.cycle_days if cfg and cfg.cycle_days and cfg.cycle_days > 0 else 30
    cycle_type = cfg.cycle_type if cfg and cfg.cycle_type else "monthly_date"
    anchor_start = cfg.cycle_start_date if cfg and cfg.cycle_start_date else None
    paycheck_day = cfg.paycheck_day if cfg and cfg.paycheck_day else (anchor_start.day if anchor_start else 25)

    if cycle_type == "monthly_date":
        return get_monthly_date_bounds(ref_date, paycheck_day)
    elif anchor_start:
        cycle_start = anchor_start
        cycle_end = cycle_start + timedelta(days=cycle_days - 1)
        while ref_date > cycle_end:
            cycle_start = cycle_end + timedelta(days=1)
            cycle_end = cycle_start + timedelta(days=cycle_days - 1)
        return cycle_start, cycle_end
    else:
        start_date = ref_date.replace(day=1)
        _, last_day = calendar.monthrange(ref_date.year, ref_date.month)
        end_date = ref_date.replace(day=last_day)
        return start_date, end_date


def find_subscription_commitment(db: Session, user_id: int, keywords: List[str]) -> Optional[int]:
    """Find active routine subscription amount matching keyword list."""
    if not keywords:
        return None
    subs = db.query(Subscription).filter(
        Subscription.user_id == user_id,
        Subscription.is_active == True,
    ).all()
    for sub in subs:
        sub_name = (sub.name or "").lower()
        sub_cat = (sub.category or "").lower()
        combined = f"{sub_cat} {sub_name}"
        if any(k in combined for k in keywords):
            return int(sub.amount)
    return None


def ensure_default_pockets(db: Session, user_id: int) -> List[JagoPocket]:
    """
    Idempotently seeds default 5 Jago Pockets for user if missing.
    Auto-populates routine commitments from active Subscriptions when available.
    """
    existing = db.query(JagoPocket).filter(JagoPocket.user_id == user_id).all()
    existing_map = {p.slug: p for p in existing}

    added = False
    for spec in DEFAULT_POCKET_SPECS:
        slug = spec["slug"]
        if slug not in existing_map:
            sub_commitment = find_subscription_commitment(db, user_id, spec["subscription_keywords"])
            initial_target = sub_commitment if sub_commitment is not None else spec["default_target"]

            new_pocket = JagoPocket(
                user_id=user_id,
                name=spec["name"],
                slug=slug,
                target_amount=initial_target,
                is_active=True,
            )
            db.add(new_pocket)
            existing_map[slug] = new_pocket
            added = True

    if added:
        db.commit()

    return list(existing_map.values())


def get_jago_account_balance(db: Session, user_id: int) -> int:
    """Calculates all-time ledger balance for Bank Jago account."""
    tx_balance = db.query(
        func.coalesce(
            func.sum(
                case(
                    (Transaction.type.in_(["income", "transfer_in"]), Transaction.amount),
                    (Transaction.type.in_(["expense", "transfer_out"]), -Transaction.amount),
                    else_=0,
                )
            ),
            0,
        )
    ).filter(
        Transaction.user_id == user_id,
        func.lower(Transaction.account).in_(["bank jago", "jago"]),
    ).scalar()

    balance = int(tx_balance or 0)
    if balance == 0:
        jago_acc = db.query(Account).filter(
            Account.user_id == user_id,
            func.lower(Account.name).in_(["bank jago", "jago"]),
        ).first()
        if jago_acc and jago_acc.initial_balance > 0:
            balance = int(jago_acc.initial_balance)
    return balance


def classify_jago_transaction(tx: Transaction) -> str:
    """
    Auto-deduction classifier mapping Bank Jago expense transactions into pocket slugs:
    1. GYM: 'Gym & Fitness' category or keyword 'gym' / 'fitness'
    2. Subscription Claude: 'Claude' / 'AI' category or keywords
    3. Kuota: 'Kuota' / 'Pulsa' category or keywords
    4. VISA: 'VISA' / 'Online debit' category or keywords
    5. Kantong Utama: default fallback for general operational expenses
    """
    desc = (tx.description or "").lower()
    cat = (tx.category or "").lower()
    combined = f"{cat} {desc}"

    # 1. GYM: 'Gym & Fitness' or keyword 'gym' / 'fitness'
    if (
        "gym" in cat
        or "fitness" in cat
        or re.search(r"\b(?:gym|fitness|fithub|fit hub|megafit|workout|membership gym)\b", combined)
    ):
        return "gym"

    # 2. Subscription Claude: 'Claude' / 'AI'
    if (
        "claude" in combined
        or "anthropic" in combined
        or re.search(r"\b(?:claude|anthropic)\b", combined)
        or (re.search(r"\bai\b", combined) and any(w in combined for w in ["subs", "langganan", "chatgpt", "openai", "copilot", "perplexity", "midjourney", "token", "api", "software", "digital", "claude"]))
        or ("ai" in cat.split())
    ):
        return "claude"

    # 3. Kuota: Kuota / Pulsa
    if (
        any(k in cat for k in ["kuota", "pulsa", "paket data", "internet", "telekomunikasi"])
        or any(k in desc for k in ["kuota", "pulsa", "paket data", "paket internet", "by.u", "byu", "telkomsel", "indosat", "tri", "three", "xl axiata", "smartfren"])
    ):
        return "kuota"

    # 4. VISA: VISA / Online debit
    if (
        "visa" in combined
        or "online debit" in combined
        or "debit online" in combined
        or re.search(r"\b(?:visa|vcc|online debit|debit online|card debit)\b", combined)
    ):
        return "visa"

    # 5. Default fallback: Kantong Utama
    return "utama"


def compute_jago_pockets_summary(
    db: Session,
    user_id: int,
    cycle_start: Optional[date] = None,
    cycle_end: Optional[date] = None,
) -> JagoPocketsSummaryResponse:
    """Computes comprehensive summary, auto-deduction metrics, and balance for 5 pockets."""
    ensure_default_pockets(db, user_id)

    if not cycle_start or not cycle_end:
        calc_start, calc_end = get_current_cycle_bounds(db, user_id)
        cycle_start = cycle_start or calc_start
        cycle_end = cycle_end or calc_end

    total_jago_balance = get_jago_account_balance(db, user_id)

    slug_order = ["gym", "claude", "kuota", "visa", "utama"]
    all_pockets = db.query(JagoPocket).filter(
        JagoPocket.user_id == user_id,
        JagoPocket.is_active == True,
    ).all()

    pocket_map = {p.slug: p for p in all_pockets}
    ordered_pockets: List[JagoPocket] = []
    for s in slug_order:
        if s in pocket_map:
            ordered_pockets.append(pocket_map[s])
    for p in all_pockets:
        if p.slug not in slug_order:
            ordered_pockets.append(p)

    expenses = db.query(Transaction).filter(
        Transaction.user_id == user_id,
        Transaction.type == "expense",
        func.lower(Transaction.account).in_(["bank jago", "jago"]),
        Transaction.date >= cycle_start,
        Transaction.date <= cycle_end,
    ).all()

    spent_by_slug: dict[str, int] = defaultdict(int)
    for tx in expenses:
        slug = classify_jago_transaction(tx)
        spent_by_slug[slug] += int(tx.amount)

    sum_other_targets = sum(
        int(p.target_amount) for p in ordered_pockets if p.slug != "utama"
    )

    items: List[JagoPocketItemResponse] = []
    total_target = 0
    total_spent = 0

    for p in ordered_pockets:
        target = int(p.target_amount)
        if p.slug == "utama" and target == 0:
            target = max(0, total_jago_balance - sum_other_targets)

        spent = spent_by_slug.get(p.slug, 0)
        remaining = target - spent
        pct = round((spent / target * 100), 1) if target > 0 else 0.0

        item = JagoPocketItemResponse(
            id=p.id,
            user_id=p.user_id,
            name=p.name,
            slug=p.slug,
            target_amount=target,
            spent_amount=spent,
            remaining_amount=remaining,
            percentage_spent=pct,
            percentage=pct,
            is_active=p.is_active,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        items.append(item)
        total_target += target
        total_spent += spent

    total_remaining = total_target - total_spent

    return JagoPocketsSummaryResponse(
        total_jago_balance=total_jago_balance,
        total_target_amount=total_target,
        total_spent_amount=total_spent,
        total_remaining_amount=total_remaining,
        cycle_start=cycle_start,
        cycle_end=cycle_end,
        pockets=items,
        items=items,
    )


def normalize_update_payload(payload: Any) -> List[Dict[str, Any]]:
    """Normalizes heterogeneous batch update payloads into list of update dicts."""
    if isinstance(payload, list):
        return [p for p in payload if isinstance(p, dict)]
    elif isinstance(payload, dict):
        if "pockets" in payload and isinstance(payload["pockets"], list):
            return [p for p in payload["pockets"] if isinstance(p, dict)]
        if "slug" in payload or "id" in payload:
            return [payload]
        results = []
        for k, v in payload.items():
            if isinstance(v, (int, float)):
                results.append({"slug": str(k), "target_amount": int(v)})
            elif isinstance(v, dict):
                entry = dict(v)
                entry.setdefault("slug", str(k))
                results.append(entry)
        return results
    return []


@router.get("", response_model=JagoPocketsSummaryResponse)
def get_jago_pockets(
    cycle_start: Optional[date] = None,
    cycle_end: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get summary of 5 Bank Jago pockets with real-time auto-deductions,
    target allocations, remaining balances, and total Bank Jago ledger balance.
    """
    return compute_jago_pockets_summary(
        db=db,
        user_id=current_user.id,
        cycle_start=cycle_start,
        cycle_end=cycle_end,
    )


@router.put("", response_model=JagoPocketsSummaryResponse)
def update_jago_pockets(
    payload: Any = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update target allocations manually for Jago pockets.
    Accepts batch list, wrapper object `{"pockets": [...]}`, or slug-target dictionary.
    """
    ensure_default_pockets(db, current_user.id)
    updates = normalize_update_payload(payload)

    if not updates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Format payload update tidak valid",
        )

    for item in updates:
        slug = item.get("slug")
        pocket_id = item.get("id")
        name = item.get("name")
        target_amount = item.get("target_amount")
        is_active = item.get("is_active")

        pocket = None
        if pocket_id:
            pocket = db.query(JagoPocket).filter(
                JagoPocket.id == pocket_id,
                JagoPocket.user_id == current_user.id,
            ).first()
        elif slug:
            pocket = db.query(JagoPocket).filter(
                func.lower(JagoPocket.slug) == slug.strip().lower(),
                JagoPocket.user_id == current_user.id,
            ).first()
        elif name:
            pocket = db.query(JagoPocket).filter(
                func.lower(JagoPocket.name) == name.strip().lower(),
                JagoPocket.user_id == current_user.id,
            ).first()

        if pocket:
            if target_amount is not None:
                pocket.target_amount = max(0, int(target_amount))
            if is_active is not None:
                pocket.is_active = bool(is_active)

    db.commit()

    return compute_jago_pockets_summary(
        db=db,
        user_id=current_user.id,
    )


@router.post("/sync-commitments", response_model=JagoPocketsSummaryResponse)
def sync_commitments_from_subscriptions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Re-synchronizes routine pocket targets with active Subscriptions
    for GYM, Subscription Claude, and Kuota.
    """
    ensure_default_pockets(db, current_user.id)
    pockets = db.query(JagoPocket).filter(JagoPocket.user_id == current_user.id).all()
    pocket_map = {p.slug: p for p in pockets}

    for spec in DEFAULT_POCKET_SPECS:
        slug = spec["slug"]
        if slug in pocket_map and spec["subscription_keywords"]:
            sub_amt = find_subscription_commitment(db, current_user.id, spec["subscription_keywords"])
            if sub_amt is not None and sub_amt > 0:
                pocket_map[slug].target_amount = sub_amt

    db.commit()
    return compute_jago_pockets_summary(db=db, user_id=current_user.id)


@router.get("/{slug}", response_model=JagoPocketItemResponse)
def get_single_jago_pocket(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Retrieve details and metrics for an individual Jago pocket."""
    summary = compute_jago_pockets_summary(db=db, user_id=current_user.id)
    pocket_item = next((p for p in summary.pockets if p.slug.lower() == slug.strip().lower()), None)
    if not pocket_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kantong dengan slug '{slug}' tidak ditemukan",
        )
    return pocket_item


@router.put("/{slug}", response_model=JagoPocketItemResponse)
def update_single_jago_pocket(
    slug: str,
    payload: JagoPocketUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update target amount or status for a single Jago pocket."""
    ensure_default_pockets(db, current_user.id)
    pocket = db.query(JagoPocket).filter(
        func.lower(JagoPocket.slug) == slug.strip().lower(),
        JagoPocket.user_id == current_user.id,
    ).first()
    if not pocket:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Kantong dengan slug '{slug}' tidak ditemukan",
        )

    if payload.target_amount is not None:
        pocket.target_amount = max(0, int(payload.target_amount))
    if payload.name is not None and payload.name.strip():
        pocket.name = payload.name.strip()
    if payload.is_active is not None:
        pocket.is_active = bool(payload.is_active)

    db.commit()

    summary = compute_jago_pockets_summary(db=db, user_id=current_user.id)
    pocket_item = next((p for p in summary.pockets if p.slug.lower() == slug.strip().lower()), None)
    return pocket_item
