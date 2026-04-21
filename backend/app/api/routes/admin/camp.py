from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import Camp, User
from backend.app.schemas.api import CampUpsertSchema, SimpleStatusSchema

from ._helpers import get_or_404, require_organizer


router = APIRouter(prefix="/admin/camp", tags=["admin"])


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
