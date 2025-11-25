from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.api.dependencies.database import get_db
from app.api.dependencies.auth import get_current_user
from app.api.dependencies.rbac import require_permission
from app.db.tables.auth.auth import User
from app.db.repositories.dms.inbox_repository import InboxRepository
from app.db.repositories.dms.audit_repository import AuditRepository
from app.services.storage_service import StorageService
from app.schemas.dms.sharing_schemas import (
    InboxEntryOut, InboxEntryCreate, InboxEntryMove
)

router = APIRouter(prefix="/inbox", tags=["Inbox"])


@router.get("/address/{account_id}")
async def get_inbox_address(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inbox", "read"))
):
    """Get or generate inbox address for an account"""
    repo = InboxRepository(db)
    inbox_address = await repo.generate_inbox_address(account_id)
    return {"inbox_address": inbox_address}


@router.post("", response_model=InboxEntryOut)
async def create_inbox_entry(
    data: InboxEntryCreate,
    inbox_address: str,
    db: AsyncSession = Depends(get_db),
    storage_service: StorageService = Depends()
):
    """Simulate receiving an email (no auth required for external systems)"""
    repo = InboxRepository(db)
    audit_repo = AuditRepository(db)
    
    # Get account by inbox address
    account = await repo.get_account_by_inbox_address(inbox_address)
    if not account:
        from app.core.exceptions import http_404
        raise http_404(msg="Inbox address not found")
    
    entry = await repo.create_inbox_entry(account.id, data, storage_service)
    
    await audit_repo.log_action(
        account_id=account.id,
        action="inbox.receive",
        resource_type="inbox_entry",
        resource_id=entry.id,
        metadata={"from_email": data.from_email, "subject": data.subject}
    )
    
    return entry


@router.get("", response_model=List[InboxEntryOut])
async def list_inbox_entries(
    account_id: str,
    is_processed: Optional[bool] = None,
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inbox", "read"))
):
    """List inbox entries"""
    repo = InboxRepository(db)
    return await repo.list_inbox_entries(account_id, is_processed, skip, limit)


@router.get("/{entry_id}", response_model=InboxEntryOut)
async def get_inbox_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("inbox", "read"))
):
    """Get inbox entry by ID"""
    repo = InboxRepository(db)
    entry = await repo.get_inbox_entry(entry_id)
    if not entry:
        from app.core.exceptions import http_404
        raise http_404(msg="Inbox entry not found")
    return entry


@router.post("/{entry_id}/move")
async def move_inbox_entry_to_folder(
    entry_id: str,
    data: InboxEntryMove,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage_service: StorageService = Depends(),
    _: None = Depends(require_permission("inbox", "update"))
):
    """Move inbox entry attachments to a folder"""
    repo = InboxRepository(db)
    audit_repo = AuditRepository(db)
    
    # Get DMS repository (need to import)
    from app.db.repositories.dms.dms_repository import DMSRepository
    dms_repo = DMSRepository(db)
    
    files = await repo.move_to_folder(
        entry_id, data, current_user.id, storage_service, dms_repo
    )
    
    entry = await repo.get_inbox_entry(entry_id)
    
    await audit_repo.log_action(
        account_id=entry.account_id,
        user_id=current_user.id,
        action="inbox.move",
        resource_type="inbox_entry",
        resource_id=entry_id,
        metadata={"folder_id": data.folder_id, "files_created": len(files)}
    )
    
    return {"message": f"Moved {len(files)} files to folder", "files": [f.id for f in files]}


@router.delete("/{entry_id}")
async def delete_inbox_entry(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    storage_service: StorageService = Depends(),
    _: None = Depends(require_permission("inbox", "delete"))
):
    """Delete inbox entry"""
    repo = InboxRepository(db)
    audit_repo = AuditRepository(db)
    
    entry = await repo.get_inbox_entry(entry_id)
    if not entry:
        from app.core.exceptions import http_404
        raise http_404(msg="Inbox entry not found")
    
    await repo.delete_inbox_entry(entry_id, storage_service)
    
    await audit_repo.log_action(
        account_id=entry.account_id,
        user_id=current_user.id,
        action="inbox.delete",
        resource_type="inbox_entry",
        resource_id=entry_id
    )
    
    return {"message": "Inbox entry deleted successfully"}
