"""Pассword-хэширование и сессионные токены.

Алгоритмы:
  * Новые пароли — bcrypt (OWASP рекомендация: cost=12 по умолчанию).
  * Старые записи (salt из hex + PBKDF2-SHA256) поддерживаются для
    обратной совместимости и автоматически перехешируются в bcrypt
    на первом удачном логине через `needs_rehash`.

Схема хранения в БД:
  * User.password_salt = "" (или NULL)  — признак bcrypt.
  * User.password_hash = полная bcrypt-строка `$2b$<cost>$<salt+hash>`.
  * Для legacy: password_salt = 32-символьный hex, password_hash = 64-символьный hex.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets

import bcrypt

_BCRYPT_PREFIXES = (b"$2a$", b"$2b$", b"$2y$")
_PBKDF2_ITERATIONS = 600_000  # OWASP-2024 минимум для PBKDF2-SHA256


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    """Вернуть (salt, hash) для записи в БД.

    Параметр `salt` сохранён для совместимости со старыми callerами, но
    игнорируется для новых bcrypt-хэшей (bcrypt встраивает соль в результат).
    """
    _ = salt  # silently ignored: bcrypt manages its own salt
    digest = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("ascii")
    return "", digest


def verify_password(password: str, salt: str | None, expected_hash: str | None) -> bool:
    """Проверить пароль против обоих форматов."""
    if not expected_hash:
        return False
    password_bytes = password.encode("utf-8")
    hash_bytes = expected_hash.encode("ascii", errors="ignore")

    if hash_bytes.startswith(_BCRYPT_PREFIXES):
        try:
            return bcrypt.checkpw(password_bytes, hash_bytes)
        except ValueError:
            return False

    # Legacy: PBKDF2-SHA256 с hex-salt.
    if not salt:
        return False
    try:
        salt_bytes = bytes.fromhex(salt)
    except ValueError:
        return False
    derived = hashlib.pbkdf2_hmac("sha256", password_bytes, salt_bytes, _PBKDF2_ITERATIONS).hex()
    return hmac.compare_digest(derived, expected_hash)


def needs_rehash(salt: str | None, expected_hash: str | None) -> bool:
    """True, если пароль записан в старом формате и должен быть перехэширован."""
    if not expected_hash:
        return False
    return not expected_hash.encode("ascii", errors="ignore").startswith(_BCRYPT_PREFIXES)


def create_session_token() -> str:
    """192-битный URL-safe токен для cookie/header-сессии."""
    return secrets.token_urlsafe(32)
