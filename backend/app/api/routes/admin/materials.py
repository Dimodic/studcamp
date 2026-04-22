from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import Material, MaterialType, User, UserRole
from backend.app.schemas.api import CreatedEntitySchema, MaterialUpsertSchema, SimpleStatusSchema

from ._helpers import (
    ensure_manageable_related_event_id,
    generate_id,
    get_or_404,
    parse_enum,
    resolve_camp_id,
)

router = APIRouter(prefix="/admin/materials", tags=["admin"])


def _authorize(db: Session, current_user: User, event_id: str | None) -> None:
    if current_user.role == UserRole.organizer:
        return
    if current_user.role == UserRole.teacher:
        ensure_manageable_related_event_id(db, current_user, event_id)
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def _apply(material: Material, payload: MaterialUpsertSchema) -> None:
    material.title = payload.title
    material.type = parse_enum(MaterialType, payload.type, "type")
    material.day = payload.day
    material.event_id = payload.eventId
    material.topic = payload.topic
    material.file_size = payload.fileSize
    material.is_new = payload.isNew
    material.url = payload.url


@router.post("", response_model=CreatedEntitySchema)
def create_material(
    payload: MaterialUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatedEntitySchema:
    _authorize(db, current_user, payload.eventId)
    material = Material(
        id=generate_id("material"),
        camp_id=resolve_camp_id(db, current_user),
        title="",
        type=MaterialType.guide,
        is_new=False,
        url="",
    )
    _apply(material, payload)
    db.add(material)
    db.commit()
    return CreatedEntitySchema(id=material.id)


@router.patch("/{material_id}", response_model=SimpleStatusSchema)
def update_material(
    material_id: str,
    payload: MaterialUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    material = get_or_404(db, Material, material_id)
    if current_user.role == UserRole.organizer:
        pass
    elif current_user.role == UserRole.teacher:
        ensure_manageable_related_event_id(db, current_user, material.event_id)
        ensure_manageable_related_event_id(db, current_user, payload.eventId)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    _apply(material, payload)
    db.add(material)
    db.commit()
    return SimpleStatusSchema(ok=True)


@router.delete("/{material_id}", response_model=SimpleStatusSchema)
def delete_material(
    material_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    material = get_or_404(db, Material, material_id)
    if current_user.role == UserRole.organizer:
        pass
    elif current_user.role == UserRole.teacher:
        ensure_manageable_related_event_id(db, current_user, material.event_id)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    db.delete(material)
    db.commit()
    return SimpleStatusSchema(ok=True)
