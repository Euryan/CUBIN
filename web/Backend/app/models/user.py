from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    nama = Column(String(120), nullable=False)
    rfid_uid = Column(String(64), unique=True, index=True, nullable=False)
    total_point = Column(Float, default=0.0)
    saldo_reward = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    trash_logs = relationship("TrashDetectionLog", back_populates="user", cascade="all, delete-orphan")
    redemptions = relationship("RewardRedemption", back_populates="user", cascade="all, delete-orphan")
