"""Auth API endpoints."""

import uuid as _uuid

from fastapi import APIRouter, Request, Response

from app.core.exceptions import AuthenticationError
from app.dependencies import CurrentUser, DBSession
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LogoutResponse,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services.auth import (
    TokenType,
    authenticate_user,
    blacklist_token,
    create_access_token,
    create_refresh_token,
    decode_token,
    is_token_blacklisted,
    register_user,
)

router = APIRouter(prefix="/auth", tags=["auth"])

REFRESH_TOKEN_COOKIE_NAME = "refresh_token"
REFRESH_TOKEN_COOKIE_PATH = "/"
REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60  # 7 days


def _set_refresh_token_cookie(response: Response, refresh_token: str) -> None:
    """Set refresh token as HttpOnly cookie."""
    response.set_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        value=refresh_token,
        max_age=REFRESH_TOKEN_MAX_AGE,
        httponly=True,
        secure=True,
        samesite="lax",
        path=REFRESH_TOKEN_COOKIE_PATH,
    )


def _clear_refresh_token_cookie(response: Response) -> None:
    """Clear refresh token cookie."""
    response.delete_cookie(
        key=REFRESH_TOKEN_COOKIE_NAME,
        path=REFRESH_TOKEN_COOKIE_PATH,
        httponly=True,
        secure=True,
        samesite="lax",
    )


@router.post("/register", response_model=UserResponse, status_code=201)
async def register(payload: RegisterRequest, db: DBSession):
    """Register a new user."""
    user = await register_user(
        db=db,
        email=payload.email,
        username=payload.username,
        password=payload.password,
    )
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: DBSession, response: Response):
    """Login and return access token. Refresh token set as HttpOnly cookie."""
    user = await authenticate_user(db, payload.email, payload.password)

    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)

    _set_refresh_token_cookie(response, refresh_token)

    return TokenResponse(access=access_token)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(request: Request, db: DBSession, response: Response):
    """Refresh access token using HttpOnly cookie with token rotation."""
    refresh_token_str = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)
    if not refresh_token_str:
        raise AuthenticationError("No refresh token provided")

    payload = decode_token(refresh_token_str)
    if payload is None:
        raise AuthenticationError("Invalid or expired refresh token")

    if payload.get("token_type") != TokenType.REFRESH:
        raise AuthenticationError("Invalid token type")

    jti = payload.get("jti")
    if jti and await is_token_blacklisted(jti):
        raise AuthenticationError("Token has been revoked")

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise AuthenticationError("Invalid refresh token")

    try:
        user_id = _uuid.UUID(user_id_str)
    except ValueError:
        raise AuthenticationError("Invalid refresh token") from None

    user = await db.get(User, user_id)
    if user is None:
        raise AuthenticationError("User not found")

    # Token rotation: blacklist old refresh token, issue new pair
    await blacklist_token(refresh_token_str)

    new_access = create_access_token(user.id)
    new_refresh = create_refresh_token(user.id)

    _set_refresh_token_cookie(response, new_refresh)

    return TokenResponse(access=new_access)


@router.post("/logout", response_model=LogoutResponse)
async def logout(request: Request, response: Response, user: CurrentUser):
    """Logout and blacklist tokens."""
    # Blacklist the access token
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header[7:]
        await blacklist_token(token)

    # Blacklist the refresh token from cookie
    refresh_token_str = request.cookies.get(REFRESH_TOKEN_COOKIE_NAME)
    if refresh_token_str:
        await blacklist_token(refresh_token_str)

    _clear_refresh_token_cookie(response)

    return LogoutResponse(message="Successfully logged out")


@router.get("/me", response_model=UserResponse)
async def me(user: CurrentUser):
    """Get current user info."""
    return user
