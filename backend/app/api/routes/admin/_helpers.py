from __future__ import annotations

from enum import Enum
from typing import TypeVar
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.entities import Camp, Event, EventTeacher, User, UserRole

ModelType = TypeVar("ModelType")
EnumType = TypeVar("EnumType", bound=Enum)


def generate_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:12]}"


def get_or_404[ModelType](
    db: Session, model: type[ModelType], entity_id: str, *, field_name: str = "id"
) -> ModelType:
    entity = db.scalar(select(model).where(getattr(model, field_name) == entity_id))
    if entity is None:
        raise HTTPException(status_code=404, detail=f"{model.__name__} not found")
    return entity


def require_organizer(current_user: User) -> None:
    if current_user.role != UserRole.organizer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organizer access required",
        )


def parse_enum[EnumType: Enum](
    enum_cls: type[EnumType], raw_value: str, field_name: str
) -> EnumType:
    try:
        return enum_cls(raw_value)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=f"Invalid {field_name}") from exc


def resolve_camp_id(db: Session, current_user: User) -> str:
    if current_user.camp_id:
        return current_user.camp_id
    camp = db.scalar(select(Camp).limit(1))
    if camp is None:
        raise HTTPException(status_code=503, detail="Camp data is missing")
    return camp.id


def ensure_unique_email(
    db: Session, email: str | None, *, exclude_user_id: str | None = None
) -> None:
    if not email:
        return
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None and existing.id != exclude_user_id:
        raise HTTPException(status_code=400, detail="Email already exists")


def _event_owned_by_teacher(db: Session, teacher_id: str, event_id: str) -> bool:
    return (
        db.scalar(
            select(EventTeacher).where(
                EventTeacher.teacher_id == teacher_id,
                EventTeacher.event_id == event_id,
            )
        )
        is not None
    )


def get_manageable_event(db: Session, current_user: User, event_id: str) -> Event:
    event = get_or_404(db, Event, event_id)
    if current_user.role == UserRole.organizer:
        return event
    if current_user.role == UserRole.teacher and _event_owned_by_teacher(
        db, current_user.id, event_id
    ):
        return event
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You cannot manage this event",
    )


def ensure_manageable_related_event_id(
    db: Session, current_user: User, event_id: str | None
) -> None:
    if event_id is None:
        raise HTTPException(status_code=400, detail="eventId is required")
    get_manageable_event(db, current_user, event_id)
