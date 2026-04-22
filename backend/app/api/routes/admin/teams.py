"""Команды проектов: фаза отбора, создание/удаление команд, распределение."""

from __future__ import annotations

from collections import defaultdict
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import (
    Camp,
    Project,
    ProjectAssignment,
    ProjectPreference,
    ProjectTeam,
    User,
    UserRole,
)
from backend.app.schemas.api import SimpleStatusSchema

from ._helpers import get_or_404, require_organizer, resolve_camp_id

router = APIRouter(prefix="/admin", tags=["admin"])


ALLOWED_PHASES = {"countdown", "open", "closed", "results"}


class PhaseUpdate(BaseModel):
    phase: str


@router.patch("/project-phase", response_model=SimpleStatusSchema)
def update_project_phase(
    payload: PhaseUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    if payload.phase not in ALLOWED_PHASES:
        raise HTTPException(status_code=400, detail=f"Unknown phase: {payload.phase}")
    camp_id = resolve_camp_id(db, current_user)
    camp = get_or_404(db, Camp, camp_id)
    camp.project_selection_phase = payload.phase
    db.add(camp)
    db.commit()
    return SimpleStatusSchema(ok=True)


class CreateTeamResponse(BaseModel):
    id: str
    projectId: str
    number: int


@router.post("/projects/{project_id}/teams", response_model=CreateTeamResponse)
def create_team(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreateTeamResponse:
    require_organizer(current_user)
    project = get_or_404(db, Project, project_id)
    existing_numbers = [
        row.number
        for row in db.scalars(select(ProjectTeam).where(ProjectTeam.project_id == project_id))
    ]
    next_number = (max(existing_numbers) + 1) if existing_numbers else 1
    team = ProjectTeam(id=f"team-{uuid4().hex[:12]}", project_id=project.id, number=next_number)
    db.add(team)
    db.commit()
    return CreateTeamResponse(id=team.id, projectId=team.project_id, number=team.number)


@router.delete("/teams/{team_id}", response_model=SimpleStatusSchema)
def delete_team(
    team_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    team = get_or_404(db, ProjectTeam, team_id)
    db.delete(team)
    db.commit()
    return SimpleStatusSchema(ok=True)


class AssignRequest(BaseModel):
    userId: str
    teamId: str | None  # null — снять назначение


@router.put("/project-assignments", response_model=SimpleStatusSchema)
def upsert_assignment(
    payload: AssignRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    user = get_or_404(db, User, payload.userId)
    if user.role != UserRole.participant:
        raise HTTPException(status_code=400, detail="Assignments only apply to participants")

    # Всегда удаляем прежнюю запись участника (один участник — одна команда).
    db.execute(delete(ProjectAssignment).where(ProjectAssignment.user_id == payload.userId))
    if payload.teamId:
        get_or_404(db, ProjectTeam, payload.teamId)
        db.add(ProjectAssignment(user_id=payload.userId, team_id=payload.teamId))
    db.commit()
    return SimpleStatusSchema(ok=True)


class AutoDistributeResponse(BaseModel):
    assigned: int
    unassigned: list[str] = Field(default_factory=list)


@router.post("/project-assignments/auto", response_model=AutoDistributeResponse)
def auto_distribute(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AutoDistributeResponse:
    """
    Распределяет участников по проектам на основе их приоритетов.

    Алгоритм greedy по приоритетам: для каждого участника (в случайном, но
    стабильном порядке — по id) перебираем его приоритеты от высшего к
    низшему и пытаемся посадить в первую команду проекта, где ещё есть
    место (до `project.max_team`). Если все приоритеты заполнены — пропускаем,
    участник уйдёт в `unassigned`, организатор распределит руками.

    Существующие назначения не трогаем: перезапуск auto не мешает ручным
    правкам. Только участники без команды получают новую.
    """
    require_organizer(current_user)
    camp_id = resolve_camp_id(db, current_user)

    participants = list(
        db.scalars(
            select(User)
            .where(
                User.camp_id == camp_id, User.role == UserRole.participant, User.is_active.is_(True)
            )
            .order_by(User.id.asc())
        )
    )

    already_assigned: set[str] = {row.user_id for row in db.scalars(select(ProjectAssignment))}

    preferences_by_user: dict[str, list[str]] = defaultdict(list)
    for pref in db.scalars(select(ProjectPreference).order_by(ProjectPreference.priority.asc())):
        preferences_by_user[pref.user_id].append(pref.project_id)

    projects_by_id = {project.id: project for project in db.scalars(select(Project))}

    # Текущее заполнение команд.
    team_fill: dict[str, int] = defaultdict(int)
    for assignment in db.scalars(select(ProjectAssignment)):
        team_fill[assignment.team_id] += 1

    teams_by_project: dict[str, list[ProjectTeam]] = defaultdict(list)
    for team in db.scalars(select(ProjectTeam).order_by(ProjectTeam.number.asc())):
        teams_by_project[team.project_id].append(team)

    def ensure_team_with_slot(project_id: str) -> ProjectTeam | None:
        project = projects_by_id.get(project_id)
        if project is None:
            return None
        for existing_team in teams_by_project.get(project_id, []):
            if team_fill[existing_team.id] < project.max_team:
                return existing_team
        # Автоматически создаём следующую команду, если существующие заполнены.
        existing = teams_by_project.get(project_id, [])
        next_number = (max((team.number for team in existing), default=0)) + 1
        new_team = ProjectTeam(
            id=f"team-{uuid4().hex[:12]}",
            project_id=project_id,
            number=next_number,
        )
        db.add(new_team)
        db.flush()
        teams_by_project[project_id].append(new_team)
        return new_team

    assigned_count = 0
    unassigned: list[str] = []
    for user in participants:
        if user.id in already_assigned:
            continue
        prefs = preferences_by_user.get(user.id, [])
        placed = False
        for project_id in prefs:
            team_for_user = ensure_team_with_slot(project_id)
            if team_for_user is None:
                continue
            db.add(ProjectAssignment(user_id=user.id, team_id=team_for_user.id))
            team_fill[team_for_user.id] += 1
            assigned_count += 1
            placed = True
            break
        if not placed:
            unassigned.append(user.id)

    db.commit()
    return AutoDistributeResponse(assigned=assigned_count, unassigned=unassigned)
