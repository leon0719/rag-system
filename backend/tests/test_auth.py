"""Auth endpoint tests."""

import pytest


@pytest.mark.asyncio
async def test_register_success(client):
    """Register endpoint should create a new user."""
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "new@example.com",
            "username": "newuser",
            "password": "StrongPass123!",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert data["username"] == "newuser"
    assert "id" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client):
    """Register should fail with duplicate email (generic message, no enumeration)."""
    payload = {
        "email": "dup@example.com",
        "username": "user1",
        "password": "StrongPass123!",
    }
    await client.post("/api/auth/register", json=payload)
    response = await client.post(
        "/api/auth/register",
        json={**payload, "username": "user2"},
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_duplicate_username(client):
    """Register should fail with duplicate username (generic message, no enumeration)."""
    await client.post(
        "/api/auth/register",
        json={
            "email": "first@example.com",
            "username": "sameuser",
            "password": "StrongPass123!",
        },
    )
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "second@example.com",
            "username": "sameuser",
            "password": "StrongPass123!",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_register_weak_password(client):
    """Register should reject weak passwords."""
    response = await client.post(
        "/api/auth/register",
        json={
            "email": "weak@example.com",
            "username": "weakuser",
            "password": "short",
        },
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client):
    """Login should return access token."""
    # Register first
    await client.post(
        "/api/auth/register",
        json={
            "email": "login@example.com",
            "username": "loginuser",
            "password": "StrongPass123!",
        },
    )
    # Login
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "login@example.com",
            "password": "StrongPass123!",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client):
    """Login should fail with wrong password."""
    await client.post(
        "/api/auth/register",
        json={
            "email": "wrong@example.com",
            "username": "wronguser",
            "password": "StrongPass123!",
        },
    )
    response = await client.post(
        "/api/auth/login",
        json={
            "email": "wrong@example.com",
            "password": "WrongPassword123!",
        },
    )
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_me_authenticated(client):
    """Me endpoint should return user info with valid token."""
    # Register and login
    await client.post(
        "/api/auth/register",
        json={
            "email": "me@example.com",
            "username": "meuser",
            "password": "StrongPass123!",
        },
    )
    login_response = await client.post(
        "/api/auth/login",
        json={"email": "me@example.com", "password": "StrongPass123!"},
    )
    token = login_response.json()["access"]

    response = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == "me@example.com"
    assert data["username"] == "meuser"


@pytest.mark.asyncio
async def test_me_unauthenticated(client):
    """Me endpoint should fail without token."""
    response = await client.get("/api/auth/me")
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_logout(client):
    """Logout should succeed with valid token."""
    # Register and login
    await client.post(
        "/api/auth/register",
        json={
            "email": "logout@example.com",
            "username": "logoutuser",
            "password": "StrongPass123!",
        },
    )
    login_response = await client.post(
        "/api/auth/login",
        json={"email": "logout@example.com", "password": "StrongPass123!"},
    )
    token = login_response.json()["access"]

    response = await client.post(
        "/api/auth/logout",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["message"] == "Successfully logged out"
