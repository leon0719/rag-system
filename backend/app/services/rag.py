"""RAG pipeline: vector search + LLM generation (SSE streaming)."""

import json
import uuid
from collections.abc import AsyncGenerator

from loguru import logger
from openai import OpenAIError
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession
from tenacity import RetryError

from app.config import get_settings
from app.core.openai import get_openai_client
from app.models.document import Document, DocumentChunk
from app.schemas.chat import SourceChunk
from app.services.conversation import add_message, create_conversation
from app.services.embedding import embed_text

settings = get_settings()

SYSTEM_PROMPT = """You are a helpful assistant that answers questions based on the provided context.
Use ONLY the context below to answer the question. If the context doesn't contain enough information,
say so clearly. Do not make up information.

Context:
{context}"""


def _sse_event(event: str, data: str | dict | list) -> str:
    """Format a Server-Sent Event string."""
    payload = json.dumps(data) if isinstance(data, (dict, list)) else data
    return f"event: {event}\ndata: {payload}\n\n"


async def vector_search(
    db: AsyncSession,
    query_embedding: list[float],
    user_id: uuid.UUID,
    top_k: int,
) -> list[tuple[DocumentChunk, float, str]]:
    """Search for the most similar chunks belonging to the user.

    Returns list of (chunk, distance_score, filename) tuples.
    """
    stmt = (
        select(
            DocumentChunk,
            DocumentChunk.embedding.cosine_distance(query_embedding).label("distance"),
            Document.filename,
        )
        .join(Document, DocumentChunk.document_id == Document.id)
        .where(Document.user_id == user_id)
        .where(DocumentChunk.embedding.isnot(None))
        .order_by(text("distance"))
        .limit(top_k)
    )

    result = await db.execute(stmt)
    rows = result.all()
    return [(row[0], float(row[1]), row[2]) for row in rows]


async def query_rag_stream(
    db: AsyncSession,
    question: str,
    user_id: uuid.UUID,
    top_k: int | None = None,
    conversation_id: uuid.UUID | None = None,
) -> AsyncGenerator[str]:
    """Full RAG pipeline with SSE streaming.

    Yields SSE-formatted strings:
      - event: conversation_id → conversation UUID (sent first)
      - event: sources  → retrieved source chunks
      - event: delta    → incremental LLM text token
      - event: usage    → token usage stats
      - event: done     → stream complete
      - event: error    → error message
    """
    if top_k is None:
        top_k = settings.VECTOR_SEARCH_TOP_K

    # 0. Resolve or create conversation
    if conversation_id is None:
        title = question[:50]
        conversation = await create_conversation(db, user_id, title=title)
        conversation_id = conversation.id

    yield _sse_event("conversation_id", str(conversation_id))

    # Save user message
    await add_message(db, conversation_id, role="user", content=question)

    # 1. Embed the question
    try:
        query_embedding = await embed_text(question)
    except (OpenAIError, RetryError) as e:
        logger.error(f"Embedding error: {e}")
        yield _sse_event("error", {"detail": "Failed to process your query. Please try again."})
        return

    # 2. Vector search (only user's documents)
    results = await vector_search(db, query_embedding, user_id, top_k)

    if not results:
        no_result_msg = (
            "I couldn't find any relevant information in your documents to answer this question."
        )
        yield _sse_event("sources", [])
        yield _sse_event("delta", no_result_msg)
        await add_message(db, conversation_id, role="assistant", content=no_result_msg)
        yield _sse_event("done", {})
        return

    # 3. Build context and send sources
    context_parts = []
    sources = []
    for chunk, distance, filename in results:
        similarity = 1.0 - distance
        context_parts.append(f"[{filename} - chunk {chunk.chunk_index}]\n{chunk.content}")
        sources.append(
            SourceChunk(
                document_id=str(chunk.document_id),
                filename=filename,
                chunk_index=chunk.chunk_index,
                content=chunk.content,
                score=round(similarity, 4),
            )
        )

    yield _sse_event("sources", [s.model_dump() for s in sources])

    context = "\n\n---\n\n".join(context_parts)

    # 4. Stream LLM response
    client = get_openai_client()
    try:
        stream = await client.chat.completions.create(
            model=settings.CHAT_MODEL,
            temperature=settings.CHAT_TEMPERATURE,
            max_tokens=settings.CHAT_MAX_TOKENS,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT.format(context=context)},
                {"role": "user", "content": question},
            ],
            stream=True,
            stream_options={"include_usage": True},
        )
    except (OpenAIError, RetryError) as e:
        logger.error(f"OpenAI chat completion error: {e}")
        yield _sse_event("error", {"detail": "Failed to generate response. Please try again."})
        return

    full_text = ""
    prompt_tokens = None
    completion_tokens = None
    async for stream_chunk in stream:
        if stream_chunk.choices:
            delta = stream_chunk.choices[0].delta
            if delta.content:
                full_text += delta.content
                yield _sse_event("delta", delta.content)

        if stream_chunk.usage:
            prompt_tokens = stream_chunk.usage.prompt_tokens
            completion_tokens = stream_chunk.usage.completion_tokens
            yield _sse_event(
                "usage",
                {
                    "prompt_tokens": prompt_tokens,
                    "completion_tokens": completion_tokens,
                    "total_tokens": stream_chunk.usage.total_tokens,
                },
            )

    # 5. Save assistant message with sources and usage
    await add_message(
        db,
        conversation_id,
        role="assistant",
        content=full_text,
        sources=[s.model_dump() for s in sources],
        prompt_tokens=prompt_tokens,
        completion_tokens=completion_tokens,
    )

    logger.info(f"RAG stream completed: {len(results)} chunks retrieved")
    yield _sse_event("done", {"full_text": full_text})
