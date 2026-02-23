"""OpenAI embedding service."""

from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import get_settings
from app.core.openai import get_openai_client

settings = get_settings()


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
async def embed_text(text: str) -> list[float]:
    """Embed a single text string.

    Returns a list of floats (the embedding vector).
    """
    client = get_openai_client()
    response = await client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=text,
    )
    return response.data[0].embedding


@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=10))
async def _embed_batch(texts: list[str]) -> list[list[float]]:
    """Embed a single batch of texts with retry."""
    client = get_openai_client()
    response = await client.embeddings.create(
        model=settings.EMBEDDING_MODEL,
        input=texts,
    )
    return [item.embedding for item in response.data]


async def embed_texts(texts: list[str]) -> list[list[float]]:
    """Embed multiple texts in batches (max 100 per API call).

    Each batch is retried independently — a single batch failure
    does not re-process already-completed batches.
    """
    all_embeddings: list[list[float]] = []
    batch_size = 100

    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        batch_embeddings = await _embed_batch(batch)
        all_embeddings.extend(batch_embeddings)

    return all_embeddings
