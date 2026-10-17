"""
MongoDB connection management using Motor async driver.
"""

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

_client: AsyncIOMotorClient | None = None
_db = None


def set_database(db) -> None:
    """Explicitly set the database instance (useful for testing)."""
    global _db
    _db = db


async def connect_mongodb() -> None:
    """Initialize the Motor client and create indexes."""
    global _client, _db
    _client = AsyncIOMotorClient(settings.MONGO_URI)
    _db = _client[settings.MONGO_DB_NAME]

    # Create indexes
    await _db["users"].create_index("email", unique=True)
    await _db["books"].create_index([("title", "text"), ("author", "text"), ("genre", "text")])
    await _db["articles"].create_index([("title", "text"), ("tags", "text")])


async def close_mongodb() -> None:
    """Close the Motor client."""
    global _client, _db
    if _client:
        _client.close()
        _client = None
    _db = None


def get_database() -> AsyncIOMotorDatabase:
    """Return the library database instance."""
    global _db, _client
    if _db is not None:
        return _db
    if _client is None:
        raise RuntimeError("MongoDB client not initialized. Call connect_mongodb() first.")
    return _client[settings.MONGO_DB_NAME]
