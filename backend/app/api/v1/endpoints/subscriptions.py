from typing import List, Optional
from datetime import datetime, date, timedelta
import zoneinfo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.models.subscription import Subscription
from app.schemas.subscription import (
    SubscriptionCreate,
    SubscriptionUpdate,
    SubscriptionResponse,
    SubscriptionsSummary,
)
from app.core.config import settings

router = APIRouter()
WIB = zoneinfo.ZoneInfo(settings.TIMEZONE)

def compute_due_info(billing_day: int, now_date: date):
    # Determine next billing date
    year = now_date.year
    month = now_date.month

    # If billing day is today or earlier this month, next billing date is next month
    try:
        cur_month_due = date(year, month, billing_day)
    except ValueError:
        # e.g. Feb 30 -> fallback to last day of month
        import calendar
        _, last_day = calendar.monthrange(year, month)
        cur_month_due = date(year, month, last_day)

    if cur_month_due >= now_date:
        next_due = cur_month_due
    else:
        # Next month
        if month == 12:
            next_year = year + 1
            next_month = 1
        else:
            next_year = year
            next_month = month + 1
        try:
            next_due = date(next_year, next_month, billing_day)
        except ValueError:
            import calendar
            _, last_day = calendar.monthrange(next_year, next_month)
            next_due = date(next_year, next_month, last_day)

    days_until = (next_due - now_date).days
    return days_until, str(next_due)

@router.get("", response_model=SubscriptionsSummary)
def get_subscriptions(db: Session = Depends(get_db)):
    subs = db.query(Subscription).order_by(Subscription.billing_day.asc()).all()
    now_date = datetime.now(WIB).date()

    items = []
    total_monthly = 0
    active_cnt = 0
    upcoming_week = 0

    for s in subs:
        days_until, next_date = compute_due_info(s.billing_day, now_date)
        if s.is_active:
            total_monthly += s.amount
            active_cnt += 1
            if days_until <= 7:
                upcoming_week += 1

        items.append(SubscriptionResponse(
            id=s.id,
            name=s.name,
            amount=s.amount,
            category=s.category,
            account=s.account,
            billing_cycle=s.billing_cycle,
            billing_day=s.billing_day,
            is_active=s.is_active,
            notes=s.notes,
            created_at=s.created_at,
            days_until_due=days_until,
            next_billing_date=next_date
        ))

    return SubscriptionsSummary(
        total_monthly_commitment=total_monthly,
        active_count=active_cnt,
        upcoming_this_week=upcoming_week,
        items=items
    )

@router.post("", response_model=SubscriptionResponse, status_code=status.HTTP_201_CREATED)
def create_subscription(sub_in: SubscriptionCreate, db: Session = Depends(get_db)):
    sub = Subscription(
        name=sub_in.name.strip(),
        amount=sub_in.amount,
        category=sub_in.category.strip(),
        account=sub_in.account.strip(),
        billing_cycle=sub_in.billing_cycle,
        billing_day=sub_in.billing_day,
        is_active=sub_in.is_active,
        notes=sub_in.notes.strip() if sub_in.notes else None
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    now_date = datetime.now(WIB).date()
    days_until, next_date = compute_due_info(sub.billing_day, now_date)

    return SubscriptionResponse(
        id=sub.id,
        name=sub.name,
        amount=sub.amount,
        category=sub.category,
        account=sub.account,
        billing_cycle=sub.billing_cycle,
        billing_day=sub.billing_day,
        is_active=sub.is_active,
        notes=sub.notes,
        created_at=sub.created_at,
        days_until_due=days_until,
        next_billing_date=next_date
    )

@router.put("/{sub_id}", response_model=SubscriptionResponse)
def update_subscription(sub_id: int, sub_in: SubscriptionUpdate, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Langganan tidak ditemukan")

    update_data = sub_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(sub, field, value)

    db.commit()
    db.refresh(sub)

    now_date = datetime.now(WIB).date()
    days_until, next_date = compute_due_info(sub.billing_day, now_date)

    return SubscriptionResponse(
        id=sub.id,
        name=sub.name,
        amount=sub.amount,
        category=sub.category,
        account=sub.account,
        billing_cycle=sub.billing_cycle,
        billing_day=sub.billing_day,
        is_active=sub.is_active,
        notes=sub.notes,
        created_at=sub.created_at,
        days_until_due=days_until,
        next_billing_date=next_date
    )

@router.delete("/{sub_id}")
def delete_subscription(sub_id: int, db: Session = Depends(get_db)):
    sub = db.query(Subscription).filter(Subscription.id == sub_id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="Langganan tidak ditemukan")

    db.delete(sub)
    db.commit()
    return {"status": "success", "message": f"Langganan '{sub.name}' berhasil dihapus"}
