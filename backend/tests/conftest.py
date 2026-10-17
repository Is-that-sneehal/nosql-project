"""
Pytest fixtures for backend tests.
"""

import asyncio
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.core.security import hash_password, create_access_token


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def mock_db():
    """Mock MongoDB database."""
    db = MagicMock()
    # Mock collections
    db.__getitem__ = MagicMock(return_value=AsyncMock())
    return db


@pytest.fixture
def mock_redis():
    """Mock Redis client."""
    redis = AsyncMock()
    redis.get = AsyncMock(return_value=None)
    redis.set = AsyncMock()
    redis.pipeline = MagicMock(return_value=AsyncMock())
    return redis


@pytest.fixture
def admin_user():
    """Sample admin user document."""
    return {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Admin User",
        "email": "admin@library.com",
        "password_hash": hash_password("admin123"),
        "role": "admin",
        "created_at": datetime.now(timezone.utc),
    }


@pytest.fixture
def member_user():
    """Sample member user document."""
    return {
        "_id": "507f1f77bcf86cd799439012",
        "name": "Member User",
        "email": "member@library.com",
        "password_hash": hash_password("member123"),
        "role": "member",
        "created_at": datetime.now(timezone.utc),
    }


@pytest.fixture
def admin_token(admin_user):
    """JWT access token for admin user."""
    return create_access_token({"sub": admin_user["_id"], "role": "admin"})


@pytest.fixture
def member_token(member_user):
    """JWT access token for member user."""
    return create_access_token({"sub": member_user["_id"], "role": "member"})


@pytest.fixture
def client(mock_db, mock_redis):
    """Create a test client with mocked dependencies."""
    from app.db.mongodb import set_database
    from app.db.redis import set_redis

    set_database(mock_db)
    set_redis(mock_redis)

    with patch("app.db.mongodb.connect_mongodb", new_callable=AsyncMock), \
         patch("app.db.mongodb.close_mongodb", new_callable=AsyncMock), \
         patch("app.db.redis.connect_redis", new_callable=AsyncMock), \
         patch("app.db.redis.close_redis", new_callable=AsyncMock):
        from app.main import app
        yield TestClient(app)

    set_database(None)
    set_redis(None)
