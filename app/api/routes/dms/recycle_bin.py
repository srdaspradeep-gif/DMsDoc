from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.dependencies.database import get_db
from app.api.dependencies.auth import get_current_user
from app.api.dependencies.rbac import require_permission
from app.db.tables.auth.auth import User
from app.db.repositories.dms.recycle_bin_repository import RecycleBinRepository
from app.db.repositories.dms.audit_repository import AuditRepository
from app.services.storage_service import StorageService
from app.schemas.dms.sharing_schemas import RecycleBinItemOut, RecycleBinRestore

router = APIRouter(prefix="/recycle-bin", tags=["Recycle Bin"])


@router.get("/files", response_model=List[RecycleBinItemOut])
async def list_deleted_files(
    account_id: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin_users", "read"))  # Admin only
):
    """List deleted files in recycle bin"""
    repo = RecycleBinRepository(db)
    files = await repo.list_deleted_files(account_id, skip, limit)
    
    return [
        RecycleBinItemOut(
            id=f.id,
            type="file",
            name=f.name,
            original_path=f.storage_path,
            deleted_at=f.deleted_at,
            deleted_by=None,  # TODO: Track who deleted
            size_bytes=f.size_bytes
        )
        for f in files
    ]


@router.get("/folders", response_model=List[RecycleBinItemOut])
async def list_deleted_folders(
    account_id: str,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin_users", "read"))
):
    """List deleted folders in recycle bin"""
    repo = RecycleBinRepository(db)
    folders = await repo.list_deleted_folders(account_id, skip, limit)
    
    return [
        RecycleBinItemOut(
            id=f.id,
            type="folder",
            name=f.name,
            original_path=f.path or "",
            deleted_at=f.deleted_at,
            deleted_by=None
        )
        for f in folders
    ]


@router.post("/restore")
async def restore_items(
    data: RecycleBinRestore,
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin_users", "update"))
):
    """Restore items from recycle bin"""
    repo = RecycleBinRepository(db)
    audit_repo = AuditRepository(db)
    
    if data.item_type == "file":
        items = await repo.restore_files(data.item_ids, account_id)
    else:
        items = await repo.restore_folders(data.item_ids, account_id)
    
    await audit_repo.log_action(
        account_id=account_id,
        user_id=current_user.id,
        action="recycle_bin.restore",
        resource_type=data.item_type,
        metadata={"item_ids": data.item_ids, "count": len(items)}
    )
    
    return {"message": f"Restored {len(items)} {data.item_type}(s)", "count": len(items)}


@router.delete("/permanent")
async def permanently_delete_items(
    data: RecycleBinRestore,
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage_service: StorageService = Depends(),
    _: None = Depends(require_permission("admin_users", "delete"))
):
    """Permanently delete items from recycle bin"""
    repo = RecycleBinRepository(db)
    audit_repo = AuditRepository(db)
    
    if data.item_type == "file":
        count = await repo.permanently_delete_files(data.item_ids, account_id, storage_service)
    else:
        count = await repo.permanently_delete_folders(data.item_ids, account_id)
    
    await audit_repo.log_action(
        account_id=account_id,
        user_id=current_user.id,
        action="recycle_bin.permanent_delete",
        resource_type=data.item_type,
        metadata={"item_ids": data.item_ids, "count": count}
    )
    
    return {"message": f"Permanently deleted {count} {data.item_type}(s)", "count": count}


@router.delete("/empty/{account_id}")
async def empty_recycle_bin(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage_service: StorageService = Depends(),
    _: None = Depends(require_permission("admin_users", "delete"))
):
    """Empty entire recycle bin for an account"""
    repo = RecycleBinRepository(db)
    audit_repo = AuditRepository(db)
    
    result = await repo.empty_recycle_bin(account_id, storage_service)
    
    await audit_repo.log_action(
        account_id=account_id,
        user_id=current_user.id,
        action="recycle_bin.empty",
        resource_type="account",
        resource_id=account_id,
        metadata=result
    )
    
    return result
