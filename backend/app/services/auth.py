"""Auth service: JWT generation/verification, password hashing, token blacklist."""

import uuid
from datetime import UTC, datetime, timedelta
from enum import StrEnum
from typing import Any

import bcrypt
import jwt
import redis.asyncio as aioredis
from loguru import logger
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.core.exceptions import AuthenticationError, ValidationError
from app.models.user import User

settings = get_settings()

_redis_client: aioredis.Redis | None = None


class TokenType(StrEnum):
    """JWT token types to prevent type confusion attacks."""

    ACCESS = "access"
    REFRESH = "refresh"


async def get_redis() -> aioredis.Redis:
    """Get or create Redis client."""
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis_client


# --- Password hashing ---


def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode(), hashed.encode())


# --- JWT ---


def create_access_token(user_id: uuid.UUID) -> str:
    """Create a JWT access token."""
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "token_type": TokenType.ACCESS,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(user_id: uuid.UUID) -> str:
    """Create a JWT refresh token."""
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "token_type": TokenType.REFRESH,
        "jti": str(uuid.uuid4()),
        "iat": now,
        "exp": now + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS),
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str, *, verify_exp: bool = True) -> dict[str, Any] | None:
    """Decode and validate a JWT token.

    Returns the payload dict if valid, None otherwise.
    """
    try:
        return jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"verify_exp": verify_exp},
        )
    except jwt.PyJWTError:
        return None


# --- Token blacklist (Redis) ---


async def blacklist_token(token: str) -> None:
    """Add a token to the blacklist with TTL matching its remaining lifetime."""
    payload = decode_token(token, verify_exp=False)
    if payload is None:
        return

    jti = payload.get("jti")
    if not jti:
        return

    exp = payload.get("exp")
    if exp:
        ttl = int(exp - datetime.now(UTC).timestamp())
        if ttl <= 0:
            return  # Already expired, no need to blacklist
    else:
        ttl = settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS * 86400

    r = await get_redis()
    await r.set(f"token_blacklist:{jti}", "1", ex=ttl)


async def is_token_blacklisted(jti: str) -> bool:
    """Check if a token JTI is blacklisted."""
    r = await get_redis()
    return await r.exists(f"token_blacklist:{jti}") > 0


# --- User operations ---


async def register_user(db: AsyncSession, email: str, username: str, password: str) -> User:
    """Register a new user."""
    result = await db.execute(
        select(User).where(or_(User.email == email, User.username == username))
    )
    if result.scalar_one_or_none():
        logger.warning(f"Registration failed: duplicate email or username attempt for {email}")
        raise ValidationError("Registration failed. Please check your details and try again.")

    user = User(
        email=email,
        username=username,
        hashed_password=hash_password(password),
    )
    db.add(user)
    await db.flush()
    logger.info(f"New user registered: user_id={user.id}, email={email}")
    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> User:
    """Authenticate a user by email and password."""
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if user is None or not verify_password(password, user.hashed_password):
        logger.warning(f"Login failed: invalid credentials for {email}")
        raise AuthenticationError("Invalid email or password")

    if not user.is_active:
        raise AuthenticationError("User account is deactivated")

    logger.info(f"User logged in: user_id={user.id}, email={email}")
    return user
