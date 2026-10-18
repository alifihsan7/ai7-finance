from sqlalchemy import Column, Integer, BigInteger, String, Text, Date, DateTime, func
from app.db.session import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(20), nullable=False, index=True)      # 'expense' or 'income'
    amount = Column(BigInteger, nullable=False)
    account = Column(String(50), nullable=False, index=True)   # 'BCA', 'GoPay', 'Cash', etc.
    category = Column(String(100), nullable=False, index=True) # 'Makanan & Minuman', etc.
    description = Column(String(255), nullable=False)
    raw_text = Column(Text, nullable=True)
    date = Column(Date, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
