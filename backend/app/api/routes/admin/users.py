from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.security import hash_password
from backend.app.db.session import get_db
from backend.app.models.entities import User, UserRole, VisibilityMode
from backend.app.schemas.api import CreatedEntitySchema, SimpleStatusSchema, UserUpsertSchema

from ._helpers import (
    ensure_unique_email,
    generate_id,
    get_or_404,
    parse_enum,
    require_organizer,
    resolve_camp_id,
)


router = APIRouter(prefix="/admin/users", tags=["admin"])


def _apply(user: User, payload: UserUpsertSchema) -> None:
    user.name = payload.name
    user.role = parse_enum(UserRole, payload.role, "role")
    user.university = payload.university
    user.city = payload.city
    user.telegram = payload.telegram
    user.photo_url = payload.photo
    user.visibility_mode = parse_enum(VisibilityMode, payload.visibility, "visibility")
    user.notifications_enabled = payload.notificationsOn
    user.is_active = payload.isActive
    user.show_in_people = payload.showInPeople
    user.email = payload.email or None


@router.post("", response_model=CreatedEntitySchema)
def create_user(
    payload: UserUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatedEntitySchema:
    require_organizer(current_user)
    ensure_unique_email(db, payload.email)
    user = User(
        id=generate_id(payload.role or "user"),
        camp_id=resolve_camp_id(db, current_user),
        name="",
        role=UserRole.participant,
        visibility_mode=VisibilityMode.name_plus_fields,
        notifications_enabled=True,
        is_active=True,
        show_in_people=True,
    )
    _apply(user, payload)
    if payload.password:
        user.password_salt, user.password_hash = hash_password(payload.password)
    db.add(user)
    db.commit()
    return CreatedEntitySchema(id=user.id)


@router.patch("/{user_id}", response_model=SimpleStatusSchema)
def update_user(
    user_id: str,
    payload: UserUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    ensure_unique_email(db, payload.email, exclude_user_id=user_id)
    user = get_or_404(db, User, user_id)
    _apply(user, payload)
    if payload.password:
        user.password_salt, user.password_hash = hash_password(payload.password)
    db.add(user)
    db.commit()
    return SimpleStatusSchema(ok=True)
