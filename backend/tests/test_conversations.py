"""Conversation CRUD endpoint tests."""

import uuid

import pytest


@pytest.fixture
async def second_user(db):
    """Create a second test user for ownership tests."""
    from app.models.user import User
    from app.services.auth import hash_password

    user = User(
        id=uuid.uuid4(),
        email="other@example.com",
        username="otheruser",
        hashed_password=hash_password("TestPassword123!"),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
def second_auth_headers(second_user) -> dict[str, str]:
    from app.services.auth import create_access_token

    token = create_access_token(second_user.id)
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_create_conversation(client, auth_headers):
    """Create conversation should return 201 with title."""
    response = await client.post(
        "/api/conversations/",
        json={"title": "Test Conversation"},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Test Conversation"
    assert "id" in data


@pytest.mark.asyncio
async def test_create_conversation_default_title(client, auth_headers):
    """Create conversation with empty title should work."""
    response = await client.post(
        "/api/conversations/",
        json={},
        headers=auth_headers,
    )
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == ""


@pytest.mark.asyncio
async def test_list_conversations(client, auth_headers):
    """List conversations should return paginated results."""
    for i in range(3):
        await client.post(
            "/api/conversations/",
            json={"title": f"Conv {i}"},
            headers=auth_headers,
        )

    response = await client.get("/api/conversations/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 3
    assert data["page"] == 1
    assert data["has_more"] is False


@pytest.mark.asyncio
async def test_list_conversations_pagination(client, auth_headers):
    """List conversations should respect page_size."""
    for i in range(5):
        await client.post(
            "/api/conversations/",
            json={"title": f"Conv {i}"},
            headers=auth_headers,
        )

    response = await client.get("/api/conversations/?page=1&page_size=2", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["items"]) == 2
    assert data["has_more"] is True

    response = await client.get("/api/conversations/?page=3&page_size=2", headers=auth_headers)
    data = response.json()
    assert len(data["items"]) == 1
    assert data["has_more"] is False


@pytest.mark.asyncio
async def test_get_conversation_detail(client, auth_headers):
    """Get detail should return conversation with messages list."""
    create_resp = await client.post(
        "/api/conversations/",
        json={"title": "Detail Test"},
        headers=auth_headers,
    )
    conv_id = create_resp.json()["id"]

    response = await client.get(f"/api/conversations/{conv_id}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == conv_id
    assert data["title"] == "Detail Test"
    assert data["messages"] == []


@pytest.mark.asyncio
async def test_update_conversation_title(client, auth_headers):
    """Update should change the title."""
    create_resp = await client.post(
        "/api/conversations/",
        json={"title": "Old Title"},
        headers=auth_headers,
    )
    conv_id = create_resp.json()["id"]

    response = await client.patch(
        f"/api/conversations/{conv_id}",
        json={"title": "New Title"},
        headers=auth_headers,
    )
    assert response.status_code == 200
    assert response.json()["title"] == "New Title"


@pytest.mark.asyncio
async def test_delete_conversation(client, auth_headers):
    """Delete should remove the conversation."""
    create_resp = await client.post(
        "/api/conversations/",
        json={"title": "To Delete"},
        headers=auth_headers,
    )
    conv_id = create_resp.json()["id"]

    response = await client.delete(f"/api/conversations/{conv_id}", headers=auth_headers)
    assert response.status_code == 204

    response = await client.get(f"/api/conversations/{conv_id}", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_other_user_conversation_returns_404(client, auth_headers, second_auth_headers):
    """Accessing another user's conversation should return 404."""
    create_resp = await client.post(
        "/api/conversations/",
        json={"title": "Private"},
        headers=auth_headers,
    )
    conv_id = create_resp.json()["id"]

    response = await client.get(f"/api/conversations/{conv_id}", headers=second_auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_other_user_conversation_returns_404(
    client, auth_headers, second_auth_headers
):
    """Updating another user's conversation should return 404."""
    create_resp = await client.post(
        "/api/conversations/",
        json={"title": "Private"},
        headers=auth_headers,
    )
    conv_id = create_resp.json()["id"]

    response = await client.patch(
        f"/api/conversations/{conv_id}",
        json={"title": "Hacked"},
        headers=second_auth_headers,
    )
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_delete_other_user_conversation_returns_404(
    client, auth_headers, second_auth_headers
):
    """Deleting another user's conversation should return 404."""
    create_resp = await client.post(
        "/api/conversations/",
        json={"title": "Private"},
        headers=auth_headers,
    )
    conv_id = create_resp.json()["id"]

    response = await client.delete(f"/api/conversations/{conv_id}", headers=second_auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_nonexistent_conversation_returns_404(client, auth_headers):
    """Getting a non-existent conversation should return 404."""
    fake_id = str(uuid.uuid4())
    response = await client.get(f"/api/conversations/{fake_id}", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_list_conversations_empty(client, auth_headers):
    """List should return empty list when no conversations."""
    response = await client.get("/api/conversations/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["items"] == []
    assert data["has_more"] is False
