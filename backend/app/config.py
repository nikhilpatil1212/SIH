from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

    PROJECT_NAME: str = "ध्रुव सारथी · Antarctic AI Nav Engine"
    API_V1_STR: str = "/api"
    ENVIRONMENT: str = "DEVELOPMENT"  # "SIMULATION" | "DEVELOPMENT" | "LIVE"
    DATABASE_URL: str = "sqlite:///./polar_nav.db"
    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173", "*"]
    
    DEFAULT_VESSEL_SPEED_KN: float = 14.0
    DEFAULT_FUEL_BURN_PER_DAY_T: float = 16.5

settings = Settings()
