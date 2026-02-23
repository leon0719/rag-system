"""Custom exceptions and FastAPI exception handlers."""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from loguru import logger


class AppError(Exception):
    """Base application error."""

    def __init__(self, message: str, status_code: int = 500):
        self.message = message
        self.status_code = status_code
        super().__init__(message)


class NotFoundError(AppError):
    """Resource not found."""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(message, status_code=404)


class AuthenticationError(AppError):
    """Authentication failed."""

    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, status_code=401)


class AuthorizationError(AppError):
    """Authorization failed."""

    def __init__(self, message: str = "Permission denied"):
        super().__init__(message, status_code=403)


class AIServiceError(AppError):
    """AI service (OpenAI) error."""

    def __init__(self, message: str = "AI service error"):
        super().__init__(message, status_code=502)


class ValidationError(AppError):
    """Validation error."""

    def __init__(self, message: str = "Validation failed"):
        super().__init__(message, status_code=422)


class DocumentProcessingError(AppError):
    """Document processing error."""

    def __init__(self, message: str = "Document processing failed"):
        super().__init__(message, status_code=422)


def register_exception_handlers(app: FastAPI) -> None:
    """Register custom exception handlers on the FastAPI app."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        logger.warning(f"{exc.__class__.__name__}: {exc.message}")
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message},
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception(f"Unhandled error: {exc}")
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error"},
        )
