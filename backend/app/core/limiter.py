"""Rate limiter configuration using SlowAPI."""

import jwt
from slowapi import Limiter
from slowapi.util import get_ipaddr
from starlette.requests import Request

from app.config import get_settings


def get_user_id_or_ip(request: Request) -> str:
    """Extract user ID from JWT for authenticated endpoints, fallback to IP."""
    settings = get_settings()
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        try:
            payload = jwt.decode(
                token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
            )
            user_id = payload.get("sub")
            if user_id:
                return user_id
        except jwt.PyJWTError:
            pass

    return get_ipaddr(request)


settings = get_settings()

limiter = Limiter(
    key_func=get_ipaddr,
    default_limits=[settings.RATE_LIMIT_DEFAULT],
    enabled=settings.RATE_LIMIT_ENABLED,
    storage_uri=settings.REDIS_URL,
    key_prefix="rag_ratelimit",
    headers_enabled=True,
    retry_after="delta-seconds",
)
