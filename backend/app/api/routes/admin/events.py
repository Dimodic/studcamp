from __future__ import annotations

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import Event, EventStatus, EventTeacher, User, UserRole
from backend.app.schemas.api import CreatedEntitySchema, EventUpsertSchema, SimpleStatusSchema

from ._helpers import (
    generate_id,
    get_manageable_event,
    parse_enum,
    require_organizer,
    resolve_camp_id,
)


router = APIRouter(prefix="/admin/events", tags=["admin"])


def _apply(event: Event, payload: EventUpsertSchema) -> None:
    event.event_date = payload.date
    event.title = payload.title
    event.type = payload.type
    event.start_at = payload.startAt
    event.end_at = payload.endAt
    event.place = payload.place
    event.building = payload.building
    event.address = payload.address
    event.status = parse_enum(EventStatus, payload.status, "status")
    event.description = payload.description
    event.materials = payload.materials
    event.day = payload.day


def _sync_teachers(db: Session, event: Event, teacher_ids: list[str]) -> None:
    resolved_ids = list(dict.fromkeys(teacher_ids))
    teachers = (
        db.scalars(select(User).where(User.id.in_(resolved_ids))).all() if resolved_ids else []
    )
    if len(teachers) != len(resolved_ids) or any(teacher.role != UserRole.teacher for teacher in teachers):
        raise HTTPException(status_code=400, detail="teacherIds must reference teacher users")
    db.execute(delete(EventTeacher).where(EventTeacher.event_id == event.id))
    for teacher_id in resolved_ids:
        db.add(EventTeacher(event_id=event.id, teacher_id=teacher_id))


@router.post("", response_model=CreatedEntitySchema)
def create_event(
    payload: EventUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatedEntitySchema:
    require_organizer(current_user)
    event = Event(
        id=generate_id("event"),
        camp_id=resolve_camp_id(db, current_user),
        event_date=date.today(),
        title="",
        type="",
        start_at="",
        end_at="",
        place="",
        building="",
        address="",
        status=EventStatus.upcoming,
        day=1,
    )
    _apply(event, payload)
    db.add(event)
    db.flush()
    _sync_teachers(db, event, payload.teacherIds)
    db.commit()
    return CreatedEntitySchema(id=event.id)


@router.patch("/{event_id}", response_model=SimpleStatusSchema)
def update_event(
    event_id: str,
    payload: EventUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    event = get_manageable_event(db, current_user, event_id)
    if current_user.role == UserRole.teacher and payload.teacherIds:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teachers cannot assign teachers",
        )
    _apply(event, payload)
    db.add(event)
    if current_user.role == UserRole.organizer:
        _sync_teachers(db, event, payload.teacherIds)
    db.commit()
    return SimpleStatusSchema(ok=True)
