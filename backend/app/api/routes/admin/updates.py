from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import OrgUpdate, UpdateType, User
from backend.app.schemas.api import CreatedEntitySchema, OrgUpdateUpsertSchema, SimpleStatusSchema

from ._helpers import generate_id, get_or_404, parse_enum, require_organizer


router = APIRouter(prefix="/admin/org-updates", tags=["admin"])


def _apply(update: OrgUpdate, payload: OrgUpdateUpsertSchema) -> None:
    update.text = payload.text
    update.time = payload.time
    update.is_new = payload.isNew
    update.type = parse_enum(UpdateType, payload.type, "type")


@router.post("", response_model=CreatedEntitySchema)
def create_org_update(
    payload: OrgUpdateUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatedEntitySchema:
    require_organizer(current_user)
    update = OrgUpdate(id=generate_id("update"), text="", time="", is_new=True, type=UpdateType.info)
    _apply(update, payload)
    db.add(update)
    db.commit()
    return CreatedEntitySchema(id=update.id)


@router.patch("/{update_id}", response_model=SimpleStatusSchema)
def update_org_update(
    update_id: str,
    payload: OrgUpdateUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    update = get_or_404(db, OrgUpdate, update_id)
    _apply(update, payload)
    db.add(update)
    db.commit()
    return SimpleStatusSchema(ok=True)


@router.delete("/{update_id}", response_model=SimpleStatusSchema)
def delete_org_update(
    update_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    update = get_or_404(db, OrgUpdate, update_id)
    db.delete(update)
    db.commit()
    return SimpleStatusSchema(ok=True)
