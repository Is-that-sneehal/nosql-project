"""
Pydantic models for Book-related request/response schemas.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class BookCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300, examples=["The Great Gatsby"])
    author: str = Field(..., min_length=1, max_length=200, examples=["F. Scott Fitzgerald"])
    genre: str = Field(..., min_length=1, max_length=100, examples=["Fiction"])
    description: str = Field(default="", max_length=2000)
    content_text: str = Field(..., min_length=1, examples=["Full book content here..."])
    cover_url: Optional[str] = Field(default=None, examples=["https://example.com/cover.jpg"])


class BookUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    author: Optional[str] = Field(None, min_length=1, max_length=200)
    genre: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=2000)
    content_text: Optional[str] = Field(None, min_length=1)
    cover_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class BookResponse(BaseModel):
    id: str = Field(..., alias="_id")
    title: str
    author: str
    genre: str
    description: str = ""
    content_text: str
    cover_url: Optional[str] = None
    uploaded_by: str
    created_at: datetime

    class Config:
        populate_by_name = True


class BookListItem(BaseModel):
    """Lighter version for listing — excludes full content_text."""
    id: str = Field(..., alias="_id")
    title: str
    author: str
    genre: str
    description: str = ""
    cover_url: Optional[str] = None
    created_at: datetime

    class Config:
        populate_by_name = True


class BookListResponse(BaseModel):
    books: List[BookListItem]
    total: int
    page: int
    limit: int
    pages: int


class TranslationResponse(BaseModel):
    book_id: str
    language: str
    translated_text: str
    cached: bool = False


class BookAudioResponse(BaseModel):
    book_id: str
    audio_ready: bool
    audio_url: str
    tts_available: bool = False

