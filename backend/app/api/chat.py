"""Chat / RAG query endpoint (SSE streaming)."""

from fastapi import APIRouter
from fastapi.responses import StreamingResponse

from app.dependencies import CurrentUser, DBSession
from app.schemas.chat import QueryRequest
from app.services.rag import query_rag_stream

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/query")
async def query(payload: QueryRequest, db: DBSession, user: CurrentUser):
    """RAG query with Server-Sent Events streaming.

    SSE events:
      - event: sources  → retrieved source chunks (JSON array)
      - event: delta    → incremental LLM text token (string)
      - event: usage    → token usage stats (JSON object)
      - event: done     → stream complete
      - event: error    → error message (JSON object)
    """
    return StreamingResponse(
        query_rag_stream(
            db=db,
            question=payload.question,
            user_id=user.id,
            top_k=payload.top_k,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
