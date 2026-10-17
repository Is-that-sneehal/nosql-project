"""
Application settings loaded from environment variables.
Uses pydantic-settings for validation and type coercion.
"""

from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "library_db"

    # Redis
    REDIS_URL: str = "redis://localhost:6379"

    # JWT
    JWT_SECRET: str = "change-me-in-production-use-a-long-random-string"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    # Translation
    TARGET_LANGUAGES: str = "hi,te"

    # Summarization
    SUMMARY_SENTENCES: int = 4

    # Rate limiting
    RATE_LIMIT_TRANSLATE: int = 20  # requests per hour per user
    RATE_LIMIT_SUMMARIZE: int = 20  # requests per hour per user
    RATE_LIMIT_WINDOW: int = 3600   # 1 hour in seconds

    # Cache TTL
    CACHE_TTL_SECONDS: int = 86400  # 24 hours

    @property
    def target_languages_list(self) -> List[str]:
        """Parse comma-separated language codes into a list."""
        return [lang.strip() for lang in self.TARGET_LANGUAGES.split(",") if lang.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
