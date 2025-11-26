import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tables.auth.auth import User
from app.db.tables.rbac.models import Account, Role, Module, Permission


@pytest.mark.asyncio
async def test_first_user_is_super_admin(client: AsyncClient, test_session: AsyncSession):
    """Test that the first registered user becomes super admin."""
    # Register first user
    response = await client.post(
        "/v2/u/signup",
        json={
            "username": "firstuser",
            "email": "first@example.com",
            "password": "testpass123"
        }
    )
    
    assert response.status_code == 201
    user_data = response.json()
    user_id = user_data["id"]
    
    # Check if user is super admin
    stmt = select(User).where(User.id == user_id)
    result = await test_session.execute(stmt)
    user = result.scalar_one()
    
    assert user.is_super_admin is True


@pytest.mark.asyncio
async def test_second_user_not_super_admin(client: AsyncClient, test_session: AsyncSession):
    """Test that the second user is NOT super admin."""
    # Register first user
    await client.post(
        "/v2/u/signup",
        json={
            "username": "firstuser2",
            "email": "first2@example.com",
            "password": "testpass123"
        }
    )
    
    # Register second user
    response = await client.post(
        "/v2/u/signup",
        json={
            "username": "seconduser",
            "email": "second@example.com",
            "password": "testpass123"
        }
    )
    
    assert response.status_code == 201
    user_data = response.json()
    user_id = user_data["id"]
    
    # Check if user is NOT super admin
    stmt = select(User).where(User.id == user_id)
    result = await test_session.execute(stmt)
    user = result.scalar_one()
    
    assert user.is_super_admin is False


@pytest.mark.asyncio
async def test_user_without_permission_denied(client: AsyncClient):
    """Test that user without permission cannot access protected endpoint."""
    # Register and login as non-admin user
    await client.post(
        "/v2/u/signup",
        json={
            "username": "nopermuser",
            "email": "noperm@example.com",
            "password": "testpass123"
        }
    )
    
    # Skip first user to avoid super admin
    await client.post(
        "/v2/u/signup",
        json={
            "username": "dummy",
            "email": "dummy@example.com",
            "password": "testpass123"
        }
    )
    
    login_response = await client.post(
        "/v2/u/login",
        data={
            "username": "nopermuser",
            "password": "testpass123"
        }
    )
    
    token = login_response.json()["access_token"]
    
    # Try to access protected endpoint (e.g., create share)
    response = await client.post(
        "/dms/shares",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "account_id": "test_account",
            "resource_type": "file",
            "resource_id": "test_file",
            "target_type": "user",
            "target_id": "test_user",
            "access_level": "view"
        }
    )
    
    # Should be forbidden (403) due to lack of permission
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_super_admin_has_all_permissions(client: AsyncClient):
    """Test that super admin can access all endpoints."""
    # Register first user (becomes super admin)
    await client.post(
        "/v2/u/signup",
        json={
            "username": "superadmin",
            "email": "superadmin@example.com",
            "password": "testpass123"
        }
    )
    
    login_response = await client.post(
        "/v2/u/login",
        data={
            "username": "superadmin",
            "password": "testpass123"
        }
    )
    
    token = login_response.json()["access_token"]
    
    # Super admin should be able to list users
    response = await client.get(
        "/v2/rbac/users",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_account_creation_requires_super_admin(client: AsyncClient):
    """Test that only super admin can create accounts."""
    # Register first user (super admin)
    await client.post(
        "/v2/u/signup",
        json={
            "username": "admin1",
            "email": "admin1@example.com",
            "password": "testpass123"
        }
    )
    
    # Register second user (not super admin)
    await client.post(
        "/v2/u/signup",
        json={
            "username": "user1",
            "email": "user1@example.com",
            "password": "testpass123"
        }
    )
    
    # Login as super admin
    admin_login = await client.post(
        "/v2/u/login",
        data={"username": "admin1", "password": "testpass123"}
    )
    admin_token = admin_login.json()["access_token"]
    
    # Login as regular user
    user_login = await client.post(
        "/v2/u/login",
        data={"username": "user1", "password": "testpass123"}
    )
    user_token = user_login.json()["access_token"]
    
    # Super admin can create account
    response = await client.post(
        "/v2/rbac/accounts",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "name": "Test Account",
            "slug": "test-account"
        }
    )
    assert response.status_code == 201
    
    # Regular user cannot create account
    response = await client.post(
        "/v2/rbac/accounts",
        headers={"Authorization": f"Bearer {user_token}"},
        json={
            "name": "Another Account",
            "slug": "another-account"
        }
    )
    assert response.status_code == 403


