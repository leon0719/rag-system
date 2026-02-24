"""Conversation and Message schemas."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ConversationCreateRequest(BaseModel):
    """Create a new conversation."""

    title: str = Field(default="", min_length=0, max_length=255)


class ConversationUpdateRequest(BaseModel):
    """Update conversation title."""

    title: str = Field(min_length=1, max_length=255)


class ConversationListItem(BaseModel):
    """Conversation summary for list view."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    created_at: datetime
    updated_at: datetime


class PaginatedConversationList(BaseModel):
    """Paginated list of conversations."""

    items: list[ConversationListItem]
    page: int
    page_size: int
    has_more: bool


class MessageResponse(BaseModel):
    """A single message in a conversation."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    role: str
    content: str
    sources: dict | list | None = None
    prompt_tokens: int | None = None
    completion_tokens: int | None = None
    created_at: datetime


class ConversationDetail(BaseModel):
    """Full conversation with messages."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    title: str
    messages: list[MessageResponse]
    created_at: datetime
    updated_at: datetime
