from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import Project, User
from backend.app.schemas.api import CreatedEntitySchema, ProjectUpsertSchema, SimpleStatusSchema

from ._helpers import generate_id, get_or_404, require_organizer


router = APIRouter(prefix="/admin/projects", tags=["admin"])


def _apply(project: Project, payload: ProjectUpsertSchema) -> None:
    project.title = payload.title
    project.short_description = payload.shortDescription
    project.description = payload.description
    project.direction = payload.direction
    project.min_team = payload.minTeam
    project.max_team = payload.maxTeam
    project.mentor_name = payload.mentorName
    project.mentor_position = payload.mentorPosition
    project.mentor_city = payload.mentorCity
    project.mentor_telegram = payload.mentorTelegram
    project.mentor_photo = payload.mentorPhoto
    project.mentor_work_format = payload.mentorWorkFormat


@router.post("", response_model=CreatedEntitySchema)
def create_project(
    payload: ProjectUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatedEntitySchema:
    require_organizer(current_user)
    project = Project(
        id=generate_id("project"),
        title="",
        short_description="",
        direction="",
        min_team=1,
        max_team=1,
    )
    _apply(project, payload)
    db.add(project)
    db.commit()
    return CreatedEntitySchema(id=project.id)


@router.patch("/{project_id}", response_model=SimpleStatusSchema)
def update_project(
    project_id: str,
    payload: ProjectUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    project = get_or_404(db, Project, project_id)
    _apply(project, payload)
    db.add(project)
    db.commit()
    return SimpleStatusSchema(ok=True)


@router.delete("/{project_id}", response_model=SimpleStatusSchema)
def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    project = get_or_404(db, Project, project_id)
    db.delete(project)
    db.commit()
    return SimpleStatusSchema(ok=True)
