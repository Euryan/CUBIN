from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class RewardBase(BaseModel):
    reward_name: str
    required_point: float = Field(gt=0)
    stock: int = Field(ge=0)
    image: Optional[str] = None


class RewardResponse(RewardBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True


class RewardCreateRequest(RewardBase):
    pass


class RewardUpdateRequest(RewardBase):
    pass


class RedeemRequest(BaseModel):
    rfid_uid: str
    reward_id: int
    quantity: int = 1


class RedeemHistoryItem(BaseModel):
    id: int
    reward_id: Optional[int]
    reward_name: Optional[str] = None
    quantity: int
    total_point: float
    status: str
    redeemed_at: datetime
    remaining_points: Optional[float] = None
    remaining_balance: Optional[float] = None

    class Config:
        orm_mode = True


class RewardRedemptionResponse(BaseModel):
    user_id: int
    reward: RewardResponse
    quantity: int
    total_point: float
    status: str
    redeemed_at: datetime

    class Config:
        orm_mode = True
