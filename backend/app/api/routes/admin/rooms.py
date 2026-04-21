from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import RoomAssignment, User
from backend.app.schemas.api import CreatedEntitySchema, RoomAssignmentUpsertSchema, SimpleStatusSchema

from ._helpers import get_or_404, require_organizer


router = APIRouter(prefix="/admin/room-assignments", tags=["admin"])


def _apply(assignment: RoomAssignment, payload: RoomAssignmentUpsertSchema) -> None:
    assignment.user_id = payload.userId
    assignment.number = payload.number
    assignment.floor = payload.floor
    assignment.building = payload.building
    assignment.neighbors = payload.neighbors
    assignment.key_info = payload.keyInfo
    assignment.rules = payload.rules


@router.post("", response_model=CreatedEntitySchema)
def create_room_assignment(
    payload: RoomAssignmentUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatedEntitySchema:
    require_organizer(current_user)
    get_or_404(db, User, payload.userId)
    existing = db.scalar(select(RoomAssignment).where(RoomAssignment.user_id == payload.userId))
    if existing is not None:
        raise HTTPException(status_code=400, detail="Room assignment already exists")
    assignment = RoomAssignment(
        user_id=payload.userId,
        number="",
        floor=1,
        building="",
        neighbors=[],
        key_info="",
        rules=[],
    )
    _apply(assignment, payload)
    db.add(assignment)
    db.commit()
    return CreatedEntitySchema(id=str(assignment.id))


@router.patch("/{user_id}", response_model=SimpleStatusSchema)
def update_room_assignment(
    user_id: str,
    payload: RoomAssignmentUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    if user_id != payload.userId:
        raise HTTPException(status_code=400, detail="Path user_id must match payload userId")
    assignment = db.scalar(select(RoomAssignment).where(RoomAssignment.user_id == user_id))
    if assignment is None:
        raise HTTPException(status_code=404, detail="RoomAssignment not found")
    _apply(assignment, payload)
    db.add(assignment)
    db.commit()
    return SimpleStatusSchema(ok=True)


@router.delete("/{user_id}", response_model=SimpleStatusSchema)
def delete_room_assignment(
    user_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    assignment = db.scalar(select(RoomAssignment).where(RoomAssignment.user_id == user_id))
    if assignment is None:
        raise HTTPException(status_code=404, detail="RoomAssignment not found")
    db.delete(assignment)
    db.commit()
    return SimpleStatusSchema(ok=True)
