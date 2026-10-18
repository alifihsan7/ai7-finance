from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class AccountBase(BaseModel):
    name: str
    type: str = "operasional"
    tag: Optional[str] = None
    color: str = "amberGold"
    initial_balance: int = 0

class AccountCreate(AccountBase):
    pass

class AccountResponse(AccountBase):
    id: int
    current_balance: int = 0
    created_at: datetime

    class Config:
        from_attributes = True
