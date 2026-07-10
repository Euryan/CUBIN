from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel


class UserBase(BaseModel):
    nama: str
    rfid_uid: str


class UserRFIDUpdateRequest(BaseModel):
    rfid_uid: str


class UserResponse(UserBase):
    id: int
    username: Optional[str] = None
    email: Optional[str] = None
    total_point: Optional[float] = 0.0
    saldo_reward: Optional[float] = 0.0
    created_at: Optional[datetime] = None

    class Config:
        orm_mode = True


class UserLeaderboard(BaseModel):
    id: int
    nama: str
    total_point: float

    class Config:
        orm_mode = True


class UserHistoryItem(BaseModel):
    id: int
    category: str
    weight: float
    point: float
    price: float
    confidence_ai: float
    created_at: datetime

    class Config:
        orm_mode = True


class UserHistoryResponse(BaseModel):
    user: UserResponse
    history: List[UserHistoryItem]
