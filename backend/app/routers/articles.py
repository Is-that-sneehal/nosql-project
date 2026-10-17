"""
Article listing, detail, and summarization endpoints.
"""

import math

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.config import settings
from app.core.dependencies import get_current_user, require_member
from app.db.mongodb import get_database
from app.db.redis import get_redis
from app.models.article import ArticleListItem, ArticleListResponse, ArticleResponse, SummaryResponse
from app.services.rate_limiter import check_rate_limit
from app.services.summarization import summarize_text

router = APIRouter(prefix="/articles", tags=["Articles"])


@router.get("", response_model=ArticleListResponse)
async def list_articles(
    q: str = Query(default="", description="Search by title or tags"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """List articles with search and pagination (any authenticated user)."""
    db = get_database()
    skip = (page - 1) * limit

    query_filter = {}
    if q:
        query_filter["$text"] = {"$search": q}

    total = await db["articles"].count_documents(query_filter)
    cursor = db["articles"].find(
        query_filter,
        {"content_text": 0},  # Exclude full content from listing
    ).sort("created_at", -1).skip(skip).limit(limit)

    articles = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        articles.append(ArticleListItem(**doc))

    return ArticleListResponse(
        articles=articles,
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit) if total > 0 else 1,
    )


@router.get("/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single article by ID (any authenticated user)."""
    db = get_database()

    if not ObjectId.is_valid(article_id):
        raise HTTPException(status_code=400, detail="Invalid article ID")

    doc = await db["articles"].find_one({"_id": ObjectId(article_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Article not found")

    doc["_id"] = str(doc["_id"])
    return ArticleResponse(**doc)


@router.get("/{article_id}/summarize", response_model=SummaryResponse)
async def summarize_article(
    article_id: str,
    member: dict = Depends(require_member),
):
    """
    Generate an extractive summary of an article (member only).
    Results are cached in Redis for 24h.
    """
    # Rate limit check
    allowed = await check_rate_limit(
        user_id=member["_id"],
        action="summarize",
        limit=settings.RATE_LIMIT_SUMMARIZE,
        window=settings.RATE_LIMIT_WINDOW,
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
        )

    # Check Redis cache
    redis = get_redis()
    cache_key = f"summary:{article_id}"
    cached = await redis.get(cache_key)
    if cached:
        return SummaryResponse(
            article_id=article_id,
            summary=cached,
            cached=True,
        )

    # Fetch article content
    db = get_database()
    if not ObjectId.is_valid(article_id):
        raise HTTPException(status_code=400, detail="Invalid article ID")

    doc = await db["articles"].find_one(
        {"_id": ObjectId(article_id)},
        {"content_text": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Article not found")

    # Summarize
    try:
        summary = await summarize_text(doc["content_text"], settings.SUMMARY_SENTENCES)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Summarization error: {str(e)}",
        )

    # Cache result
    await redis.set(cache_key, summary, ex=settings.CACHE_TTL_SECONDS)

    return SummaryResponse(
        article_id=article_id,
        summary=summary,
        cached=False,
    )
