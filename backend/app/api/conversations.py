"""Conversation CRUD endpoints."""

import uuid

from fastapi import APIRouter, Query, Request, Response

from app.core.limiter import get_user_id_or_ip, limiter
from app.dependencies import CurrentUser, DBSession
from app.schemas.conversation import (
    ConversationCreateRequest,
    ConversationDetail,
    ConversationListItem,
    ConversationUpdateRequest,
    PaginatedConversationList,
)
from app.services.conversation import (
    create_conversation,
    delete_conversation,
    get_conversation_detail,
    list_user_conversations,
    update_conversation,
)

router = APIRouter(prefix="/conversations", tags=["conversations"])


@router.post("/", response_model=ConversationListItem, status_code=201)
@limiter.limit("10/minute", key_func=get_user_id_or_ip)
async def create(
    request: Request,
    response: Response,
    payload: ConversationCreateRequest,
    db: DBSession,
    user: CurrentUser,
) -> ConversationListItem:
    """Create a new conversation."""
    conversation = await create_conversation(db, user.id, title=payload.title)
    return ConversationListItem.model_validate(conversation)


@router.get("/", response_model=PaginatedConversationList)
@limiter.limit("30/minute", key_func=get_user_id_or_ip)
async def list_conversations(
    request: Request,
    response: Response,
    db: DBSession,
    user: CurrentUser,
    page: int = Query(default=1, ge=1, le=1000),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginatedConversationList:
    """List user's conversations with pagination."""
    return await list_user_conversations(db, user.id, page=page, page_size=page_size)


@router.get("/{conversation_id}", response_model=ConversationDetail)
@limiter.limit("30/minute", key_func=get_user_id_or_ip)
async def get_detail(
    request: Request,
    response: Response,
    conversation_id: uuid.UUID,
    db: DBSession,
    user: CurrentUser,
) -> ConversationDetail:
    """Get conversation detail with all messages."""
    conversation = await get_conversation_detail(db, conversation_id, user.id)
    return ConversationDetail.model_validate(conversation)


@router.patch("/{conversation_id}", response_model=ConversationListItem)
@limiter.limit("10/minute", key_func=get_user_id_or_ip)
async def update_title(
    request: Request,
    response: Response,
    conversation_id: uuid.UUID,
    payload: ConversationUpdateRequest,
    db: DBSession,
    user: CurrentUser,
) -> ConversationListItem:
    """Update a conversation's title."""
    conversation = await update_conversation(db, conversation_id, user.id, title=payload.title)
    return ConversationListItem.model_validate(conversation)


@router.delete("/{conversation_id}", status_code=204)
@limiter.limit("10/minute", key_func=get_user_id_or_ip)
async def delete(
    request: Request,
    response: Response,
    conversation_id: uuid.UUID,
    db: DBSession,
    user: CurrentUser,
) -> None:
    """Delete a conversation and all its messages."""
    await delete_conversation(db, conversation_id, user.id)
