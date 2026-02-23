"""Chat / RAG query SSE streaming tests."""

import json
from collections.abc import AsyncGenerator
from unittest.mock import patch

import pytest


async def _collect_sse_events(response) -> list[tuple[str, str]]:
    """Parse SSE events from response text into (event_type, data) tuples."""
    events = []
    text = response.text
    for block in text.strip().split("\n\n"):
        event_type = ""
        data = ""
        for line in block.strip().split("\n"):
            if line.startswith("event: "):
                event_type = line[7:]
            elif line.startswith("data: "):
                data = line[6:]
        if event_type:
            events.append((event_type, data))
    return events


@pytest.fixture
def mock_rag_stream():
    """Mock the RAG stream to yield SSE events."""

    async def fake_stream(**kwargs) -> AsyncGenerator[str]:
        yield 'event: sources\ndata: [{"document_id": "abc", "filename": "test.txt", "chunk_index": 0, "content": "Python is great.", "score": 0.95}]\n\n'
        yield 'event: delta\ndata: "This"\n\n'
        yield 'event: delta\ndata: " is"\n\n'
        yield 'event: delta\ndata: " the answer."\n\n'
        yield 'event: usage\ndata: {"prompt_tokens": 100, "completion_tokens": 10, "total_tokens": 110}\n\n'
        yield "event: done\ndata: {}\n\n"

    with patch("app.api.chat.query_rag_stream", side_effect=fake_stream):
        yield


@pytest.fixture
def mock_rag_stream_empty():
    """Mock RAG stream with no results."""

    async def fake_stream(**kwargs) -> AsyncGenerator[str]:
        yield "event: sources\ndata: []\n\n"
        yield 'event: delta\ndata: "No relevant information found."\n\n'
        yield "event: done\ndata: {}\n\n"

    with patch("app.api.chat.query_rag_stream", side_effect=fake_stream):
        yield


@pytest.mark.asyncio
async def test_query_stream_returns_sse(client, test_user, auth_headers, mock_rag_stream):
    """Query should return SSE stream with sources, delta, usage, done events."""
    response = await client.post(
        "/api/chat/query",
        json={"question": "What is Python?"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]

    events = await _collect_sse_events(response)
    event_types = [e[0] for e in events]

    assert "sources" in event_types
    assert "delta" in event_types
    assert "done" in event_types

    # Verify sources data is valid JSON array
    sources_data = next(d for t, d in events if t == "sources")
    sources = json.loads(sources_data)
    assert len(sources) == 1
    assert sources[0]["filename"] == "test.txt"

    # Verify usage event
    assert "usage" in event_types
    usage_data = next(d for t, d in events if t == "usage")
    usage = json.loads(usage_data)
    assert usage["total_tokens"] == 110


@pytest.mark.asyncio
async def test_query_stream_empty(client, test_user, auth_headers, mock_rag_stream_empty):
    """Query with no documents should stream empty sources and a message."""
    response = await client.post(
        "/api/chat/query",
        json={"question": "What is the meaning of life?"},
        headers=auth_headers,
    )
    assert response.status_code == 200

    events = await _collect_sse_events(response)
    event_types = [e[0] for e in events]

    assert "sources" in event_types
    assert "done" in event_types

    sources_data = next(d for t, d in events if t == "sources")
    assert json.loads(sources_data) == []


@pytest.mark.asyncio
async def test_query_unauthenticated(client):
    """Query without auth should fail."""
    response = await client.post(
        "/api/chat/query",
        json={"question": "test"},
    )
    assert response.status_code in (401, 403)
