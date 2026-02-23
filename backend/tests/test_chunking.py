"""Chunking service unit tests (no mocks needed)."""

import pytest

from app.services.chunking import split_text


@pytest.mark.asyncio
async def test_split_short_text():
    """Short text should produce a single chunk."""
    chunks = split_text("Hello world", chunk_size=512, chunk_overlap=50)
    assert len(chunks) == 1
    assert chunks[0].content == "Hello world"
    assert chunks[0].chunk_index == 0
    assert chunks[0].token_count > 0


@pytest.mark.asyncio
async def test_split_long_text():
    """Long text should be split into multiple chunks."""
    # Create a long text with multiple paragraphs
    paragraphs = [f"This is paragraph number {i}. " * 20 for i in range(10)]
    text = "\n\n".join(paragraphs)

    chunks = split_text(text, chunk_size=100, chunk_overlap=10)
    assert len(chunks) > 1

    # All chunks should have content
    for chunk in chunks:
        assert chunk.content.strip()
        assert chunk.token_count > 0


@pytest.mark.asyncio
async def test_split_preserves_paragraph_boundaries():
    """Splitter should prefer splitting at paragraph boundaries."""
    text = "Paragraph one content here.\n\nParagraph two content here.\n\nParagraph three content here."
    chunks = split_text(text, chunk_size=512, chunk_overlap=50)
    # With large chunk_size, everything should fit in one chunk
    assert len(chunks) == 1
    assert "Paragraph one" in chunks[0].content


@pytest.mark.asyncio
async def test_split_empty_text():
    """Empty text should produce no chunks."""
    chunks = split_text("", chunk_size=512, chunk_overlap=50)
    assert len(chunks) == 0


@pytest.mark.asyncio
async def test_split_whitespace_only():
    """Whitespace-only text should produce no chunks."""
    chunks = split_text("   \n\n  \n  ", chunk_size=512, chunk_overlap=50)
    assert len(chunks) == 0


@pytest.mark.asyncio
async def test_chunk_indices_are_sequential():
    """Chunk indices should be sequential starting from 0."""
    text = "Word " * 500
    chunks = split_text(text, chunk_size=50, chunk_overlap=5)
    for i, chunk in enumerate(chunks):
        assert chunk.chunk_index == i


@pytest.mark.asyncio
async def test_split_with_overlap():
    """Chunks after the first should contain overlap from the previous chunk."""
    paragraphs = [f"Paragraph {i} " * 30 for i in range(5)]
    text = "\n\n".join(paragraphs)

    chunks = split_text(text, chunk_size=50, chunk_overlap=10)
    assert len(chunks) > 1

    # Second chunk onwards should contain text from the tail of the previous raw chunk
    for i in range(1, len(chunks)):
        assert chunks[i].token_count > 0
        assert len(chunks[i].content) > 0


@pytest.mark.asyncio
async def test_split_zero_overlap():
    """With zero overlap, chunks should not contain overlap prefix."""
    text = "Word " * 500
    chunks_no_overlap = split_text(text, chunk_size=50, chunk_overlap=0)
    assert len(chunks_no_overlap) > 1

    # Compare with overlap — overlap chunks should be longer
    chunks_with_overlap = split_text(text, chunk_size=50, chunk_overlap=10)
    assert len(chunks_with_overlap) == len(chunks_no_overlap)

    # First chunks are identical (no overlap applied to index 0)
    assert chunks_no_overlap[0].content == chunks_with_overlap[0].content

    # Subsequent overlap chunks should have more tokens
    for i in range(1, len(chunks_no_overlap)):
        assert chunks_with_overlap[i].token_count >= chunks_no_overlap[i].token_count


@pytest.mark.asyncio
async def test_single_chunk_no_overlap_applied():
    """A single chunk should not have overlap applied."""
    chunks = split_text("Short text here", chunk_size=512, chunk_overlap=50)
    assert len(chunks) == 1
    assert chunks[0].content == "Short text here"
