"""Выборка состояния текущего пользователя из БД."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.entities import (
    EventCheckIn,
    EventTeacher,
    ProjectPreference,
    RoomAssignment,
    StoryRead,
    UpdateRead,
    User,
)

from .helpers import UserState


def load_user_state(db: Session, user: User) -> UserState:
    attendance = {
        row.event_id: row.attendance_status
        for row in db.scalars(select(EventCheckIn).where(EventCheckIn.user_id == user.id))
    }
    story_reads = {
        row.story_id: row.is_read
        for row in db.scalars(select(StoryRead).where(StoryRead.user_id == user.id))
    }
    update_reads = {
        row.update_id: row.is_read
        for row in db.scalars(select(UpdateRead).where(UpdateRead.user_id == user.id))
    }
    project_priorities = [
        row.project_id
        for row in db.scalars(
            select(ProjectPreference)
            .where(ProjectPreference.user_id == user.id)
            .order_by(ProjectPreference.priority.asc())
        )
    ]
    room = db.scalar(select(RoomAssignment).where(RoomAssignment.user_id == user.id))
    return UserState(
        attendance=attendance,
        story_reads=story_reads,
        update_reads=update_reads,
        project_priorities=project_priorities,
        room=room,
    )


def load_event_teachers(db: Session) -> dict[str, list[str]]:
    mapping: dict[str, list[str]] = {}
    for row in db.scalars(select(EventTeacher)):
        mapping.setdefault(row.event_id, []).append(row.teacher_id)
    return mapping
