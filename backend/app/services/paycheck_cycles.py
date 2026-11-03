from datetime import date

from sqlalchemy.orm import Session

from app.models.paycheck import PaycheckCycle, PaycheckSession


def recorded_cycle_ends(db: Session, user_id: int) -> dict[date, date]:
    rows = (
        db.query(PaycheckSession.date, PaycheckCycle.end_date)
        .join(PaycheckCycle, PaycheckCycle.session_id == PaycheckSession.id)
        .filter(PaycheckSession.user_id == user_id, PaycheckSession.status != "cancelled")
        .order_by(PaycheckSession.id)
        .all()
    )
    return dict(rows)
