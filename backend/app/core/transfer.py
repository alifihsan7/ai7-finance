import re
from typing import Optional
from sqlalchemy.orm import Session
from app.models.transaction import Transaction

def find_paired_transfer(db: Session, tx: Transaction) -> Optional[Transaction]:
    """
    Finds the paired counterpart transaction for a transfer_out or transfer_in record.
    Operates deterministically using:
    1. Explicit pair_id tag stored in raw_text ('[pair_id:123]')
    2. Adjacent sequence ID (tx.id + 1 for out, tx.id - 1 for in)
    3. Counterpart candidate with matching date, amount, user, and closest ID
    """
    if tx.type not in ("transfer_out", "transfer_in"):
        return None

    target_type = "transfer_in" if tx.type == "transfer_out" else "transfer_out"

    # 1. Explicit pair_id tag lookup
    if tx.raw_text:
        match = re.search(r'\[pair_id:(\d+)\]', tx.raw_text)
        if match:
            pair_id = int(match.group(1))
            pair = db.query(Transaction).filter(
                Transaction.id == pair_id,
                Transaction.user_id == tx.user_id,
                Transaction.type == target_type,
                Transaction.amount == tx.amount
            ).first()
            if pair:
                return pair

    # 2. Adjacent ID lookup
    adjacent_id = tx.id + 1 if tx.type == "transfer_out" else tx.id - 1
    adjacent_pair = db.query(Transaction).filter(
        Transaction.id == adjacent_id,
        Transaction.user_id == tx.user_id,
        Transaction.type == target_type,
        Transaction.amount == tx.amount
    ).first()
    if adjacent_pair:
        return adjacent_pair

    # 3. Candidate fallback: same user, counterpart type, exact amount, date, and category 'Transfer'
    candidates = db.query(Transaction).filter(
        Transaction.user_id == tx.user_id,
        Transaction.type == target_type,
        Transaction.amount == tx.amount,
        Transaction.date == tx.date,
        Transaction.category == "Transfer"
    ).all()

    if candidates:
        candidates.sort(key=lambda c: abs(c.id - tx.id))
        return candidates[0]

    return None
