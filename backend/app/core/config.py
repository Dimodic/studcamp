"""Конфигурация приложения.

Использует pydantic-settings (официальный путь FastAPI для настроек):
https://fastapi.tiangolo.com/advanced/settings/.

Переменные окружения — с префиксом `STUDCAMP_`.
"""

from __future__ import annotations

from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[3]
DEFAULT_SEED_PATH = PROJECT_ROOT / "backend" / "seeds" / "initial_data.json"


def _split_csv(raw: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in raw.split(",") if item.strip())


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="STUDCAMP_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    app_name: str = "Studcamp API"
    environment: str = "development"
    database_url: str = "sqlite:///./studcamp.db"
    api_v1_prefix: str = "/api/v1"
    # CSV-список. В продовом STUDCAMP_ENV=production пустой список приводит
    # к fail-fast в main.py (нельзя случайно пустить `*` + allow_credentials).
    cors_origins_raw: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        alias="STUDCAMP_CORS_ORIGINS",
    )
    session_ttl_hours: int = 24
    timezone: str = "Europe/Moscow"
    seed_path: str = str(DEFAULT_SEED_PATH)

    # LLM-guardrails (см. routes/llm.py и routes/admin/attendance.py).
    llm_timeout_seconds: float = 30.0
    llm_max_upload_bytes: int = 10 * 1024 * 1024  # 10 MiB суммарно по всем attachments

    # Rate-limit для публичных endpoint'ов, без внешних зависимостей (in-memory).
    login_rate_limit_per_minute: int = 10
    llm_rate_limit_per_minute: int = 20

    # Telegram WebApp (см. core/telegram_auth.py и services/telegram_membership.py).
    # Если bot_token пуст — endpoint /auth/telegram вернёт 503 (фича отключена).
    telegram_bot_token: str = ""
    # Для супергрупп — отрицательный id вида -100xxxxxxxxxx. 0 = не настроено.
    telegram_group_id: int = 0
    # initData с auth_date старше этого лимита считается протухшей.
    telegram_auth_max_age_seconds: int = 3600

    @property
    def cors_origins(self) -> tuple[str, ...]:
        return _split_csv(self.cors_origins_raw)

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in {"production", "prod"}


settings = Settings()
