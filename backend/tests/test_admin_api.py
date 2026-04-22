from backend.app.models.entities import (
    CampusCategory,
    Document,
    Event,
    EventTeacher,
    Material,
    OrgUpdate,
    Project,
    Resource,
    RoomAssignment,
    Story,
    User,
    UserRole,
)
from sqlalchemy import select


def _login_as_role(client, db_session, role: UserRole):
    user = db_session.scalar(select(User).where(User.role == role).order_by(User.id.asc()))
    assert user is not None
    assert user.email
    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "studcamp123"},
    )
    assert response.status_code == 200
    payload = response.json()
    return user, {"Authorization": f"Bearer {payload['token']}"}, payload


def test_seed_creates_role_logins_and_assignments(db_session):
    organizer = db_session.scalar(
        select(User).where(User.role == UserRole.organizer).order_by(User.id.asc())
    )
    teacher = db_session.scalar(
        select(User).where(User.role == UserRole.teacher).order_by(User.id.asc())
    )
    assert organizer is not None and organizer.email and organizer.password_hash
    assert teacher is not None and teacher.email and teacher.password_hash
    assert (
        db_session.scalar(select(EventTeacher).where(EventTeacher.teacher_id == teacher.id))
        is not None
    )


def test_bootstrap_exposes_admin_capabilities(client, db_session):
    organizer, organizer_headers, _ = _login_as_role(client, db_session, UserRole.organizer)
    teacher, teacher_headers, _ = _login_as_role(client, db_session, UserRole.teacher)

    organizer_bootstrap = client.get("/api/v1/bootstrap", headers=organizer_headers)
    teacher_bootstrap = client.get("/api/v1/bootstrap", headers=teacher_headers)

    assert organizer_bootstrap.status_code == 200
    assert teacher_bootstrap.status_code == 200

    organizer_payload = organizer_bootstrap.json()
    teacher_payload = teacher_bootstrap.json()

    assert organizer_payload["currentUser"]["capabilities"]["canManageAll"] is True
    assert organizer_payload["currentUser"]["capabilities"]["canAssignTeachers"] is True
    assert organizer_payload["adminUsers"]
    assert organizer_payload["adminDocuments"]
    assert "teacherIds" in organizer_payload["events"][0]

    assert teacher_payload["currentUser"]["id"] == teacher.id
    assert teacher_payload["currentUser"]["capabilities"]["canEditOwnEvents"] is True
    assert teacher_payload["currentUser"]["capabilities"]["canManageUsers"] is False
    assert teacher_payload["adminUsers"] == []

    assert any(teacher.id in event["teacherIds"] for event in teacher_payload["events"])
    assert organizer_payload["currentUser"]["id"] == organizer.id


