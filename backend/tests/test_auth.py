"""
Tests for authentication flows and role guards.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, patch, MagicMock

import pytest
from bson import ObjectId

from app.core.security import hash_password, create_access_token, create_refresh_token


class TestRegister:
    """Tests for POST /auth/register."""

    def test_register_success(self, client, mock_db):
        """New user registration should return tokens."""
        users_col = AsyncMock()
        users_col.find_one = AsyncMock(return_value=None)
        users_col.insert_one = AsyncMock(
            return_value=MagicMock(inserted_id=ObjectId("507f1f77bcf86cd799439099"))
        )
        mock_db.__getitem__ = MagicMock(return_value=users_col)

        response = client.post("/auth/register", json={
            "name": "New User",
            "email": "new@example.com",
            "password": "password123",
        })

        assert response.status_code == 201
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["user"]["email"] == "new@example.com"
        assert data["user"]["role"] == "member"

    def test_register_duplicate_email(self, client, mock_db):
        """Registration with existing email should fail."""
        users_col = AsyncMock()
        users_col.find_one = AsyncMock(return_value={"email": "existing@example.com"})
        mock_db.__getitem__ = MagicMock(return_value=users_col)

        response = client.post("/auth/register", json={
            "name": "Duplicate User",
            "email": "existing@example.com",
            "password": "password123",
        })

        assert response.status_code == 400
        assert "already registered" in response.json()["detail"]

    def test_register_invalid_email(self, client):
        """Registration with invalid email format should fail validation."""
        response = client.post("/auth/register", json={
            "name": "Bad Email",
            "email": "not-an-email",
            "password": "password123",
        })

        assert response.status_code == 422

    def test_register_short_password(self, client):
        """Registration with password too short should fail validation."""
        response = client.post("/auth/register", json={
            "name": "Short Pass",
            "email": "short@example.com",
            "password": "12345",
        })

        assert response.status_code == 422


class TestLogin:
    """Tests for POST /auth/login."""

    def test_login_success(self, client, mock_db):
        """Valid credentials should return tokens."""
        user_doc = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "name": "Test User",
            "email": "test@example.com",
            "password_hash": hash_password("password123"),
            "role": "member",
            "created_at": datetime.now(timezone.utc),
        }
        users_col = AsyncMock()
        users_col.find_one = AsyncMock(return_value=user_doc)
        mock_db.__getitem__ = MagicMock(return_value=users_col)

        response = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "password123",
        })

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == "test@example.com"

    def test_login_wrong_password(self, client, mock_db):
        """Wrong password should return 401."""
        user_doc = {
            "_id": ObjectId("507f1f77bcf86cd799439011"),
            "name": "Test User",
            "email": "test@example.com",
            "password_hash": hash_password("correct_password"),
            "role": "member",
            "created_at": datetime.now(timezone.utc),
        }
        users_col = AsyncMock()
        users_col.find_one = AsyncMock(return_value=user_doc)
        mock_db.__getitem__ = MagicMock(return_value=users_col)

        response = client.post("/auth/login", json={
            "email": "test@example.com",
            "password": "wrong_password",
        })

        assert response.status_code == 401

    def test_login_nonexistent_user(self, client, mock_db):
        """Login with non-existent email should return 401."""
        users_col = AsyncMock()
        users_col.find_one = AsyncMock(return_value=None)
        mock_db.__getitem__ = MagicMock(return_value=users_col)

        response = client.post("/auth/login", json={
            "email": "nonexistent@example.com",
            "password": "password123",
        })

        assert response.status_code == 401


class TestRefresh:
    """Tests for POST /auth/refresh."""

    def test_refresh_success(self, client, mock_db):
        """Valid refresh token should return new tokens."""
        user_id = "507f1f77bcf86cd799439011"
        refresh_token = create_refresh_token({"sub": user_id, "role": "member"})

        user_doc = {
            "_id": ObjectId(user_id),
            "name": "Test User",
            "email": "test@example.com",
            "role": "member",
            "created_at": datetime.now(timezone.utc),
        }
        users_col = AsyncMock()
        users_col.find_one = AsyncMock(return_value=user_doc)
        mock_db.__getitem__ = MagicMock(return_value=users_col)

        response = client.post("/auth/refresh", json={
            "refresh_token": refresh_token,
        })

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data

    def test_refresh_with_access_token_fails(self, client):
        """Using an access token as refresh should fail."""
        access_token = create_access_token({"sub": "some_id", "role": "member"})

        response = client.post("/auth/refresh", json={
            "refresh_token": access_token,
        })

        assert response.status_code == 401
        assert "expected refresh token" in response.json()["detail"]


class TestRoleGuards:
    """Tests for role-based access control."""

    def test_admin_endpoint_with_member_token(self, client, mock_db, member_user, member_token):
        """Member token on admin-only endpoint should return 403."""
        # Mock user lookup
        users_col = AsyncMock()
        users_col.find_one = AsyncMock(return_value={
            **member_user,
            "_id": ObjectId(member_user["_id"]),
        })
        mock_db.__getitem__ = MagicMock(return_value=users_col)

        response = client.get(
            "/admin/members",
            headers={"Authorization": f"Bearer {member_token}"},
        )

        assert response.status_code == 403

    def test_admin_endpoint_with_admin_token(self, client, mock_db, admin_user, admin_token):
        """Admin token on admin-only endpoint should succeed."""
        users_col = AsyncMock()
        users_col.find_one = AsyncMock(return_value={
            **admin_user,
            "_id": ObjectId(admin_user["_id"]),
        })

        async def empty_async_gen():
            for item in []:
                yield item

        cursor_mock = MagicMock()
        cursor_mock.sort = MagicMock(return_value=cursor_mock)
        cursor_mock.__aiter__ = lambda s: empty_async_gen()

        def get_collection(name):
            col = AsyncMock()
            if name == "users":
                col.find_one = users_col.find_one
                col.find = MagicMock(return_value=cursor_mock)
            return col

        mock_db.__getitem__ = MagicMock(side_effect=get_collection)

        response = client.get(
            "/admin/members",
            headers={"Authorization": f"Bearer {admin_token}"},
        )

        assert response.status_code == 200

    def test_no_token_returns_403(self, client):
        """Request without token should return 403."""
        response = client.get("/admin/members")
        assert response.status_code == 403

    def test_expired_token(self, client):
        """Expired token should return 401."""
        from datetime import timedelta
        expired_token = create_access_token(
            {"sub": "some_id", "role": "admin"},
            expires_delta=timedelta(seconds=-10),
        )

        response = client.get(
            "/admin/members",
            headers={"Authorization": f"Bearer {expired_token}"},
        )

        assert response.status_code == 401
