from typing import Optional
from datetime import datetime, date, timedelta
import zoneinfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, desc

from app.db.session import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import (
    MonthlySummary,
    CategorySummary,
    AccountBalance,
    DailyTrendItem,
    CycleBurnDay,
    SafeToSpendInfo,
)
from app.core.config import settings

router = APIRouter()
WIB = zoneinfo.ZoneInfo(settings.TIMEZONE)

@router.get("/summary", response_model=MonthlySummary)
def get_monthly_summary(
    month: Optional[str] = Query(None, description="Format YYYY-MM"),
    db: Session = Depends(get_db)
):
    now_wib = datetime.now(WIB)
    if not month:
        yr = now_wib.year
        mo = now_wib.month
        month_str = f"{yr:04d}-{mo:02d}"
    else:
        try:
            yr, mo = map(int, month.split("-"))
            month_str = f"{yr:04d}-{mo:02d}"
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid month format, use YYYY-MM")

    start_date = date(yr, mo, 1)
    end_date = date(yr + 1, 1, 1) if mo == 12 else date(yr, mo + 1, 1)

    # Monthly totals (income and expense)
    totals = db.query(
        Transaction.type,
        func.coalesce(func.sum(Transaction.amount), 0).label("total")
    ).filter(
        Transaction.date >= start_date,
        Transaction.date < end_date
    ).group_by(Transaction.type).all()

    income_total = 0
    expense_total = 0
    for r in totals:
        if r.type == "income":
            income_total = int(r.total)
        elif r.type == "expense":
            expense_total = int(r.total)

    net_total = income_total - expense_total
    savings_rate = round((net_total / income_total * 100), 1) if income_total > 0 else 0.0

    # Expense by category
    cat_rows = db.query(
        Transaction.category,
        func.sum(Transaction.amount).label("total"),
        func.count(Transaction.id).label("count")
    ).filter(
        Transaction.date >= start_date,
        Transaction.date < end_date,
        Transaction.type == "expense"
    ).group_by(Transaction.category).order_by(func.sum(Transaction.amount).desc()).all()

    categories = []
    for c in cat_rows:
        tot = int(c.total)
        pct = round((tot / expense_total * 100), 1) if expense_total > 0 else 0.0
        categories.append(CategorySummary(
            category=c.category,
            total=tot,
            count=c.count,
            percentage=pct
        ))

    # All-time account balances
    acc_rows = db.query(
        Transaction.account,
        func.sum(
            case((Transaction.type == "income", Transaction.amount), else_=-Transaction.amount)
        ).label("balance")
    ).group_by(Transaction.account).order_by(func.sum(
        case((Transaction.type == "income", Transaction.amount), else_=-Transaction.amount)
    ).desc()).all()

    accounts = [AccountBalance(account=a.account, balance=int(a.balance or 0)) for a in acc_rows]
    total_balance = sum(a.balance for a in accounts)

    # Daily trend in current month
    trend_rows = db.query(
        Transaction.date,
        func.sum(case((Transaction.type == "income", Transaction.amount), else_=0)).label("income"),
        func.sum(case((Transaction.type == "expense", Transaction.amount), else_=0)).label("expense")
    ).filter(
        Transaction.date >= start_date,
        Transaction.date < end_date
    ).group_by(Transaction.date).order_by(Transaction.date.asc()).all()

    daily_trend = [
        DailyTrendItem(
            date=str(t.date),
            income=int(t.income or 0),
            expense=int(t.expense or 0)
        ) for t in trend_rows
    ]

    # 14-day cycle calculation anchored to latest paycheck or current date
    latest_paycheck = db.query(Transaction).filter(
        Transaction.type == "income",
        (Transaction.category == "Uang Saku Ortu") | (Transaction.description.ilike("%gajian%"))
    ).order_by(desc(Transaction.date), desc(Transaction.id)).first()

    today_wib = now_wib.date()
    if latest_paycheck:
        cycle_start = latest_paycheck.date
    else:
        cycle_start = today_wib

    cycle_end = cycle_start + timedelta(days=13)
    days_passed = (today_wib - cycle_start).days + 1
    day_of_cycle = min(14, max(1, days_passed))
    days_remaining = max(1, 14 - day_of_cycle + 1)

    pocket_budget = 825000  # Standar jatah saku Mandiri 14 hari
    
    mandiri_spent_row = db.query(
        func.coalesce(func.sum(Transaction.amount), 0).label("spent")
    ).filter(
        Transaction.account == "Mandiri",
        Transaction.type == "expense",
        Transaction.date >= cycle_start,
        Transaction.date <= cycle_end
    ).first()
    pocket_spent = int(mandiri_spent_row.spent if mandiri_spent_row else 0)
    pocket_remaining = max(0, pocket_budget - pocket_spent)
    safe_daily = int(pocket_remaining / days_remaining)

    ideal_daily_rate = pocket_budget / 14
    ideal_pace_today = int(ideal_daily_rate * day_of_cycle)

    if pocket_spent < ideal_pace_today * 0.9:
        pace_status = "ahead"
    elif pocket_spent <= ideal_pace_today * 1.1:
        pace_status = "on_track"
    else:
        pace_status = "warning"

    daily_mandiri_rows = db.query(
        Transaction.date,
        func.coalesce(func.sum(Transaction.amount), 0).label("spent")
    ).filter(
        Transaction.account == "Mandiri",
        Transaction.type == "expense",
        Transaction.date >= cycle_start,
        Transaction.date <= cycle_end
    ).group_by(Transaction.date).all()
    spent_by_date = {str(r.date): int(r.spent) for r in daily_mandiri_rows}

    burn_chart = []
    cumulative = 0
    for d in range(1, 15):
        day_date = cycle_start + timedelta(days=d-1)
        day_str = str(day_date)
        day_spent = spent_by_date.get(day_str, 0)
        
        if day_date <= today_wib:
            cumulative += day_spent
            burn_chart.append(CycleBurnDay(
                day=d,
                date=day_str,
                spent=day_spent,
                cumulative_spent=cumulative,
                ideal_pace=int(ideal_daily_rate * d)
            ))
        else:
            burn_chart.append(CycleBurnDay(
                day=d,
                date=day_str,
                spent=0,
                cumulative_spent=cumulative,
                ideal_pace=int(ideal_daily_rate * d)
            ))

    safe_info = SafeToSpendInfo(
        cycle_start=cycle_start,
        cycle_end=cycle_end,
        day_of_cycle=day_of_cycle,
        days_remaining=days_remaining,
        pocket_budget=pocket_budget,
        pocket_spent=pocket_spent,
        pocket_remaining=pocket_remaining,
        safe_daily=safe_daily,
        pace_status=pace_status,
        ideal_pace_today=ideal_pace_today,
        burn_chart=burn_chart
    )

    return MonthlySummary(
        month=month_str,
        year=yr,
        month_num=mo,
        income=income_total,
        expense=expense_total,
        net=net_total,
        savings_rate=savings_rate,
        categories=categories,
        accounts=accounts,
        total_balance=total_balance,
        daily_trend=daily_trend,
        safe_to_spend=safe_info
    )
