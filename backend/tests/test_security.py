"""Unit-тесты для slayer'ов Партии 1: bcrypt + legacy rehash + SSRF-guard."""

from __future__ import annotations

import hashlib
import secrets

import pytest
from backend.app.core.security import (
    create_session_token,
    hash_password,
    needs_rehash,
    verify_password,
)
from backend.app.core.url_guard import ensure_public_url
from fastapi import HTTPException


class TestPasswordHashing:
    def test_bcrypt_roundtrip(self) -> None:
        salt, digest = hash_password("my-secret")
        assert salt == ""
        assert digest.startswith("$2")
        assert verify_password("my-secret", salt, digest) is True
        assert verify_password("wrong", salt, digest) is False

    def test_legacy_pbkdf2_verify(self) -> None:
        legacy_salt = secrets.token_hex(16)
        legacy_hash = hashlib.pbkdf2_hmac(
            "sha256", b"legacy-pass", bytes.fromhex(legacy_salt), 600_000
        ).hex()
        assert verify_password("legacy-pass", legacy_salt, legacy_hash) is True
        assert verify_password("other", legacy_salt, legacy_hash) is False

    def test_needs_rehash_identifies_legacy(self) -> None:
        legacy_salt = secrets.token_hex(16)
        legacy_hash = hashlib.pbkdf2_hmac("sha256", b"x", bytes.fromhex(legacy_salt), 600_000).hex()
        assert needs_rehash(legacy_salt, legacy_hash) is True

        _, bcrypt_hash = hash_password("x")
        assert needs_rehash("", bcrypt_hash) is False

    def test_session_token_is_urlsafe(self) -> None:
        token = create_session_token()
        # 32 байта энтропии → 43 url-safe символа.
        assert len(token) >= 43
        assert all(c.isalnum() or c in "-_" for c in token)


class TestUrlGuard:
    def test_public_url_passes(self) -> None:
        ensure_public_url("https://api.openai.com/v1")

    def test_rejects_non_http(self) -> None:
        with pytest.raises(HTTPException) as exc:
            ensure_public_url("file:///etc/passwd")
        assert exc.value.status_code == 400

    def test_rejects_loopback(self) -> None:
        with pytest.raises(HTTPException):
            ensure_public_url("http://127.0.0.1:8000")

    def test_rejects_localhost_hostname(self) -> None:
        with pytest.raises(HTTPException):
            ensure_public_url("http://localhost:11434")

    def test_rejects_aws_metadata(self) -> None:
        with pytest.raises(HTTPException):
            ensure_public_url("http://169.254.169.254/latest/")

    def test_allow_private_for_dev(self) -> None:
        # В dev-окружении разрешаем Ollama/LM Studio на localhost.
        ensure_public_url("http://localhost:11434", allow_private=True)
        ensure_public_url("http://127.0.0.1:8080", allow_private=True)

    def test_rejects_private_network(self) -> None:
        with pytest.raises(HTTPException):
            ensure_public_url("http://10.0.0.1")
