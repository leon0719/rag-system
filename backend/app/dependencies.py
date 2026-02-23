"""FastAPI dependencies."""

import uuid as _uuid
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AuthenticationError
from app.database import get_db
from app.models.user import User
from app.services.auth import TokenType, decode_token, is_token_blacklisted

DBSession = Annotated[AsyncSession, Depends(get_db)]

_security = HTTPBearer()


async def get_current_user(
    db: DBSession,
    credentials: HTTPAuthorizationCredentials = Depends(_security),
) -> User:
    """Decode JWT access token, check blacklist, and return the user."""
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise AuthenticationError("Invalid or expired token")

    if payload.get("token_type") != TokenType.ACCESS:
        raise AuthenticationError("Invalid token type")

    jti = payload.get("jti")
    if jti and await is_token_blacklisted(jti):
        raise AuthenticationError("Token has been revoked")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise AuthenticationError("Invalid token payload")

    try:
        user_id = _uuid.UUID(user_id_str)
    except ValueError:
        raise AuthenticationError("Invalid token payload") from None

    user = await db.get(User, user_id)
    if user is None:
        raise AuthenticationError("User not found")

    if not user.is_active:
        raise AuthenticationError("User account is deactivated")

    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
