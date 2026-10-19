"""
Tests for translation and summarization services with mocked external calls.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from bson import ObjectId

from app.core.security import create_access_token


class TestTranslation:
    """Tests for GET /books/{id}/translate."""

    def test_translate_success(self, client, mock_db, mock_redis):
        """Translation with valid params should succeed."""
        user_id = "507f1f77bcf86cd799439012"
        member_token = create_access_token({"sub": user_id, "role": "member"})
        book_id = "507f1f77bcf86cd799439020"

        # Mock user lookup
        member_doc = {
            "_id": ObjectId(user_id),
            "name": "Member",
            "email": "member@test.com",
            "role": "member",
            "created_at": datetime.now(timezone.utc),
        }

        # Mock book lookup
        book_doc = {
            "_id": ObjectId(book_id),
            "content_text": "Hello, world. This is a test.",
        }

        def get_collection(name):
            col = AsyncMock()
            if name == "users":
                col.find_one = AsyncMock(return_value=member_doc)
            elif name == "books":
                col.find_one = AsyncMock(return_value=book_doc)
            return col

        mock_db.__getitem__ = MagicMock(side_effect=get_collection)

        # Mock Redis: no cache, rate limit OK
        mock_redis.get = AsyncMock(return_value=None)
        pipeline = AsyncMock()
        pipeline.zremrangebyscore = MagicMock()
        pipeline.zcard = MagicMock()
        pipeline.zadd = MagicMock()
        pipeline.expire = MagicMock()
        pipeline.execute = AsyncMock(return_value=[None, 0, None, None])
        mock_redis.pipeline = MagicMock(return_value=pipeline)

        with patch("app.services.translation._translate_chunk", return_value="नमस्ते, दुनिया"):
            response = client.get(
                f"/books/{book_id}/translate?lang=hi",
                headers={"Authorization": f"Bearer {member_token}"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["language"] == "hi"
        assert "नमस्ते" in data["translated_text"]

    def test_translate_invalid_language(self, client, mock_db, mock_redis):
        """Translation with unsupported language should fail."""
        user_id = "507f1f77bcf86cd799439012"
        member_token = create_access_token({"sub": user_id, "role": "member"})
        book_id = "507f1f77bcf86cd799439020"

        member_doc = {
            "_id": ObjectId(user_id),
            "name": "Member",
            "email": "member@test.com",
            "role": "member",
            "created_at": datetime.now(timezone.utc),
        }

        def get_collection(name):
            col = AsyncMock()
            if name == "users":
                col.find_one = AsyncMock(return_value=member_doc)
            return col

        mock_db.__getitem__ = MagicMock(side_effect=get_collection)

        response = client.get(
            f"/books/{book_id}/translate?lang=fr",
            headers={"Authorization": f"Bearer {member_token}"},
        )

        assert response.status_code == 400
        assert "Unsupported language" in response.json()["detail"]

    def test_translate_cached_result(self, client, mock_db, mock_redis):
        """Cached translation should return immediately without calling translator."""
        user_id = "507f1f77bcf86cd799439012"
        member_token = create_access_token({"sub": user_id, "role": "member"})
        book_id = "507f1f77bcf86cd799439020"

        member_doc = {
            "_id": ObjectId(user_id),
            "name": "Member",
            "email": "member@test.com",
            "role": "member",
            "created_at": datetime.now(timezone.utc),
        }

        def get_collection(name):
            col = AsyncMock()
            if name == "users":
                col.find_one = AsyncMock(return_value=member_doc)
            return col

        mock_db.__getitem__ = MagicMock(side_effect=get_collection)

        # Mock Redis: cache HIT
        mock_redis.get = AsyncMock(return_value="Cached Hindi translation text")
        pipeline = AsyncMock()
        pipeline.zremrangebyscore = MagicMock()
        pipeline.zcard = MagicMock()
        pipeline.zadd = MagicMock()
        pipeline.expire = MagicMock()
        pipeline.execute = AsyncMock(return_value=[None, 0, None, None])
        mock_redis.pipeline = MagicMock(return_value=pipeline)

        response = client.get(
            f"/books/{book_id}/translate?lang=hi",
            headers={"Authorization": f"Bearer {member_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["cached"] is True
        assert data["translated_text"] == "Cached Hindi translation text"

    def test_translate_admin_forbidden(self, client, mock_db):
        """Admin should not be able to use translate endpoint."""
        user_id = "507f1f77bcf86cd799439011"
        admin_token = create_access_token({"sub": user_id, "role": "admin"})
        book_id = "507f1f77bcf86cd799439020"

        admin_doc = {
            "_id": ObjectId(user_id),
            "name": "Admin",
            "email": "admin@test.com",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        }

        def get_collection(name):
            col = AsyncMock()
            if name == "users":
                col.find_one = AsyncMock(return_value=admin_doc)
            return col

        mock_db.__getitem__ = MagicMock(side_effect=get_collection)

        response = client.get(
            f"/books/{book_id}/translate?lang=hi",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 403


class TestSummarization:
    """Tests for GET /articles/{id}/summarize."""

    def test_summarize_success(self, client, mock_db, mock_redis):
        """Summarization with valid params should succeed."""
        user_id = "507f1f77bcf86cd799439012"
        member_token = create_access_token({"sub": user_id, "role": "member"})
        article_id = "507f1f77bcf86cd799439030"

        member_doc = {
            "_id": ObjectId(user_id),
            "name": "Member",
            "email": "member@test.com",
            "role": "member",
            "created_at": datetime.now(timezone.utc),
        }

        article_doc = {
            "_id": ObjectId(article_id),
            "content_text": (
                "Artificial intelligence is transforming healthcare. "
                "Machine learning algorithms detect diseases early. "
                "AI helps in drug discovery. "
                "Natural language processing streamlines clinical documentation."
            ),
        }

        def get_collection(name):
            col = AsyncMock()
            if name == "users":
                col.find_one = AsyncMock(return_value=member_doc)
            elif name == "articles":
                col.find_one = AsyncMock(return_value=article_doc)
            return col

        mock_db.__getitem__ = MagicMock(side_effect=get_collection)

        mock_redis.get = AsyncMock(return_value=None)
        pipeline = AsyncMock()
        pipeline.zremrangebyscore = MagicMock()
        pipeline.zcard = MagicMock()
        pipeline.zadd = MagicMock()
        pipeline.expire = MagicMock()
        pipeline.execute = AsyncMock(return_value=[None, 0, None, None])
        mock_redis.pipeline = MagicMock(return_value=pipeline)

        with patch(
            "app.services.summarization._summarize_sync",
            return_value="AI transforms healthcare and drug discovery.",
        ):
            response = client.get(
                f"/articles/{article_id}/summarize",
                headers={"Authorization": f"Bearer {member_token}"},
            )

        assert response.status_code == 200
        data = response.json()
        assert "summary" in data
        assert len(data["summary"]) > 0

    def test_summarize_cached(self, client, mock_db, mock_redis):
        """Cached summary should return immediately."""
        user_id = "507f1f77bcf86cd799439012"
        member_token = create_access_token({"sub": user_id, "role": "member"})
        article_id = "507f1f77bcf86cd799439030"

        member_doc = {
            "_id": ObjectId(user_id),
            "name": "Member",
            "email": "member@test.com",
            "role": "member",
            "created_at": datetime.now(timezone.utc),
        }

        def get_collection(name):
            col = AsyncMock()
            if name == "users":
                col.find_one = AsyncMock(return_value=member_doc)
            return col

        mock_db.__getitem__ = MagicMock(side_effect=get_collection)

        mock_redis.get = AsyncMock(return_value="Cached summary text")
        pipeline = AsyncMock()
        pipeline.zremrangebyscore = MagicMock()
        pipeline.zcard = MagicMock()
        pipeline.zadd = MagicMock()
        pipeline.expire = MagicMock()
        pipeline.execute = AsyncMock(return_value=[None, 0, None, None])
        mock_redis.pipeline = MagicMock(return_value=pipeline)

        response = client.get(
            f"/articles/{article_id}/summarize",
            headers={"Authorization": f"Bearer {member_token}"},
        )

        assert response.status_code == 200
        data = response.json()
        assert data["cached"] is True
        assert data["summary"] == "Cached summary text"

    def test_summarize_admin_forbidden(self, client, mock_db):
        """Admin should not be able to use summarize endpoint."""
        user_id = "507f1f77bcf86cd799439011"
        admin_token = create_access_token({"sub": user_id, "role": "admin"})
        article_id = "507f1f77bcf86cd799439030"

        admin_doc = {
            "_id": ObjectId(user_id),
            "name": "Admin",
            "email": "admin@test.com",
            "role": "admin",
            "created_at": datetime.now(timezone.utc),
        }

        def get_collection(name):
            col = AsyncMock()
            if name == "users":
                col.find_one = AsyncMock(return_value=admin_doc)
            return col

        mock_db.__getitem__ = MagicMock(side_effect=get_collection)

        response = client.get(
            f"/articles/{article_id}/summarize",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 403


class TestChunking:
    """Tests for the text chunking logic."""

    def test_short_text_single_chunk(self):
        """Short text should produce a single chunk."""
        from app.services.translation import _chunk_text
        text = "Hello, this is a short text."
        chunks = _chunk_text(text)
        assert len(chunks) == 1
        assert chunks[0] == text

    def test_long_text_multiple_chunks(self):
        """Long text should be split into multiple chunks."""
        from app.services.translation import _chunk_text
        # Create text longer than 3000 chars
        paragraph = "This is a paragraph. " * 100  # ~2100 chars
        text = f"{paragraph}\n\n{paragraph}\n\n{paragraph}"
        chunks = _chunk_text(text, max_chars=3000)
        assert len(chunks) > 1
        for chunk in chunks:
            assert len(chunk) <= 3000

    def test_empty_text(self):
        """Empty text should still return something."""
        from app.services.translation import _chunk_text
        chunks = _chunk_text("")
        assert len(chunks) == 1


class TestAudioService:
    """Tests for the offline TTS audio service and Linux fallback behavior."""

    def test_audio_filepath(self):
        from app.services.audio import get_audio_filepath
        path = get_audio_filepath("60d5ec49f1b2c8b1f8e4e1a1")
        assert path.endswith("book_60d5ec49f1b2c8b1f8e4e1a1.wav")

    def test_audio_not_ready_for_nonexistent_file(self):
        from app.services.audio import is_audio_ready
        assert is_audio_ready("nonexistent_id_12345") is False

    def test_is_tts_available_boolean(self):
        from app.services.audio import is_tts_available
        assert isinstance(is_tts_available(), bool)

    def test_delete_nonexistent_audio_does_not_crash(self):
        from app.services.audio import delete_book_audio
        # Should not raise any exception
        delete_book_audio("nonexistent_id_99999")

    @pytest.mark.asyncio
    async def test_generate_raises_when_tts_unavailable(self, monkeypatch):
        import app.services.audio as audio_mod
        monkeypatch.setattr(audio_mod, "_PYTTSX3_AVAILABLE", False)

        with pytest.raises(RuntimeError) as exc_info:
            await audio_mod.generate_book_audio("test_id", "Some book content")
        assert "not available" in str(exc_info.value)

