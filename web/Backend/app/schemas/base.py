from datetime import datetime
from pydantic import BaseModel


class TimestampModel(BaseModel):
    created_at: datetime

    class Config:
        orm_mode = True
