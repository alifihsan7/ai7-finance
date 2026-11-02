from typing import Optional, List, Any, Set
from datetime import datetime, date
from pydantic import BaseModel, Field, ConfigDict, model_validator, field_validator

VALID_POCKET_ROLES: Set[str] = {
    "operasional",
    "tagihan",
    "darurat",
    "tabungan",
    "investasi",
}


class JagoPocketBase(BaseModel):
    name: str = Field(..., max_length=100)
    slug: Optional[str] = Field(default=None, max_length=50)
    account_id: Optional[int] = None
    role: str = Field(default="operasional", max_length=30)
    target_amount: int = Field(default=0, ge=0)
    is_active: bool = True

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, v: Optional[str]) -> str:
        if not v:
            return "operasional"
        normalized = str(v).strip().lower()
        if normalized not in VALID_POCKET_ROLES:
            raise ValueError(f"Role kantong tidak valid. Pilihan: {', '.join(sorted(VALID_POCKET_ROLES))}")
        return normalized


class JagoPocketCreate(BaseModel):
    account_id: Optional[int] = None
    name: str = Field(..., min_length=1, max_length=100)
    target_amount: int = Field(default=0, ge=0)
    role: str = Field(default="operasional", max_length=30)
    slug: Optional[str] = Field(default=None, max_length=50)
    is_active: bool = True

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, v: Optional[str]) -> str:
        if not v:
            return "operasional"
        normalized = str(v).strip().lower()
        if normalized not in VALID_POCKET_ROLES:
            raise ValueError(f"Role kantong tidak valid. Pilihan: {', '.join(sorted(VALID_POCKET_ROLES))}")
        return normalized


# Universal alias for creation
PocketCreate = JagoPocketCreate


class JagoPocketTargetUpdate(BaseModel):
    id: Optional[int] = None
    slug: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    account_id: Optional[int] = None
    target_amount: int = Field(..., ge=0)
    is_active: Optional[bool] = None

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        normalized = str(v).strip().lower()
        if normalized not in VALID_POCKET_ROLES:
            raise ValueError(f"Role kantong tidak valid. Pilihan: {', '.join(sorted(VALID_POCKET_ROLES))}")
        return normalized


class JagoPocketUpdate(BaseModel):
    name: Optional[str] = None
    target_amount: Optional[int] = Field(None, ge=0)
    role: Optional[str] = None
    account_id: Optional[int] = None
    is_active: Optional[bool] = None

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        normalized = str(v).strip().lower()
        if normalized not in VALID_POCKET_ROLES:
            raise ValueError(f"Role kantong tidak valid. Pilihan: {', '.join(sorted(VALID_POCKET_ROLES))}")
        return normalized


# Universal alias for update
PocketUpdate = JagoPocketUpdate


class JagoPocketsBatchUpdate(BaseModel):
    pockets: Optional[List[JagoPocketTargetUpdate]] = None


class JagoPocketItemResponse(BaseModel):
    id: int
    user_id: int
    account_id: Optional[int] = None
    account_name: Optional[str] = None
    name: str
    slug: str
    role: str = "operasional"
    target_amount: int
    spent_amount: int = 0
    remaining_amount: int = 0
    percentage_spent: float = 0.0
    percentage: float = 0.0
    is_active: bool = True
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# Universal aliases for single response
PocketResponse = JagoPocketItemResponse
PocketItemResponse = JagoPocketItemResponse


class JagoPocketsSummaryResponse(BaseModel):
    account_id: Optional[int] = None
    account_name: Optional[str] = None
    total_jago_balance: int = 0
    total_pocket_balance: int = 0
    total_target_amount: int = 0
    total_spent_amount: int = 0
    total_remaining_amount: int = 0
    cycle_start: Optional[date] = None
    cycle_end: Optional[date] = None
    pockets: List[JagoPocketItemResponse] = Field(default_factory=list)
    items: List[JagoPocketItemResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode="before")
    @classmethod
    def sync_pocket_balances(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "total_pocket_balance" not in data or data["total_pocket_balance"] is None:
                data["total_pocket_balance"] = data.get("total_jago_balance", 0)
            if "total_jago_balance" not in data or data["total_jago_balance"] is None:
                data["total_jago_balance"] = data.get("total_pocket_balance", 0)
        return data


# Universal alias for summary response
PocketSummaryResponse = JagoPocketsSummaryResponse
