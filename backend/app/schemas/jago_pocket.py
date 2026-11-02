from typing import Optional, List
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict

class JagoPocketBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: str = Field(..., max_length=50)
    target_amount: int = Field(default=0, ge=0)
    is_active: bool = True

class JagoPocketCreate(JagoPocketBase):
    pass

class JagoPocketTargetUpdate(BaseModel):
    id: Optional[int] = None
    slug: Optional[str] = None
    name: Optional[str] = None
    target_amount: int = Field(..., ge=0)
    is_active: Optional[bool] = None

class JagoPocketUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[int] = Field(None, ge=0)
    is_active: Optional[bool] = None

class JagoPocketsBatchUpdate(BaseModel):
    pockets: Optional[List[JagoPocketTargetUpdate]] = None

class JagoPocketItemResponse(BaseModel):
    id: int
    user_id: int
    name: str
    slug: str
    target_amount: int
    spent_amount: int = 0
    remaining_amount: int = 0
    percentage_spent: float = 0.0
    percentage: float = 0.0
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class JagoPocketsSummaryResponse(BaseModel):
    total_jago_balance: int
    total_target_amount: int
    total_spent_amount: int
    total_remaining_amount: int
    cycle_start: Optional[date] = None
    cycle_end: Optional[date] = None
    pockets: List[JagoPocketItemResponse]
    items: List[JagoPocketItemResponse]

    model_config = ConfigDict(from_attributes=True)
