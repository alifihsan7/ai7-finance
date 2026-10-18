from typing import Optional, List
from datetime import date as dt_date, datetime as dt_datetime
from pydantic import BaseModel

class TransactionBase(BaseModel):
    type: str
    amount: int
    account: str
    category: str
    description: str
    date: Optional[dt_date] = None

class TransactionCreate(TransactionBase):
    pass

class TransactionOut(TransactionBase):
    id: int
    raw_text: Optional[str] = None
    created_at: dt_datetime

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

class PaycheckRequest(BaseModel):
    total_amount: int = 1500000
    date: Optional[dt_date] = None
    note: Optional[str] = "Uang Saku Ortu 2-Mingguan"

class PaycheckAllocationItem(BaseModel):
    account: str
    amount: int
    percentage: float
    purpose: str

class PaycheckResponse(BaseModel):
    success: bool
    total_amount: int
    cycle_start: dt_date
    cycle_end: dt_date
    allocations: List[PaycheckAllocationItem]
    created_transactions: List[TransactionOut]
