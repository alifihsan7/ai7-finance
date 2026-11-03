from datetime import date, timedelta
import json

from sqlalchemy.orm import Session

from app.models.paycheck import LegacyPaycheckCycle, PaycheckCycle, PaycheckReceipt, PaycheckSession
from app.models.transaction import Transaction


def receipt_allocations(db: Session, receipt: PaycheckReceipt):
    allocations = json.loads(receipt.allocations_json)
    ids = [item["transfer_id"] for item in allocations if item["transfer_id"]]
    if not ids:
        return allocations
    amounts = dict(db.query(Transaction.id, Transaction.amount).filter(
        Transaction.id.in_(ids), Transaction.user_id == receipt.user_id, Transaction.type == "transfer_in",
    ).all())
    for item in allocations:
        if item["transfer_id"] in amounts:
            item["amount"] = amounts[item["transfer_id"]]
        else:
            item["transfer_id"] = None
    return allocations


def recorded_cycle_ends(db: Session, user_id: int) -> dict[date, date]:
    rows = (
        db.query(PaycheckSession.date, PaycheckCycle.end_date)
        .join(PaycheckCycle, PaycheckCycle.session_id == PaycheckSession.id)
        .filter(PaycheckSession.user_id == user_id, PaycheckSession.status != "cancelled")
        .order_by(PaycheckSession.id)
        .all()
    )
    receipts = (
        db.query(Transaction.date, PaycheckReceipt.cycle_end)
        .join(Transaction, Transaction.id == PaycheckReceipt.transaction_id)
        .filter(PaycheckReceipt.user_id == user_id, PaycheckReceipt.cycle_end.is_not(None))
        .order_by(Transaction.id)
        .all()
    )
    legacy = db.query(LegacyPaycheckCycle.start_date, LegacyPaycheckCycle.end_date).filter(
        LegacyPaycheckCycle.user_id == user_id,
    ).all()
    return dict([*legacy, *rows, *receipts])


def preserve_legacy_cycles(db: Session, cfg, today: date):
    from app.api.v1.endpoints.analytics import get_monthly_date_bounds

    existing = recorded_cycle_ends(db, cfg.user_id)
    dates = db.query(Transaction.date).filter(
        Transaction.user_id == cfg.user_id,
        Transaction.type == "income",
        Transaction.date <= today,
        ~legacy_cycle_covers(db, cfg.user_id),
        Transaction.category.in_(["Gajian", "Gaji", "Pemasukan", "Uang Saku Ortu", "Income"])
        | Transaction.description.ilike("%gajian%") | Transaction.description.ilike("%pemasukan%"),
    ).distinct()
    for (day,) in dates:
        if day in existing:
            continue
        if cfg.cycle_type == "monthly_date":
            start, end = get_monthly_date_bounds(day, cfg.paycheck_day or 25)
        else:
            start, end = day, day + timedelta(days=max(1, cfg.cycle_days) - 1)
        if start not in existing:
            db.add(LegacyPaycheckCycle(user_id=cfg.user_id, start_date=start, end_date=end))
            existing[start] = end


def legacy_cycle_covers(db: Session, user_id: int):
    return db.query(LegacyPaycheckCycle.start_date).filter(
        LegacyPaycheckCycle.user_id == user_id,
        LegacyPaycheckCycle.start_date <= Transaction.date,
        LegacyPaycheckCycle.end_date >= Transaction.date,
    ).exists()
