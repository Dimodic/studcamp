from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.config import settings
from backend.app.core.security import (
    create_session_token,
    hash_password,
    needs_rehash,
    verify_password,
)
from backend.app.core.telegram_auth import TelegramAuthError, verify_init_data
from backend.app.db.session import get_db
from backend.app.models.entities import Camp, User, UserRole, VisibilityMode
from backend.app.models.entities import Session as UserSession
from backend.app.schemas.api import (
    CurrentUserSchema,
    LoginRequestSchema,
    LoginResponseSchema,
    SimpleStatusSchema,
    TelegramLoginRequestSchema,
)
from backend.app.services.bootstrap import _serialize_current_user
from backend.app.services.telegram_membership import is_group_member

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_session(db: Session, user: User) -> UserSession:
    expires_at = datetime.now(UTC) + timedelta(hours=settings.session_ttl_hours)
    session = UserSession(token=create_session_token(), user_id=user.id, expires_at=expires_at)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


@router.post("/login", response_model=LoginResponseSchema)
def login(payload: LoginRequestSchema, db: Session = Depends(get_db)) -> LoginResponseSchema:
    user = db.scalar(select(User).where(User.email == payload.email, User.is_active.is_(True)))
    if user is None or not user.password_hash:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный email или пароль"
        )

    if not verify_password(payload.password, user.password_salt, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Неверный email или пароль"
        )

    # Lazy-upgrade: перехэшируем легаси PBKDF2-паролей в bcrypt при первом логине.
    if needs_rehash(user.password_salt, user.password_hash):
        user.password_salt, user.password_hash = hash_password(payload.password)
        db.add(user)

    session = _issue_session(db, user)
    return LoginResponseSchema(
        token=session.token, expiresAt=session.expires_at, user=_serialize_current_user(user)
    )


@router.post("/telegram", response_model=LoginResponseSchema)
def telegram_login(
    payload: TelegramLoginRequestSchema,
    db: Session = Depends(get_db),
) -> LoginResponseSchema:
    """Авторизация через Telegram WebApp.

    Фронт получает window.Telegram.WebApp.initData и шлёт сюда.
    Backend:
      1. проверяет HMAC-подпись initData;
      2. проверяет, что пользователь — участник настроенной Telegram-группы
         (через Bot API getChatMember);
      3. upsert'ит User по telegram_id (создаёт как participant в active camp);
      4. выдаёт сессионный токен — дальше всё как у обычного логина.
    """
    if not settings.telegram_bot_token or not settings.telegram_group_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Telegram-авторизация не настроена на сервере",
        )

    try:
        tg_user = verify_init_data(
            payload.initData,
            settings.telegram_bot_token,
            max_age_seconds=settings.telegram_auth_max_age_seconds,
        )
    except TelegramAuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Не удалось проверить подпись Telegram: {exc}",
        ) from exc

    member = is_group_member(
        tg_user.id,
        bot_token=settings.telegram_bot_token,
        chat_id=settings.telegram_group_id,
    )
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Вы не в группе кемпа. Попросите организатора добавить вас.",
        )

    user = db.scalar(select(User).where(User.telegram_id == tg_user.id))
    if user is None:
        active_camp = db.scalar(select(Camp).where(Camp.is_active.is_(True)))
        display_name = (
            " ".join(filter(None, [tg_user.first_name, tg_user.last_name])).strip()
            or f"Пользователь {tg_user.id}"
        )
        user = User(
            id=f"tg-{tg_user.id}",
            telegram_id=tg_user.id,
            camp_id=active_camp.id if active_camp else None,
            name=display_name,
            role=UserRole.participant,
            telegram=f"@{tg_user.username}" if tg_user.username else None,
            visibility_mode=VisibilityMode.name_plus_fields,
            notifications_enabled=True,
            is_active=True,
            show_in_people=True,
        )
        db.add(user)
        db.flush()
    elif not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Аккаунт деактивирован организатором",
        )

    session = _issue_session(db, user)
    return LoginResponseSchema(
        token=session.token, expiresAt=session.expires_at, user=_serialize_current_user(user)
    )


@router.get("/me", response_model=CurrentUserSchema)
def me(current_user: User = Depends(get_current_user)) -> CurrentUserSchema:
    return _serialize_current_user(current_user)


@router.post("/logout", response_model=SimpleStatusSchema)
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    db.execute(delete(UserSession).where(UserSession.user_id == current_user.id))
    db.commit()
    return SimpleStatusSchema(ok=True)
