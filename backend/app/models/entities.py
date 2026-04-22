from __future__ import annotations

import enum
from datetime import date, datetime

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.app.db.base import Base


class UserRole(enum.StrEnum):
    participant = "participant"
    teacher = "teacher"
    organizer = "organizer"


class VisibilityMode(enum.StrEnum):
    name_only = "name_only"
    name_plus_fields = "name_plus_fields"


class EventStatus(enum.StrEnum):
    upcoming = "upcoming"
    in_progress = "in_progress"
    completed = "completed"
    changed = "changed"
    cancelled = "cancelled"


class StoryType(enum.StrEnum):
    info = "info"
    urgent = "urgent"
    navigation = "navigation"
    project = "project"


class UpdateType(enum.StrEnum):
    change = "change"
    info = "info"
    urgent = "urgent"


class DocumentStatus(enum.StrEnum):
    done = "done"
    in_progress = "in_progress"
    blocked = "blocked"
    not_started = "not_started"


class MaterialType(enum.StrEnum):
    presentation = "presentation"
    recording = "recording"
    guide = "guide"
    checklist = "checklist"
    org_doc = "org_doc"


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Camp(TimestampMixin, Base):
    __tablename__ = "camps"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    short_desc: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str] = mapped_column(String(128), nullable=False)
    university: Mapped[str] = mapped_column(String(255), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    current_day: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    total_days: Mapped[int] = mapped_column(Integer, default=14, nullable=False)
    project_selection_phase: Mapped[str] = mapped_column(String(32), default="open", nullable=False)
    # { "1": "Вводный день", "2": "День системного программирования", ... }
    day_titles: Mapped[dict[str, str] | None] = mapped_column(JSON)
    # Только один кемп может быть активным одновременно — именно он
    # отображается всем участникам и преподавателям. Организатор
    # переключает его через /admin/camps/{id}/activate.
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    users: Mapped[list[User]] = relationship(back_populates="camp")
    events: Mapped[list[Event]] = relationship(back_populates="camp")


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    camp_id: Mapped[str | None] = mapped_column(ForeignKey("camps.id", ondelete="SET NULL"))
    email: Mapped[str | None] = mapped_column(String(255), unique=True)
    password_salt: Mapped[str | None] = mapped_column(String(64))
    password_hash: Mapped[str | None] = mapped_column(String(128))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    university: Mapped[str | None] = mapped_column(String(255))
    city: Mapped[str | None] = mapped_column(String(128))
    telegram: Mapped[str | None] = mapped_column(String(128))
    photo_url: Mapped[str | None] = mapped_column(Text)
    visibility_mode: Mapped[VisibilityMode] = mapped_column(
        Enum(VisibilityMode),
        default=VisibilityMode.name_plus_fields,
        nullable=False,
    )
    notifications_enabled: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_in_people: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    camp: Mapped[Camp | None] = relationship(back_populates="users")
    sessions: Mapped[list[Session]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    documents: Mapped[list[Document]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    story_reads: Mapped[list[StoryRead]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    update_reads: Mapped[list[UpdateRead]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    event_checkins: Mapped[list[EventCheckIn]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    project_preferences: Mapped[list[ProjectPreference]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    room_assignment: Mapped[RoomAssignment | None] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    teaching_event_links: Mapped[list[EventTeacher]] = relationship(
        back_populates="teacher", cascade="all, delete-orphan"
    )


class Session(TimestampMixin, Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    token: Mapped[str] = mapped_column(String(64), unique=True, nullable=False, index=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped[User] = relationship(back_populates="sessions")


class Event(TimestampMixin, Base):
    __tablename__ = "events"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    camp_id: Mapped[str] = mapped_column(ForeignKey("camps.id", ondelete="CASCADE"), nullable=False)
    event_date: Mapped[date] = mapped_column(Date, nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(64), nullable=False)
    start_at: Mapped[str] = mapped_column(String(16), nullable=False)
    end_at: Mapped[str] = mapped_column(String(16), nullable=False)
    place: Mapped[str] = mapped_column(String(255), nullable=False)
    building: Mapped[str] = mapped_column(String(255), nullable=False)
    address: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[EventStatus] = mapped_column(Enum(EventStatus), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    materials: Mapped[list[str] | None] = mapped_column(JSON)
    day: Mapped[int] = mapped_column(Integer, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    camp: Mapped[Camp] = relationship(back_populates="events")
    checkins: Mapped[list[EventCheckIn]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )
    attached_materials: Mapped[list[Material]] = relationship(back_populates="event")
    resources: Mapped[list[Resource]] = relationship(back_populates="event")
    teacher_links: Mapped[list[EventTeacher]] = relationship(
        back_populates="event", cascade="all, delete-orphan"
    )


class EventTeacher(TimestampMixin, Base):
    __tablename__ = "event_teachers"
    __table_args__ = (
        UniqueConstraint("event_id", "teacher_id", name="uq_event_teachers_event_teacher"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_id: Mapped[str] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    teacher_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )

    event: Mapped[Event] = relationship(back_populates="teacher_links")
    teacher: Mapped[User] = relationship(back_populates="teaching_event_links")


class EventCheckIn(TimestampMixin, Base):
    __tablename__ = "event_checkins"
    __table_args__ = (UniqueConstraint("user_id", "event_id", name="uq_event_checkins_user_event"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    event_id: Mapped[str] = mapped_column(
        ForeignKey("events.id", ondelete="CASCADE"), nullable=False
    )
    attendance_status: Mapped[str] = mapped_column(
        String(32), default="not_checked", nullable=False
    )
    # Откуда пришла отметка: "self" (участник сам), "sheet" (LLM-парсинг фото
    # листка посещаемости), "manual" (организатор поставил вручную).
    source: Mapped[str] = mapped_column(String(16), default="self", nullable=False)

    user: Mapped[User] = relationship(back_populates="event_checkins")
    event: Mapped[Event] = relationship(back_populates="checkins")


class Project(TimestampMixin, Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    camp_id: Mapped[str] = mapped_column(
        ForeignKey("camps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    short_description: Mapped[str] = mapped_column(Text, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    direction: Mapped[str] = mapped_column(String(128), nullable=False)
    min_team: Mapped[int] = mapped_column(Integer, nullable=False)
    max_team: Mapped[int] = mapped_column(Integer, nullable=False)
    mentor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mentor_position: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mentor_city: Mapped[str | None] = mapped_column(String(128), nullable=True)
    mentor_telegram: Mapped[str | None] = mapped_column(String(128), nullable=True)
    mentor_photo: Mapped[str | None] = mapped_column(String(500), nullable=True)
    mentor_work_format: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    preferences: Mapped[list[ProjectPreference]] = relationship(
        back_populates="project", cascade="all, delete-orphan"
    )


class ProjectPreference(TimestampMixin, Base):
    __tablename__ = "project_preferences"
    __table_args__ = (
        UniqueConstraint("user_id", "project_id", name="uq_project_preferences_user_project"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    priority: Mapped[int] = mapped_column(Integer, nullable=False)

    user: Mapped[User] = relationship(back_populates="project_preferences")
    project: Mapped[Project] = relationship(back_populates="preferences")


class ProjectTeam(TimestampMixin, Base):
    """Команда внутри проекта. Команд у проекта может быть несколько (1, 2, …)."""

    __tablename__ = "project_teams"
    __table_args__ = (
        UniqueConstraint("project_id", "number", name="uq_project_teams_project_number"),
    )

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    project_id: Mapped[str] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    number: Mapped[int] = mapped_column(Integer, nullable=False)

    assignments: Mapped[list[ProjectAssignment]] = relationship(
        back_populates="team", cascade="all, delete-orphan"
    )


class ProjectAssignment(TimestampMixin, Base):
    """Кто в какой команде. Один участник — одна команда на весь кемп."""

    __tablename__ = "project_assignments"
    __table_args__ = (UniqueConstraint("user_id", name="uq_project_assignments_user"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    team_id: Mapped[str] = mapped_column(
        ForeignKey("project_teams.id", ondelete="CASCADE"), nullable=False
    )

    team: Mapped[ProjectTeam] = relationship(back_populates="assignments")


class Story(TimestampMixin, Base):
    __tablename__ = "stories"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    camp_id: Mapped[str] = mapped_column(
        ForeignKey("camps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[StoryType] = mapped_column(Enum(StoryType), nullable=False)
    image: Mapped[str] = mapped_column(Text, nullable=False)
    slides: Mapped[list[dict[str, str]]] = mapped_column(JSON, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    reads: Mapped[list[StoryRead]] = relationship(
        back_populates="story", cascade="all, delete-orphan"
    )


class StoryRead(TimestampMixin, Base):
    __tablename__ = "story_reads"
    __table_args__ = (UniqueConstraint("user_id", "story_id", name="uq_story_reads_user_story"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    story_id: Mapped[str] = mapped_column(
        ForeignKey("stories.id", ondelete="CASCADE"), nullable=False
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped[User] = relationship(back_populates="story_reads")
    story: Mapped[Story] = relationship(back_populates="reads")


class OrgUpdate(TimestampMixin, Base):
    __tablename__ = "org_updates"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    camp_id: Mapped[str] = mapped_column(
        ForeignKey("camps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    text: Mapped[str] = mapped_column(Text, nullable=False)
    time: Mapped[str] = mapped_column(String(32), nullable=False)
    is_new: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    type: Mapped[UpdateType] = mapped_column(Enum(UpdateType), nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    reads: Mapped[list[UpdateRead]] = relationship(
        back_populates="update", cascade="all, delete-orphan"
    )


class UpdateRead(TimestampMixin, Base):
    __tablename__ = "update_reads"
    __table_args__ = (UniqueConstraint("user_id", "update_id", name="uq_update_reads_user_update"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    update_id: Mapped[str] = mapped_column(
        ForeignKey("org_updates.id", ondelete="CASCADE"), nullable=False
    )
    is_read: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    user: Mapped[User] = relationship(back_populates="update_reads")
    update: Mapped[OrgUpdate] = relationship(back_populates="reads")


class Document(TimestampMixin, Base):
    __tablename__ = "documents"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[DocumentStatus] = mapped_column(Enum(DocumentStatus), nullable=False)
    deadline: Mapped[str | None] = mapped_column(String(64))
    critical: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    fallback: Mapped[str | None] = mapped_column(Text)

    user: Mapped[User] = relationship(back_populates="documents")


class CampusCategory(TimestampMixin, Base):
    __tablename__ = "campus_categories"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    camp_id: Mapped[str] = mapped_column(
        ForeignKey("camps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    icon: Mapped[str] = mapped_column(String(64), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    items: Mapped[list[dict[str, str]]] = mapped_column(JSON, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class RoomAssignment(TimestampMixin, Base):
    __tablename__ = "room_assignments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    number: Mapped[str] = mapped_column(String(32), nullable=False)
    floor: Mapped[int] = mapped_column(Integer, nullable=False)
    building: Mapped[str] = mapped_column(String(255), nullable=False)
    neighbors: Mapped[list[str]] = mapped_column(JSON, nullable=False)
    key_info: Mapped[str] = mapped_column(Text, nullable=False)
    rules: Mapped[list[str]] = mapped_column(JSON, nullable=False)

    user: Mapped[User] = relationship(back_populates="room_assignment")


class Material(TimestampMixin, Base):
    __tablename__ = "materials"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    camp_id: Mapped[str] = mapped_column(
        ForeignKey("camps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[MaterialType] = mapped_column(Enum(MaterialType), nullable=False)
    day: Mapped[int | None] = mapped_column(Integer)
    event_id: Mapped[str | None] = mapped_column(ForeignKey("events.id", ondelete="SET NULL"))
    topic: Mapped[str | None] = mapped_column(String(128))
    file_size: Mapped[str | None] = mapped_column(String(64))
    is_new: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    event: Mapped[Event | None] = relationship(back_populates="attached_materials")


class Resource(TimestampMixin, Base):
    __tablename__ = "resources"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    camp_id: Mapped[str] = mapped_column(
        ForeignKey("camps.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str] = mapped_column(String(32), nullable=False)
    kind: Mapped[str] = mapped_column(String(32), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    url: Mapped[str] = mapped_column(Text, nullable=False)
    day: Mapped[int | None] = mapped_column(Integer)
    event_id: Mapped[str | None] = mapped_column(ForeignKey("events.id", ondelete="SET NULL"))
    is_new: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_hidden: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    event: Mapped[Event | None] = relationship(back_populates="resources")
