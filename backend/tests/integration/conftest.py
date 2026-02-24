"""Integration test fixtures using real PostgreSQL + pgvector."""

import os
import uuid
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.models.base import Base
from app.services.auth import hash_password

pytestmark = pytest.mark.integration

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://test:test@localhost:5433/rag_test",
)


@pytest.fixture(scope="session")
def anyio_backend():
    return "asyncio"


@pytest.fixture(scope="session")
async def pg_engine():
    """Create a PostgreSQL async engine for integration testing."""
    engine = create_async_engine(DATABASE_URL, echo=False)

    async with engine.begin() as conn:
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture
async def db(pg_engine) -> AsyncGenerator[AsyncSession]:
    """Yield an async session that rolls back after each test."""
    session_factory = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture
async def client(pg_engine) -> AsyncGenerator[AsyncClient]:
    """Create a test HTTP client with real PostgreSQL."""
    session_factory = async_sessionmaker(pg_engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db() -> AsyncGenerator[AsyncSession]:
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    with (
        patch("app.services.auth.is_token_blacklisted", new_callable=AsyncMock, return_value=False),
        patch("app.services.auth.blacklist_token", new_callable=AsyncMock),
        patch("app.dependencies.is_token_blacklisted", new_callable=AsyncMock, return_value=False),
    ):
        from app.main import create_app

        test_app = create_app()
        test_app.dependency_overrides[get_db] = override_get_db

        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            yield ac


@pytest.fixture
async def test_user(db: AsyncSession):
    """Create a test user in PostgreSQL."""
    from app.models.user import User

    user = User(
        id=uuid.uuid4(),
        email=f"test-{uuid.uuid4().hex[:8]}@example.com",
        username=f"testuser-{uuid.uuid4().hex[:8]}",
        hashed_password=hash_password("TestPassword123!"),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@pytest.fixture
def auth_headers(test_user) -> dict[str, str]:
    """Generate auth headers with a valid access token for the test user."""
    from app.services.auth import create_access_token

    token = create_access_token(test_user.id)
    return {"Authorization": f"Bearer {token}"}
