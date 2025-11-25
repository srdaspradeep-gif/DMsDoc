from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.database import get_db
from app.api.dependencies.auth import get_current_user
from app.api.dependencies.rbac import require_permission
from app.db.tables.auth.auth import User
from app.db.repositories.dms.access_overview_repository import AccessOverviewRepository
from app.schemas.dms.sharing_schemas import UserAccessOverview, ResourceAccessOverview

router = APIRouter(prefix="/access-overview", tags=["Access Overview"])


@router.get("/user/{user_id}", response_model=UserAccessOverview)
async def get_user_access_overview(
    user_id: str,
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin_users", "read"))
):
    """Get all resources a user can access"""
    repo = AccessOverviewRepository(db)
    
    # Get user info
    from sqlalchemy import select
    stmt = select(User).where(User.id == user_id)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        from app.core.exceptions import http_404
        raise http_404(msg="User not found")
    
    resources = await repo.get_user_access(account_id, user_id)
    
    return UserAccessOverview(
        user_id=user_id,
        username=user.username,
        resources=resources
    )


@router.get("/resource/{resource_type}/{resource_id}", response_model=ResourceAccessOverview)
async def get_resource_access_overview(
    resource_type: str,
    resource_id: str,
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin_users", "read"))
):
    """Get all users/groups that can access a resource"""
    repo = AccessOverviewRepository(db)
    
    # Get resource name
    resource_name = await repo._get_resource_name(resource_type, resource_id)
    
    accessors = await repo.get_resource_access(account_id, resource_type, resource_id)
    
    return ResourceAccessOverview(
        resource_type=resource_type,
        resource_id=resource_id,
        resource_name=resource_name,
        accessors=accessors
    )
