"""
FastAPI dependencies for authentication and role-based access control.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from app.core.security import decode_token
from app.db.mongodb import get_database

security_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme),
) -> dict:
    """
    Extract and validate the current user from the JWT bearer token.
    Returns the full user document from MongoDB (without password_hash).
    """
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type — expected access token",
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
        )

    db = get_database()
    from bson import ObjectId

    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    # Convert ObjectId to string for JSON serialization
    user["_id"] = str(user["_id"])
    user.pop("password_hash", None)
    return user


async def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency that ensures the current user has admin role."""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


async def require_member(current_user: dict = Depends(get_current_user)) -> dict:
    """Dependency that ensures the current user has member role."""
    if current_user.get("role") != "member":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Member access required",
        )
    return current_user
