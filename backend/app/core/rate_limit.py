"""Простой in-memory rate-limiter по IP+пути.

Нужен для /auth/login (brute-force) и /llm/* (DoS через LLM-апстрим).
Без внешних зависимостей: скользящее окно на 60 секунд.

Для продакшена с несколькими воркерами/инстансами — использовать
Redis-backed вариант (slowapi с Redis-стором). Для однопроцессного
gunicorn-воркера in-memory достаточно как первой линии обороны.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from threading import Lock

from fastapi import Request, Response
from fastapi.responses import JSONResponse

Endpoint = Callable[[Request], Awaitable[Response]]


class RateLimiter:
    def __init__(self) -> None:
        self._lock = Lock()
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def check(self, key: str, limit_per_minute: int) -> tuple[bool, float]:
        """Return (allowed, retry_after_seconds)."""
        now = time.monotonic()
        cutoff = now - 60.0
        with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] < cutoff:
                bucket.popleft()
            if len(bucket) >= limit_per_minute:
                retry = max(0.0, 60.0 - (now - bucket[0]))
                return False, retry
            bucket.append(now)
            return True, 0.0


_limiter = RateLimiter()


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def build_rate_limit_middleware(
    rules: dict[str, int],
) -> Callable[[Request, Endpoint], Awaitable[Response]]:
    """Фабрика Starlette-middleware.

    `rules` — mapping «префикс пути → лимит в минуту». Для пути, не попавшего
    ни в один префикс, middleware ничего не делает.
    """

    async def middleware(request: Request, call_next: Endpoint) -> Response:
        path = request.url.path
        for prefix, limit in rules.items():
            if path.startswith(prefix):
                key = f"{prefix}:{_client_ip(request)}"
                allowed, retry_after = _limiter.check(key, limit)
                if not allowed:
                    return JSONResponse(
                        status_code=429,
                        content={
                            "detail": "Слишком много запросов. Повторите попытку позже.",
                        },
                        headers={"Retry-After": str(int(retry_after) + 1)},
                    )
                break
        return await call_next(request)

    return middleware
