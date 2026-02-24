"""Conversation service: CRUD operations and message management."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError
from app.models.conversation import Conversation, Message
from app.schemas.conversation import ConversationListItem, PaginatedConversationList


async def create_conversation(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str = "",
) -> Conversation:
    """Create a new conversation."""
    conversation = Conversation(user_id=user_id, title=title)
    db.add(conversation)
    await db.flush()
    return conversation


async def list_user_conversations(
    db: AsyncSession,
    user_id: uuid.UUID,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedConversationList:
    """List conversations for a user with pagination."""
    offset = (page - 1) * page_size

    count_stmt = (
        select(func.count()).select_from(Conversation).where(Conversation.user_id == user_id)
    )
    total = (await db.execute(count_stmt)).scalar_one()

    stmt = (
        select(Conversation)
        .where(Conversation.user_id == user_id)
        .order_by(Conversation.updated_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    result = await db.execute(stmt)
    conversations = result.scalars().all()

    return PaginatedConversationList(
        items=[ConversationListItem.model_validate(c) for c in conversations],
        page=page,
        page_size=page_size,
        has_more=(offset + page_size) < total,
    )


async def get_conversation_detail(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> Conversation:
    """Get a conversation with all messages. Raises NotFoundError if not found or not owned."""
    stmt = (
        select(Conversation)
        .options(selectinload(Conversation.messages))
        .where(Conversation.id == conversation_id, Conversation.user_id == user_id)
    )
    result = await db.execute(stmt)
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise NotFoundError("Conversation not found")
    return conversation


async def update_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
    title: str,
) -> Conversation:
    """Update a conversation's title."""
    stmt = select(Conversation).where(
        Conversation.id == conversation_id, Conversation.user_id == user_id
    )
    result = await db.execute(stmt)
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise NotFoundError("Conversation not found")

    conversation.title = title
    await db.flush()
    await db.refresh(conversation)
    return conversation


async def delete_conversation(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    user_id: uuid.UUID,
) -> None:
    """Delete a conversation and all its messages."""
    stmt = select(Conversation).where(
        Conversation.id == conversation_id, Conversation.user_id == user_id
    )
    result = await db.execute(stmt)
    conversation = result.scalar_one_or_none()
    if conversation is None:
        raise NotFoundError("Conversation not found")

    await db.delete(conversation)
    await db.flush()


async def get_recent_messages(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    limit: int = 10,
) -> list[Message]:
    """Get the most recent messages in a conversation, ordered chronologically."""
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(stmt)
    messages = list(result.scalars().all())
    messages.reverse()
    return messages


async def add_message(
    db: AsyncSession,
    conversation_id: uuid.UUID,
    role: str,
    content: str,
    sources: list[dict] | None = None,
    prompt_tokens: int | None = None,
    completion_tokens: int | None = None,
) -> Message:
    """Add a message to a conversation."""
    message = Message(
        conversation_id=conversation_id,
        role=role,
        content=content,
        sources=sources,
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )
    db.add(message)
    await db.flush()
    return message
