from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import Story, StoryType, User
from backend.app.schemas.api import CreatedEntitySchema, SimpleStatusSchema, StoryUpsertSchema

from ._helpers import generate_id, get_or_404, parse_enum, require_organizer


router = APIRouter(prefix="/admin/stories", tags=["admin"])


def _apply(story: Story, payload: StoryUpsertSchema) -> None:
    story.title = payload.title
    story.type = parse_enum(StoryType, payload.type, "type")
    story.image = payload.image
    story.slides = [slide.model_dump() for slide in payload.slides]


@router.post("", response_model=CreatedEntitySchema)
def create_story(
    payload: StoryUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatedEntitySchema:
    require_organizer(current_user)
    story = Story(id=generate_id("story"), title="", type=StoryType.info, image="", slides=[])
    _apply(story, payload)
    db.add(story)
    db.commit()
    return CreatedEntitySchema(id=story.id)


@router.patch("/{story_id}", response_model=SimpleStatusSchema)
def update_story(
    story_id: str,
    payload: StoryUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    story = get_or_404(db, Story, story_id)
    _apply(story, payload)
    db.add(story)
    db.commit()
    return SimpleStatusSchema(ok=True)


@router.delete("/{story_id}", response_model=SimpleStatusSchema)
def delete_story(
    story_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    story = get_or_404(db, Story, story_id)
    db.delete(story)
    db.commit()
    return SimpleStatusSchema(ok=True)
