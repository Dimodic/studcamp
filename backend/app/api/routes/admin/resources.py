from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import Resource, User, UserRole
from backend.app.schemas.api import CreatedEntitySchema, ResourceUpsertSchema, SimpleStatusSchema

from ._helpers import (
    ensure_manageable_related_event_id,
    generate_id,
    get_or_404,
    resolve_camp_id,
)

router = APIRouter(prefix="/admin/resources", tags=["admin"])


def _authorize(db: Session, current_user: User, event_id: str | None) -> None:
    if current_user.role == UserRole.organizer:
        return
    if current_user.role == UserRole.teacher:
        ensure_manageable_related_event_id(db, current_user, event_id)
        return
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


def _apply(resource: Resource, payload: ResourceUpsertSchema) -> None:
    resource.title = payload.title
    resource.category = payload.category
    resource.kind = payload.kind
    resource.description = payload.description
    resource.url = payload.url
    resource.day = payload.day
    resource.event_id = payload.eventId
    resource.is_new = payload.isNew


@router.post("", response_model=CreatedEntitySchema)
def create_resource(
    payload: ResourceUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatedEntitySchema:
    _authorize(db, current_user, payload.eventId)
    resource = Resource(
        id=generate_id("resource"),
        camp_id=resolve_camp_id(db, current_user),
        title="",
        category="",
        kind="",
        url="",
        is_new=False,
    )
    _apply(resource, payload)
    db.add(resource)
    db.commit()
    return CreatedEntitySchema(id=resource.id)


@router.patch("/{resource_id}", response_model=SimpleStatusSchema)
def update_resource(
    resource_id: str,
    payload: ResourceUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    resource = get_or_404(db, Resource, resource_id)
    if current_user.role == UserRole.organizer:
        pass
    elif current_user.role == UserRole.teacher:
        ensure_manageable_related_event_id(db, current_user, resource.event_id)
        ensure_manageable_related_event_id(db, current_user, payload.eventId)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    _apply(resource, payload)
    db.add(resource)
    db.commit()
    return SimpleStatusSchema(ok=True)


@router.delete("/{resource_id}", response_model=SimpleStatusSchema)
def delete_resource(
    resource_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    resource = get_or_404(db, Resource, resource_id)
    if current_user.role == UserRole.organizer:
        pass
    elif current_user.role == UserRole.teacher:
        ensure_manageable_related_event_id(db, current_user, resource.event_id)
    else:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    db.delete(resource)
    db.commit()
    return SimpleStatusSchema(ok=True)
