from datetime import datetime
from sqlalchemy import Column, Integer, ForeignKey, DateTime, Float, String
from sqlalchemy.orm import relationship
from app.database import Base


class RewardRedemption(Base):
    __tablename__ = "reward_redemptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    reward_id = Column(Integer, ForeignKey("rewards.id", ondelete="SET NULL"), nullable=True)
    quantity = Column(Integer, default=1)
    total_point = Column(Float, nullable=False)
    status = Column(String(40), default="pending")
    redeemed_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="redemptions")
    reward = relationship("Reward", back_populates="redemptions")
