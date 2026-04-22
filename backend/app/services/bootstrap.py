from __future__ import annotations

import re
from collections.abc import Iterable
from dataclasses import dataclass
from datetime import UTC, datetime, time
from typing import TypeVar
from zoneinfo import ZoneInfo

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.models.entities import (
    Camp,
    CampusCategory,
    Document,
    Event,
    EventCheckIn,
    EventTeacher,
    Material,
    OrgUpdate,
    Project,
    ProjectAssignment,
    ProjectPreference,
    ProjectTeam,
    Resource,
    RoomAssignment,
    Story,
    StoryRead,
    UpdateRead,
    User,
    UserRole,
)
from backend.app.schemas.api import (
    AdminDocumentSchema,
    AdminRoomAssignmentSchema,
    AdminUserSchema,
    AttendanceStatsSchema,
    BootstrapSchema,
    CampDatesSchema,
    CampSchema,
    CampusCategorySchema,
    CampusItemSchema,
    CapabilitySchema,
    CurrentUserSchema,
    DocumentSchema,
    EventSchema,
    MaterialSchema,
    OrgUpdateSchema,
    PersonSchema,
    ProjectSchema,
    ProjectTeamSchema,
    ResourceSchema,
    RoomInfoSchema,
    StorySchema,
    StorySlideSchema,
    UiStateSchema,
)

_HidableT = TypeVar("_HidableT")


ORGANIZER_CAPABILITIES = CapabilitySchema(
    canManageAll=True,
    canCreateEvents=True,
    canEditAllEvents=True,
    canEditOwnEvents=True,
    canManageUsers=True,
    canManageStories=True,
    canManageUpdates=True,
    canManageProjects=True,
    canManageMaterials=True,
    canManageResources=True,
    canManageCampus=True,
    canManageDocuments=True,
    canManageRooms=True,
    canAssignTeachers=True,
)

TEACHER_CAPABILITIES = CapabilitySchema(
    canEditOwnEvents=True,
    canManageMaterials=True,
    canManageResources=True,
)


@dataclass(frozen=True)
class _UserState:
    attendance: dict[str, str]
    story_reads: dict[str, bool]
    update_reads: dict[str, bool]
    project_priorities: list[str]
    room: RoomAssignment | None


def _now_local() -> datetime:
    return datetime.now(ZoneInfo(settings.timezone))


def _parse_hhmm(value: str) -> time | None:
    try:
        return time.fromisoformat(value.strip())
    except ValueError:
        return None


def _resolve_current_day(camp: Camp) -> int:
    today = _now_local().date()
    if today <= camp.start_date:
        return 1
    if today >= camp.end_date:
        return camp.total_days
    return (today - camp.start_date).days + 1


def _resolve_event_status(event: Event) -> str:
    if event.status.value in {"changed", "cancelled"}:
        return event.status.value

    now = _now_local()
    today = now.date()
    if event.event_date < today:
        return "completed"
    if event.event_date > today:
        return "upcoming"

    start_time = _parse_hhmm(event.start_at)
    end_time = _parse_hhmm(event.end_at)
    current_time = now.time().replace(tzinfo=None)

    if start_time and end_time:
        if current_time < start_time:
            return "upcoming"
        if current_time > end_time:
            return "completed"
        return "in_progress"

    return event.status.value


def _capabilities_for(user: User) -> CapabilitySchema:
    if user.role == UserRole.organizer:
        return ORGANIZER_CAPABILITIES
    if user.role == UserRole.teacher:
        return TEACHER_CAPABILITIES
    return CapabilitySchema()


def _serialize_camp(camp: Camp) -> CampSchema:
    return CampSchema(
        id=camp.id,
        name=camp.name,
        shortDesc=camp.short_desc,
        city=camp.city,
        university=camp.university,
        dates=CampDatesSchema(start=camp.start_date, end=camp.end_date),
        status=camp.status,
        dayTitles=camp.day_titles or {},
    )


def _serialize_person(user: User) -> PersonSchema:
    return PersonSchema(
        id=user.id,
        name=user.name,
        role=user.role.value,
        university=user.university,
        city=user.city,
        telegram=user.telegram,
        photo=user.photo_url,
        visibility=user.visibility_mode.value,
    )


def _serialize_current_user(
    user: User,
    attendance_stats: AttendanceStatsSchema | None = None,
    assigned_team_id: str | None = None,
) -> CurrentUserSchema:
    return CurrentUserSchema(
        **_serialize_person(user).model_dump(),
        email=user.email,
        notificationsOn=user.notifications_enabled,
        capabilities=_capabilities_for(user),
        attendance=attendance_stats,
        assignedTeamId=assigned_team_id,
    )


