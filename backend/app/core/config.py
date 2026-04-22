from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SEED_PATH = PROJECT_ROOT / "backend" / "seeds" / "initial_data.json"


@dataclass(frozen=True)
class Settings:
    app_name: str = os.getenv("STUDCAMP_APP_NAME", "Studcamp API")
    environment: str = os.getenv("STUDCAMP_ENV", "development")
    database_url: str = os.getenv(
        "STUDCAMP_DATABASE_URL",
        "sqlite:///./studcamp.db",
    )
    api_v1_prefix: str = "/api/v1"
    cors_origins: tuple[str, ...] = tuple(
        origin.strip()
        for origin in os.getenv(
            "STUDCAMP_CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173",
        ).split(",")
        if origin.strip()
    )
    session_ttl_hours: int = int(os.getenv("STUDCAMP_SESSION_TTL_HOURS", "24"))
    timezone: str = os.getenv("STUDCAMP_TIMEZONE", "Europe/Moscow")
    seed_path: str = os.getenv("STUDCAMP_SEED_PATH", str(DEFAULT_SEED_PATH))


settings = Settings()
