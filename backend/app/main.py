"""FastAPI application factory."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from slowapi.middleware import SlowAPIASGIMiddleware

from app.api import auth, chat, conversations, documents, health
from app.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.limiter import limiter
from app.core.logging import setup_logging
from app.database import get_engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None]:
    """Application lifespan: setup on startup, teardown on shutdown."""
    settings = get_settings()
    setup_logging(json_logs=settings.ENV == "prod")
    yield
    await get_engine().dispose()


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    application = FastAPI(
        title="RAG System API",
        version="0.1.0",
        lifespan=lifespan,
    )

    # Rate limiting
    application.state.limiter = limiter
    application.add_middleware(SlowAPIASGIMiddleware)

    # CORS
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Exception handlers
    register_exception_handlers(application)

    # Routers
    application.include_router(health.root_router)
    application.include_router(health.router, prefix="/api")
    application.include_router(auth.router, prefix="/api")
    application.include_router(documents.router, prefix="/api")
    application.include_router(conversations.router, prefix="/api")
    application.include_router(chat.router, prefix="/api")

    def custom_openapi() -> dict[str, Any]:
        if application.openapi_schema:
            return application.openapi_schema

        openapi_schema = get_openapi(
            title=application.title,
            version=application.version,
            routes=application.routes,
        )
        _patch_upload_schemas(openapi_schema)
        application.openapi_schema = openapi_schema
        return openapi_schema

    application.openapi = custom_openapi  # type: ignore[assignment]

    return application


def _patch_file_property(prop: dict[str, Any]) -> None:
    """Convert OpenAPI 3.1 contentMediaType to format:binary for Swagger UI."""
    if prop.get("type") == "array":
        items = prop.get("items", {})
        if items.get("contentMediaType"):
            items.pop("contentMediaType", None)
            items["type"] = "string"
            items["format"] = "binary"
    elif prop.get("contentMediaType"):
        prop.pop("contentMediaType", None)
        prop["type"] = "string"
        prop["format"] = "binary"
    elif "anyOf" in prop:
        for variant in prop["anyOf"]:
            if variant.get("contentMediaType"):
                variant.pop("contentMediaType", None)
                variant["type"] = "string"
                variant["format"] = "binary"


def _patch_upload_schemas(openapi_schema: dict[str, Any]) -> None:
    """Patch all multipart/form-data schemas for Swagger UI file upload compatibility."""
    for path_data in openapi_schema.get("paths", {}).values():
        for method_data in path_data.values():
            if not isinstance(method_data, dict):
                continue
            multipart = (
                method_data.get("requestBody", {}).get("content", {}).get("multipart/form-data", {})
            )
            schema = multipart.get("schema", {})

            if "$ref" in schema:
                ref_path = schema["$ref"].lstrip("#/").split("/")
                ref_schema = openapi_schema
                for part in ref_path:
                    ref_schema = ref_schema.get(part, {})
                for prop in ref_schema.get("properties", {}).values():
                    _patch_file_property(prop)
            else:
                for prop in schema.get("properties", {}).values():
                    _patch_file_property(prop)


app = create_app()
