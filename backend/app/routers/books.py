"""
Book listing, detail, and translation endpoints.
"""

import math

import os
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse

from app.core.config import settings
from app.core.dependencies import get_current_user, require_member
from app.db.mongodb import get_database
from app.db.redis import get_redis
from app.models.book import BookListItem, BookListResponse, BookResponse, TranslationResponse, BookAudioResponse
from app.services.rate_limiter import check_rate_limit
from app.services.translation import translate_text
from app.services.audio import is_audio_ready, generate_book_audio, get_audio_filepath

router = APIRouter(prefix="/books", tags=["Books"])



@router.get("", response_model=BookListResponse)
async def list_books(
    q: str = Query(default="", description="Search by title, author, or genre"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=10, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """List books with search and pagination (any authenticated user)."""
    db = get_database()
    skip = (page - 1) * limit

    query_filter = {}
    if q:
        query_filter["$text"] = {"$search": q}

    total = await db["books"].count_documents(query_filter)
    cursor = db["books"].find(
        query_filter,
        {"content_text": 0},  # Exclude full content from listing
    ).sort("created_at", -1).skip(skip).limit(limit)

    books = []
    async for doc in cursor:
        doc["_id"] = str(doc["_id"])
        books.append(BookListItem(**doc))

    return BookListResponse(
        books=books,
        total=total,
        page=page,
        limit=limit,
        pages=math.ceil(total / limit) if total > 0 else 1,
    )


@router.get("/{book_id}", response_model=BookResponse)
async def get_book(book_id: str, current_user: dict = Depends(get_current_user)):
    """Get a single book by ID (any authenticated user)."""
    db = get_database()

    if not ObjectId.is_valid(book_id):
        raise HTTPException(status_code=400, detail="Invalid book ID")

    doc = await db["books"].find_one({"_id": ObjectId(book_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Book not found")

    doc["_id"] = str(doc["_id"])
    return BookResponse(**doc)


@router.get("/{book_id}/translate", response_model=TranslationResponse)
async def translate_book(
    book_id: str,
    lang: str = Query(..., description="Target language ISO code (e.g., hi, te)"),
    member: dict = Depends(require_member),
):
    """
    Translate a book's content to a regional language (member only).
    Results are cached in Redis for 24h.
    """
    # Validate language
    allowed_languages = settings.target_languages_list
    if lang not in allowed_languages:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported language '{lang}'. Allowed: {allowed_languages}",
        )

    # Rate limit check
    allowed = await check_rate_limit(
        user_id=member["_id"],
        action="translate",
        limit=settings.RATE_LIMIT_TRANSLATE,
        window=settings.RATE_LIMIT_WINDOW,
    )
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded. Please try again later.",
        )

    # Check Redis cache
    redis = get_redis()
    cache_key = f"translate:{book_id}:{lang}"
    cached = await redis.get(cache_key)
    if cached:
        return TranslationResponse(
            book_id=book_id,
            language=lang,
            translated_text=cached,
            cached=True,
        )

    # Fetch book content
    db = get_database()
    if not ObjectId.is_valid(book_id):
        raise HTTPException(status_code=400, detail="Invalid book ID")

    doc = await db["books"].find_one(
        {"_id": ObjectId(book_id)},
        {"content_text": 1},
    )
    if not doc:
        raise HTTPException(status_code=404, detail="Book not found")

    # Translate
    try:
        translated = await translate_text(doc["content_text"], lang)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Translation service error: {str(e)}",
        )

    # Cache result
    await redis.set(cache_key, translated, ex=settings.CACHE_TTL_SECONDS)

    return TranslationResponse(
        book_id=book_id,
        language=lang,
        translated_text=translated,
        cached=False,
    )


# ---------------------------------------------------------------------------
# Audio (Text-to-Speech) endpoints
# ---------------------------------------------------------------------------

@router.get("/{book_id}/audio/status", response_model=BookAudioResponse)
async def get_book_audio_status(
    book_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Check whether offline TTS audio has been generated for this book."""
    db = get_database()
    if not ObjectId.is_valid(book_id):
        raise HTTPException(status_code=400, detail="Invalid book ID")

    doc = await db["books"].find_one({"_id": ObjectId(book_id)}, {"_id": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Book not found")

    ready = is_audio_ready(book_id)
    return BookAudioResponse(
        book_id=book_id,
        audio_ready=ready,
        audio_url=f"/books/{book_id}/audio/stream",
    )


@router.post("/{book_id}/audio/generate", response_model=BookAudioResponse)
async def generate_audio_for_book(
    book_id: str,
    member: dict = Depends(require_member),
):
    """
    Generate offline text-to-speech WAV audio for the book's content.
    Caches the audio file on disk. Member only.
    """
    db = get_database()
    if not ObjectId.is_valid(book_id):
        raise HTTPException(status_code=400, detail="Invalid book ID")

    doc = await db["books"].find_one({"_id": ObjectId(book_id)}, {"content_text": 1})
    if not doc:
        raise HTTPException(status_code=404, detail="Book not found")

    content = doc.get("content_text", "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="Book has no content text to read.")

    try:
        await generate_book_audio(book_id, content)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio generation failed: {str(e)}",
        )

    return BookAudioResponse(
        book_id=book_id,
        audio_ready=True,
        audio_url=f"/books/{book_id}/audio/stream",
    )


@router.get("/{book_id}/audio/stream")
async def stream_book_audio(book_id: str):
    """
    Stream or download the generated WAV audio for a book.
    Accessible for HTML5 <audio> elements without requiring header injection.
    """
    if not ObjectId.is_valid(book_id):
        raise HTTPException(status_code=400, detail="Invalid book ID")

    if not is_audio_ready(book_id):
        raise HTTPException(
            status_code=404,
            detail="Audio has not been generated for this book yet.",
        )

    filepath = get_audio_filepath(book_id)
    return FileResponse(
        filepath,
        media_type="audio/wav",
        filename=f"book_{book_id}.wav",
        headers={"Accept-Ranges": "bytes"},
    )

