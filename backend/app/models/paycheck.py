from typing import Optional
from sqlalchemy import Column, Integer, BigInteger, Float, String, Boolean, DateTime, Date, Text, ForeignKey, UniqueConstraint, func
from app.db.session import Base
from app.models.user import User

class PaycheckConfig(Base):
    __tablename__ = "paycheck_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, default=1, index=True)
    source_account = Column(String(50), nullable=False, default="BRI 1")
    use_gate = Column(Boolean, nullable=False, default=True)
    gate_name = Column(String(50), nullable=False, default="Perantara transfer")
    cycle_type = Column(String(30), nullable=False, default="biweekly")
    cycle_days = Column(Integer, nullable=False, default=14)
    paycheck_day = Column(Integer, nullable=True, default=25)
    cycle_start_date = Column(Date, nullable=True)
    pocket_account = Column(String(50), nullable=False, default="Mandiri")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    @property
    def main_income_account(self) -> str:
        return self.source_account

    @main_income_account.setter
    def main_income_account(self, value: str):
        self.source_account = value

    @property
    def total_salary(self) -> Optional[int]:
        return None

class PaycheckBucket(Base):
    __tablename__ = "paycheck_buckets"

    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(Integer, nullable=False, default=1, index=True)
    account = Column(String(50), nullable=False, index=True)
    percentage = Column(Float, nullable=False)
    fixed_amount = Column(BigInteger, nullable=True)
    via_gate = Column(Boolean, nullable=False, default=False)
    via_secondary = Column(String(50), nullable=True)
    purpose = Column(String(255), nullable=False)
    category = Column(String(100), nullable=False, default="Gajian")
    sort_order = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

class PaycheckSession(Base):
    __tablename__ = "paycheck_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, default=1, index=True)
    total_amount = Column(BigInteger, nullable=False)
    date = Column(Date, nullable=False, index=True)
    status = Column(String(30), nullable=False, default="in_progress", index=True) # in_progress, completed, cancelled
    note = Column(String(255), nullable=True)
    steps_json = Column(Text, nullable=False) # JSON array of Step objects
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)


class PaycheckCycle(Base):
    __tablename__ = "paycheck_cycles"

    session_id = Column(Integer, ForeignKey("paycheck_sessions.id", ondelete="CASCADE"), primary_key=True)
    end_date = Column(Date, nullable=False)


class LegacyPaycheckCycle(Base):
    __tablename__ = "legacy_paycheck_cycles"

    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    start_date = Column(Date, primary_key=True)
    end_date = Column(Date, nullable=False)


class PaycheckReceipt(Base):
    __tablename__ = "paycheck_receipts"
    __table_args__ = (UniqueConstraint("user_id", "request_key"),)

    transaction_id = Column(Integer, ForeignKey("transactions.id", ondelete="CASCADE"), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    request_key = Column(String(36), nullable=False)
    cycle_end = Column(Date, nullable=True)
    allocations_json = Column(Text, nullable=False)
