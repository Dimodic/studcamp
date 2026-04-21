from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import EventCheckIn, OrgUpdate, Project, ProjectPreference, Story, StoryRead, UpdateRead, User, VisibilityMode
from backend.app.schemas.api import (
    BootstrapSchema,
    EventCheckInSchema,
    MarkUpdatesReadSchema,
    ProfilePreferencesSchema,
    ProjectPreferencesSchema,
    SimpleStatusSchema,
)
from backend.app.services.bootstrap import build_bootstrap


router = APIRouter(tags=["app"])


@router.get("/bootstrap", response_model=BootstrapSchema)
def bootstrap(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> BootstrapSchema:
    return build_bootstrap(db, current_user)


@router.post("/stories/{story_id}/read", response_model=SimpleStatusSchema)
def mark_story_read(story_id: str, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> SimpleStatusSchema:
    story = db.scalar(select(Story).where(Story.id == story_id))
    if story is None:
        raise HTTPException(status_code=404, detail="Story not found")

    story_read = db.scalar(select(StoryRead).where(StoryRead.user_id == current_user.id, StoryRead.story_id == story_id))
    if story_read is None:
        story_read = StoryRead(user_id=current_user.id, story_id=story_id, is_read=True)
        db.add(story_read)
    else:
        story_read.is_read = True
    db.commit()
    return SimpleStatusSchema(ok=True)


@router.post("/events/{event_id}/check-in", response_model=SimpleStatusSchema)
def check_in_event(
    event_id: str,
    payload: EventCheckInSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    checkin = db.scalar(select(EventCheckIn).where(EventCheckIn.user_id == current_user.id, EventCheckIn.event_id == event_id))
    if checkin is None:
        checkin = EventCheckIn(user_id=current_user.id, event_id=event_id, attendance_status=payload.attendance)
        db.add(checkin)
    else:
        checkin.attendance_status = payload.attendance
    db.commit()
    return SimpleStatusSchema(ok=True)


@router.put("/projects/preferences", response_model=SimpleStatusSchema)
def save_project_preferences(
    payload: ProjectPreferencesSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    valid_ids = {
        project_id
        for project_id in db.scalars(select(Project.id).where(Project.id.in_(payload.projectIds))).all()
    }
    requested_ids = [project_id for project_id in payload.projectIds if project_id in valid_ids]
    db.execute(delete(ProjectPreference).where(ProjectPreference.user_id == current_user.id))
    for priority, project_id in enumerate(requested_ids, start=1):
        db.add(ProjectPreference(user_id=current_user.id, project_id=project_id, priority=priority))
    db.commit()
    return SimpleStatusSchema(ok=True)


@router.patch("/profile/preferences", response_model=SimpleStatusSchema)
def update_profile_preferences(
    payload: ProfilePreferencesSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    if payload.visibilityMode is not None:
        current_user.visibility_mode = VisibilityMode(payload.visibilityMode)
    if payload.notificationsOn is not None:
        current_user.notifications_enabled = payload.notificationsOn
    db.add(current_user)
    db.commit()
    return SimpleStatusSchema(ok=True)


@router.post("/updates/mark-read", response_model=SimpleStatusSchema)
def mark_updates_read(
    payload: MarkUpdatesReadSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    if payload.markAll:
        for update in db.scalars(select(OrgUpdate)).all():
            record = db.scalar(
                select(UpdateRead).where(UpdateRead.user_id == current_user.id, UpdateRead.update_id == update.id)
            )
            if record is None:
                db.add(UpdateRead(user_id=current_user.id, update_id=update.id, is_read=True))
            else:
                record.is_read = True
        db.commit()
        return SimpleStatusSchema(ok=True)

    for update_id in payload.updateIds or []:
        record = db.scalar(select(UpdateRead).where(UpdateRead.user_id == current_user.id, UpdateRead.update_id == update_id))
        if record is None:
            db.add(UpdateRead(user_id=current_user.id, update_id=update_id, is_read=True))
        else:
            record.is_read = True
    db.commit()
    return SimpleStatusSchema(ok=True)
