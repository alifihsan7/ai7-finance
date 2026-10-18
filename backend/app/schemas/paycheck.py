from pydantic import BaseModel
from typing import List, Optional, Dict
from datetime import date as dt_date, datetime

class PaycheckConfigOut(BaseModel):
    id: int
    source_account: str
    use_gate: bool
    gate_name: str
    is_active: bool

    class Config:
        from_attributes = True

class PaycheckConfigUpdate(BaseModel):
    source_account: str
    use_gate: bool
    gate_name: str

class PaycheckBucketBase(BaseModel):
    account: str
    percentage: float
    fixed_amount: Optional[int] = None
    via_gate: bool = False
    via_secondary: Optional[str] = None
    purpose: str
    sort_order: int = 0

class PaycheckBucketOut(PaycheckBucketBase):
    id: int

    class Config:
        from_attributes = True

class PaycheckStep(BaseModel):
    id: str
    phase: int
    app: str
    title: str
    badge: Optional[str] = None
    description: str
    source_account: str
    target_account: str
    amount: int
    is_done: bool = False
    is_auto: bool = False
    creates_income: bool = True
    transaction_id: Optional[int] = None

class PaycheckSessionOut(BaseModel):
    id: int
    total_amount: int
    date: dt_date
    status: str
    note: Optional[str] = None
    steps: List[PaycheckStep]
    completed_steps: int
    total_steps: int
    progress_percentage: float
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class PaycheckStartRequest(BaseModel):
    total_amount: int = 1500000
    date: Optional[dt_date] = None
    note: Optional[str] = "Uang Saku Ortu 2-Mingguan"
    allocations: Optional[Dict[str, int]] = None  # Custom adjusted amounts: {"Mandiri": 825000, ...}
