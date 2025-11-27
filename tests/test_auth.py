import pytest
import uuid
from httpx import AsyncClient


def unique_email():
    """Generate unique email for each test."""
    return f"test_{uuid.uuid4().hex[:8]}@example.com"


def unique_username():
    """Generate unique username for each test."""
    return f"user_{uuid.uuid4().hex[:8]}"


@pytest.mark.asyncio
async def test_register_user(client: AsyncClient):
    """Test user registration."""
    email = unique_email()
    username = unique_username()

    response = await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )

    assert response.status_code == 201
    data = response.json()
    assert data["email"] == email
    assert "id" in data
    assert "password" not in data  # Password should not be returned


@pytest.mark.asyncio
async def test_register_duplicate_user(client: AsyncClient):
    """Test registration with duplicate email."""
    email = unique_email()
    username1 = unique_username()
    username2 = unique_username()

    # First registration
    await client.post(
        "/v2/u/signup",
        json={"username": username1, "email": email, "password": "testpass123"},
    )

    # Try to register again with same email
    response = await client.post(
        "/v2/u/signup",
        json={"username": username2, "email": email, "password": "testpass123"},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_login_user(client: AsyncClient):
    """Test user login."""
    email = unique_email()
    username = unique_username()

    # First register a user
    await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )

    # Now login
    response = await client.post(
        "/v2/u/login", data={"username": username, "password": "testpass123"}
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "token_type" in data
    assert data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_login_with_email(client: AsyncClient):
    """Test user login with email."""
    email = unique_email()
    username = unique_username()

    # First register a user
    await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )

    # Login with email
    response = await client.post(
        "/v2/u/login",
        data={"username": email, "password": "testpass123"},  # Using email as username
    )

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    """Test login with wrong password."""
    email = unique_email()
    username = unique_username()

    # First register a user
    await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "correctpass"},
    )

    # Try to login with wrong password
    response = await client.post(
        "/v2/u/login", data={"username": username, "password": "wrongpassword"}
    )

    assert response.status_code == 403


@pytest.mark.asyncio
async def test_get_current_user(client: AsyncClient):
    """Test getting current user info."""
    email = unique_email()
    username = unique_username()

    # Register and login
    await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )

    login_response = await client.post(
        "/v2/u/login", data={"username": username, "password": "testpass123"}
    )

    token = login_response.json()["access_token"]

    # Get current user
    response = await client.get(
        "/v2/u/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    data = response.json()
    assert data["username"] == username
    assert "id" in data


@pytest.mark.asyncio
async def test_get_current_user_unauthorized(client: AsyncClient):
    """Test getting current user without token."""
    response = await client.get("/v2/u/me")

    assert response.status_code == 401
