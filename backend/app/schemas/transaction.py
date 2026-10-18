from typing import Optional, List
from datetime import date, datetime
from pydantic import BaseModel

class TransactionBase(BaseModel):
    type: str
    amount: int
    account: str
    category: str
    description: str
    date: Optional[date] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionOut(TransactionBase):
    id: int
    raw_text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CategorySummary(BaseModel):
    category: str
    total: int
    count: int
    percentage: float

class AccountBalance(BaseModel):
    account: str
    balance: int

class DailyTrendItem(BaseModel):
    date: str
    income: int
    expense: int

class MonthlySummary(BaseModel):
    month: str
    year: int
    month_num: int
    income: int
    expense: int
    net: int
    savings_rate: float
    categories: List[CategorySummary]
    accounts: List[AccountBalance]
    total_balance: int
    daily_trend: List[DailyTrendItem]
