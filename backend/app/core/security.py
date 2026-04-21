from __future__ import annotations

import hashlib
import secrets
import uuid


def hash_password(password: str, salt: str | None = None) -> tuple[str, str]:
    resolved_salt = salt or secrets.token_hex(16)
    derived = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        bytes.fromhex(resolved_salt),
        600_000,
    ).hex()
    return resolved_salt, derived


def verify_password(password: str, salt: str, expected_hash: str) -> bool:
    _, actual = hash_password(password=password, salt=salt)
    return secrets.compare_digest(actual, expected_hash)


def create_session_token() -> str:
    return uuid.uuid4().hex
