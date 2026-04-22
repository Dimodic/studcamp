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
from backend.app.db.session import get_db
from backend.app.models.entities import Session as UserSession
from backend.app.models.entities import User
from backend.app.schemas.api import (
    CurrentUserSchema,
    LoginRequestSchema,
    LoginResponseSchema,
    SimpleStatusSchema,
)
from backend.app.services.bootstrap import _serialize_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


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

    expires_at = datetime.now(UTC) + timedelta(hours=settings.session_ttl_hours)
    session = UserSession(token=create_session_token(), user_id=user.id, expires_at=expires_at)
    db.add(session)
    db.commit()
    db.refresh(session)

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
