"""Chat / RAG query endpoint (SSE streaming)."""

from fastapi import APIRouter, Request, Response
from fastapi.responses import StreamingResponse

from app.core.limiter import get_user_id_or_ip, limiter
from app.dependencies import CurrentUser, DBSession
from app.schemas.chat import QueryRequest
from app.services.conversation import get_conversation_detail
from app.services.rag import query_rag_stream

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/query")
@limiter.limit("10/minute", key_func=get_user_id_or_ip)
async def query(
    request: Request, response: Response, payload: QueryRequest, db: DBSession, user: CurrentUser
):
    """RAG query with Server-Sent Events streaming.

    SSE events:
      - event: conversation_id → conversation UUID
      - event: sources  → retrieved source chunks (JSON array)
      - event: delta    → incremental LLM text token (string)
      - event: usage    → token usage stats (JSON object)
      - event: done     → stream complete
      - event: error    → error message (JSON object)
    """
    if payload.conversation_id is not None:
        await get_conversation_detail(db, payload.conversation_id, user.id)

    return StreamingResponse(
        query_rag_stream(
            db=db,
            question=payload.question,
            user_id=user.id,
            top_k=payload.top_k,
            conversation_id=payload.conversation_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
