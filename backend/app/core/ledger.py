from sqlalchemy import case

from app.models.transaction import Transaction

POSITIVE_TYPES = ("income", "transfer_in", "adjustment_in")
NEGATIVE_TYPES = ("expense", "transfer_out", "adjustment_out")


def signed_amount():
    return case(
        (Transaction.type.in_(POSITIVE_TYPES), Transaction.amount),
        (Transaction.type.in_(NEGATIVE_TYPES), -Transaction.amount),
        else_=0,
    )
