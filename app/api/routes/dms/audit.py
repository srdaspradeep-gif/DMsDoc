from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.dependencies.database import get_db
from app.api.dependencies.auth import get_current_user
from app.api.dependencies.rbac import require_permission
from app.db.tables.auth.auth import User
from app.db.repositories.dms.audit_repository import AuditRepository
from app.schemas.dms.sharing_schemas import AuditLogOut, AuditLogQuery

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.post("/query", response_model=List[AuditLogOut])
async def query_audit_logs(
    query: AuditLogQuery,
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("audit", "read"))
):
    """Query audit logs with filters"""
    repo = AuditRepository(db)
    logs = await repo.query_logs(account_id, query)
    return logs


@router.get("/resource/{resource_type}/{resource_id}", response_model=List[AuditLogOut])
async def get_resource_history(
    resource_type: str,
    resource_id: str,
    account_id: str,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("audit", "read"))
):
    """Get audit history for a specific resource"""
    repo = AuditRepository(db)
    logs = await repo.get_resource_history(account_id, resource_type, resource_id, skip, limit)
    return logs


@router.get("/user/{user_id}", response_model=List[AuditLogOut])
async def get_user_activity(
    user_id: str,
    account_id: str,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("audit", "read"))
):
    """Get audit history for a specific user"""
    repo = AuditRepository(db)
    logs = await repo.get_user_activity(account_id, user_id, skip, limit)
    return logs


@router.get("/stats/{action}")
async def get_action_stats(
    action: str,
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("audit", "read"))
):
    """Get statistics for a specific action"""
    repo = AuditRepository(db)
    count = await repo.get_action_count(account_id, action)
    return {"action": action, "count": count}
