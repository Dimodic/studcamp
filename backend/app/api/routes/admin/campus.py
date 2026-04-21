from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import CampusCategory, User
from backend.app.schemas.api import CampusCategoryUpsertSchema, CreatedEntitySchema, SimpleStatusSchema

from ._helpers import generate_id, get_or_404, require_organizer


router = APIRouter(prefix="/admin/campus-categories", tags=["admin"])


def _apply(category: CampusCategory, payload: CampusCategoryUpsertSchema) -> None:
    category.icon = payload.icon
    category.title = payload.title
    category.items = [item.model_dump() for item in payload.items]


@router.post("", response_model=CreatedEntitySchema)
def create_campus_category(
    payload: CampusCategoryUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatedEntitySchema:
    require_organizer(current_user)
    category = CampusCategory(id=generate_id("campus"), icon="", title="", items=[])
    _apply(category, payload)
    db.add(category)
    db.commit()
    return CreatedEntitySchema(id=category.id)


@router.patch("/{category_id}", response_model=SimpleStatusSchema)
def update_campus_category(
    category_id: str,
    payload: CampusCategoryUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    category = get_or_404(db, CampusCategory, category_id)
    _apply(category, payload)
    db.add(category)
    db.commit()
    return SimpleStatusSchema(ok=True)
