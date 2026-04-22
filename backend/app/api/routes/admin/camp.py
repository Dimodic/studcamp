from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import Camp, Event, User, UserRole
from backend.app.schemas.api import (
    CampListItemSchema,
    CampListResponseSchema,
    CampUpsertSchema,
    CreatedEntitySchema,
    SimpleStatusSchema,
)

from ._helpers import get_or_404, require_organizer

router = APIRouter(prefix="/admin/camp", tags=["admin"])
# Отдельный /admin/camps (во множественном числе) для list/create/activate —
# /admin/camp/{id} уже используется под PATCH конкретного кемпа, путать не надо.
camps_router = APIRouter(prefix="/admin/camps", tags=["admin"])


def _serialize_camp(db: Session, camp: Camp) -> CampListItemSchema:
    participants_count = (
        db.scalar(
            select(func.count(User.id)).where(
                User.camp_id == camp.id,
                User.role == UserRole.participant,
                User.is_active.is_(True),
            )
        )
        or 0
    )
    events_count = db.scalar(select(func.count(Event.id)).where(Event.camp_id == camp.id)) or 0
    return CampListItemSchema(
        id=camp.id,
        name=camp.name,
        shortDesc=camp.short_desc,
        city=camp.city,
        university=camp.university,
        startDate=camp.start_date,
        endDate=camp.end_date,
        status=camp.status,
        isActive=camp.is_active,
        participantsCount=participants_count,
        eventsCount=events_count,
    )


@router.patch("/{camp_id}", response_model=SimpleStatusSchema)
def update_camp(
    camp_id: str,
    payload: CampUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    camp = get_or_404(db, Camp, camp_id)
    camp.name = payload.name
    camp.short_desc = payload.shortDesc
    camp.city = payload.city
    camp.university = payload.university
    camp.start_date = payload.startDate
    camp.end_date = payload.endDate
    camp.status = payload.status
    db.add(camp)
    db.commit()
    return SimpleStatusSchema(ok=True)


@camps_router.get("", response_model=CampListResponseSchema)
def list_camps(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CampListResponseSchema:
    require_organizer(current_user)
    camps = db.scalars(
        select(Camp).order_by(Camp.is_active.desc(), Camp.start_date.desc(), Camp.id.asc())
    ).all()
    return CampListResponseSchema(camps=[_serialize_camp(db, camp) for camp in camps])


@camps_router.post("", response_model=CreatedEntitySchema)
def create_camp(
    payload: CampUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatedEntitySchema:
    require_organizer(current_user)
    total_days = (payload.endDate - payload.startDate).days + 1
    camp = Camp(
        id=f"camp-{uuid.uuid4().hex[:12]}",
        name=payload.name,
        short_desc=payload.shortDesc,
        city=payload.city,
        university=payload.university,
        start_date=payload.startDate,
        end_date=payload.endDate,
        status=payload.status,
        current_day=1,
        total_days=max(total_days, 1),
        project_selection_phase="countdown",
        day_titles=payload.dayTitles,
        is_active=False,
    )
    db.add(camp)
    db.commit()
    return CreatedEntitySchema(ok=True, id=camp.id)


@camps_router.put("/{camp_id}/activate", response_model=SimpleStatusSchema)
def activate_camp(
    camp_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    """Сделать кемп активным для всех пользователей. Остальные деактивируются."""
    require_organizer(current_user)
    camp = db.scalar(select(Camp).where(Camp.id == camp_id))
    if camp is None:
        raise HTTPException(status_code=404, detail="Camp not found")
    # Один SQL-update: выставить is_active только для выбранного.
    db.execute(update(Camp).values(is_active=(Camp.id == camp_id)))
    db.commit()
    return SimpleStatusSchema(ok=True)
