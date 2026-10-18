from typing import Optional
from datetime import datetime, date
import zoneinfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case

from app.db.session import get_db
from app.models.transaction import Transaction
from app.schemas.transaction import MonthlySummary, CategorySummary, AccountBalance, DailyTrendItem
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
        daily_trend=daily_trend
    )
