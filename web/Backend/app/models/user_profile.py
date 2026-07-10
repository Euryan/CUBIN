from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from app.database import Base


class UserProfile(Base):
    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    username = Column(String(120), unique=True, nullable=False, index=True)
    email = Column(String(180), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
