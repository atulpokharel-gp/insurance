from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import Optional
import os

class Settings(BaseSettings):
    secret_key: str = "your-secret-key-here-change-in-production"
    encryption_key: Optional[str] = None
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    database_url: str = "sqlite:///./gautam_insurance.db"
    backup_database_url: str = "sqlite:///./gautam_insurance_backup.db"
    backup_sync_interval_minutes: int = 60
    admin_username: str = "admin"
    admin_password: str = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/J9eHCO6e7m"
    advisor_default_password: str = "advisor123"
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
