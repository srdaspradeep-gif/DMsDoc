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
async def test_user_signup_creates_user(client: AsyncClient):
    """Test that user signup creates a new user."""
    email = unique_email()
    username = unique_username()

    response = await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )

    assert response.status_code == 201
    user_data = response.json()
    assert "id" in user_data
    assert user_data["username"] == username
    assert user_data["email"] == email


@pytest.mark.asyncio
async def test_user_login_returns_token(client: AsyncClient):
    """Test that user login returns access token."""
    email = unique_email()
    username = unique_username()

    # Signup
    await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )

    # Login
    login_response = await client.post(
        "/v2/u/login", data={"username": username, "password": "testpass123"}
    )

    assert login_response.status_code == 200
    token_data = login_response.json()
    assert "access_token" in token_data
    assert "refresh_token" in token_data
    assert token_data["token_type"] == "bearer"


@pytest.mark.asyncio
async def test_authenticated_user_can_access_profile(client: AsyncClient):
    """Test that authenticated user can access their profile."""
    email = unique_email()
    username = unique_username()

    # Signup and login
    await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )

    login_response = await client.post(
        "/v2/u/login", data={"username": username, "password": "testpass123"}
    )
    token = login_response.json()["access_token"]

    # Access profile
    profile_response = await client.get(
        "/v2/u/me", headers={"Authorization": f"Bearer {token}"}
    )

    assert profile_response.status_code == 200


@pytest.mark.asyncio
async def test_authenticated_user_can_list_users(client: AsyncClient):
    """Test that authenticated user can list users."""
    email = unique_email()
    username = unique_username()

    # Signup and login
    await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )

    login_response = await client.post(
        "/v2/u/login", data={"username": username, "password": "testpass123"}
    )
    token = login_response.json()["access_token"]

    # List users
    response = await client.get(
        "/v2/rbac/users", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_authenticated_user_can_list_accounts(client: AsyncClient):
    """Test that authenticated user can list accounts."""
    email = unique_email()
    username = unique_username()

    # Signup and login
    await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )

    login_response = await client.post(
        "/v2/u/login", data={"username": username, "password": "testpass123"}
    )
    token = login_response.json()["access_token"]

    # List accounts
    response = await client.get(
        "/v2/rbac/accounts", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_authenticated_user_can_list_modules(client: AsyncClient):
    """Test that authenticated user can list modules."""
    email = unique_email()
    username = unique_username()

    # Signup and login
    await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )

    login_response = await client.post(
        "/v2/u/login", data={"username": username, "password": "testpass123"}
    )
    token = login_response.json()["access_token"]

    # List modules
    response = await client.get(
        "/v2/rbac/modules", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    modules = response.json()
    assert isinstance(modules, list)


@pytest.mark.asyncio
async def test_get_user_details(client: AsyncClient):
    """Test getting user details by ID."""
    email = unique_email()
    username = unique_username()

    # Signup
    signup_response = await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )
    user_id = signup_response.json()["id"]

    # Login
    login_response = await client.post(
        "/v2/u/login", data={"username": username, "password": "testpass123"}
    )
    token = login_response.json()["access_token"]

    # Get user details
    response = await client.get(
        f"/v2/rbac/users/{user_id}", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    user_data = response.json()
    assert user_data["id"] == user_id
    assert user_data["username"] == username


@pytest.mark.asyncio
async def test_unauthenticated_request_fails(client: AsyncClient):
    """Test that unauthenticated requests fail."""
    response = await client.get("/v2/rbac/users")

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_invalid_token_fails(client: AsyncClient):
    """Test that invalid token fails."""
    response = await client.get(
        "/v2/rbac/users", headers={"Authorization": "Bearer invalid_token"}
    )

    assert response.status_code == 401


@pytest.mark.asyncio
async def test_duplicate_signup_fails(client: AsyncClient):
    """Test that duplicate signup fails."""
    email = unique_email()
    username = unique_username()

    # First signup
    await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )

    # Duplicate signup
    response = await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_wrong_password_login_fails(client: AsyncClient):
    """Test that wrong password login fails."""
    email = unique_email()
    username = unique_username()

    # Signup
    await client.post(
        "/v2/u/signup",
        json={"username": username, "email": email, "password": "testpass123"},
    )

    # Login with wrong password
    response = await client.post(
        "/v2/u/login", data={"username": username, "password": "wrongpassword"}
    )

    assert response.status_code == 403
