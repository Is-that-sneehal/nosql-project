"""
Pydantic models for Article-related request/response schemas.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Request schemas
# ---------------------------------------------------------------------------

class ArticleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=300, examples=["AI in Healthcare"])
    source: str = Field(default="", max_length=300, examples=["Nature Journal"])
    tags: List[str] = Field(default_factory=list, examples=[["AI", "healthcare"]])
    content_text: str = Field(..., min_length=1, examples=["Full article content here..."])


class ArticleUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    source: Optional[str] = Field(None, max_length=300)
    tags: Optional[List[str]] = None
    content_text: Optional[str] = Field(None, min_length=1)


# ---------------------------------------------------------------------------
# Response schemas
# ---------------------------------------------------------------------------

class ArticleResponse(BaseModel):
    id: str = Field(..., alias="_id")
    title: str
    source: str = ""
    tags: List[str] = []
    content_text: str
    uploaded_by: str
    created_at: datetime

    class Config:
        populate_by_name = True


class ArticleListItem(BaseModel):
    """Lighter version for listing — excludes full content_text."""
    id: str = Field(..., alias="_id")
    title: str
    source: str = ""
    tags: List[str] = []
    created_at: datetime

    class Config:
        populate_by_name = True


class ArticleListResponse(BaseModel):
    articles: List[ArticleListItem]
    total: int
    page: int
    limit: int
    pages: int


class SummaryResponse(BaseModel):
    article_id: str
    summary: str
    cached: bool = False
