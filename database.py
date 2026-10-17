"""
Simple synchronous database and cache connections.
- MongoDB via pymongo
- Redis via redis-py
"""

import os
from pymongo import MongoClient
import redis
from dotenv import load_dotenv

load_dotenv()

# MongoDB setup
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/library_simple_db")
mongo_client = MongoClient(MONGO_URI)

# Get database name from URI or default
try:
    db = mongo_client.get_default_database()
except Exception:
    db = mongo_client["library_simple_db"]

users_col = db["users"]
books_col = db["books"]
articles_col = db["articles"]

# Redis setup (synchronous with fakeredis fallback if server offline)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
try:
    _real_client = redis.from_url(REDIS_URL, decode_responses=True, socket_connect_timeout=1)
    _real_client.ping()
    redis_client = _real_client
except Exception:
    try:
        import fakeredis
        redis_client = fakeredis.FakeRedis(decode_responses=True)
    except Exception:
        redis_client = None

