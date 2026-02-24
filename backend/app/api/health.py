"""Health check endpoint."""

from fastapi import APIRouter, Response
from loguru import logger
from sqlalchemy import text

from app.dependencies import DBSession
from app.services.auth import get_redis

router = APIRouter(tags=["health"])

root_router = APIRouter(tags=["root"])


@router.get("/health")
async def health(db: DBSession, response: Response):
    """Health check: verify database and Redis connectivity."""
    checks: dict[str, str] = {}

    # Database check
    try:
        await db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception as e:
        logger.warning(f"Health check database failure: {e}")
        checks["database"] = "error"

    # Redis check
    try:
        r = await get_redis()
        await r.ping()
        checks["redis"] = "ok"
    except Exception as e:
        logger.warning(f"Health check Redis failure: {e}")
        checks["redis"] = "error"

    healthy = all(v == "ok" for v in checks.values())
    if not healthy:
        response.status_code = 503

    return {"status": "healthy" if healthy else "unhealthy", **checks}


@root_router.get("/")
async def root():
    """Root endpoint: simple welcome message."""
    return {"message": "Welcome to the RAG System API!"}
