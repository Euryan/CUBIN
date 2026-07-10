from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class TrashCreateRequest(BaseModel):
    rfid_uid: str
    category: str
    weight: float = Field(gt=0)
    confidence_ai: float = Field(ge=0, le=100)


class HardwareDetectRequest(BaseModel):
    """Request dari hardware/IoT device (cobaconnect.py)."""
    class_index: int = Field(ge=0, le=10, description="Index class dari model AI (0=idle, 1=Plastik, 2=Kaleng, 3=Kertas, 4=Kaca)")
    confidence_ai: float = Field(ge=0, le=100, description="Confidence score dalam persen (0-100)")
    weight: float = Field(gt=0, description="Berat sampah dalam kg")
    rfid_uid: Optional[str] = Field(None, description="RFID UID user (opsional)")
    location: Optional[str] = Field(None, description="Lokasi hardware/bin")
    hardware_id: Optional[str] = Field(None, description="ID unik hardware unit")


class TrashResponse(BaseModel):
    id: int
    user_id: int
    category: str
    weight: float
    point: float
    price: float
    confidence_ai: float
    created_at: datetime

    class Config:
        orm_mode = True


class TrashSummary(BaseModel):
    total_entries: int
    total_weight: float
    total_points: float
    total_plastic: float
    total_organic: float
    total_metal: float
    total_paper: float

