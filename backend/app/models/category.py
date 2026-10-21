from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, func, UniqueConstraint
from app.db.session import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, default=1, index=True)
    name = Column(String(50), nullable=False)
    type = Column(String(20), nullable=False, default="expense") # expense, income
    color = Column(String(50), nullable=False, default="amberGold")
    icon = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('user_id', 'name', 'type', name='uq_user_category_name_type'),
    )
