from typing import Optional
from datetime import datetime
from pydantic import BaseModel

class CategoryBase(BaseModel):
    name: str
    type: str = "expense"
    color: str = "amberGold"
    icon: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True
