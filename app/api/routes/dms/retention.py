from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.dependencies.database import get_db
from app.api.dependencies.auth import get_current_user
from app.api.dependencies.rbac import require_permission
from app.db.tables.auth.auth import User
from app.db.repositories.dms.retention_repository import RetentionRepository
from app.db.repositories.dms.audit_repository import AuditRepository
from app.schemas.dms.sharing_schemas import (
    RetentionPolicyCreate, RetentionPolicyUpdate, RetentionPolicyOut
)

router = APIRouter(prefix="/retention", tags=["Retention"])


@router.post("", response_model=RetentionPolicyOut)
async def create_retention_policy(
    data: RetentionPolicyCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("retention", "create"))
):
    """Create a retention policy"""
    repo = RetentionRepository(db)
    audit_repo = AuditRepository(db)
    
    policy = await repo.create_policy(data, current_user.id)
    
    await audit_repo.log_action(
        account_id=data.account_id,
        user_id=current_user.id,
        action="retention_policy.create",
        resource_type="folder",
        resource_id=data.folder_id,
        metadata={"policy_id": policy.id, "retention_days": data.retention_days}
    )
    
    return policy


@router.get("", response_model=List[RetentionPolicyOut])
async def list_retention_policies(
    account_id: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("retention", "read"))
):
    """List retention policies"""
    repo = RetentionRepository(db)
    return await repo.list_policies(account_id, skip, limit)


@router.get("/{policy_id}", response_model=RetentionPolicyOut)
async def get_retention_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("retention", "read"))
):
    """Get retention policy by ID"""
    repo = RetentionRepository(db)
    policy = await repo.get_policy(policy_id)
    if not policy:
        from app.core.exceptions import http_404
        raise http_404(msg="Retention policy not found")
    return policy


@router.put("/{policy_id}", response_model=RetentionPolicyOut)
async def update_retention_policy(
    policy_id: str,
    data: RetentionPolicyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("retention", "update"))
):
    """Update a retention policy"""
    repo = RetentionRepository(db)
    audit_repo = AuditRepository(db)
    
    policy = await repo.update_policy(policy_id, data)
    
    await audit_repo.log_action(
        account_id=policy.account_id,
        user_id=current_user.id,
        action="retention_policy.update",
        resource_type="folder",
        resource_id=policy.folder_id,
        metadata={"policy_id": policy_id}
    )
    
    return policy


@router.delete("/{policy_id}")
async def delete_retention_policy(
    policy_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("retention", "delete"))
):
    """Delete a retention policy"""
    repo = RetentionRepository(db)
    audit_repo = AuditRepository(db)
    
    policy = await repo.get_policy(policy_id)
    if not policy:
        from app.core.exceptions import http_404
        raise http_404(msg="Retention policy not found")
    
    await repo.delete_policy(policy_id)
    
    await audit_repo.log_action(
        account_id=policy.account_id,
        user_id=current_user.id,
        action="retention_policy.delete",
        resource_type="folder",
        resource_id=policy.folder_id,
        metadata={"policy_id": policy_id}
    )
    
    return {"message": "Retention policy deleted successfully"}


@router.post("/apply/{account_id}")
async def apply_retention_policies(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("retention", "admin"))
):
    """Apply all retention policies for an account (admin only)"""
    repo = RetentionRepository(db)
    audit_repo = AuditRepository(db)
    
    result = await repo.apply_retention_policies(account_id)
    
    await audit_repo.log_action(
        account_id=account_id,
        user_id=current_user.id,
        action="retention_policy.apply",
        resource_type="account",
        resource_id=account_id,
        metadata=result
    )
    
    return result
