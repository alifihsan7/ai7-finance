from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, Date, func
from app.db.session import Base

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    amount = Column(BigInteger, nullable=False)
    category = Column(String(50), nullable=False, default="Layanan Digital")
    account = Column(String(50), nullable=False, default="Jago")
    billing_cycle = Column(String(20), nullable=False, default="monthly") # 'monthly', 'yearly'
    billing_day = Column(Integer, nullable=False, default=1)              # 1-31
    billing_type = Column(String(20), nullable=False, default="fixed_day") # 'fixed_day', 'exact_date'
    exact_due_date = Column(Date, nullable=True)                          # Specific expiry date
    is_active = Column(Boolean, nullable=False, default=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
