"""
Admin-only endpoints: CRUD for books and articles, member listing, stats.
"""

import math
from datetime import datetime, timezone

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.dependencies import require_admin
from app.db.mongodb import get_database
from app.db.redis import get_redis
from app.models.book import BookCreate, BookUpdate, BookResponse
from app.models.article import ArticleCreate, ArticleUpdate, ArticleResponse
from app.models.user import MemberResponse
from app.services.audio import delete_book_audio

router = APIRouter(prefix="/admin", tags=["Admin"])


# ---------------------------------------------------------------------------
# Books CRUD
# ---------------------------------------------------------------------------

@router.post("/books", response_model=BookResponse, status_code=status.HTTP_201_CREATED)
async def create_book(payload: BookCreate, admin: dict = Depends(require_admin)):
    """Create a new book (admin only)."""
    db = get_database()
    doc = {
        **payload.model_dump(),
        "uploaded_by": admin["_id"],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db["books"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return BookResponse(**doc)


@router.put("/books/{book_id}", response_model=BookResponse)
async def update_book(book_id: str, payload: BookUpdate, admin: dict = Depends(require_admin)):
    """Update an existing book (admin only). Invalidates cached translations."""
    db = get_database()

    if not ObjectId.is_valid(book_id):
        raise HTTPException(status_code=400, detail="Invalid book ID")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db["books"].find_one_and_update(
        {"_id": ObjectId(book_id)},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Book not found")

    # Invalidate cached translations and audio for this book
    if "content_text" in update_data:
        delete_book_audio(book_id)
        redis = get_redis()
        async for key in redis.scan_iter(f"translate:{book_id}:*"):
            await redis.delete(key)

    result["_id"] = str(result["_id"])
    return BookResponse(**result)


@router.delete("/books/{book_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_book(book_id: str, admin: dict = Depends(require_admin)):
    """Delete a book (admin only). Invalidates cached translations and audio."""
    db = get_database()

    if not ObjectId.is_valid(book_id):
        raise HTTPException(status_code=400, detail="Invalid book ID")

    result = await db["books"].delete_one({"_id": ObjectId(book_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Book not found")

    # Invalidate cached audio and translations
    delete_book_audio(book_id)
    redis = get_redis()
    async for key in redis.scan_iter(f"translate:{book_id}:*"):
        await redis.delete(key)



# ---------------------------------------------------------------------------
# Articles CRUD
# ---------------------------------------------------------------------------

@router.post("/articles", response_model=ArticleResponse, status_code=status.HTTP_201_CREATED)
async def create_article(payload: ArticleCreate, admin: dict = Depends(require_admin)):
    """Create a new article (admin only)."""
    db = get_database()
    doc = {
        **payload.model_dump(),
        "uploaded_by": admin["_id"],
        "created_at": datetime.now(timezone.utc),
    }
    result = await db["articles"].insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    return ArticleResponse(**doc)


@router.put("/articles/{article_id}", response_model=ArticleResponse)
async def update_article(article_id: str, payload: ArticleUpdate, admin: dict = Depends(require_admin)):
    """Update an existing article (admin only). Invalidates cached summary."""
    db = get_database()

    if not ObjectId.is_valid(article_id):
        raise HTTPException(status_code=400, detail="Invalid article ID")

    update_data = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = await db["articles"].find_one_and_update(
        {"_id": ObjectId(article_id)},
        {"$set": update_data},
        return_document=True,
    )
    if not result:
        raise HTTPException(status_code=404, detail="Article not found")

    # Invalidate cached summary
    if "content_text" in update_data:
        redis = get_redis()
        await redis.delete(f"summary:{article_id}")

    result["_id"] = str(result["_id"])
    return ArticleResponse(**result)


@router.delete("/articles/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_article(article_id: str, admin: dict = Depends(require_admin)):
    """Delete an article (admin only). Invalidates cached summary."""
    db = get_database()

    if not ObjectId.is_valid(article_id):
        raise HTTPException(status_code=400, detail="Invalid article ID")

    result = await db["articles"].delete_one({"_id": ObjectId(article_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Article not found")

    redis = get_redis()
    await redis.delete(f"summary:{article_id}")


# ---------------------------------------------------------------------------
# Members listing
# ---------------------------------------------------------------------------

@router.get("/members", response_model=list[MemberResponse])
async def list_members(admin: dict = Depends(require_admin)):
    """List all registered members (admin only)."""
    db = get_database()
    cursor = db["users"].find(
        {"role": "member"},
        {"password_hash": 0},
    ).sort("created_at", -1)

    members = []
    async for user in cursor:
        user["_id"] = str(user["_id"])
        members.append(MemberResponse(**user))
    return members


# ---------------------------------------------------------------------------
# Stats
# ---------------------------------------------------------------------------

@router.get("/stats")
async def get_stats(admin: dict = Depends(require_admin)):
    """Get basic usage statistics (admin only)."""
    db = get_database()

    total_books = await db["books"].count_documents({})
    total_articles = await db["articles"].count_documents({})
    total_members = await db["users"].count_documents({"role": "member"})

    return {
        "total_books": total_books,
        "total_articles": total_articles,
        "total_members": total_members,
    }
