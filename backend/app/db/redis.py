"""
Redis async connection management.
"""

import redis.asyncio as aioredis
from app.core.config import settings

_redis: aioredis.Redis | None = None


def set_redis(client: aioredis.Redis | None) -> None:
    """Explicitly set the Redis client instance (useful for testing)."""
    global _redis
    _redis = client

async def connect_redis() -> None:
    """Initialize the async Redis client."""
    global _redis
    try:
        _redis = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            socket_connect_timeout=2,
        )
        # Verify connection
        await _redis.ping()
    except Exception:
        try:
            import fakeredis.aioredis
            _redis = fakeredis.aioredis.FakeRedis(decode_responses=True)
            await _redis.ping()
        except Exception:
            _redis = None
            raise


async def close_redis() -> None:
    """Close the Redis connection."""
    global _redis
    if _redis:
        await _redis.close()
        _redis = None


def get_redis() -> aioredis.Redis:
    """Return the Redis client instance."""
    global _redis
    if _redis is None:
        raise RuntimeError("Redis client not initialized. Call connect_redis() first.")
    return _redis
