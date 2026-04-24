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

    Логика:
      1. Верифицируем HMAC-подпись initData — это гарантирует, что фронт
         действительно открыт из Telegram от имени указанного user.id, а
         не подделан. Без валидного bot_token дальше не идём.
      2. Определяем «кто пускается». Две стратегии:
         а) Если юзер с таким telegram_id уже есть в БД (организатор
            заранее импортировал список участников группы через
            POST /admin/users с полем telegramId) — доверяем этой записи
            как «разрешению войти». Bot API не дёргаем вообще.
         б) Если нет — fallback к getChatMember на настроенной группе
            (telegram_group_id). Нужен, когда бот в группе и мы хотим
            пускать всех её участников автоматически, без ручного
            импорта. Если group_id не задан (0) или бот не в группе
            (getChatMember вернёт false) — отказ.
      3. Выдаём сессионный токен.

    Итог: если организатор предзалил whitelist через /admin/users,
    авторизация работает **без бота в группе** — нужна только валидная
    подпись initData + совпадение telegram_id с записью в БД.
    """
    if not settings.telegram_bot_token:
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

    user = db.scalar(select(User).where(User.telegram_id == tg_user.id))

    if user is None:
        # Не в whitelist'е — проверим по группе, если она настроена.
        if not settings.telegram_group_id or not is_group_member(
            tg_user.id,
            bot_token=settings.telegram_bot_token,
            chat_id=settings.telegram_group_id,
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вы не в списке кемпа. Попросите организатора добавить вас.",
            )

        # Прошли проверку группы, но записи в БД нет — авто-создадим
        # нового участника в активном кемпе.
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


@router.post("/demo", response_model=LoginResponseSchema)
def demo_login(db: Session = Depends(get_db)) -> LoginResponseSchema:
    """Публичный демо-вход без учёток — для презентационной ссылки.

    Если в настройках указан `demo_organizer_id`, любой HTTP-запрос на этот
    endpoint получает сессионный токен этого пользователя. Это сделано ровно
    для кейса «открыть сайт без Telegram → сразу оказаться в интерфейсе
    организатора»; все действия такого сеанса реально меняют данные в БД,
    так что демо-юзер должен быть отдельным, а не «настоящим» админом
    продовой инсталляции.

    В выключенном состоянии (пустой `demo_organizer_id`) endpoint отвечает
    404, как будто его нет — чтобы в продакшне без демо-юзера он не светился.
    """
    if not settings.demo_organizer_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

    user = db.get(User, settings.demo_organizer_id)
    if user is None or not user.is_active or user.role != UserRole.organizer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not Found")

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
