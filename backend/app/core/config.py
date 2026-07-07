import os
import json
from pathlib import Path
from pydantic_settings import BaseSettings
from pydantic import Field

SETTINGS_DIR = Path(__file__).parent
SETTINGS_FILE = SETTINGS_DIR / "settings.json"

class AppSettings(BaseSettings):
    database_url: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/postgres",
        validation_alias="DATABASE_URL"
    )
    ollama_url: str = Field(
        default="http://localhost:11434",
        validation_alias="OLLAMA_URL"
    )
    ollama_model: str = Field(
        default="qwen2.5:1.5b",
        validation_alias="OLLAMA_MODEL"
    )
    ollama_temperature: float = Field(
        default=0.0,
        validation_alias="OLLAMA_TEMPERATURE"
    )

    class Config:
        env_file = ".env"
        extra = "ignore"

def get_settings() -> AppSettings:
    """Loads configuration settings from local settings.json if present, falling back to environment variables."""
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r") as f:
                data = json.load(f)
                return AppSettings(**data)
        except Exception:
            pass
    return AppSettings()

def save_settings(settings: AppSettings) -> None:
    """Persists configuration settings to local settings.json."""
    SETTINGS_DIR.mkdir(parents=True, exist_ok=True)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(settings.model_dump(), f, indent=4)
