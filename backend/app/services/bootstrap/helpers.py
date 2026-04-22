"""Чистые хелперы, не трогающие БД."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime, time
from typing import TypeVar
from zoneinfo import ZoneInfo

from backend.app.core.config import settings
from backend.app.models.entities import Camp, Event, RoomAssignment, User, UserRole
from backend.app.schemas.api import CapabilitySchema

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
class UserState:
    """Состояние текущего юзера: отметки, чтения, приоритеты, комната."""

    attendance: dict[str, str]
    story_reads: dict[str, bool]
    update_reads: dict[str, bool]
    project_priorities: list[str]
    room: RoomAssignment | None


def now_local() -> datetime:
    return datetime.now(ZoneInfo(settings.timezone))


def parse_hhmm(value: str) -> time | None:
    try:
        return time.fromisoformat(value.strip())
    except ValueError:
        return None


def resolve_current_day(camp: Camp) -> int:
    today = now_local().date()
    if today <= camp.start_date:
        return 1
    if today >= camp.end_date:
        return camp.total_days
    return (today - camp.start_date).days + 1


def resolve_event_status(event: Event) -> str:
    if event.status.value in {"changed", "cancelled"}:
        return event.status.value

    now = now_local()
    today = now.date()
    if event.event_date < today:
        return "completed"
    if event.event_date > today:
        return "upcoming"

    start_time = parse_hhmm(event.start_at)
    end_time = parse_hhmm(event.end_at)
    current_time = now.time().replace(tzinfo=None)

    if start_time and end_time:
        if current_time < start_time:
            return "upcoming"
        if current_time > end_time:
            return "completed"
        return "in_progress"

    return event.status.value


# Типы занятий, на которые «не ставится отметка»: питание, свободная работа
# над проектами, экскурсии и орг-события. Считаем, что отметка нужна только
# на лекциях / семинарах / практиках и подобных учебных форматах.
_NON_COUNTED_TYPE_RE = re.compile(
    r"(завтрак|обед|ужин|кофе|работ[аы]?\s+над\s+проектам|"
    r"регистрац|отъезд|экскурс|мероприят|знакомств|"
    r"вручен|открыт|закрыт|гитарник)",
    re.IGNORECASE,
)


def counts_for_attendance(event: Event) -> bool:
    haystack = f"{event.type or ''} {event.title or ''}"
    return not _NON_COUNTED_TYPE_RE.search(haystack)


def capabilities_for(user: User) -> CapabilitySchema:
    if user.role == UserRole.organizer:
        return ORGANIZER_CAPABILITIES
    if user.role == UserRole.teacher:
        return TEACHER_CAPABILITIES
    return CapabilitySchema()
