"""Test fixtures: async DB, test client, authenticated client helper."""

import os

# Set test environment variables BEFORE any app imports
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite://")
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("OPENAI_API_KEY", "sk-test-key")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-for-jwt")
os.environ.setdefault("ENV", "test")
os.environ.setdefault("DEBUG", "true")

import uuid
from collections.abc import AsyncGenerator
from unittest.mock import AsyncMock, patch

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import event, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database import get_db
from app.services.auth import hash_password


@pytest.fixture
async def engine():
    """Create an in-memory SQLite async engine for testing.

    Creates tables manually to avoid PostgreSQL-specific types (Vector, HNSW index).
    """
    test_engine = create_async_engine("sqlite+aiosqlite://", echo=False)

    # Enable WAL mode and FK support for SQLite
    @event.listens_for(test_engine.sync_engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    async with test_engine.begin() as conn:
        # Create tables manually (SQLite-compatible)
        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(50) NOT NULL,
                hashed_password VARCHAR(255) NOT NULL,
                is_active BOOLEAN DEFAULT 1 NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
            )
        """)
        )
        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS documents (
                id VARCHAR(36) PRIMARY KEY,
                user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                filename VARCHAR(255) NOT NULL,
                file_type VARCHAR(50) NOT NULL,
                file_size INTEGER NOT NULL,
                content TEXT NOT NULL,
                chunk_count INTEGER DEFAULT 0 NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
            )
        """)
        )
        await conn.execute(
            text("""
            CREATE TABLE IF NOT EXISTS document_chunks (
                id VARCHAR(36) PRIMARY KEY,
                document_id VARCHAR(36) NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
                content TEXT NOT NULL,
                chunk_index INTEGER NOT NULL,
                token_count INTEGER NOT NULL,
                embedding TEXT,
                metadata JSON
            )
        """)
        )

    yield test_engine
    await test_engine.dispose()


@pytest.fixture
async def db(engine) -> AsyncGenerator[AsyncSession]:
    """Yield an async session for testing."""
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session


@pytest.fixture
async def client(engine) -> AsyncGenerator[AsyncClient]:
    """Create a test HTTP client with DB session override."""
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

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
    """Create a test user in the database."""
    from app.models.user import User

    user = User(
        id=uuid.uuid4(),
        email="test@example.com",
        username="testuser",
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
