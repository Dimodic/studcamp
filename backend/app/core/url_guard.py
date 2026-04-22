"""SSRF-guard для пользовательских URL.

LLM-эндпоинт `/llm/parse` и upload-парсер `/admin/attendance/...` принимают
`baseUrl` от организатора. Без валидации это позволяет сделать GET/POST к
внутренним сервисам (`http://db:5432`, AWS metadata и т.п.). Эта функция
блокирует loopback / private / metadata-адреса.

В dev-окружении (`STUDCAMP_ENV=development`) приватные адреса разрешены
по умолчанию — люди подключают локальные Ollama/LM Studio на
`http://localhost:11434`.
"""

from __future__ import annotations

import ipaddress
import socket
from urllib.parse import urlparse

from fastapi import HTTPException

_BLOCKED_HOSTS = frozenset(
    {
        "localhost",
        "ip6-localhost",
        "ip6-loopback",
        "metadata.google.internal",
        "metadata",
        "instance-data",
    }
)


def ensure_public_url(url: str, *, allow_private: bool = False) -> None:
    """Поднять 400-ошибку, если URL указывает на внутренний/приватный адрес."""
    parsed = urlparse(url.strip())
    if parsed.scheme not in {"http", "https"}:
        raise HTTPException(status_code=400, detail="URL должен быть http(s)")
    host = (parsed.hostname or "").strip().lower()
    if not host:
        raise HTTPException(status_code=400, detail="В URL отсутствует хост")

    if host in _BLOCKED_HOSTS or host.endswith(".local"):
        if not allow_private:
            raise HTTPException(status_code=400, detail=f"Недопустимый хост: {host}")
        return

    try:
        resolved = socket.getaddrinfo(host, None)
    except socket.gaierror as exc:
        raise HTTPException(status_code=400, detail=f"Не удалось разрешить хост {host}") from exc

    for _family, _type, _proto, _canon, sockaddr in resolved:
        ip_str = sockaddr[0]
        try:
            addr = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        is_private = (
            addr.is_loopback
            or addr.is_private
            or addr.is_link_local
            or addr.is_reserved
            or addr.is_multicast
            or addr.is_unspecified
        )
        if is_private and not allow_private:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"URL ведёт на {ip_str} — адрес из внутренней сети недоступен "
                    "для внешних запросов."
                ),
            )
