"""
Configuration module for the POLAR-EMS ML Service.
Loads settings from environment variables using Pydantic Settings.
"""

from pathlib import Path
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Service Network Configuration
    ML_SERVICE_HOST: str = "0.0.0.0"
    ML_SERVICE_PORT: int = 8001
    
    # Database Configuration (Neon PostgreSQL)
    DATABASE_URL: Optional[str] = None
    
    # Model Storage & Thresholds
    MODEL_STORAGE_PATH: str = "./trained_models"
    MIN_TRAINING_OBSERVATIONS: int = 168  # Minimum 1 week of hourly observations (168h) for reliable training
    DEFAULT_FORECAST_HORIZON_HOURS: int = 24
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    model_config = SettingsConfigDict(
        env_file=(".env", "../.env.local", "../backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def model_dir(self) -> Path:
        path = Path(self.MODEL_STORAGE_PATH)
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()
