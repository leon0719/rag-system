"""Document schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class DocumentUploadResponse(BaseModel):
    """Response for a single uploaded document."""

    id: UUID
    filename: str
    file_type: str
    file_size: int
    chunk_count: int

    model_config = {"from_attributes": True}


class DocumentListItem(BaseModel):
    """Document list item."""

    id: UUID
    filename: str
    file_type: str
    file_size: int
    chunk_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedDocumentList(BaseModel):
    """Paginated list of documents."""

    items: list[DocumentListItem]
    page: int
    page_size: int
    has_more: bool


class DocumentDetail(BaseModel):
    """Document detail response."""

    id: UUID
    filename: str
    file_type: str
    file_size: int
    content: str
    chunk_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