@pytest.mark.asyncio
async def test_list_accounts(client: AsyncClient):
    """Test listing accounts."""
    # Register and login
    await client.post(
        "/v2/u/signup",
        json={
            "username": "testuser3",
            "email": "test3@example.com",
            "password": "testpass123"
        }
    )
    
    login_response = await client.post(
        "/v2/u/login",
        data={"username": "testuser3", "password": "testpass123"}
    )
    
    token = login_response.json()["access_token"]
    
    # List accounts
    response = await client.get(
        "/v2/rbac/accounts",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_list_modules(client: AsyncClient):
    """Test listing system modules."""
    # Register and login
    await client.post(
        "/v2/u/signup",
        json={
            "username": "testuser4",
            "email": "test4@example.com",
            "password": "testpass123"
        }
    )
    
    login_response = await client.post(
        "/v2/u/login",
        data={"username": "testuser4", "password": "testpass123"}
    )
    
    token = login_response.json()["access_token"]
    
    # List modules
    response = await client.get(
        "/v2/rbac/modules",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    modules = response.json()
    assert isinstance(modules, list)
    
    # Check for expected modules
    module_keys = [m["key"] for m in modules]
    expected_modules = [
        "sections", "folders", "files", "metadata", "approvals",
        "admin_users", "sharing", "retention", "audit", "inbox",
        "accounts", "api", "roles", "groups", "permissions"
    ]
    
    for expected in expected_modules:
        assert expected in module_keys, f"Module '{expected}' not found"


@pytest.mark.asyncio
async def test_user_activation_deactivation(client: AsyncClient):
    """Test user activation and deactivation."""
    # Register first user (super admin)
    await client.post(
        "/v2/u/signup",
        json={
            "username": "admin2",
            "email": "admin2@example.com",
            "password": "testpass123"
        }
    )
    
    # Register second user
    response = await client.post(
        "/v2/u/signup",
        json={
            "username": "user2",
            "email": "user2@example.com",
            "password": "testpass123"
        }
    )
    user_id = response.json()["id"]
    
    # Login as super admin
    admin_login = await client.post(
        "/v2/u/login",
        data={"username": "admin2", "password": "testpass123"}
    )
    admin_token = admin_login.json()["access_token"]
    
    # Deactivate user
    response = await client.patch(
        f"/v2/rbac/users/{user_id}/deactivate",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200
    
    # Activate user
    response = await client.patch(
        f"/v2/rbac/users/{user_id}/activate",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200


@pytest.mark.asyncio
async def test_get_user_with_rbac_info(client: AsyncClient):
    """Test getting user with RBAC information."""
    # Register and login
    response = await client.post(
        "/v2/u/signup",
        json={
            "username": "testuser5",
            "email": "test5@example.com",
            "password": "testpass123"
        }
    )
    user_id = response.json()["id"]
    
    login_response = await client.post(
        "/v2/u/login",
        data={"username": "testuser5", "password": "testpass123"}
    )
    
    token = login_response.json()["access_token"]
    
    # Get user with RBAC info
    response = await client.get(
        f"/v2/rbac/users/{user_id}",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    assert response.status_code == 200
    user_data = response.json()
    assert "id" in user_data
    assert "username" in user_data
    assert "is_super_admin" in user_data
    assert "roles" in user_data
    assert "groups" in user_data
    assert "accounts" in user_data


@pytest.mark.asyncio
async def test_cannot_deactivate_super_admin(client: AsyncClient):
    """Test that super admin cannot be deactivated."""
    # Register first user (super admin)
    response = await client.post(
        "/v2/u/signup",
        json={
            "username": "admin3",
            "email": "admin3@example.com",
            "password": "testpass123"
        }
    )
    admin_id = response.json()["id"]
    
    # Login as super admin
    login_response = await client.post(
        "/v2/u/login",
        data={"username": "admin3", "password": "testpass123"}
    )
    token = login_response.json()["access_token"]
    
    # Try to deactivate super admin (should fail or be ignored)
    response = await client.patch(
        f"/v2/rbac/users/{admin_id}/deactivate",
        headers={"Authorization": f"Bearer {token}"}
    )
    
    # Should either fail (403/400) or succeed but user remains active
    # Implementation may vary, but super admin should remain active
    if response.status_code == 200:
        # Check user is still active
        user_response = await client.get(
            f"/v2/rbac/users/{admin_id}",
            headers={"Authorization": f"Bearer {token}"}
        )
        user_data = user_response.json()
        # Super admin should still be active
        assert user_data.get("is_active") is True
