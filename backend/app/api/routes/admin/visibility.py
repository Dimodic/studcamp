"""Toggle is_hidden flag on content entities without rewriting the full payload."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import (
    CampusCategory,
    Event,
    Material,
    OrgUpdate,
    Project,
    Resource,
    Story,
    User,
)
from backend.app.schemas.api import SimpleStatusSchema

from ._helpers import get_or_404, require_organizer


router = APIRouter(prefix="/admin/visibility", tags=["admin"])


RESOURCE_MODELS = {
    "events": Event,
    "stories": Story,
    "org-updates": OrgUpdate,
    "projects": Project,
    "materials": Material,
    "resources": Resource,
    "campus-categories": CampusCategory,
}


class VisibilityUpdate(BaseModel):
    hidden: bool


@router.patch("/{resource}/{entity_id}", response_model=SimpleStatusSchema)
def set_visibility(
    resource: str,
    entity_id: str,
    payload: VisibilityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    model = RESOURCE_MODELS.get(resource)
    if model is None:
        raise HTTPException(status_code=404, detail=f"Unknown resource: {resource}")
    entity = get_or_404(db, model, entity_id)
    entity.is_hidden = payload.hidden
    db.add(entity)
    db.commit()
    return SimpleStatusSchema(ok=True)
