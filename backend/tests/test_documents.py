"""Document endpoint tests (mock OpenAI embedding)."""

import io
from unittest.mock import patch

import pytest


@pytest.fixture
def mock_embeddings():
    """Mock the embedding service to return None (SQLite can't handle Vector)."""

    async def fake_embed_texts(texts):
        return [None] * len(texts)

    with patch("app.services.document.embed_texts", side_effect=fake_embed_texts):
        yield


@pytest.mark.asyncio
async def test_upload_txt_file(client, test_user, auth_headers, mock_embeddings):
    """Upload a .txt file should succeed with 201."""
    content = "This is a test document with enough content to be meaningful."
    files = [("files", ("test.txt", io.BytesIO(content.encode()), "text/plain"))]

    response = await client.post(
        "/api/documents/upload",
        files=files,
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data) == 1
    assert data[0]["filename"] == "test.txt"
    assert data[0]["file_type"] == ".txt"
    assert data[0]["chunk_count"] > 0


@pytest.mark.asyncio
async def test_upload_multiple_files(client, test_user, auth_headers, mock_embeddings):
    """Upload multiple files should process each independently."""
    files = [
        ("files", ("file1.txt", io.BytesIO(b"Content of file one."), "text/plain")),
        ("files", ("file2.md", io.BytesIO(b"# Content of file two"), "text/plain")),
    ]

    response = await client.post(
        "/api/documents/upload",
        files=files,
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert len(data) == 2


@pytest.mark.asyncio
async def test_upload_unsupported_type(client, test_user, auth_headers):
    """Upload unsupported file type should fail."""
    files = [("files", ("test.exe", io.BytesIO(b"binary content"), "application/octet-stream"))]

    response = await client.post(
        "/api/documents/upload",
        files=files,
        headers=auth_headers,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_upload_oversized_file(client, test_user, auth_headers):
    """Upload a file exceeding MAX_UPLOAD_FILE_SIZE should fail."""
    # Create content larger than 10 MB
    oversized_content = b"x" * (10 * 1024 * 1024 + 1)
    files = [("files", ("big.txt", io.BytesIO(oversized_content), "text/plain"))]

    response = await client.post(
        "/api/documents/upload",
        files=files,
        headers=auth_headers,
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_list_documents(client, test_user, auth_headers, mock_embeddings):
    """List documents should return paginated response."""
    files = [("files", ("list-test.txt", io.BytesIO(b"Some content here."), "text/plain"))]
    await client.post("/api/documents/upload", files=files, headers=auth_headers)

    response = await client.get("/api/documents/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "page" in data
    assert "page_size" in data
    assert "has_more" in data
    assert len(data["items"]) >= 1


@pytest.mark.asyncio
async def test_get_document(client, test_user, auth_headers, mock_embeddings):
    """Get document detail should return document info."""
    files = [("files", ("detail-test.txt", io.BytesIO(b"Detail content."), "text/plain"))]
    upload_response = await client.post("/api/documents/upload", files=files, headers=auth_headers)
    doc_id = upload_response.json()[0]["id"]

    response = await client.get(f"/api/documents/{doc_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "detail-test.txt"


@pytest.mark.asyncio
async def test_delete_document(client, test_user, auth_headers, mock_embeddings):
    """Delete document should succeed and return 204."""
    files = [("files", ("delete-test.txt", io.BytesIO(b"Delete me."), "text/plain"))]
    upload_response = await client.post("/api/documents/upload", files=files, headers=auth_headers)
    doc_id = upload_response.json()[0]["id"]

    response = await client.delete(f"/api/documents/{doc_id}", headers=auth_headers)
    assert response.status_code == 204

    # Verify it's gone
    get_response = await client.get(f"/api/documents/{doc_id}", headers=auth_headers)
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_get_nonexistent_document(client, test_user, auth_headers):
    """Get non-existent document should return 404."""
    import uuid

    fake_id = uuid.uuid4()
    response = await client.get(f"/api/documents/{fake_id}", headers=auth_headers)
    assert response.status_code == 404
