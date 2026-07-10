from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime
from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(80), unique=True, nullable=False)
    price = Column(Float, nullable=False)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
