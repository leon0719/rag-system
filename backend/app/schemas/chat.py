"""Chat / RAG query schemas."""

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """RAG query request."""

    question: str = Field(min_length=1, max_length=2000)
    top_k: int = Field(default=5, ge=1, le=20)


class SourceChunk(BaseModel):
    """A source chunk referenced in the answer."""

    document_id: str
    filename: str
    chunk_index: int
    content: str
    score: float


class TokenUsage(BaseModel):
    """Token usage statistics."""

    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


class QueryResponse(BaseModel):
    """RAG query response."""

    answer: str
    sources: list[SourceChunk]
    usage: TokenUsage | None = None
