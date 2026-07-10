from pathlib import Path
from typing import List
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    APP_NAME: str = "Smart Waste Management API"
    API_PREFIX: str = "/api/v1"
    MYSQL_USER: str = "root"
    MYSQL_PASSWORD: str = ""
    MYSQL_HOST: str = "127.0.0.1"
    MYSQL_PORT: int = 3306
    MYSQL_DB: str = "smartwaste"
    ALLOWED_ORIGINS: List[str] = ["*"]
    LOG_LEVEL: str = "INFO"
    ADMIN_EMAIL: str = "admin@ecotrash.local"
    ADMIN_PASSWORD: str = "password"
    ADMIN_NAME: str = "Admin Bank Sampah"
    ADMIN_ROLE: str = "Waste Operations"

    @property
    def DATABASE_URL(self) -> str:
        return f"mysql+asyncmy://{self.MYSQL_USER}:{self.MYSQL_PASSWORD}@{self.MYSQL_HOST}:{self.MYSQL_PORT}/{self.MYSQL_DB}"

    class Config:
        env_file = Path(__file__).resolve().parent.parent / ".env"
        env_file_encoding = "utf-8"

settings = Settings()
