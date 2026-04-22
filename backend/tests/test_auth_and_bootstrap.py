from datetime import datetime
from zoneinfo import ZoneInfo


def test_login_and_bootstrap_flow(client):
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "alexey.petrov@studcamp.local", "password": "studcamp123"},
    )
    assert login_response.status_code == 200
    payload = login_response.json()
    assert payload["token"]
    assert payload["user"]["name"] == "Технический доступ"

    bootstrap_response = client.get(
        "/api/v1/bootstrap",
        headers={"Authorization": f"Bearer {payload['token']}"},
    )
    assert bootstrap_response.status_code == 200
    bootstrap = bootstrap_response.json()
    assert bootstrap["camp"]["id"] == "camp-alisa-2026"
    assert bootstrap["camp"]["dates"]["start"] == "2026-04-13"
    assert any(project["title"] == "Инструктивный синтез" for project in bootstrap["projects"])
    assert any(
        resource["title"] == "Таблица приезда и отъезда" for resource in bootstrap["resources"]
    )
    assert any(
        resource["url"] == "https://disk.yandex.ru/d/Qdl9OmGsu697FA"
        for resource in bootstrap["resources"]
    )
    assert all(person["id"] != payload["user"]["id"] for person in bootstrap["people"])


def test_mutations_are_persisted(client):
    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "alexey.petrov@studcamp.local", "password": "studcamp123"},
    )
    token = login_response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    bootstrap_before = client.get("/api/v1/bootstrap", headers=headers).json()
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
    from backend.app.services.bootstrap import helpers as bootstrap_helpers

    monkeypatch.setattr(
        bootstrap_helpers,
        "now_local",
        lambda: datetime(2026, 4, 19, 17, 30, tzinfo=ZoneInfo("Europe/Moscow")),
    )

    login_response = client.post(
        "/api/v1/auth/login",
        json={"email": "alexey.petrov@studcamp.local", "password": "studcamp123"},
    )
    token = login_response.json()["token"]
    headers = {"Authorization": f"Bearer {token}"}

    bootstrap = client.get("/api/v1/bootstrap", headers=headers).json()
    by_title = {event["title"]: event for event in bootstrap["events"]}

    assert by_title["Работа над проектами в Яндексе"]["status"] == "completed"
    assert by_title["Экскурсия в офис Яндекса"]["status"] == "completed"
