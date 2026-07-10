from datetime import datetime
from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    name: str
    price: float = Field(gt=0)
    description: str | None = None


class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime

    class Config:
        orm_mode = True
