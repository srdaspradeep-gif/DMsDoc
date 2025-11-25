from fastapi import APIRouter, Depends, status, Header, File, UploadFile, Query
from fastapi.responses import Response
from typing import List, Optional

from app.api.dependencies.rbac import require_permission, get_current_user, get_rbac_service, RBACService
from app.api.dependencies.repositories import get_repository
from app.db.repositories.dms.versioning_repository import VersioningRepository
from app.db.repositories.dms.dms_repository import DMSRepository
from app.schemas.dms.schemas import (
    FileVersionOut, FileLockCreate, FileLockOut, FileLockStatus,
    FileReminderCreate, FileReminderUpdate, FileReminderOut, FileReminderDetail
)
from app.schemas.auth.bands import TokenData
from app.services.storage_service import storage_service

router = APIRouter(tags=["File Versioning & Locking"], prefix="/files-dms")


# ==================== FILE VERSIONS ====================

@router.post(
    "/{file_id}/versions",
    response_model=FileVersionOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("files", "update"))],
    summary="Upload new file version"
)
async def upload_new_version(
    file_id: str,
    file: UploadFile = File(...),
    comment: Optional[str] = Query(None),
    x_account_id: str = Header(...),
    current_user: TokenData = Depends(get_current_user),
    dms_repo: DMSRepository = Depends(get_repository(DMSRepository)),
    version_repo: VersioningRepository = Depends(get_repository(VersioningRepository))
):
    """Upload a new version of an existing file"""
    # Check if file exists
    existing_file = await dms_repo.get_file(file_id, x_account_id)
    if not existing_file:
        from app.core.exceptions import http_404
        raise http_404(msg="File not found")
    
    # Check if file is locked by another user
    is_locked, lock = await version_repo.check_file_locked(file_id, current_user.id)
    if is_locked:
        from app.core.exceptions import http_403
        raise http_403(msg=f"File is locked by another user until {lock.locked_until}")
    
    # Generate storage path for new version
    storage_path = f"files/{x_account_id}/{existing_file.folder_id}/versions/{file_id}/{file.filename}"
    
    # Upload to S3
    size_bytes, file_hash = await storage_service.upload_file(file, storage_path)
    
    # Create version record
    version = await version_repo.create_version(
        file_id=file_id,
        storage_path=storage_path,
        mime_type=file.content_type,
        size_bytes=size_bytes,
        file_hash=file_hash,
        comment=comment,
        created_by=current_user.id
    )
    
    # Update file record to point to new version
    existing_file.current_version_id = version.id
    existing_file.storage_path = storage_path
    existing_file.mime_type = file.content_type
    existing_file.size_bytes = size_bytes
    existing_file.file_hash = file_hash
    await version_repo.session.commit()
    
    return version


@router.get(
    "/{file_id}/versions",
    response_model=List[FileVersionOut],
    dependencies=[Depends(require_permission("files", "read"))],
    summary="List file versions"
)
async def list_file_versions(
    file_id: str,
    skip: int = 0,
    limit: int = 100,
    current_user: TokenData = Depends(get_current_user),
    repository: VersioningRepository = Depends(get_repository(VersioningRepository))
):
    """List all versions of a file"""
    return await repository.list_versions(file_id, skip, limit)


@router.get(
    "/{file_id}/versions/{version_id}",
    response_model=FileVersionOut,
    dependencies=[Depends(require_permission("files", "read"))],
    summary="Get version details"
)
async def get_version(
    file_id: str,
    version_id: str,
    current_user: TokenData = Depends(get_current_user),
    repository: VersioningRepository = Depends(get_repository(VersioningRepository))
):
    """Get specific version details"""
    version = await repository.get_version(version_id)
    if not version or version.file_id != file_id:
        from app.core.exceptions import http_404
        raise http_404(msg="Version not found")
    return version


@router.get(
    "/{file_id}/versions/{version_id}/download",
    dependencies=[Depends(require_permission("files", "read"))],
    summary="Download specific version"
)
async def download_version(
    file_id: str,
    version_id: str,
    current_user: TokenData = Depends(get_current_user),
    repository: VersioningRepository = Depends(get_repository(VersioningRepository))
):
    """Download a specific version of a file"""
    version = await repository.get_version(version_id)
    if not version or version.file_id != file_id:
        from app.core.exceptions import http_404
        raise http_404(msg="Version not found")
    
    # Download from S3
    content = await storage_service.download_file(version.storage_path)
    
    return Response(
        content=content,
        media_type=version.mime_type or 'application/octet-stream',
        headers={
            'Content-Disposition': f'attachment; filename="v{version.version_number}_{version.file.original_filename}"'
        }
    )


@router.post(
    "/{file_id}/versions/{version_id}/restore",
    response_model=FileVersionOut,
    dependencies=[Depends(require_permission("files", "update"))],
    summary="Restore version as current"
)
async def restore_version(
    file_id: str,
    version_id: str,
    current_user: TokenData = Depends(get_current_user),
    repository: VersioningRepository = Depends(get_repository(VersioningRepository))
):
    """Make a specific version the current active version"""
    # Check if file is locked
    is_locked, lock = await repository.check_file_locked(file_id, current_user.id)
    if is_locked:
        from app.core.exceptions import http_403
        raise http_403(msg=f"File is locked by another user until {lock.locked_until}")
    
    return await repository.restore_version(file_id, version_id)


# ==================== FILE LOCKS ====================

