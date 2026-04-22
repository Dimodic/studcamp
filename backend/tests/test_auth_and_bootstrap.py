from datetime import datetime
from zoneinfo import ZoneInfo

VIEWER_EMAIL = "test.viewer@camp.local"
VIEWER_PASSWORD = "studcamp123"
EXPECTED_CAMP_ID = "camp-mock-2026"
EXPECTED_CAMP_START = "2026-04-13"


def _login(client) -> tuple[str, dict]:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": VIEWER_EMAIL, "password": VIEWER_PASSWORD},
    )
    assert response.status_code == 200
    payload = response.json()
    return payload["token"], payload


def test_login_and_bootstrap_flow(client):
    token, login_payload = _login(client)
    assert login_payload["user"]["email"] == VIEWER_EMAIL
    assert login_payload["user"]["role"] == "participant"

    bootstrap_response = client.get(
        "/api/v1/bootstrap",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert bootstrap_response.status_code == 200
    bootstrap = bootstrap_response.json()

    assert bootstrap["camp"]["id"] == EXPECTED_CAMP_ID
    assert bootstrap["camp"]["dates"]["start"] == EXPECTED_CAMP_START
    # fixture-независимые проверки: непустые списки ключевых сущностей.
    assert len(bootstrap["projects"]) > 0
    assert len(bootstrap["resources"]) > 0
    assert len(bootstrap["events"]) > 0
    assert len(bootstrap["stories"]) > 0
    # Сам viewer не должен появиться в списке people (show_in_people=False).
    assert all(person["id"] != login_payload["user"]["id"] for person in bootstrap["people"])


def test_mutations_are_persisted(client):
    token, _ = _login(client)
    headers = {"Authorization": f"Bearer {token}"}

    bootstrap_before = client.get("/api/v1/bootstrap", headers=headers).json()
    assert bootstrap_before["stories"], "fixture должна содержать хотя бы одну сторис"
    assert len(bootstrap_before["projects"]) >= 3, "fixture должна содержать ≥ 3 проектов"
    assert len(bootstrap_before["orgUpdates"]) >= 2

    story_id = bootstrap_before["stories"][0]["id"]
    project_ids = [project["id"] for project in bootstrap_before["projects"][:3]]
    update_ids = [update["id"] for update in bootstrap_before["orgUpdates"][:2]]

    response = client.post(f"/api/v1/stories/{story_id}/read", headers=headers)
    assert response.status_code == 200

    response = client.put(
        "/api/v1/projects/preferences", headers=headers, json={"projectIds": project_ids}
    )
    assert response.status_code == 200

    response = client.patch(
        "/api/v1/profile/preferences",
        headers=headers,
        json={"visibilityMode": "name_only", "notificationsOn": False},
    )
    assert response.status_code == 200

    response = client.post(
        "/api/v1/updates/mark-read",
        headers=headers,
        json={"updateIds": update_ids},
    )
    assert response.status_code == 200

    bootstrap = client.get("/api/v1/bootstrap", headers=headers).json()
    assert story_id in [story["id"] for story in bootstrap["stories"] if story["read"]]
    assert bootstrap["projectPriorities"] == project_ids
    assert bootstrap["currentUser"]["visibility"] == "name_only"
    assert bootstrap["currentUser"]["notificationsOn"] is False
    assert all(update["isRead"] for update in bootstrap["orgUpdates"] if update["id"] in update_ids)


def test_bootstrap_uses_moscow_timezone_for_event_statuses(client, monkeypatch):
    """Проверяем, что статусы событий считаются в МСК-таймзоне.

    Подменяем «сейчас» на 2026-04-19 17:30 MSK — это 7-й день кемпа.
    Все события прошедших дней (13-18 апреля) должны быть completed.
    """
    from backend.app.services.bootstrap import helpers as bootstrap_helpers

    monkeypatch.setattr(
        bootstrap_helpers,
        "now_local",
        lambda: datetime(2026, 4, 19, 17, 30, tzinfo=ZoneInfo("Europe/Moscow")),
    )

    token, _ = _login(client)
    headers = {"Authorization": f"Bearer {token}"}
    bootstrap = client.get("/api/v1/bootstrap", headers=headers).json()

    past_events = [event for event in bootstrap["events"] if event["date"] < "2026-04-19"]
    assert past_events, "fixture должна содержать события прошлых дней"
    assert all(event["status"] == "completed" for event in past_events), (
        "события до 2026-04-19 должны считаться completed при MSK-часах"
    )

    future_events = [event for event in bootstrap["events"] if event["date"] > "2026-04-19"]
    assert future_events, "fixture должна содержать события будущих дней"
    assert all(event["status"] == "upcoming" for event in future_events)
