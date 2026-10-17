"""
Authentication endpoints: register, login, refresh.
"""

from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, HTTPException, status
import jwt

from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from app.db.mongodb import get_database
from app.models.user import UserCreate, UserLogin, TokenRefresh, TokenPair, UserResponse

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenPair, status_code=status.HTTP_201_CREATED)
async def register(payload: UserCreate):
    """Register a new user and return JWT tokens."""
    db = get_database()

    # Check for existing email
    existing = await db["users"].find_one({"email": payload.email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    # Create user document
    user_doc = {
        "name": payload.name,
        "email": payload.email,
        "password_hash": hash_password(payload.password),
        "role": payload.role,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db["users"].insert_one(user_doc)
    user_id = str(result.inserted_id)

    # Generate tokens
    token_data = {"sub": user_id, "role": user_doc["role"]}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    user_doc["_id"] = user_id
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(**user_doc),
    )


@router.post("/login", response_model=TokenPair)
async def login(payload: UserLogin):
    """Authenticate a user and return JWT tokens."""
    db = get_database()

    user = await db["users"].find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user_id = str(user["_id"])
    token_data = {"sub": user_id, "role": user["role"]}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    user["_id"] = user_id
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(**user),
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(payload: TokenRefresh):
    """Issue a new access token using a valid refresh token."""
    try:
        data = decode_token(payload.refresh_token)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if data.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type — expected refresh token",
        )

    db = get_database()
    user = await db["users"].find_one({"_id": ObjectId(data["sub"])})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    user_id = str(user["_id"])
    token_data = {"sub": user_id, "role": user["role"]}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    user["_id"] = user_id
    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserResponse(**user),
    )