@router.post(
    "/{file_id}/lock",
    response_model=FileLockOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("files", "update"))],
    summary="Lock file for editing"
)
async def lock_file(
    file_id: str,
    duration_hours: int = Query(6, ge=1, le=72),
    x_account_id: str = Header(...),
    current_user: TokenData = Depends(get_current_user),
    dms_repo: DMSRepository = Depends(get_repository(DMSRepository)),
    repository: VersioningRepository = Depends(get_repository(VersioningRepository))
):
    """Lock a file to prevent concurrent edits"""
    # Verify file exists
    file = await dms_repo.get_file(file_id, x_account_id)
    if not file:
        from app.core.exceptions import http_404
        raise http_404(msg="File not found")
    
    return await repository.create_lock(file_id, current_user.id, duration_hours)


@router.delete(
    "/{file_id}/lock",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("files", "update"))],
    summary="Unlock file"
)
async def unlock_file(
    file_id: str,
    current_user: TokenData = Depends(get_current_user),
    rbac_service: RBACService = Depends(get_rbac_service),
    x_account_id: Optional[str] = Header(None),
    repository: VersioningRepository = Depends(get_repository(VersioningRepository))
):
    """Unlock a file (owner or admin)"""
    # Check if user is admin
    is_admin = await rbac_service.check_permission(current_user.id, "files", "admin", x_account_id)
    
    await repository.unlock_file(file_id, current_user.id, is_admin)


@router.get(
    "/{file_id}/lock",
    response_model=FileLockStatus,
    dependencies=[Depends(require_permission("files", "read"))],
    summary="Get file lock status"
)
async def get_lock_status(
    file_id: str,
    current_user: TokenData = Depends(get_current_user),
    repository: VersioningRepository = Depends(get_repository(VersioningRepository))
):
    """Get lock status for a file"""
    lock = await repository.get_active_lock(file_id)
    
    if not lock:
        return FileLockStatus(is_locked=False, can_unlock=False)
    
    # Get user details
    from sqlalchemy import select
    from app.db.tables.auth.auth import User
    stmt = select(User).where(User.id == lock.locked_by)
    result = await repository.session.execute(stmt)
    user = result.scalar_one_or_none()
    
    can_unlock = lock.locked_by == current_user.id
    
    return FileLockStatus(
        is_locked=True,
        locked_by=lock.locked_by,
        locked_by_username=user.username if user else None,
        locked_until=lock.locked_until,
        can_unlock=can_unlock
    )


# ==================== FILE REMINDERS ====================

@router.post(
    "/{file_id}/reminders",
    response_model=FileReminderOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission("files", "read"))],
    summary="Create reminder"
)
async def create_reminder(
    file_id: str,
    data: FileReminderCreate,
    current_user: TokenData = Depends(get_current_user),
    repository: VersioningRepository = Depends(get_repository(VersioningRepository))
):
    """Create a reminder for a file"""
    data.file_id = file_id
    return await repository.create_reminder(data, current_user.id)


@router.get(
    "/{file_id}/reminders",
    response_model=List[FileReminderOut],
    dependencies=[Depends(require_permission("files", "read"))],
    summary="List file reminders"
)
async def list_file_reminders(
    file_id: str,
    skip: int = 0,
    limit: int = 100,
    current_user: TokenData = Depends(get_current_user),
    repository: VersioningRepository = Depends(get_repository(VersioningRepository))
):
    """List all reminders for a file"""
    return await repository.list_reminders(file_id=file_id, skip=skip, limit=limit)


@router.get(
    "/reminders/me",
    response_model=List[FileReminderDetail],
    dependencies=[Depends(require_permission("files", "read"))],
    summary="Get my reminders"
)
async def get_my_reminders(
    due: Optional[str] = Query(None, pattern=r'^(now|all)$'$'),
    skip: int = 0,
    limit: int = 100,
    current_user: TokenData = Depends(get_current_user),
    repository: VersioningRepository = Depends(get_repository(VersioningRepository))
):
    """Get reminders for current user (due=now for due reminders only)"""
    if due == "now":
        reminders = await repository.get_due_reminders(current_user.id)
    else:
        reminders = await repository.list_reminders(
            target_user_id=current_user.id,
            skip=skip,
            limit=limit
        )
    
    # Build detailed response
    result = []
    for reminder in reminders:
        result.append(FileReminderDetail(
            id=reminder.id,
            file_id=reminder.file_id,
            created_by=reminder.created_by,
            target_user_id=reminder.target_user_id,
            remind_at=reminder.remind_at,
            message=reminder.message,
            status=reminder.status.value,
            created_at=reminder.created_at,
            updated_at=reminder.updated_at,
            file_name=reminder.file.name,
            document_id=reminder.file.document_id,
            creator_username=reminder.creator.username,
            target_username=reminder.target_user.username
        ))
    
    return result


@router.patch(
    "/reminders/{reminder_id}",
    response_model=FileReminderOut,
    dependencies=[Depends(require_permission("files", "read"))],
    summary="Update reminder"
)
async def update_reminder(
    reminder_id: str,
    data: FileReminderUpdate,
    current_user: TokenData = Depends(get_current_user),
    repository: VersioningRepository = Depends(get_repository(VersioningRepository))
):
    """Update a reminder"""
    return await repository.update_reminder(reminder_id, data)


@router.delete(
    "/reminders/{reminder_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_permission("files", "read"))],
    summary="Delete reminder"
)
async def delete_reminder(
    reminder_id: str,
    current_user: TokenData = Depends(get_current_user),
    repository: VersioningRepository = Depends(get_repository(VersioningRepository))
):
    """Delete a reminder"""
    await repository.delete_reminder(reminder_id)
