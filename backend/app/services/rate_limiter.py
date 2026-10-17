"""
Redis-based sliding window rate limiter.
"""

import time

from app.db.redis import get_redis


async def check_rate_limit(
    user_id: str,
    action: str,
    limit: int = 20,
    window: int = 3600,
) -> bool:
    """
    Check if the user has exceeded the rate limit for the given action.

    Uses a Redis sorted set with timestamps as scores for a sliding window.

    Returns True if the request is allowed, raises an exception if rate-limited.
    """
    redis = get_redis()
    key = f"ratelimit:{user_id}:{action}"
    now = time.time()
    window_start = now - window

    # Use a pipeline for atomicity
    pipe = redis.pipeline()

    # Remove entries older than the window
    pipe.zremrangebyscore(key, 0, window_start)

    # Count current entries in the window
    pipe.zcard(key)

    # Add the current request
    pipe.zadd(key, {str(now): now})

    # Set expiry on the key so it auto-cleans
    pipe.expire(key, window)

    results = await pipe.execute()
    current_count = results[1]  # zcard result

    if current_count >= limit:
        return False  # Rate limit exceeded

    return True  # Request allowed
