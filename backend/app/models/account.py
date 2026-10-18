from sqlalchemy import Column, Integer, BigInteger, String, DateTime, func
from app.db.session import Base

class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    type = Column(String(30), nullable=False, default="operasional") # operasional, tabungan, investasi, darurat, dll
    tag = Column(String(100), nullable=True) # e.g. "Saku Tambahan", "E-Wallet", dll
    color = Column(String(50), nullable=False, default="amberGold") # amberGold, cyanHub, purpleLock, mintRise, coralFall, blue
    initial_balance = Column(BigInteger, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
