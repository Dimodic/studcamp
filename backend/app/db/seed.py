from __future__ import annotations

import json
from datetime import date
from pathlib import Path
from typing import Iterable

from sqlalchemy import delete
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.security import hash_password
from backend.app.models.entities import (
    Camp,
    CampusCategory,
    Document,
    DocumentStatus,
    Event,
    EventCheckIn,
    EventStatus,
    EventTeacher,
    Material,
    MaterialType,
    OrgUpdate,
    Project,
    ProjectPreference,
    Resource,
    RoomAssignment,
    Session as UserSession,
    Story,
    StoryType,
    StoryRead,
    UpdateRead,
    UpdateType,
    User,
    UserRole,
    VisibilityMode,
)


RESET_ORDER: tuple[type, ...] = (
    UpdateRead,
    StoryRead,
    EventCheckIn,
    EventTeacher,
    ProjectPreference,
    UserSession,
    RoomAssignment,
    Document,
    Resource,
    Material,
    Event,
    Story,
    Project,
    OrgUpdate,
    CampusCategory,
    User,
    Camp,
)


def _load_seed(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _reset_tables(db: Session) -> None:
    for model in RESET_ORDER:
        db.execute(delete(model))
    db.flush()


def _seed_camp(db: Session, payload: dict) -> None:
    db.add(
        Camp(
            id=payload["id"],
            name=payload["name"],
            short_desc=payload.get("short_desc"),
            city=payload["city"],
            university=payload["university"],
            start_date=date.fromisoformat(payload["start_date"]),
            end_date=date.fromisoformat(payload["end_date"]),
            status=payload["status"],
            current_day=payload["current_day"],
            total_days=payload["total_days"],
            project_selection_phase=payload["project_selection_phase"],
            day_titles=payload.get("day_titles"),
        )
    )


def _seed_users(db: Session, users: Iterable[dict], camp_id: str, default_password: str) -> None:
    salt, password_hash = hash_password(default_password)
    for payload in users:
        email = payload.get("email")
        if email:
            user_salt = payload.get("password_salt") or salt
            user_hash = payload.get("password_hash") or password_hash
        else:
            user_salt = None
            user_hash = None

        db.add(
            User(
                id=payload["id"],
                camp_id=payload.get("camp_id", camp_id),
                email=email,
                password_salt=user_salt,
                password_hash=user_hash,
                name=payload["name"],
                role=UserRole(payload["role"]),
                university=payload.get("university"),
                city=payload.get("city"),
                telegram=payload.get("telegram"),
                photo_url=payload.get("photo_url"),
                visibility_mode=VisibilityMode(payload["visibility_mode"]),
                notifications_enabled=payload["notifications_enabled"],
                is_active=payload["is_active"],
                show_in_people=payload.get("show_in_people", True),
            )
        )


def _seed_events(db: Session, events: Iterable[dict]) -> None:
    for payload in events:
        db.add(
            Event(
                id=payload["id"],
                camp_id=payload["camp_id"],
                event_date=date.fromisoformat(payload["event_date"]),
                title=payload["title"],
                type=payload["type"],
                start_at=payload["start_at"],
                end_at=payload["end_at"],
                place=payload["place"],
                building=payload["building"],
                address=payload["address"],
                status=EventStatus(payload["status"]),
                description=payload.get("description"),
                materials=payload.get("materials"),
                day=payload["day"],
            )
        )
        for teacher_id in payload.get("teacher_ids") or []:
            db.add(EventTeacher(event_id=payload["id"], teacher_id=teacher_id))


def _seed_projects(db: Session, projects: Iterable[dict]) -> None:
    for payload in projects:
        db.add(
            Project(
                id=payload["id"],
                title=payload["title"],
                short_description=payload["short_description"],
                description=payload.get("description"),
                direction=payload["direction"],
                min_team=payload["min_team"],
                mentor_name=payload.get("mentor_name"),
                mentor_position=payload.get("mentor_position"),
                mentor_city=payload.get("mentor_city"),
                mentor_telegram=payload.get("mentor_telegram"),
                mentor_photo=payload.get("mentor_photo"),
                mentor_work_format=payload.get("mentor_work_format"),
                max_team=payload["max_team"],
            )
        )


def _seed_stories(db: Session, stories: Iterable[dict]) -> None:
    for payload in stories:
        db.add(
            Story(
                id=payload["id"],
                title=payload["title"],
                type=StoryType(payload["type"]),
                image=payload["image"],
                slides=payload["slides"],
            )
        )


def _seed_org_updates(db: Session, updates: Iterable[dict]) -> None:
    for payload in updates:
        db.add(
            OrgUpdate(
                id=payload["id"],
                text=payload["text"],
                time=payload["time"],
                is_new=payload["is_new"],
                type=UpdateType(payload["type"]),
            )
        )


def _seed_documents(db: Session, documents: Iterable[dict]) -> None:
    for payload in documents:
        db.add(
            Document(
                id=payload["id"],
                user_id=payload["user_id"],
                title=payload["title"],
                description=payload["description"],
                status=DocumentStatus(payload["status"]),
                deadline=payload.get("deadline"),
                critical=payload["critical"],
                fallback=payload.get("fallback"),
            )
        )


def _seed_campus(db: Session, categories: Iterable[dict], room_assignments: Iterable[dict]) -> None:
    for payload in categories:
        db.add(
            CampusCategory(
                id=payload["id"],
                icon=payload["icon"],
                title=payload["title"],
                items=payload["items"],
            )
        )
    for payload in room_assignments:
        db.add(
            RoomAssignment(
                user_id=payload["user_id"],
                number=payload["number"],
                floor=payload["floor"],
                building=payload["building"],
                neighbors=payload["neighbors"],
                key_info=payload["key_info"],
                rules=payload["rules"],
            )
        )


def _seed_content(db: Session, materials: Iterable[dict], resources: Iterable[dict]) -> None:
    for payload in materials:
        db.add(
            Material(
                id=payload["id"],
                title=payload["title"],
                type=MaterialType(payload["type"]),
                day=payload.get("day"),
                event_id=payload.get("event_id"),
                topic=payload.get("topic"),
                file_size=payload.get("file_size"),
                is_new=payload["is_new"],
                url=payload["url"],
            )
        )
    for payload in resources:
        db.add(
            Resource(
                id=payload["id"],
                title=payload["title"],
                category=payload["category"],
                kind=payload["kind"],
                description=payload.get("description"),
                url=payload["url"],
                day=payload.get("day"),
                event_id=payload.get("event_id"),
                is_new=payload["is_new"],
            )
        )


def _seed_user_state(db: Session, snapshot: dict) -> None:
    viewer_id = snapshot.get("meta", {}).get("viewer_user_id", "viewer-dev")

    for story_id in snapshot.get("story_reads", []):
        db.add(StoryRead(user_id=viewer_id, story_id=story_id, is_read=True))

    for update_id in snapshot.get("update_reads", []):
        db.add(UpdateRead(user_id=viewer_id, update_id=update_id, is_read=True))

    for payload in snapshot.get("event_checkins", []):
        db.add(
            EventCheckIn(
                user_id=payload["user_id"],
                event_id=payload["event_id"],
                attendance_status=payload["attendance_status"],
            )
        )

    for priority, project_id in enumerate(snapshot.get("project_priorities", []), start=1):
        db.add(ProjectPreference(user_id=viewer_id, project_id=project_id, priority=priority))


def seed_database(db: Session, seed_path: Path | str | None = None) -> None:
    path = Path(seed_path) if seed_path else Path(settings.seed_path)
    snapshot = _load_seed(path)
    default_password = snapshot.get("meta", {}).get("default_demo_password", "studcamp123")

    _reset_tables(db)
    _seed_camp(db, snapshot["camp"])
    _seed_users(db, snapshot["users"], snapshot["camp"]["id"], default_password)
    _seed_events(db, snapshot["events"])
    _seed_projects(db, snapshot["projects"])
    _seed_stories(db, snapshot["stories"])
    _seed_org_updates(db, snapshot["org_updates"])
    _seed_documents(db, snapshot["documents"])
    _seed_campus(db, snapshot["campus_categories"], snapshot["room_assignments"])
    _seed_content(db, snapshot["materials"], snapshot["resources"])
    _seed_user_state(db, snapshot)
    db.commit()
