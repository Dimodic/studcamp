"""Проверка членства пользователя в целевой Telegram-группе через Bot API.

Используется в `POST /auth/telegram`: после успешной верификации initData
делаем `getChatMember(chat_id=settings.telegram_group_id, user_id=tg_id)`.
Если status ∈ {creator, administrator, member, restricted(is_member=True)} —
пользователь в группе и получает доступ.

Результаты кешируются на 60 секунд в памяти, чтобы не молотить Bot API при
массовом входе (лимит 30 req/sec на бота).
"""

from __future__ import annotations

import time

import httpx

_ACTIVE_STATUSES = frozenset({"creator", "administrator", "member"})
_CACHE_TTL = 60.0
_cache: dict[int, tuple[float, bool]] = {}


def is_group_member(
    user_id: int,
    *,
    bot_token: str,
    chat_id: int,
    timeout: float = 10.0,
) -> bool:
    """True, если пользователь состоит в чате. False — если нет или при сетевых ошибках."""
    if not bot_token or not chat_id:
        return False

    now = time.monotonic()
    cached = _cache.get(user_id)
    if cached and now - cached[0] < _CACHE_TTL:
        return cached[1]

    url = f"https://api.telegram.org/bot{bot_token}/getChatMember"
    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.get(url, params={"chat_id": chat_id, "user_id": user_id})
    except httpx.HTTPError:
        return False

    if response.status_code != 200:
        return False

    payload = response.json()
    if not payload.get("ok"):
        return False

    result = payload.get("result") or {}
    status = result.get("status")
    is_member = status in _ACTIVE_STATUSES or (
        status == "restricted" and bool(result.get("is_member", False))
    )
    _cache[user_id] = (now, is_member)
    return is_member


def _clear_cache() -> None:
    """Только для тестов — сбрасывает memoize-слой."""
    _cache.clear()
