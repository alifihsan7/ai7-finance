from sqlalchemy import Column, Integer, BigInteger, String, DateTime, Date, Boolean, ForeignKey, func
from app.db.session import Base
from app.models.user import User

class Goal(Base):
    __tablename__ = "financial_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, default=1, index=True)
    name = Column(String(100), nullable=False)
    target_amount = Column(BigInteger, nullable=False)
    manual_current_amount = Column(BigInteger, nullable=False, default=0)
    linked_account = Column(String(50), nullable=True)  # e.g. "BRI 2", "Bibit", "BRI 1", or None
    target_date = Column(Date, nullable=True)
    category = Column(String(50), nullable=False, default="Tabungan")  # "Tabungan", "Investasi", "Darurat", "Wishlist"
    icon = Column(String(20), nullable=False, default="🎯")
    color = Column(String(30), nullable=False, default="emerald")  # "emerald", "amber", "cyan", "purple", "rose"
    is_active = Column(Boolean, nullable=False, default=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
