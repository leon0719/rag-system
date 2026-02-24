"""Integration tests for vector search using real PostgreSQL + pgvector."""

import uuid

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.document import Document, DocumentChunk
from app.services.rag import vector_search

pytestmark = pytest.mark.integration


@pytest.fixture
async def user_with_documents(db: AsyncSession, test_user):
    """Create test user with documents and embeddings."""
    doc = Document(
        id=uuid.uuid4(),
        user_id=test_user.id,
        filename="test.txt",
        file_type="txt",
        file_size=100,
        content="This is a test document about Python programming.",
        chunk_count=2,
    )
    db.add(doc)
    await db.flush()

    # Chunk about Python
    chunk1 = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc.id,
        content="Python is a popular programming language.",
        chunk_index=0,
        token_count=8,
        embedding=[0.1] * 1536,
    )
    # Chunk about JavaScript (different topic)
    chunk2 = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc.id,
        content="JavaScript runs in the browser.",
        chunk_index=1,
        token_count=6,
        embedding=[0.9] * 1536,
    )
    db.add_all([chunk1, chunk2])
    await db.commit()

    return test_user, doc, [chunk1, chunk2]


async def test_vector_search_returns_results(db: AsyncSession, user_with_documents):
    """Vector search should return chunks sorted by similarity."""
    user, _doc, chunks = user_with_documents

    # Query embedding close to chunk1 (all 0.1)
    query_embedding = [0.1] * 1536

    results = await vector_search(db, query_embedding, user.id, top_k=5)

    assert len(results) == 2
    # First result should be the most similar (chunk1)
    first_chunk, first_distance, first_filename = results[0]
    assert first_chunk.id == chunks[0].id
    assert first_filename == "test.txt"
    assert first_distance < 0.01  # Very close to 0 (identical vectors)


async def test_vector_search_respects_max_distance(db: AsyncSession, user_with_documents):
    """Vector search should filter out chunks above max_distance threshold."""
    user, _doc, _chunks = user_with_documents

    query_embedding = [0.1] * 1536

    # Very strict threshold — only exact matches
    results = await vector_search(db, query_embedding, user.id, top_k=5, max_distance=0.001)

    # Only chunk1 (embedding=[0.1]*1536) should pass since query is identical
    assert len(results) == 1
    assert results[0][1] < 0.001


async def test_vector_search_isolates_by_user(db: AsyncSession, user_with_documents):
    """Vector search should only return chunks belonging to the querying user."""
    _user, _doc, _chunks = user_with_documents

    other_user_id = uuid.uuid4()
    query_embedding = [0.1] * 1536

    results = await vector_search(db, query_embedding, other_user_id, top_k=5)

    assert len(results) == 0


async def test_vector_search_top_k_limits(db: AsyncSession, user_with_documents):
    """Vector search should respect the top_k limit."""
    user, _doc, _chunks = user_with_documents

    query_embedding = [0.5] * 1536

    results = await vector_search(db, query_embedding, user.id, top_k=1)

    assert len(results) == 1


async def test_vector_search_skips_null_embeddings(db: AsyncSession, test_user):
    """Chunks with null embeddings should not appear in search results."""
    doc = Document(
        id=uuid.uuid4(),
        user_id=test_user.id,
        filename="null_embed.txt",
        file_type="txt",
        file_size=50,
        content="Document with null embedding chunk.",
        chunk_count=1,
    )
    db.add(doc)
    await db.flush()

    chunk = DocumentChunk(
        id=uuid.uuid4(),
        document_id=doc.id,
        content="This chunk has no embedding.",
        chunk_index=0,
        token_count=6,
        embedding=None,
    )
    db.add(chunk)
    await db.commit()

    query_embedding = [0.5] * 1536
    results = await vector_search(db, query_embedding, test_user.id, top_k=5)

    assert all(r[0].id != chunk.id for r in results)
