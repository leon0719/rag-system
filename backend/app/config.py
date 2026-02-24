"""Application settings from environment variables."""

import os
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

_env = os.getenv("ENV", "local")
_env_file = f".env.{_env}"


class Settings(BaseSettings):
    """Application settings."""

    model_config = SettingsConfigDict(
        env_file=_env_file,
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # Required
    DATABASE_URL: str
    REDIS_URL: str
    OPENAI_API_KEY: str
    JWT_SECRET_KEY: str

    # Optional
    ENV: str = "local"
    DEBUG: bool = False
    CORS_ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"

    # JWT
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # AI / Embedding
    EMBEDDING_MODEL: str = "text-embedding-3-small"
    EMBEDDING_DIMENSION: int = 1536
    CHAT_MODEL: str = "gpt-4o"
    CHAT_TEMPERATURE: float = 0.7

    # Chunking
    CHUNK_SIZE: int = 512
    CHUNK_OVERLAP: int = 50

    # Upload
    MAX_UPLOAD_FILE_SIZE: int = 10 * 1024 * 1024  # 10 MB

    # RAG
    VECTOR_SEARCH_TOP_K: int = 5
    CHAT_MAX_TOKENS: int = 2048

    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_DEFAULT: str = "60/minute"

    def get_cors_origins(self) -> list[str]:
        """Parse comma-separated CORS origins."""
        return [v.strip() for v in self.CORS_ALLOWED_ORIGINS.split(",") if v.strip()]


@lru_cache
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()  # type: ignore[call-arg]