def _compute_attendance(
    events: list[Event],
    attendance: dict[str, str],
    user_role: UserRole,
) -> AttendanceStatsSchema:
    # Организаторам отметка посещаемости не релевантна — считаем нули.
    if user_role != UserRole.participant:
        return AttendanceStatsSchema(present=0, total=0, percentage=0, closed=False)
    relevant_events = [
        event
        for event in events
        if _resolve_event_status(event) != "cancelled" and _counts_for_attendance(event)
    ]
    total = len(relevant_events)
    present = sum(1 for event in relevant_events if attendance.get(event.id) == "confirmed")
    percentage = round(present / total * 100) if total > 0 else 0
    return AttendanceStatsSchema(
        present=present,
        total=total,
        percentage=percentage,
        closed=percentage >= 90,
    )


# Типы занятий, на которые «не ставится отметка»: питание, свободная работа
# над проектами, экскурсии и орг-события. Считаем, что отметка нужна только
# на лекциях / семинарах / практиках и подобных учебных форматах.
_NON_COUNTED_TYPE_RE = re.compile(
    r"(завтрак|обед|ужин|кофе|работ[аы]?\s+над\s+проектам|"
    r"регистрац|отъезд|экскурс|мероприят|знакомств|"
    r"вручен|открыт|закрыт|гитарник)",
    re.IGNORECASE,
)


def _counts_for_attendance(event: Event) -> bool:
    haystack = f"{event.type or ''} {event.title or ''}"
    return not _NON_COUNTED_TYPE_RE.search(haystack)


def _serialize_admin_user(user: User) -> AdminUserSchema:
    return AdminUserSchema(
        **_serialize_person(user).model_dump(),
        email=user.email,
        notificationsOn=user.notifications_enabled,
        isActive=user.is_active,
        showInPeople=user.show_in_people,
    )


def _serialize_event(
    event: Event,
    attendance: dict[str, str],
    teacher_ids: dict[str, list[str]],
) -> EventSchema:
    return EventSchema(
        id=event.id,
        date=event.event_date,
        title=event.title,
        type=event.type,
        startAt=event.start_at,
        endAt=event.end_at,
        place=event.place,
        building=event.building,
        address=event.address,
        status=_resolve_event_status(event),
        description=event.description,
        materials=event.materials,
        attendance=attendance.get(event.id),
        day=event.day,
        teacherIds=teacher_ids.get(event.id, []),
        isHidden=event.is_hidden,
        countsForAttendance=_counts_for_attendance(event),
    )


def _serialize_project(project: Project) -> ProjectSchema:
    return ProjectSchema(
        id=project.id,
        title=project.title,
        shortDescription=project.short_description,
        description=project.description,
        direction=project.direction,
        minTeam=project.min_team,
        maxTeam=project.max_team,
        mentorName=project.mentor_name,
        mentorPosition=project.mentor_position,
        mentorCity=project.mentor_city,
        mentorTelegram=project.mentor_telegram,
        mentorPhoto=project.mentor_photo,
        mentorWorkFormat=project.mentor_work_format,
        isHidden=project.is_hidden,
    )


def _serialize_story(story: Story, read_map: dict[str, bool]) -> StorySchema:
    return StorySchema(
        id=story.id,
        title=story.title,
        type=story.type.value,
        image=story.image,
        read=read_map.get(story.id, False),
        slides=[StorySlideSchema(**slide) for slide in story.slides],
        isHidden=story.is_hidden,
    )


def _serialize_org_update(update: OrgUpdate, read_map: dict[str, bool]) -> OrgUpdateSchema:
    return OrgUpdateSchema(
        id=update.id,
        text=update.text,
        time=update.time,
        isNew=update.is_new,
        type=update.type.value,
        isRead=read_map.get(update.id, False),
        isHidden=update.is_hidden,
    )


def _serialize_document(document: Document) -> DocumentSchema:
    return DocumentSchema(
        id=document.id,
        title=document.title,
        description=document.description,
        status=document.status.value,
        deadline=document.deadline,
        critical=document.critical,
        fallback=document.fallback,
    )


def _serialize_admin_document(document: Document) -> AdminDocumentSchema:
    return AdminDocumentSchema(
        id=document.id,
        userId=document.user_id,
        title=document.title,
        description=document.description,
        status=document.status.value,
        deadline=document.deadline,
        critical=document.critical,
        fallback=document.fallback,
    )


def _serialize_campus_category(category: CampusCategory) -> CampusCategorySchema:
    return CampusCategorySchema(
        id=category.id,
        icon=category.icon,
        title=category.title,
        items=[CampusItemSchema(**item) for item in category.items],
        isHidden=category.is_hidden,
    )


def _serialize_material(material: Material) -> MaterialSchema:
    return MaterialSchema(
        id=material.id,
        title=material.title,
        type=material.type.value,
        day=material.day,
        eventId=material.event_id,
        topic=material.topic,
        fileSize=material.file_size,
        isNew=material.is_new,
        url=material.url,
        isHidden=material.is_hidden,
    )


