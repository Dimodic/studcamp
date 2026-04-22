from __future__ import annotations

import base64
import binascii
import json
import re
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.core.config import settings
from backend.app.core.url_guard import ensure_public_url
from backend.app.db.session import get_db
from backend.app.models.entities import User, UserRole
from backend.app.services.llm_prompt import SYSTEM_PROMPT

router = APIRouter(prefix="/llm", tags=["llm"])


class LlmAttachment(BaseModel):
    name: str
    mimeType: str = ""
    base64: str = ""


class LlmParseRequest(BaseModel):
    baseUrl: str
    model: str
    apiKey: str = ""
    text: str = ""
    attachments: list[LlmAttachment] = Field(default_factory=list)


class LlmParseItem(BaseModel):
    kind: str
    payload: dict[str, Any]


class LlmParseResponse(BaseModel):
    items: list[LlmParseItem]


TEXT_MIME_PREFIXES = ("text/",)
TEXT_MIME_EXACT = {
    "application/json",
    "application/xml",
    "application/yaml",
    "application/x-yaml",
    "application/javascript",
    "application/typescript",
    "application/sql",
    "application/x-sh",
    "application/x-tex",
}
TEXT_EXTENSIONS = {
    ".txt",
    ".md",
    ".markdown",
    ".csv",
    ".tsv",
    ".json",
    ".jsonl",
    ".log",
    ".yml",
    ".yaml",
    ".html",
    ".htm",
    ".xml",
    ".srt",
    ".rtf",
    ".sh",
    ".py",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".sql",
    ".toml",
    ".ini",
    ".cfg",
    ".env",
}


def _attachment_extension(name: str) -> str:
    idx = name.rfind(".")
    return name[idx:].lower() if idx >= 0 else ""


def _is_text_like(attachment: LlmAttachment) -> bool:
    mime = attachment.mimeType.lower()
    if mime.startswith(TEXT_MIME_PREFIXES):
        return True
    if mime in TEXT_MIME_EXACT:
        return True
    return _attachment_extension(attachment.name) in TEXT_EXTENSIONS


def _is_image(attachment: LlmAttachment) -> bool:
    return attachment.mimeType.lower().startswith("image/")


def _decode_text(attachment: LlmAttachment) -> str | None:
    try:
        raw = base64.b64decode(attachment.base64, validate=False)
    except (binascii.Error, ValueError):
        return None
    for encoding in ("utf-8", "utf-16", "cp1251", "latin-1"):
        try:
            return raw.decode(encoding)
        except UnicodeDecodeError:
            continue
    return None


def _data_url(attachment: LlmAttachment, fallback_mime: str) -> str:
    mime = attachment.mimeType or fallback_mime
    return f"data:{mime};base64,{attachment.base64}"


def _build_content_parts(text: str, attachments: list[LlmAttachment]) -> list[dict[str, Any]]:
    parts: list[dict[str, Any]] = []
    prompt_text = text.strip()
    inline_blocks: list[str] = []
    binary_attachments: list[LlmAttachment] = []

    for attachment in attachments:
        if _is_text_like(attachment):
            decoded = _decode_text(attachment)
            if decoded is not None:
                inline_blocks.append(f"--- Файл: {attachment.name} ---\n{decoded.strip()}")
                continue
        binary_attachments.append(attachment)

    text_payload = prompt_text
    if inline_blocks:
        text_payload = (
            "\n\n".join([prompt_text, *inline_blocks])
            if prompt_text
            else "\n\n".join(inline_blocks)
        )
    if not text_payload and not binary_attachments:
        text_payload = "(пустой ввод)"

    if text_payload:
        parts.append({"type": "text", "text": text_payload})

    for attachment in binary_attachments:
        if not attachment.base64:
            continue
        if _is_image(attachment):
            parts.append(
                {
                    "type": "image_url",
                    "image_url": {"url": _data_url(attachment, "image/png")},
                }
            )
        else:
            parts.append(
                {
                    "type": "file",
                    "file": {
                        "filename": attachment.name,
                        "file_data": _data_url(attachment, "application/octet-stream"),
                    },
                }
            )

    return parts


def _extract_json_block(raw: str) -> dict[str, Any]:
    candidate = raw.strip()
    fence_match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", candidate, flags=re.DOTALL)
    if fence_match:
        candidate = fence_match.group(1)
    else:
        brace_match = re.search(r"\{.*\}", candidate, flags=re.DOTALL)
        if brace_match:
            candidate = brace_match.group(0)
    try:
        decoded: dict[str, Any] = json.loads(candidate)
        return decoded
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail=(
                f"Модель вернула не-JSON ответ: {exc.msg}. Попробуй другую модель или уточни текст."
            ),
        ) from exc


def _normalize_base_url(base_url: str) -> str:
    return base_url.strip().rstrip("/")


def _call_openai_compatible(
    *,
    base_url: str,
    api_key: str,
    model: str,
    system: str,
    content_parts: list[dict[str, Any]],
) -> str:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    headers["HTTP-Referer"] = "https://studcamp.local"
    headers["X-Title"] = "Studcamp Admin Assistant"
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": content_parts},
        ],
        "temperature": 0.2,
        "response_format": {"type": "json_object"},
    }
    endpoint = f"{_normalize_base_url(base_url)}/chat/completions"
    try:
        with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
            response = client.post(endpoint, headers=headers, json=body)
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=502, detail=f"Не удалось связаться с {endpoint}: {exc}"
        ) from exc
    if response.status_code >= 400:
        raise HTTPException(status_code=response.status_code, detail=response.text)
    data = response.json()
    try:
        content: str = data["choices"][0]["message"]["content"]
        return content
    except (KeyError, IndexError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="Неожиданный ответ провайдера") from exc


@router.post("/parse", response_model=LlmParseResponse)
def parse_content(
    payload: LlmParseRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> LlmParseResponse:
    if current_user.role != UserRole.organizer:
        raise HTTPException(status_code=403, detail="Organizer access required")
    if not payload.baseUrl.strip():
        raise HTTPException(status_code=400, detail="Не указан Base URL")
    if not payload.model.strip():
        raise HTTPException(status_code=400, detail="Не указана модель")

    # SSRF-guard: разрешаем приватные адреса только в dev-окружении
    # (организатор может подключить локальный Ollama / LM Studio).
    ensure_public_url(payload.baseUrl, allow_private=not settings.is_production)

    # Защита от DoS: суммарный base64-объём attachments.
    total_bytes = sum(len(att.base64) for att in payload.attachments)
    if total_bytes > settings.llm_max_upload_bytes:
        raise HTTPException(
            status_code=413,
            detail=(
                f"Суммарный размер вложений превышает лимит "
                f"{settings.llm_max_upload_bytes // (1024 * 1024)} MB."
            ),
        )

    content_parts = _build_content_parts(payload.text, payload.attachments)
    raw = _call_openai_compatible(
        base_url=payload.baseUrl,
        api_key=payload.apiKey,
        model=payload.model,
        system=SYSTEM_PROMPT,
        content_parts=content_parts,
    )

    parsed = _extract_json_block(raw)
    raw_items = parsed.get("items", [])
    if not isinstance(raw_items, list):
        raise HTTPException(status_code=502, detail="Поле items должно быть массивом")

    items: list[LlmParseItem] = []
    for entry in raw_items:
        if not isinstance(entry, dict):
            continue
        kind = entry.get("kind")
        entity_payload = entry.get("payload")
        if not isinstance(kind, str) or not isinstance(entity_payload, dict):
            continue
        items.append(LlmParseItem(kind=kind, payload=entity_payload))

    return LlmParseResponse(items=items)
