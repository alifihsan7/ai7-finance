from sqlalchemy import Column, Integer, BigInteger, String, Boolean, DateTime, ForeignKey, UniqueConstraint, Index, func
from sqlalchemy.orm import relationship
from app.db.session import Base
from app.models.user import User

class JagoPocket(Base):
    __tablename__ = "jago_pockets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, default=1, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True, index=True)
    subscription_id = Column(Integer, ForeignKey("subscriptions.id", ondelete="RESTRICT"), nullable=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(50), nullable=False, index=True)
    role = Column(String(30), nullable=False, default="operasional")  # operasional, tagihan, darurat, tabungan, investasi
    target_amount = Column(BigInteger, nullable=False, default=0)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    account = relationship("Account", back_populates="pockets")

    __table_args__ = (
        UniqueConstraint("user_id", "slug", name="uq_jago_pockets_user_slug"),
        Index("uq_pocket_subscription", "user_id", "subscription_id", unique=True),
    )

# Universal alias for Virtual Pockets
Pocket = JagoPocket
