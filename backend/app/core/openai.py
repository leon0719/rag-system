"""Shared AsyncOpenAI client singleton."""

from openai import AsyncOpenAI

from app.config import get_settings

_client: AsyncOpenAI | None = None


def get_openai_client() -> AsyncOpenAI:
    """Get or create singleton AsyncOpenAI client."""
    global _client
    if _client is None:
        settings = get_settings()
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


def reset_openai_client() -> None:
    """Reset the singleton client (for testing)."""
    global _client
    _client = None