def _serialize_resource(resource: Resource) -> ResourceSchema:
    return ResourceSchema(
        id=resource.id,
        title=resource.title,
        category=resource.category,
        kind=resource.kind,
        description=resource.description,
        url=resource.url,
        day=resource.day,
        eventId=resource.event_id,
        isNew=resource.is_new,
        isHidden=resource.is_hidden,
    )


def _serialize_room(room: RoomAssignment | None) -> RoomInfoSchema | None:
    if room is None:
        return None
    return RoomInfoSchema(
        number=room.number,
        floor=room.floor,
        building=room.building,
        neighbors=room.neighbors,
        keyInfo=room.key_info,
        rules=room.rules,
    )


def _serialize_admin_room_assignment(assignment: RoomAssignment) -> AdminRoomAssignmentSchema:
    return AdminRoomAssignmentSchema(
        userId=assignment.user_id,
        number=assignment.number,
        floor=assignment.floor,
        building=assignment.building,
        neighbors=assignment.neighbors,
        keyInfo=assignment.key_info,
        rules=assignment.rules,
    )


def _load_user_state(db: Session, user: User) -> _UserState:
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
    return _UserState(
        attendance=attendance,
        story_reads=story_reads,
        update_reads=update_reads,
        project_priorities=project_priorities,
        room=room,
    )


def _load_event_teachers(db: Session) -> dict[str, list[str]]:
    mapping: dict[str, list[str]] = {}
    for row in db.scalars(select(EventTeacher)):
        mapping.setdefault(row.event_id, []).append(row.teacher_id)
    return mapping


def build_bootstrap(db: Session, user: User) -> BootstrapSchema:
    camp = user.camp or db.scalar(select(Camp).limit(1))
    if camp is None:
        raise HTTPException(status_code=503, detail="Camp data is missing")

    state = _load_user_state(db, user)
    event_teachers = _load_event_teachers(db)

    events = db.scalars(
        select(Event).order_by(Event.event_date.asc(), Event.start_at.asc(), Event.id.asc())
    ).all()
    people = db.scalars(
        select(User)
        .where(User.is_active.is_(True), User.show_in_people.is_(True))
        .order_by(User.role.asc(), User.name.asc())
    ).all()
    projects = db.scalars(select(Project).order_by(Project.title.asc())).all()
    stories = db.scalars(select(Story).order_by(Story.id.asc())).all()
    updates = db.scalars(select(OrgUpdate).order_by(OrgUpdate.id.desc())).all()
    documents = db.scalars(
        select(Document).where(Document.user_id == user.id).order_by(Document.id.asc())
    ).all()
    campus_categories = db.scalars(select(CampusCategory).order_by(CampusCategory.id.asc())).all()
    materials = db.scalars(
        select(Material).order_by(
            Material.day.is_(None).asc(), Material.day.asc(), Material.id.asc()
        )
    ).all()
    resources = db.scalars(
        select(Resource).order_by(
            Resource.day.is_(None).asc(),
            Resource.day.asc(),
            Resource.category.asc(),
            Resource.id.asc(),
        )
    ).all()

    is_organizer = user.role == UserRole.organizer
    admin_users = (
        db.scalars(select(User).order_by(User.role.asc(), User.name.asc())).all()
        if is_organizer
        else []
    )
    admin_documents = (
        db.scalars(select(Document).order_by(Document.user_id.asc(), Document.id.asc())).all()
        if is_organizer
        else []
    )
    admin_room_assignments = (
        db.scalars(
            select(RoomAssignment).order_by(RoomAssignment.user_id.asc(), RoomAssignment.id.asc())
        ).all()
        if is_organizer
        else []
    )

    attendance_stats = _compute_attendance(list(events), state.attendance, user.role)

    # Организатор видит всё (чтобы управлять), участники и преподаватели —
    # только незаскрытое. Skip attendance-relevant события из статистики ниже
    # не требуется: для is_hidden=True такие события у участника не появятся.
    def visible(items: Iterable[_HidableT]) -> list[_HidableT]:
        if is_organizer:
            return list(items)
        return [item for item in items if not getattr(item, "is_hidden", False)]

    teams = db.scalars(
        select(ProjectTeam).order_by(ProjectTeam.project_id.asc(), ProjectTeam.number.asc())
    ).all()
    team_members: dict[str, list[str]] = {team.id: [] for team in teams}
    assigned_team_id: str | None = None
    for row in db.scalars(select(ProjectAssignment)):
        team_members.setdefault(row.team_id, []).append(row.user_id)
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
        ui=UiStateSchema(currentDay=_resolve_current_day(camp), totalDays=camp.total_days),
        lastSyncedAt=datetime.now(UTC),
    )
