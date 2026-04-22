"""Чистые функции `_serialize_*`: ORM-модель → Pydantic-схема.

Никаких запросов в БД здесь не делается — всё что нужно передаётся параметром.
"""

from __future__ import annotations

from backend.app.models.entities import (
    Camp,
    CampusCategory,
    Document,
    Event,
    Material,
    OrgUpdate,
    Project,
    Resource,
    RoomAssignment,
    Story,
    User,
    UserRole,
)
from backend.app.schemas.api import (
    AdminDocumentSchema,
    AdminRoomAssignmentSchema,
    AdminUserSchema,
    AttendanceStatsSchema,
    CampDatesSchema,
    CampSchema,
    CampusCategorySchema,
    CampusItemSchema,
    CurrentUserSchema,
    DocumentSchema,
    EventSchema,
    MaterialSchema,
    OrgUpdateSchema,
    PersonSchema,
    ProjectSchema,
    ResourceSchema,
    RoomInfoSchema,
    StorySchema,
    StorySlideSchema,
)

from .helpers import capabilities_for, counts_for_attendance, resolve_event_status


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
        capabilities=capabilities_for(user),
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
        if resolve_event_status(event) != "cancelled" and counts_for_attendance(event)
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
        status=resolve_event_status(event),
        description=event.description,
        materials=event.materials,
        attendance=attendance.get(event.id),
        day=event.day,
        teacherIds=teacher_ids.get(event.id, []),
        isHidden=event.is_hidden,
        countsForAttendance=counts_for_attendance(event),
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
