from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.orm import relationship
from app.database import Base


class Reward(Base):
    __tablename__ = "rewards"

    id = Column(Integer, primary_key=True, index=True)
    reward_name = Column(String(120), nullable=False)
    required_point = Column(Float, nullable=False)
    stock = Column(Integer, default=0)
    image = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    redemptions = relationship("RewardRedemption", back_populates="reward")
