"""
Pydantic models for User-related request/response schemas.
"""

from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, EmailStr, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, examples=["John Doe"])
    email: EmailStr = Field(..., examples=["john@example.com"])
    password: str = Field(..., min_length=6, max_length=128, examples=["securepass123"])
    role: Literal["admin", "member"] = Field(default="member")


class UserLogin(BaseModel):
    email: EmailStr = Field(..., examples=["john@example.com"])
    password: str = Field(..., examples=["securepass123"])


class TokenRefresh(BaseModel):
    refresh_token: str


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class UserResponse(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    email: str
    role: str
    created_at: datetime

    class Config:
        populate_by_name = True


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserResponse


class MemberResponse(BaseModel):
    id: str = Field(..., alias="_id")
    name: str
    email: str
    created_at: datetime

    class Config:
        populate_by_name = True
