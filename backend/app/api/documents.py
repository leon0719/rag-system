"""Document API endpoints."""

import uuid
from typing import Annotated

from fastapi import APIRouter, File, Query, UploadFile
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import DocumentProcessingError, NotFoundError
from app.dependencies import CurrentUser, DBSession
from app.models.document import Document
from app.schemas.document import DocumentDetail, DocumentUploadResponse, PaginatedDocumentList
from app.services.document import ingest_document, list_user_documents

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=list[DocumentUploadResponse], status_code=201)
async def upload_documents(
    files: Annotated[list[UploadFile], File()],
    db: DBSession,
    user: CurrentUser,
):
    """Upload and process multiple documents.

    Each file is processed independently — a single failure doesn't affect others.
    """
    results: list[DocumentUploadResponse] = []
    errors: list[str] = []

    for file in files:
        # Each file gets its own nested transaction
        try:
            async with db.begin_nested():
                document = await ingest_document(db, file, user.id)
                results.append(
                    DocumentUploadResponse(
                        id=document.id,
                        filename=document.filename,
                        file_type=document.file_type,
                        file_size=document.file_size,
                        chunk_count=document.chunk_count,
                    )
                )
        except Exception as e:
            filename = file.filename or "unknown"
            logger.error(f"Failed to process {filename}: {e}")
            errors.append(f"{filename}: {e}")

    if not results and errors:
        raise DocumentProcessingError(f"All files failed to process: {'; '.join(errors)}")

    return results


@router.get("/", response_model=PaginatedDocumentList)
async def list_documents(
    db: DBSession,
    user: CurrentUser,
    page: int = Query(1, ge=1, le=1000),
    page_size: int = Query(20, ge=1, le=100),
):
    """List all documents for the current user with pagination."""
    return await list_user_documents(db, user.id, page, page_size)


async def _get_user_document(
    db: AsyncSession, document_id: uuid.UUID, user_id: uuid.UUID
) -> Document:
    """Get a document owned by the user, or raise NotFoundError."""
    document = await db.get(Document, document_id)
    if document is None or document.user_id != user_id:
        raise NotFoundError("Document not found")
    return document


@router.get("/{document_id}", response_model=DocumentDetail)
async def get_document(document_id: uuid.UUID, db: DBSession, user: CurrentUser):
    """Get document details (ownership check)."""
    return await _get_user_document(db, document_id, user.id)


@router.delete("/{document_id}", status_code=204)
async def delete_document(document_id: uuid.UUID, db: DBSession, user: CurrentUser):
    """Delete a document and all its chunks (ownership check)."""
    document = await _get_user_document(db, document_id, user.id)
    await db.delete(document)
    logger.info(f"Document deleted: {document.filename} (id={document_id})")
