"""
Security utilities: password hashing (bcrypt) and JWT token management.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
import jwt

from app.core.config import settings


# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

def hash_password(plain_password: str) -> str:
    """Hash a plain-text password with bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(plain_password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against a bcrypt hash."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


# ---------------------------------------------------------------------------
# JWT tokens
# ---------------------------------------------------------------------------

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.JWT_ACCESS_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire, "type": "access"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=settings.JWT_REFRESH_EXPIRE_DAYS)
    )
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> Dict[str, Any]:
    """
    Decode and verify a JWT token.
    Raises jwt.ExpiredSignatureError or jwt.InvalidTokenError on failure.
    """
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
