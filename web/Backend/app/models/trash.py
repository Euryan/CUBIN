from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class TrashDetectionLog(Base):
    __tablename__ = "trash_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    category = Column(String(80), nullable=False)
    weight = Column(Float, nullable=False)
    point = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    confidence_ai = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="trash_logs")
