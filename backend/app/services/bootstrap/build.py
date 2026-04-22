"""Главная точка входа: build_bootstrap(db, user) — собирает payload."""

from __future__ import annotations

from collections.abc import Iterable
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.models.entities import (
    Camp,
    CampusCategory,
    Document,
    Event,
    Material,
    OrgUpdate,
    Project,
    ProjectAssignment,
    ProjectTeam,
    Resource,
    RoomAssignment,
    Story,
    User,
    UserRole,
)
from backend.app.schemas.api import BootstrapSchema, ProjectTeamSchema, UiStateSchema

from .helpers import _HidableT, resolve_current_day
from .loaders import load_event_teachers, load_user_state
from .serializers import (
    _compute_attendance,
    _serialize_admin_document,
    _serialize_admin_room_assignment,
    _serialize_admin_user,
    _serialize_camp,
    _serialize_campus_category,
    _serialize_current_user,
    _serialize_document,
    _serialize_event,
    _serialize_material,
    _serialize_org_update,
    _serialize_person,
    _serialize_project,
    _serialize_resource,
    _serialize_room,
    _serialize_story,
)


def build_bootstrap(db: Session, user: User) -> BootstrapSchema:
    # Организатор видит активный кемп (его «текущий рабочий контекст»).
    # Участники и преподаватели видят тот кемп, к которому привязаны.
    # Кемпы изолированы: содержимое (events, projects, stories, ...) не
    # просачивается между ними.
    is_organizer = user.role == UserRole.organizer
    if is_organizer:
        camp = (
            db.scalar(select(Camp).where(Camp.is_active.is_(True)))
            or user.camp
            or db.scalar(select(Camp).limit(1))
        )
    else:
        camp = user.camp or db.scalar(select(Camp).where(Camp.is_active.is_(True)))
    if camp is None:
        raise HTTPException(status_code=503, detail="Camp data is missing")

    state = load_user_state(db, user)
    event_teachers = load_event_teachers(db)

    events = db.scalars(
        select(Event)
        .where(Event.camp_id == camp.id)
        .order_by(Event.event_date.asc(), Event.start_at.asc(), Event.id.asc())
    ).all()
    people = db.scalars(
        select(User)
        .where(
            User.camp_id == camp.id,
            User.is_active.is_(True),
            User.show_in_people.is_(True),
        )
        .order_by(User.role.asc(), User.name.asc())
    ).all()
    projects = db.scalars(
        select(Project).where(Project.camp_id == camp.id).order_by(Project.title.asc())
    ).all()
    stories = db.scalars(
        select(Story).where(Story.camp_id == camp.id).order_by(Story.id.asc())
    ).all()
    updates = db.scalars(
        select(OrgUpdate).where(OrgUpdate.camp_id == camp.id).order_by(OrgUpdate.id.desc())
    ).all()
    documents = db.scalars(
        select(Document).where(Document.user_id == user.id).order_by(Document.id.asc())
    ).all()
    campus_categories = db.scalars(
        select(CampusCategory)
        .where(CampusCategory.camp_id == camp.id)
        .order_by(CampusCategory.id.asc())
    ).all()
    materials = db.scalars(
        select(Material)
        .where(Material.camp_id == camp.id)
        .order_by(Material.day.is_(None).asc(), Material.day.asc(), Material.id.asc())
    ).all()
    resources = db.scalars(
        select(Resource)
        .where(Resource.camp_id == camp.id)
        .order_by(
            Resource.day.is_(None).asc(),
            Resource.day.asc(),
            Resource.category.asc(),
            Resource.id.asc(),
        )
    ).all()

    admin_users = (
        db.scalars(
            select(User).where(User.camp_id == camp.id).order_by(User.role.asc(), User.name.asc())
        ).all()
        if is_organizer
        else []
    )
    admin_documents = (
        db.scalars(
            select(Document)
            .join(User, Document.user_id == User.id)
            .where(User.camp_id == camp.id)
            .order_by(Document.user_id.asc(), Document.id.asc())
        ).all()
        if is_organizer
        else []
    )
    admin_room_assignments = (
        db.scalars(
            select(RoomAssignment)
            .join(User, RoomAssignment.user_id == User.id)
            .where(User.camp_id == camp.id)
            .order_by(RoomAssignment.user_id.asc(), RoomAssignment.id.asc())
        ).all()
        if is_organizer
        else []
    )

    attendance_stats = _compute_attendance(list(events), state.attendance, user.role)

    # Организатор видит всё (чтобы управлять), участники и преподаватели —
    # только незаскрытое. Скип attendance-relevant-событий из статистики ниже
    # не требуется: у участника is_hidden=True события просто не появятся.
    def visible(items: Iterable[_HidableT]) -> list[_HidableT]:
        if is_organizer:
            return list(items)
        return [item for item in items if not getattr(item, "is_hidden", False)]

    teams = db.scalars(
        select(ProjectTeam)
        .join(Project, ProjectTeam.project_id == Project.id)
        .where(Project.camp_id == camp.id)
        .order_by(ProjectTeam.project_id.asc(), ProjectTeam.number.asc())
    ).all()
    team_ids = {team.id for team in teams}
    team_members: dict[str, list[str]] = {team.id: [] for team in teams}
    assigned_team_id: str | None = None
    for row in db.scalars(select(ProjectAssignment)):
        if row.team_id not in team_ids:
            continue  # assignment принадлежит проекту другого кемпа
        team_members[row.team_id].append(row.user_id)
        if row.user_id == user.id:
            assigned_team_id = row.team_id

    team_schemas = [
        ProjectTeamSchema(
            id=team.id,
            projectId=team.project_id,
            number=team.number,
            memberIds=team_members.get(team.id, []),
        )
        for team in teams
    ]

    return BootstrapSchema(
        camp=_serialize_camp(camp),
        currentUser=_serialize_current_user(user, attendance_stats, assigned_team_id),
        events=[
            _serialize_event(event, state.attendance, event_teachers) for event in visible(events)
        ],
        people=[_serialize_person(person) for person in people],
        projects=[_serialize_project(project) for project in visible(projects)],
        projectSelectionPhase=camp.project_selection_phase,
        projectPriorities=state.project_priorities,
        projectTeams=team_schemas,
        stories=[_serialize_story(story, state.story_reads) for story in visible(stories)],
        orgUpdates=[
            _serialize_org_update(update, state.update_reads) for update in visible(updates)
        ],
        documents=[_serialize_document(document) for document in documents],
        campusCategories=[
            _serialize_campus_category(category) for category in visible(campus_categories)
        ],
        room=_serialize_room(state.room),
        materials=[_serialize_material(material) for material in visible(materials)],
        resources=[_serialize_resource(resource) for resource in visible(resources)],
        adminUsers=[_serialize_admin_user(person) for person in admin_users],
        adminDocuments=[_serialize_admin_document(document) for document in admin_documents],
        adminRoomAssignments=[
            _serialize_admin_room_assignment(assignment) for assignment in admin_room_assignments
        ],
        ui=UiStateSchema(currentDay=resolve_current_day(camp), totalDays=camp.total_days),
        lastSyncedAt=datetime.now(UTC),
    )
