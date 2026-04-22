"""Верификация Telegram WebApp.initData.

Алгоритм из официальной доки: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app

1. init_data — query-string с полями user, auth_date, chat_instance, hash и т.д.
2. Берём все поля кроме `hash`, сортируем по ключу, склеиваем через '\n'
   в формате k=v.
3. secret = HMAC_SHA256("WebAppData", bot_token).
4. computed_hash = HMAC_SHA256(secret, data_check).hexdigest().
5. Сравниваем с пришедшим hash в constant-time.

auth_date (unix-сек) — защита от replay старых ссылок. По умолчанию 1 час.
"""

from __future__ import annotations

import hashlib
import hmac
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from urllib.parse import parse_qsl


class TelegramAuthError(Exception):
    """Подпись неверна, просрочена или initData повреждена."""


@dataclass(frozen=True)
class TelegramUser:
    id: int
    first_name: str
    last_name: str | None
    username: str | None
    language_code: str | None


def verify_init_data(
    init_data: str,
    bot_token: str,
    *,
    max_age_seconds: int = 3600,
    now: datetime | None = None,
) -> TelegramUser:
    """Проверить подпись и вернуть пользователя. Бросает TelegramAuthError."""
    if not bot_token:
        raise TelegramAuthError("bot token not configured")
    if not init_data:
        raise TelegramAuthError("empty init_data")

    try:
        pairs = dict(parse_qsl(init_data, strict_parsing=True, keep_blank_values=True))
    except ValueError as exc:
        raise TelegramAuthError(f"malformed init_data: {exc}") from exc

    received_hash = pairs.pop("hash", None)
    if not received_hash:
        raise TelegramAuthError("no hash in init_data")

    data_check = "\n".join(f"{key}={pairs[key]}" for key in sorted(pairs))
    secret_key = hmac.new(b"WebAppData", bot_token.encode("utf-8"), hashlib.sha256).digest()
    computed = hmac.new(secret_key, data_check.encode("utf-8"), hashlib.sha256).hexdigest()

    if not hmac.compare_digest(computed, received_hash):
        raise TelegramAuthError("signature mismatch")

    auth_date_raw = pairs.get("auth_date", "0")
    try:
        auth_ts = int(auth_date_raw)
    except ValueError as exc:
        raise TelegramAuthError("auth_date is not an integer") from exc

    current = now or datetime.now(UTC)
    if current.timestamp() - auth_ts > max_age_seconds:
        raise TelegramAuthError("init_data expired")

    user_json = pairs.get("user")
    if not user_json:
        raise TelegramAuthError("no user field in init_data")
    try:
        user_data: dict[str, Any] = json.loads(user_json)
    except json.JSONDecodeError as exc:
        raise TelegramAuthError("user field is not valid JSON") from exc

    try:
        user_id = int(user_data["id"])
    except (KeyError, ValueError, TypeError) as exc:
        raise TelegramAuthError("user.id missing or invalid") from exc

    return TelegramUser(
        id=user_id,
        first_name=str(user_data.get("first_name", "")),
        last_name=user_data.get("last_name"),
        username=user_data.get("username"),
        language_code=user_data.get("language_code"),
    )
