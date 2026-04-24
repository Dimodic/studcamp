"""Тесты авторизации через Telegram WebApp.

Покрывают:
  * verify_init_data — happy path, битая подпись, expired, missing user.
  * POST /auth/telegram — 503 без настройки бота, 401 при неверной подписи,
    403 когда не член группы, 200 + upsert пользователя при успехе.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from datetime import UTC, datetime
from urllib.parse import urlencode

import pytest
from backend.app.core.telegram_auth import TelegramAuthError, verify_init_data
from backend.app.models.entities import User
from sqlalchemy import select

BOT_TOKEN = "123456:ABCDEF-test-token"


def _sign_init_data(user_payload: dict[str, object], *, auth_date: int | None = None) -> str:
    """Собирает валидный initData как его формирует Telegram WebApp."""
    fields = {
        "auth_date": str(auth_date if auth_date is not None else int(time.time())),
        "query_id": "AAH123",
        "user": json.dumps(user_payload, ensure_ascii=False, separators=(",", ":")),
    }
    data_check = "\n".join(f"{k}={v}" for k, v in sorted(fields.items()))
    secret = hmac.new(b"WebAppData", BOT_TOKEN.encode(), hashlib.sha256).digest()
    sig = hmac.new(secret, data_check.encode(), hashlib.sha256).hexdigest()
    return urlencode({**fields, "hash": sig})


class TestVerifyInitData:
    def test_happy_path(self) -> None:
        init = _sign_init_data({"id": 42, "first_name": "Alice", "username": "alice"})
        user = verify_init_data(init, BOT_TOKEN)
        assert user.id == 42
        assert user.first_name == "Alice"
        assert user.username == "alice"

    def test_bad_signature(self) -> None:
        init = _sign_init_data({"id": 42, "first_name": "Alice"})
        # Подменим hash в конце.
        tampered = init.rsplit("hash=", 1)[0] + "hash=" + "0" * 64
        with pytest.raises(TelegramAuthError, match="signature"):
            verify_init_data(tampered, BOT_TOKEN)

    def test_expired(self) -> None:
        old_ts = int(time.time()) - 10_000
        init = _sign_init_data({"id": 42, "first_name": "Alice"}, auth_date=old_ts)
        with pytest.raises(TelegramAuthError, match="expired"):
            verify_init_data(init, BOT_TOKEN, max_age_seconds=3600)

    def test_empty_input(self) -> None:
        with pytest.raises(TelegramAuthError):
            verify_init_data("", BOT_TOKEN)

    def test_no_bot_token(self) -> None:
        init = _sign_init_data({"id": 42, "first_name": "Alice"})
        with pytest.raises(TelegramAuthError, match="bot token"):
            verify_init_data(init, "")

    def test_future_auth_date_inside_window(self) -> None:
        # Если часы клиента слегка убежали вперёд — это ok (разница отрицательная).
        future_ts = int(datetime.now(UTC).timestamp()) + 30
        init = _sign_init_data({"id": 42, "first_name": "Alice"}, auth_date=future_ts)
        user = verify_init_data(init, BOT_TOKEN)
        assert user.id == 42


class TestTelegramLoginEndpoint:
    def test_returns_503_when_bot_not_configured(self, client, monkeypatch) -> None:
        from backend.app.core import config as config_module

        monkeypatch.setattr(config_module.settings, "telegram_bot_token", "")
        monkeypatch.setattr(config_module.settings, "telegram_group_id", 0)
        response = client.post("/api/v1/auth/telegram", json={"initData": "whatever"})
        assert response.status_code == 503

    def test_401_on_bad_signature(self, client, monkeypatch) -> None:
        from backend.app.core import config as config_module

        monkeypatch.setattr(config_module.settings, "telegram_bot_token", BOT_TOKEN)
        monkeypatch.setattr(config_module.settings, "telegram_group_id", -100123)
        response = client.post(
            "/api/v1/auth/telegram",
            json={"initData": "auth_date=0&hash=0000"},
        )
        assert response.status_code == 401

    def test_403_when_not_in_group(self, client, db_session, monkeypatch) -> None:
        from backend.app.core import config as config_module
        from backend.app.services import telegram_membership

        telegram_membership._clear_cache()
        monkeypatch.setattr(config_module.settings, "telegram_bot_token", BOT_TOKEN)
        monkeypatch.setattr(config_module.settings, "telegram_group_id", -100123)
        monkeypatch.setattr(telegram_membership, "is_group_member", lambda *args, **kwargs: False)

        init = _sign_init_data({"id": 7777, "first_name": "Ghost"})
        response = client.post("/api/v1/auth/telegram", json={"initData": init})
        assert response.status_code == 403
        assert db_session.scalar(select(User).where(User.telegram_id == 7777)) is None

    def test_whitelist_login_without_group_check(self, client, db_session, monkeypatch) -> None:
        """Предзалитый пользователь входит без проверки группы — даже если
        group_id не настроен (0) или бот не в группе.
        """
        from backend.app.core import config as config_module
        from backend.app.services import telegram_membership

        telegram_membership._clear_cache()
        monkeypatch.setattr(config_module.settings, "telegram_bot_token", BOT_TOKEN)
        monkeypatch.setattr(config_module.settings, "telegram_group_id", 0)

        # Предзалитого пользователя создадим вручную с известным telegram_id.
        from backend.app.models.entities import UserRole, VisibilityMode

        existing = User(
            id="pre-loaded-user",
            name="Preloaded Participant",
            role=UserRole.participant,
            telegram_id=5555,
            telegram="@preloaded",
            visibility_mode=VisibilityMode.name_plus_fields,
            notifications_enabled=True,
            is_active=True,
            show_in_people=True,
        )
        db_session.add(existing)
        db_session.commit()

        init = _sign_init_data({"id": 5555, "first_name": "Any"})
        response = client.post("/api/v1/auth/telegram", json={"initData": init})
        assert response.status_code == 200, response.text
        payload = response.json()
        assert payload["user"]["id"] == "pre-loaded-user"

        # Дубликатов нет — тот же пользователь, не новая запись «tg-5555».
        found = db_session.scalars(select(User).where(User.telegram_id == 5555)).all()
        assert len(found) == 1
        assert found[0].id == "pre-loaded-user"

    def test_non_whitelisted_rejected_when_group_not_configured(
        self, client, db_session, monkeypatch
    ) -> None:
        """Если юзера нет в БД и group_id = 0 — 403, а не авто-создание."""
        from backend.app.core import config as config_module
        from backend.app.services import telegram_membership

        telegram_membership._clear_cache()
        monkeypatch.setattr(config_module.settings, "telegram_bot_token", BOT_TOKEN)
        monkeypatch.setattr(config_module.settings, "telegram_group_id", 0)

        init = _sign_init_data({"id": 99999, "first_name": "Stranger"})
        response = client.post("/api/v1/auth/telegram", json={"initData": init})
        assert response.status_code == 403
        assert db_session.scalar(select(User).where(User.telegram_id == 99999)) is None

    def test_upserts_and_returns_token(self, client, db_session, monkeypatch) -> None:
        from backend.app.api.routes import auth as auth_route
        from backend.app.core import config as config_module
        from backend.app.services import telegram_membership

        telegram_membership._clear_cache()
        monkeypatch.setattr(config_module.settings, "telegram_bot_token", BOT_TOKEN)
        monkeypatch.setattr(config_module.settings, "telegram_group_id", -100123)
        monkeypatch.setattr(auth_route, "is_group_member", lambda *args, **kwargs: True)

        init = _sign_init_data(
            {"id": 9001, "first_name": "Иван", "last_name": "Тест", "username": "ivan_test"}
        )
        response = client.post("/api/v1/auth/telegram", json={"initData": init})
        assert response.status_code == 200, response.text
        payload = response.json()
        assert payload["token"]
        assert payload["user"]["name"] == "Иван Тест"
        assert payload["user"]["role"] == "participant"

        stored = db_session.scalar(select(User).where(User.telegram_id == 9001))
        assert stored is not None
        assert stored.telegram == "@ivan_test"

        # Повторный вход — не создаёт второго пользователя, возвращает тот же.
        response2 = client.post("/api/v1/auth/telegram", json={"initData": init})
        assert response2.status_code == 200
        same_count = db_session.scalar(select(User).where(User.telegram_id == 9001))
        assert same_count is not None
        assert same_count.id == stored.id


class TestDemoLoginEndpoint:
    """Тесты публичного демо-входа /auth/demo."""

    def test_404_when_not_configured(self, client, monkeypatch) -> None:
        from backend.app.core import config as config_module

        monkeypatch.setattr(config_module.settings, "demo_organizer_id", "")
        response = client.post("/api/v1/auth/demo")
        assert response.status_code == 404

    def test_404_when_user_missing(self, client, monkeypatch) -> None:
        from backend.app.core import config as config_module

        monkeypatch.setattr(config_module.settings, "demo_organizer_id", "no-such-user")
        response = client.post("/api/v1/auth/demo")
        assert response.status_code == 404

    def test_404_when_user_is_not_organizer(self, client, db_session, monkeypatch) -> None:
        # Назначим демо-id на teacher'а — endpoint должен отказать.
        from backend.app.core import config as config_module
        from backend.app.models.entities import UserRole

        teacher = db_session.scalar(
            select(User).where(User.role == UserRole.teacher).order_by(User.id.asc())
        )
        assert teacher is not None
        monkeypatch.setattr(config_module.settings, "demo_organizer_id", teacher.id)
        response = client.post("/api/v1/auth/demo")
        assert response.status_code == 404

    def test_issues_session_when_configured(self, client, db_session, monkeypatch) -> None:
        from backend.app.core import config as config_module
        from backend.app.models.entities import UserRole

        organizer = db_session.scalar(
            select(User).where(User.role == UserRole.organizer).order_by(User.id.asc())
        )
        assert organizer is not None
        monkeypatch.setattr(config_module.settings, "demo_organizer_id", organizer.id)

        response = client.post("/api/v1/auth/demo")
        assert response.status_code == 200, response.text
        payload = response.json()
        assert payload["token"]
        assert payload["user"]["role"] == "organizer"
        assert payload["user"]["id"] == organizer.id
