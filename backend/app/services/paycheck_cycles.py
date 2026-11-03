from datetime import date
import json

from sqlalchemy.orm import Session

from app.models.paycheck import PaycheckCycle, PaycheckReceipt, PaycheckSession
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
    return dict([*rows, *receipts])
