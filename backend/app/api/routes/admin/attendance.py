"""Organizer-side attendance management: mark from sheet photo via LLM or bulk manual."""

from __future__ import annotations

import base64
import binascii
import json
import re
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import Event, EventCheckIn, User, UserRole

from ._helpers import get_or_404, require_organizer

router = APIRouter(prefix="/admin/attendance", tags=["admin"])


class AttendancePhoto(BaseModel):
    name: str
    mimeType: str
    base64: str


class AttendancePhotoParseRequest(BaseModel):
    baseUrl: str
    model: str
    apiKey: str = ""
    eventId: str
    photos: list[AttendancePhoto] = Field(default_factory=list)


class AttendanceMatch(BaseModel):
    userId: str
    name: str
    signed: bool


class AttendancePhotoParseResponse(BaseModel):
    matched: list[AttendanceMatch]
    unmatched: list[str]  # имена, которые LLM увидела на листе, но не нашла в системе


class AttendanceBulkMarkRequest(BaseModel):
    eventId: str
    userIds: list[str]


class AttendanceBulkMarkResponse(BaseModel):
    ok: bool
    marked: int


ATTENDANCE_SYSTEM_PROMPT = """Ты помощник организатора кемпа. Тебе присылают фотографии листков
посещаемости (обычно таблица: колонка ФИО + колонка подпись участника).
Твоя задача — по фото понять, кто из участников РАСПИСАЛСЯ за присутствие.

Тебе также передаётся список участников кемпа. Для каждого участника проверь:
- есть ли на листке его ФИО (полностью, или инициалы «Иванов И.И.»);
- стоит ли рядом подпись (любая ненулевая закорючка в поле «подпись»).

Если оба условия выполнены — считай, что человек присутствовал.

Отвечай СТРОГО в формате JSON без markdown:
{
  "matched": [
    { "userId": "<id из списка>", "signed": true }
  ],
  "unmatched": [
    "<ФИО, которое видно на листке, но нет в списке участников>"
  ]
}

Если на листке вообще пусто — верни {"matched": [], "unmatched": []}.
Никогда не придумывай userId — используй только те, что переданы.
"""


def _extract_json(raw: str) -> dict[str, Any]:
    stripped = raw.strip()
    fence = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", stripped, flags=re.DOTALL)
    if fence:
        stripped = fence.group(1)
    else:
        brace = re.search(r"\{.*\}", stripped, flags=re.DOTALL)
        if brace:
            stripped = brace.group(0)
    try:
        decoded: dict[str, Any] = json.loads(stripped)
        return decoded
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502, detail=f"Модель вернула не-JSON ответ: {exc.msg}"
        ) from exc


def _ensure_photo(photo: AttendancePhoto) -> None:
    if not photo.base64.strip():
        raise HTTPException(status_code=400, detail="Фото пустое")
    try:
        base64.b64decode(photo.base64, validate=False)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status_code=400, detail=f"Неверный base64 у {photo.name}") from exc


@router.post("/parse", response_model=AttendancePhotoParseResponse)
def parse_attendance_photo(
    payload: AttendancePhotoParseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttendancePhotoParseResponse:
    require_organizer(current_user)
    if not payload.photos:
        raise HTTPException(status_code=400, detail="Прикрепи хотя бы одно фото")
    for photo in payload.photos:
        _ensure_photo(photo)

    event = get_or_404(db, Event, payload.eventId)

    # Список участников того же кемпа. Ограничиваем ролью participant.
    users = db.scalars(
        select(User).where(User.camp_id == event.camp_id, User.role == UserRole.participant)
    ).all()
    user_roster = [{"userId": user.id, "name": user.name} for user in users]

    user_content: list[dict[str, Any]] = [
        {
            "type": "text",
            "text": (
                f"Листок посещаемости к занятию «{event.title}» от {event.event_date}.\n"
                "Список участников кемпа (используй только эти userId):\n"
                + json.dumps(user_roster, ensure_ascii=False)
            ),
        }
    ]
    for photo in payload.photos:
        mime = photo.mimeType or "image/jpeg"
        user_content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime};base64,{photo.base64}"},
            }
        )

    headers: dict[str, str] = {"Content-Type": "application/json"}
    if payload.apiKey.strip():
        headers["Authorization"] = f"Bearer {payload.apiKey}"
    headers["HTTP-Referer"] = "https://studcamp.local"
    headers["X-Title"] = "Studcamp Attendance"

    body = {
        "model": payload.model,
        "messages": [
            {"role": "system", "content": ATTENDANCE_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }
    endpoint = payload.baseUrl.rstrip("/") + "/chat/completions"
    try:
        with httpx.Client(timeout=180) as client:
            response = client.post(endpoint, headers=headers, json=body)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502, detail=f"Не удалось связаться с {endpoint}: {exc}"
        ) from exc
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)

    data = response.json()
    try:
        raw = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="Неожиданный ответ провайдера") from exc

    parsed = _extract_json(raw)
    matched_raw = parsed.get("matched", [])
    unmatched_raw = parsed.get("unmatched", [])
    if not isinstance(matched_raw, list) or not isinstance(unmatched_raw, list):
        raise HTTPException(status_code=502, detail="Модель вернула структуру не того вида")

    user_by_id = {user.id: user for user in users}
    matched: list[AttendanceMatch] = []
    for entry in matched_raw:
        if not isinstance(entry, dict):
            continue
        uid = entry.get("userId")
        if not isinstance(uid, str) or uid not in user_by_id:
            continue
        matched.append(
            AttendanceMatch(
                userId=uid,
                name=user_by_id[uid].name,
                signed=bool(entry.get("signed", True)),
            )
        )

    unmatched: list[str] = [str(item) for item in unmatched_raw if isinstance(item, str)]

    return AttendancePhotoParseResponse(matched=matched, unmatched=unmatched)


@router.post("/mark", response_model=AttendanceBulkMarkResponse)
def mark_attendance(
    payload: AttendanceBulkMarkRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> AttendanceBulkMarkResponse:
    require_organizer(current_user)
    event = get_or_404(db, Event, payload.eventId)
    user_ids = list(dict.fromkeys(payload.userIds))
    valid_users = {
        user.id
        for user in db.scalars(
            select(User).where(User.id.in_(user_ids), User.camp_id == event.camp_id)
        ).all()
    }
    count = 0
    for user_id in user_ids:
        if user_id not in valid_users:
            continue
        existing = db.scalar(
            select(EventCheckIn).where(
                EventCheckIn.user_id == user_id,
                EventCheckIn.event_id == event.id,
            )
        )
        if existing is None:
            db.add(
                EventCheckIn(
                    user_id=user_id,
                    event_id=event.id,
                    attendance_status="confirmed",
                    source="sheet",
                )
            )
        else:
            existing.attendance_status = "confirmed"
            existing.source = "sheet"
            db.add(existing)
        count += 1
    db.commit()
    return AttendanceBulkMarkResponse(ok=True, marked=count)