def test_organizer_can_create_and_update_all_admin_entities(client, db_session):
    organizer, headers, _ = _login_as_role(client, db_session, UserRole.organizer)
    teacher = db_session.scalar(
        select(User).where(User.role == UserRole.teacher).order_by(User.id.asc())
    )
    assert teacher is not None

    user_response = client.post(
        "/api/v1/admin/users",
        headers=headers,
        json={
            "name": "Admin Created Participant",
            "role": "participant",
            "university": "MIPT",
            "city": "Moscow",
            "telegram": "@createduser",
            "photo": None,
            "visibility": "name_plus_fields",
            "notificationsOn": True,
            "isActive": True,
            "showInPeople": True,
            "email": "created-participant@studcamp.local",
            "password": "secret123",
        },
    )
    assert user_response.status_code == 200
    created_user_id = user_response.json()["id"]

    story_response = client.post(
        "/api/v1/admin/stories",
        headers=headers,
        json={
            "title": "Admin Story",
            "type": "info",
            "image": "https://example.com/story.png",
            "slides": [
                {
                    "image": "https://example.com/slide.png",
                    "text": "Slide text",
                    "caption": "Slide caption",
                }
            ],
        },
    )
    assert story_response.status_code == 200
    story_id = story_response.json()["id"]

    update_response = client.post(
        "/api/v1/admin/org-updates",
        headers=headers,
        json={"text": "Admin update", "time": "12:00", "isNew": True, "type": "info"},
    )
    assert update_response.status_code == 200
    update_id = update_response.json()["id"]

    event_response = client.post(
        "/api/v1/admin/events",
        headers=headers,
        json={
            "date": "2026-04-23",
            "title": "Admin Event",
            "type": "Lecture",
            "startAt": "12:00",
            "endAt": "13:00",
            "place": "Room 101",
            "building": "Main building",
            "address": "Moscow",
            "status": "upcoming",
            "description": "Organizer-created event",
            "materials": ["Ноутбук"],
            "day": 11,
            "teacherIds": [teacher.id],
        },
    )
    assert event_response.status_code == 200
    event_id = event_response.json()["id"]

    project_response = client.post(
        "/api/v1/admin/projects",
        headers=headers,
        json={
            "title": "Admin Project",
            "shortDescription": "Project description",
            "direction": "ML",
            "minTeam": 2,
            "maxTeam": 4,
        },
    )
    assert project_response.status_code == 200
    project_id = project_response.json()["id"]

    material_response = client.post(
        "/api/v1/admin/materials",
        headers=headers,
        json={
            "title": "Admin Material",
            "type": "guide",
            "day": 11,
            "eventId": event_id,
            "topic": "Topic",
            "fileSize": "1 MB",
            "isNew": True,
            "url": "https://example.com/material",
        },
    )
    assert material_response.status_code == 200
    material_id = material_response.json()["id"]

    resource_response = client.post(
        "/api/v1/admin/resources",
        headers=headers,
        json={
            "title": "Admin Resource",
            "category": "study",
            "kind": "doc",
            "description": "Resource description",
            "url": "https://example.com/resource",
            "day": 11,
            "eventId": event_id,
            "isNew": True,
        },
    )
    assert resource_response.status_code == 200
    resource_id = resource_response.json()["id"]

    category_response = client.post(
        "/api/v1/admin/campus-categories",
        headers=headers,
        json={
            "icon": "info",
            "title": "Admin Campus",
            "items": [{"title": "Point", "detail": "Detail"}],
        },
    )
    assert category_response.status_code == 200
    category_id = category_response.json()["id"]

    room_response = client.post(
        "/api/v1/admin/room-assignments",
        headers=headers,
        json={
            "userId": created_user_id,
            "number": "A-101",
            "floor": 4,
            "building": "Hostel",
            "neighbors": ["Neighbor One", "Neighbor Two"],
            "keyInfo": "Take key at desk",
            "rules": ["Quiet hours"],
        },
    )
    assert room_response.status_code == 200

    document_response = client.post(
        "/api/v1/admin/documents",
        headers=headers,
        json={
            "userId": created_user_id,
            "title": "Admin Document",
            "description": "Document description",
            "status": "not_started",
            "deadline": "1 May",
            "critical": True,
            "fallback": "Ping organizer",
        },
    )
    assert document_response.status_code == 200
    document_id = document_response.json()["id"]

    assert (
        client.patch(
            f"/api/v1/admin/users/{created_user_id}",
            headers=headers,
            json={
                "name": "Updated Participant",
                "role": "participant",
                "university": "HSE",
                "city": "Saint Petersburg",
                "telegram": "@updateduser",
                "photo": "https://example.com/photo",
                "visibility": "name_only",
                "notificationsOn": False,
                "isActive": True,
                "showInPeople": False,
                "email": "created-participant@studcamp.local",
                "password": None,
            },
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/admin/stories/{story_id}",
            headers=headers,
            json={
                "title": "Updated Story",
                "type": "urgent",
                "image": "https://example.com/story-2.png",
                "slides": [
                    {"image": "https://example.com/slide-2.png", "text": "Updated", "caption": None}
                ],
            },
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/admin/org-updates/{update_id}",
            headers=headers,
            json={
                "text": "Updated admin update",
                "time": "13:00",
                "isNew": False,
                "type": "change",
            },
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/admin/events/{event_id}",
            headers=headers,
            json={
                "date": "2026-04-24",
                "title": "Updated Admin Event",
                "type": "Workshop",
                "startAt": "14:00",
                "endAt": "15:30",
                "place": "Room 202",
                "building": "HQ",
                "address": "Saint Petersburg",
                "status": "changed",
                "description": "Updated description",
                "materials": ["Проектор"],
                "day": 12,
                "teacherIds": [teacher.id],
            },
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/admin/projects/{project_id}",
            headers=headers,
            json={
                "title": "Updated Admin Project",
                "shortDescription": "Updated description",
                "direction": "Hardware",
                "minTeam": 3,
                "maxTeam": 5,
            },
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/admin/materials/{material_id}",
            headers=headers,
            json={
                "title": "Updated Material",
                "type": "presentation",
                "day": 12,
                "eventId": event_id,
                "topic": "Updated topic",
                "fileSize": "2 MB",
                "isNew": False,
                "url": "https://example.com/material-2",
            },
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/admin/resources/{resource_id}",
            headers=headers,
            json={
                "title": "Updated Resource",
                "category": "projects",
                "kind": "sheet",
                "description": "Updated resource",
                "url": "https://example.com/resource-2",
                "day": 12,
                "eventId": event_id,
                "isNew": False,
            },
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/admin/campus-categories/{category_id}",
            headers=headers,
            json={
                "icon": "wifi",
                "title": "Updated Campus",
                "items": [{"title": "Updated point", "detail": "Updated detail"}],
            },
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/admin/room-assignments/{created_user_id}",
            headers=headers,
            json={
                "userId": created_user_id,
                "number": "B-202",
                "floor": 5,
                "building": "New hostel",
                "neighbors": ["Neighbor Three"],
                "keyInfo": "Updated key info",
                "rules": ["Updated rule"],
            },
        ).status_code
        == 200
    )
    assert (
        client.patch(
            f"/api/v1/admin/documents/{document_id}",
            headers=headers,
            json={
                "userId": created_user_id,
                "title": "Updated Document",
                "description": "Updated document description",
                "status": "done",
                "deadline": "2 May",
                "critical": False,
                "fallback": "Updated fallback",
            },
        ).status_code
        == 200
    )

    assert (
        db_session.scalar(select(User).where(User.id == created_user_id)).name
        == "Updated Participant"
    )
    assert db_session.scalar(select(Story).where(Story.id == story_id)).title == "Updated Story"
    assert (
        db_session.scalar(select(OrgUpdate).where(OrgUpdate.id == update_id)).text
        == "Updated admin update"
    )
    assert (
        db_session.scalar(select(Event).where(Event.id == event_id)).title == "Updated Admin Event"
    )
    assert (
        db_session.scalar(select(Project).where(Project.id == project_id)).title
        == "Updated Admin Project"
    )
    assert (
        db_session.scalar(select(Material).where(Material.id == material_id)).title
        == "Updated Material"
    )
    assert (
        db_session.scalar(select(Resource).where(Resource.id == resource_id)).title
        == "Updated Resource"
    )
    assert (
        db_session.scalar(select(CampusCategory).where(CampusCategory.id == category_id)).title
        == "Updated Campus"
    )
    assert (
        db_session.scalar(
            select(RoomAssignment).where(RoomAssignment.user_id == created_user_id)
        ).number
        == "B-202"
    )
    assert (
        db_session.scalar(select(Document).where(Document.id == document_id)).title
        == "Updated Document"
    )
    assert (
        db_session.scalar(
            select(EventTeacher).where(
                EventTeacher.event_id == event_id, EventTeacher.teacher_id == teacher.id
            )
        )
        is not None
    )
    assert organizer.id != created_user_id


