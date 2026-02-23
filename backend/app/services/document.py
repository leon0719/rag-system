"""Document ingestion pipeline."""

import io
import uuid
from pathlib import PurePath

from fastapi import UploadFile
from loguru import logger
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.exceptions import DocumentProcessingError
from app.models.document import Document, DocumentChunk
from app.schemas.document import DocumentListItem, PaginatedDocumentList
from app.services.chunking import split_text
from app.services.embedding import embed_texts

SUPPORTED_TYPES = {".txt", ".md", ".pdf"}

# Strip C0 control characters (U+0000-U+001F) except \t \n \r, plus DEL (U+007F).
# PDF extraction commonly produces \x00 (rejected by PostgreSQL) and \x01 artifacts.
_CONTROL_CHAR_TABLE = str.maketrans(
    "", "", "".join(chr(c) for c in range(32) if chr(c) not in "\t\n\r") + "\x7f"
)

settings = get_settings()


async def list_user_documents(
    db: AsyncSession,
    user_id: uuid.UUID,
    page: int,
    page_size: int,
) -> PaginatedDocumentList:
    """List documents for a user with pagination (fetch N+1 strategy)."""
    offset = (page - 1) * page_size
    result = await db.execute(
        select(Document)
        .where(Document.user_id == user_id)
        .order_by(Document.created_at.desc())
        .offset(offset)
        .limit(page_size + 1)
    )
    rows = result.scalars().all()

    has_more = len(rows) > page_size
    items = [DocumentListItem.model_validate(r) for r in rows[:page_size]]

    return PaginatedDocumentList(
        items=items,
        page=page,
        page_size=page_size,
        has_more=has_more,
    )


def _extract_text_from_pdf(content: bytes) -> str:
    """Extract text from a PDF file."""
    reader = PdfReader(io.BytesIO(content))
    pages = []
    for page in reader.pages:
        text = page.extract_text()
        if text:
            pages.append(text)
    return "\n\n".join(pages)


def _get_file_type(filename: str) -> str:
    """Get file extension."""
    return PurePath(filename).suffix.lower()


async def ingest_document(
    db: AsyncSession,
    file: UploadFile,
    user_id: uuid.UUID,
) -> Document:
    """Process a single uploaded file: read → chunk → embed → save.

    All writes happen in the caller's transaction scope.
    """
    filename = file.filename or "unknown"
    file_type = _get_file_type(filename)

    if file_type not in SUPPORTED_TYPES:
        raise DocumentProcessingError(
            f"Unsupported file type: {file_type}. Supported: {', '.join(SUPPORTED_TYPES)}"
        )

    raw_content = await file.read()
    file_size = len(raw_content)

    if file_size > settings.MAX_UPLOAD_FILE_SIZE:
        max_mb = settings.MAX_UPLOAD_FILE_SIZE // (1024 * 1024)
        raise DocumentProcessingError(f"File '{filename}' exceeds maximum size of {max_mb} MB")

    # Extract text
    if file_type == ".pdf":
        text = _extract_text_from_pdf(raw_content)
    else:
        try:
            text = raw_content.decode("utf-8")
        except UnicodeDecodeError as e:
            raise DocumentProcessingError(
                f"File '{filename}' is not valid UTF-8 encoded text"
            ) from e

    text = text.translate(_CONTROL_CHAR_TABLE)

    if not text.strip():
        raise DocumentProcessingError(f"File '{filename}' contains no extractable text")

    logger.info(f"Processing document: {filename} ({file_size} bytes)")

    # Chunk
    chunks = split_text(text)
    if not chunks:
        raise DocumentProcessingError(f"File '{filename}' produced no chunks")

    # Embed
    chunk_texts = [c.content for c in chunks]
    embeddings = await embed_texts(chunk_texts)

    # Save document
    document = Document(
        user_id=user_id,
        filename=filename,
        file_type=file_type,
        file_size=file_size,
        content=text,
        chunk_count=len(chunks),
    )
    db.add(document)
    await db.flush()  # Get document.id

    # Save chunks with embeddings
    for chunk, embedding in zip(chunks, embeddings):
        db_chunk = DocumentChunk(
            document_id=document.id,
            content=chunk.content,
            chunk_index=chunk.chunk_index,
            token_count=chunk.token_count,
            embedding=embedding,
            metadata_={"filename": filename},
        )
        db.add(db_chunk)

    await db.flush()
    logger.info(f"Document ingested: {filename} → {len(chunks)} chunks")

    return document
