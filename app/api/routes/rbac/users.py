from fastapi import APIRouter, Depends, status, Header
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.api.dependencies.rbac import require_account_admin, get_current_user, get_rbac_service, RBACService
from app.api.dependencies.repositories import get_repository, get_db
from app.api.dependencies.auth_utils import get_hashed_password
from app.db.repositories.rbac.rbac_repository import RBACRepository
from app.db.tables.auth.auth import User
from app.schemas.rbac.schemas import UserWithRBAC
from app.schemas.auth.bands import TokenData, UserOut
from app.core.exceptions import http_400

router = APIRouter(tags=["User Management"], prefix="/users")


class AdminUserCreate(BaseModel):
    """Schema for admin user creation"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=5, max_length=50)
    full_name: Optional[str] = None
    is_active: bool = True


@router.get(
    "",
    response_model=List[UserOut],
    summary="List users in account"
)
async def list_users(
    skip: int = 0,
    limit: int = 100,
    x_account_id: Optional[str] = Header(None),
    current_user: TokenData = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """List all users in an account"""
    stmt = select(User).offset(skip).limit(limit)
    
    # TODO: Filter by account_id when provided
    if x_account_id:
        # Join with account_users table
        pass
    
    result = await session.execute(stmt)
    return result.scalars().all()


@router.post(
    "",
    response_model=UserOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_account_admin())],
    summary="Create new user (Admin only)"
)
async def create_user(
    data: AdminUserCreate,
    x_account_id: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_db)
):
    """Create a new user (Admin only). Does NOT grant super admin."""
    # Check if user already exists
    stmt = select(User).where((User.username == data.username) | (User.email == data.email))
    result = await session.execute(stmt)
    if result.scalar_one_or_none():
        raise http_400(msg="User with this username or email already exists")
    
    # Hash password
    hashed_password = get_hashed_password(data.password)
    
    # Create user (never super admin via this endpoint)
    new_user = User(
        username=data.username,
        email=data.email,
        password=hashed_password,
        full_name=data.full_name,
        is_active=data.is_active,
        is_super_admin=False,
        password_changed_at=datetime.utcnow()
    )
    
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    
    return new_user


@router.patch(
    "/{user_id}",
    response_model=UserOut,
    dependencies=[Depends(require_account_admin())],
    summary="Update user (Admin only)"
)
async def update_user(
    user_id: str,
    full_name: Optional[str] = None,
    is_active: Optional[bool] = None,
    session: AsyncSession = Depends(get_db)
):
    """Update user details (Admin only)"""
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        from app.core.exceptions import http_404
        raise http_404(msg="User not found")
    
    # Prevent deactivating super admin
    if user.is_super_admin and is_active is False:
        raise http_400(msg="Cannot deactivate super admin")
    
    if full_name is not None:
        user.full_name = full_name
    if is_active is not None:
        user.is_active = is_active
    
    await session.commit()
    await session.refresh(user)
    return user


@router.get(
    "/{user_id}",
    response_model=UserWithRBAC,
    summary="Get user details with RBAC info"
)
async def get_user(
    user_id: str,
    current_user: TokenData = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
):
    """Get user details including roles, groups, and accounts"""
    stmt = select(User).where(User.id == user_id).options(
        selectinload(User.roles),
        selectinload(User.groups),
        selectinload(User.accounts)
    )
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        from app.core.exceptions import http_404
        raise http_404(msg="User not found")
    
    return user


@router.get(
    "/{user_id}/permissions",
    summary="Get user permissions"
)
async def get_user_permissions(
    user_id: str,
    x_account_id: Optional[str] = Header(None),
    current_user: TokenData = Depends(get_current_user),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get all permissions for a user"""
    permissions = await rbac_service.get_user_permissions(user_id, x_account_id)
    return {"user_id": user_id, "permissions": list(permissions)}


@router.get(
    "/{user_id}/accounts",
    summary="Get user accounts"
)
async def get_user_accounts(
    user_id: str,
    current_user: TokenData = Depends(get_current_user),
    rbac_service: RBACService = Depends(get_rbac_service)
):
    """Get all accounts a user belongs to"""
    accounts = await rbac_service.get_user_accounts(user_id)
    return {"user_id": user_id, "accounts": accounts}


@router.patch(
    "/{user_id}/activate",
    dependencies=[Depends(require_account_admin())],
    summary="Activate user"
)
async def activate_user(
    user_id: str,
    session: AsyncSession = Depends(get_db)
):
    """Activate a user account"""
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        from app.core.exceptions import http_404
        raise http_404(msg="User not found")
    
    user.is_active = True
    await session.commit()
    return {"message": "User activated successfully"}


@router.patch(
    "/{user_id}/deactivate",
    dependencies=[Depends(require_account_admin())],
    summary="Deactivate user"
)
async def deactivate_user(
    user_id: str,
    session: AsyncSession = Depends(get_db)
):
    """Deactivate a user account"""
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        from app.core.exceptions import http_404
        raise http_404(msg="User not found")
    
    # Prevent deactivating super admin
    if user.is_super_admin:
        raise http_400(msg="Cannot deactivate super admin")
    
    user.is_active = False
    await session.commit()
    return {"message": "User deactivated successfully"}


class ResetPasswordRequest(BaseModel):
    """Schema for admin password reset"""
    new_password: str = Field(..., min_length=5, max_length=50)


@router.patch(
    "/{user_id}/reset-password",
    dependencies=[Depends(require_account_admin())],
    summary="Reset user password (Admin only)"
)
async def reset_user_password(
    user_id: str,
    data: ResetPasswordRequest,
    session: AsyncSession = Depends(get_db)
):
    """Reset a user's password (Admin only)"""
    stmt = select(User).where(User.id == user_id)
    result = await session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        from app.core.exceptions import http_404
        raise http_404(msg="User not found")
    
    # Hash new password
    user.password = get_hashed_password(data.new_password)
    user.password_changed_at = datetime.utcnow()
    
    await session.commit()
    return {"message": "Password reset successfully"}