def test_teacher_scope_is_limited_to_owned_event_assets(client, db_session):
    teacher, headers, login_payload = _login_as_role(client, db_session, UserRole.teacher)
    bootstrap = client.get("/api/v1/bootstrap", headers=headers).json()
    teacher_id = login_payload["user"]["id"]
    owned_event = next(event for event in bootstrap["events"] if teacher_id in event["teacherIds"])
    foreign_event = next(
        event for event in bootstrap["events"] if teacher_id not in event["teacherIds"]
    )

    own_event_response = client.patch(
        f"/api/v1/admin/events/{owned_event['id']}",
        headers=headers,
        json={
            "date": owned_event["date"],
            "title": f"{owned_event['title']} (edited)",
            "type": owned_event["type"],
            "startAt": owned_event["startAt"],
            "endAt": owned_event["endAt"],
            "place": owned_event["place"],
            "building": owned_event["building"],
            "address": owned_event["address"],
            "status": owned_event["status"],
            "description": "Teacher updated description",
            "materials": owned_event["materials"] or [],
            "day": owned_event["day"],
        },
    )
    assert own_event_response.status_code == 200

    foreign_event_response = client.patch(
        f"/api/v1/admin/events/{foreign_event['id']}",
        headers=headers,
        json={
            "date": foreign_event["date"],
            "title": foreign_event["title"],
            "type": foreign_event["type"],
            "startAt": foreign_event["startAt"],
            "endAt": foreign_event["endAt"],
            "place": foreign_event["place"],
            "building": foreign_event["building"],
            "address": foreign_event["address"],
            "status": foreign_event["status"],
            "description": "Should fail",
            "materials": foreign_event["materials"] or [],
            "day": foreign_event["day"],
        },
    )
    assert foreign_event_response.status_code == 403

    material_response = client.post(
        "/api/v1/admin/materials",
        headers=headers,
        json={
            "title": "Teacher Material",
            "type": "guide",
            "day": owned_event["day"],
            "eventId": owned_event["id"],
            "topic": "Teacher topic",
            "fileSize": None,
            "isNew": True,
            "url": "https://example.com/teacher-material",
        },
    )
    assert material_response.status_code == 200

    resource_response = client.post(
        "/api/v1/admin/resources",
        headers=headers,
        json={
            "title": "Teacher Resource",
            "category": "study",
            "kind": "doc",
            "description": "Teacher resource",
            "url": "https://example.com/teacher-resource",
            "day": owned_event["day"],
            "eventId": owned_event["id"],
            "isNew": True,
        },
    )
    assert resource_response.status_code == 200

    assert (
        client.post(
            "/api/v1/admin/resources",
            headers=headers,
            json={
                "title": "Forbidden Resource",
                "category": "study",
                "kind": "doc",
                "description": "No access",
                "url": "https://example.com/forbidden-resource",
                "day": foreign_event["day"],
                "eventId": foreign_event["id"],
                "isNew": False,
            },
        ).status_code
        == 403
    )

    assert (
        client.post(
            "/api/v1/admin/projects",
            headers=headers,
            json={
                "title": "Forbidden Project",
                "shortDescription": "Should fail",
                "direction": "ML",
                "minTeam": 2,
                "maxTeam": 3,
            },
        ).status_code
        == 403
    )

    assert (
        db_session.scalar(select(Event).where(Event.id == owned_event["id"])).description
        == "Teacher updated description"
    )
    assert (
        db_session.scalar(
            select(Material).where(Material.id == material_response.json()["id"])
        ).event_id
        == owned_event["id"]
    )
    assert (
        db_session.scalar(
            select(Resource).where(Resource.id == resource_response.json()["id"])
        ).event_id
        == owned_event["id"]
    )
    assert teacher.id == teacher_id
