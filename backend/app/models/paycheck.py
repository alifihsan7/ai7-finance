from sqlalchemy import Column, Integer, BigInteger, Float, String, Boolean, DateTime, Date, Text, ForeignKey, func
from app.db.session import Base

class PaycheckConfig(Base):
    __tablename__ = "paycheck_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, default=1, index=True)
    source_account = Column(String(50), nullable=False, default="BRI 1")
    use_gate = Column(Boolean, nullable=False, default=True)
    gate_name = Column(String(50), nullable=False, default="Flip")
    cycle_type = Column(String(30), nullable=False, default="biweekly")
    cycle_days = Column(Integer, nullable=False, default=14)
    pocket_account = Column(String(50), nullable=False, default="Mandiri")
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

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
