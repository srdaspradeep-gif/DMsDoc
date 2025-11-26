from fastapi import APIRouter, Depends, status, Header
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.dependencies.rbac import require_account_admin, get_current_user, get_rbac_service, RBACService
from app.api.dependencies.repositories import get_repository, get_db
from app.db.repositories.rbac.rbac_repository import RBACRepository
from app.db.tables.auth.auth import User
from app.schemas.rbac.schemas import UserWithRBAC
from app.schemas.auth.bands import TokenData, UserOut

router = APIRouter(tags=["User Management"], prefix="/users")


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
    
    user.is_active = False
    await session.commit()
    return {"message": "User deactivated successfully"}
