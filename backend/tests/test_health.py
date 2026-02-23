"""Health endpoint tests."""

from unittest.mock import AsyncMock, patch

import pytest


@pytest.mark.asyncio
async def test_health_returns_200(client):
    """Health endpoint should return 200 with status healthy when all services up."""
    with patch("app.api.health.get_redis") as mock_get_redis:
        mock_redis = AsyncMock()
        mock_redis.ping = AsyncMock(return_value=True)
        mock_get_redis.return_value = mock_redis

        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert data["database"] == "ok"
        assert data["redis"] == "ok"


@pytest.mark.asyncio
async def test_health_returns_503_when_redis_down(client):
    """Health endpoint should return 503 when Redis is unavailable."""
    with patch("app.api.health.get_redis") as mock_get_redis:
        mock_get_redis.side_effect = ConnectionError("Redis unavailable")

        response = await client.get("/api/health")
        assert response.status_code == 503
        data = response.json()
        assert data["status"] == "unhealthy"
        assert data["database"] == "ok"
        assert data["redis"] == "error"
