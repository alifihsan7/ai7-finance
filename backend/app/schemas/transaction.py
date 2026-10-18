from typing import Optional, List
from datetime import date as dt_date, datetime as dt_datetime
from pydantic import BaseModel, Field

class TransactionBase(BaseModel):
    type: str
    amount: int
    account: str
    category: str
    description: str
    date: Optional[dt_date] = None

class TransactionCreate(TransactionBase):
    amount: int = Field(..., gt=0, description="Nominal transaksi wajib lebih besar dari 0")

class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[int] = Field(None, gt=0, description="Nominal transaksi wajib lebih besar dari 0")
    account: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[dt_date] = None

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
    expense: Optional[int] = 0

class DailyTrendItem(BaseModel):
    date: str
    income: int
    expense: int

class CycleBurnDay(BaseModel):
    day: int
    date: str
    spent: int
    cumulative_spent: int
    ideal_pace: int

class SafeToSpendInfo(BaseModel):
    cycle_start: dt_date
    cycle_end: dt_date
    cycle_type: Optional[str] = "biweekly"
    cycle_days: Optional[int] = 14
    pocket_account: Optional[str] = "Mandiri"
    day_of_cycle: int
    days_remaining: int
    pocket_budget: int
    pocket_spent: int
    pocket_remaining: int
    safe_daily: int
    pace_status: str
    ideal_pace_today: int
    burn_chart: List[CycleBurnDay]

class MonthlySummary(BaseModel):
    period_type: str = "cycle"  # cycle | week | month | custom
    period_label: str = ""
    start_date: str
    end_date: str
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
    safe_to_spend: Optional[SafeToSpendInfo] = None

class PaycheckRequest(BaseModel):
    total_amount: int = 1500000
    date: Optional[dt_date] = None
    note: Optional[str] = "Alokasi Gajian Siklus"

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

class TransferCreate(BaseModel):
    from_account: str
    to_account: str
    amount: int = Field(..., gt=0, description="Nominal transfer wajib lebih besar dari 0")
    description: Optional[str] = "Transfer Antar Rekening"
    date: Optional[dt_date] = None

class TransferResponse(BaseModel):
    status: str
    from_account: str
    to_account: str
    amount: int
    out_transaction_id: int
    in_transaction_id: int
    date: dt_date
