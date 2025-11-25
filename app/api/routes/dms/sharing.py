from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.api.dependencies.database import get_db
from app.api.dependencies.auth import get_current_user
from app.api.dependencies.rbac import require_permission
from app.db.tables.auth.auth import User
from app.db.repositories.dms.sharing_repository import SharingRepository
from app.db.repositories.dms.audit_repository import AuditRepository
from app.schemas.dms.sharing_schemas import (
    ShareCreate, ShareUpdate, ShareOut, PublicLinkOut
)

router = APIRouter(prefix="/shares", tags=["Sharing"])


@router.post("", response_model=ShareOut)
async def create_share(
    data: ShareCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("sharing", "create"))
):
    """Create a new share"""
    repo = SharingRepository(db)
    audit_repo = AuditRepository(db)
    
    share = await repo.create_share(data, current_user.id)
    
    # Log action
    await audit_repo.log_action(
        account_id=data.account_id,
        user_id=current_user.id,
        action="share.create",
        resource_type=data.resource_type,
        resource_id=data.resource_id,
        metadata={
            "target_type": data.target_type,
            "target_id": data.target_id,
            "access_level": data.access_level
        }
    )
    
    return share


@router.get("", response_model=List[ShareOut])
async def list_shares(
    account_id: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("sharing", "read"))
):
    """List shares for an account"""
    repo = SharingRepository(db)
    shares = await repo.list_shares(
        account_id=account_id,
        resource_type=resource_type,
        resource_id=resource_id,
        skip=skip,
        limit=limit
    )
    return shares


@router.get("/my-shares", response_model=List[ShareOut])
async def list_my_shares(
    account_id: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List shares accessible by current user"""
    repo = SharingRepository(db)
    
    # Get user's group IDs
    group_ids = [g.id for g in current_user.groups if g.account_id == account_id]
    
    shares = await repo.list_shares_for_user(
        account_id=account_id,
        user_id=current_user.id,
        group_ids=group_ids,
        skip=skip,
        limit=limit
    )
    return shares


@router.get("/{share_id}", response_model=ShareOut)
async def get_share(
    share_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("sharing", "read"))
):
    """Get share by ID"""
    repo = SharingRepository(db)
    share = await repo.get_share(share_id)
    if not share:
        from app.core.exceptions import http_404
        raise http_404(msg="Share not found")
    return share


@router.put("/{share_id}", response_model=ShareOut)
async def update_share(
    share_id: str,
    data: ShareUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("sharing", "update"))
):
    """Update a share"""
    repo = SharingRepository(db)
    audit_repo = AuditRepository(db)
    
    share = await repo.update_share(share_id, data)
    
    # Log action
    await audit_repo.log_action(
        account_id=share.account_id,
        user_id=current_user.id,
        action="share.update",
        resource_type=share.resource_type.value,
        resource_id=share.resource_id,
        metadata={"share_id": share_id}
    )
    
    return share


@router.delete("/{share_id}")
async def delete_share(
    share_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("sharing", "delete"))
):
    """Delete a share"""
    repo = SharingRepository(db)
    audit_repo = AuditRepository(db)
    
    share = await repo.get_share(share_id)
    if not share:
        from app.core.exceptions import http_404
        raise http_404(msg="Share not found")
    
    await repo.delete_share(share_id)
    
    # Log action
    await audit_repo.log_action(
        account_id=share.account_id,
        user_id=current_user.id,
        action="share.delete",
        resource_type=share.resource_type.value,
        resource_id=share.resource_id,
        metadata={"share_id": share_id}
    )
    
    return {"message": "Share deleted successfully"}


@router.get("/public/{token}", response_model=ShareOut)
async def get_public_share(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """Access a public share by token (no auth required)"""
    repo = SharingRepository(db)
    share = await repo.get_share_by_token(token)
    if not share:
        from app.core.exceptions import http_404
        raise http_404(msg="Public share not found or expired")
    return share
