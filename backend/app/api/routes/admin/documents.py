from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.api.deps import get_current_user
from backend.app.db.session import get_db
from backend.app.models.entities import Document, DocumentStatus, User
from backend.app.schemas.api import CreatedEntitySchema, DocumentUpsertSchema, SimpleStatusSchema

from ._helpers import generate_id, get_or_404, parse_enum, require_organizer


router = APIRouter(prefix="/admin/documents", tags=["admin"])


def _apply(document: Document, payload: DocumentUpsertSchema) -> None:
    document.user_id = payload.userId
    document.title = payload.title
    document.description = payload.description
    document.status = parse_enum(DocumentStatus, payload.status, "status")
    document.deadline = payload.deadline
    document.critical = payload.critical
    document.fallback = payload.fallback


@router.post("", response_model=CreatedEntitySchema)
def create_document(
    payload: DocumentUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CreatedEntitySchema:
    require_organizer(current_user)
    get_or_404(db, User, payload.userId)
    document = Document(
        id=generate_id("doc"),
        user_id=payload.userId,
        title="",
        description="",
        status=DocumentStatus.not_started,
        critical=False,
    )
    _apply(document, payload)
    db.add(document)
    db.commit()
    return CreatedEntitySchema(id=document.id)


@router.patch("/{document_id}", response_model=SimpleStatusSchema)
def update_document(
    document_id: str,
    payload: DocumentUpsertSchema,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SimpleStatusSchema:
    require_organizer(current_user)
    get_or_404(db, User, payload.userId)
    document = get_or_404(db, Document, document_id)
    _apply(document, payload)
    db.add(document)
    db.commit()
    return SimpleStatusSchema(ok=True)
