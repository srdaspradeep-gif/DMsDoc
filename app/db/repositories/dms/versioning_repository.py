from typing import List, Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta

from app.core.exceptions import http_400, http_404, http_403
from app.db.tables.dms.versioning import FileVersion, FileLock, FileReminder, ReminderStatus
from app.db.tables.dms.files import FileNew
from app.db.tables.auth.auth import User
from app.schemas.dms.schemas import FileVersionCreate, FileLockCreate, FileReminderCreate, FileReminderUpdate


class VersioningRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    # ==================== FILE VERSIONS ====================
    
    async def create_version(self, file_id: str, storage_path: str, mime_type: Optional[str],
                           size_bytes: int, file_hash: Optional[str], comment: Optional[str],
                           created_by: str) -> FileVersion:
        """Create a new file version"""
        # Get current max version number
        stmt = select(FileVersion).where(FileVersion.file_id == file_id).order_by(FileVersion.version_number.desc())
        result = await self.session.execute(stmt)
        latest = result.scalars().first()
        
        version_number = (latest.version_number + 1) if latest else 1
        
        version = FileVersion(
            file_id=file_id,
            version_number=version_number,
            storage_path=storage_path,
            mime_type=mime_type,
            size_bytes=size_bytes,
            file_hash=file_hash,
            comment=comment,
            created_by=created_by
        )
        
        self.session.add(version)
        await self.session.commit()
        await self.session.refresh(version)
        return version
    
    async def get_version(self, version_id: str) -> Optional[FileVersion]:
        """Get version by ID"""
        stmt = select(FileVersion).where(FileVersion.id == version_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def list_versions(self, file_id: str, skip: int = 0, limit: int = 100) -> List[FileVersion]:
        """List all versions for a file"""
        stmt = select(FileVersion).where(
            FileVersion.file_id == file_id
        ).order_by(FileVersion.version_number.desc()).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def restore_version(self, file_id: str, version_id: str) -> FileVersion:
        """Make a specific version the current one"""
        version = await self.get_version(version_id)
        if not version or version.file_id != file_id:
            raise http_404(msg="Version not found")
        
        # Update file's current_version_id
        stmt = select(FileNew).where(FileNew.id == file_id)
        result = await self.session.execute(stmt)
        file = result.scalar_one_or_none()
        
        if not file:
            raise http_404(msg="File not found")
        
        file.current_version_id = version_id
        file.storage_path = version.storage_path
        file.mime_type = version.mime_type
        file.size_bytes = version.size_bytes
        file.file_hash = version.file_hash
        
        await self.session.commit()
        return version
    
    # ==================== FILE LOCKS ====================
    
    async def create_lock(self, file_id: str, locked_by: str, duration_hours: int = 6) -> FileLock:
        """Lock a file for editing"""
        # Check if already locked
        existing = await self.get_active_lock(file_id)
        if existing:
            raise http_400(msg=f"File is already locked by user {existing.locked_by} until {existing.locked_until}")
        
        locked_until = datetime.utcnow() + timedelta(hours=duration_hours)
        
        lock = FileLock(
            file_id=file_id,
            locked_by=locked_by,
            locked_until=locked_until
        )
        
        self.session.add(lock)
        await self.session.commit()
        await self.session.refresh(lock)
        return lock
    
    async def get_active_lock(self, file_id: str) -> Optional[FileLock]:
        """Get active lock for a file (if not expired)"""
        stmt = select(FileLock).where(
            FileLock.file_id == file_id,
            FileLock.locked_until > datetime.utcnow()
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def unlock_file(self, file_id: str, user_id: str, is_admin: bool = False):
        """Unlock a file"""
        stmt = select(FileLock).where(FileLock.file_id == file_id)
        result = await self.session.execute(stmt)
        lock = result.scalar_one_or_none()
        
        if not lock:
            raise http_404(msg="No lock found for this file")
        
        # Check if user can unlock
        if lock.locked_by != user_id and not is_admin:
            raise http_403(msg="You don't have permission to unlock this file")
        
        await self.session.delete(lock)
        await self.session.commit()
    
    async def check_file_locked(self, file_id: str, user_id: str) -> tuple[bool, Optional[FileLock]]:
        """Check if file is locked by another user"""
        lock = await self.get_active_lock(file_id)
        if not lock:
            return False, None
        
        if lock.locked_by == user_id:
            return False, lock  # User owns the lock
        
        return True, lock  # Locked by someone else
    
    async def cleanup_expired_locks(self):
        """Remove expired locks (can be called periodically)"""
        from sqlalchemy import delete
        stmt = delete(FileLock).where(FileLock.locked_until <= datetime.utcnow())
        await self.session.execute(stmt)
        await self.session.commit()
    
    # ==================== FILE REMINDERS ====================
    
    async def create_reminder(self, data: FileReminderCreate, created_by: str) -> FileReminder:
        """Create a reminder"""
        reminder = FileReminder(
            **data.model_dump(),
            created_by=created_by,
            status=ReminderStatus.pending
        )
        
        self.session.add(reminder)
        await self.session.commit()
        await self.session.refresh(reminder)
        return reminder
    
    async def get_reminder(self, reminder_id: str) -> Optional[FileReminder]:
        """Get reminder by ID"""
        stmt = select(FileReminder).where(FileReminder.id == reminder_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def list_reminders(self, file_id: Optional[str] = None, target_user_id: Optional[str] = None,
                           status: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[FileReminder]:
        """List reminders with filters"""
        stmt = select(FileReminder)
        
        conditions = []
        if file_id:
            conditions.append(FileReminder.file_id == file_id)
        if target_user_id:
            conditions.append(FileReminder.target_user_id == target_user_id)
        if status:
            conditions.append(FileReminder.status == ReminderStatus[status])
        
        if conditions:
            stmt = stmt.where(and_(*conditions))
        
        stmt = stmt.order_by(FileReminder.remind_at).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def get_due_reminders(self, user_id: str) -> List[FileReminder]:
        """Get reminders that are due for a user"""
        stmt = select(FileReminder).where(
            FileReminder.target_user_id == user_id,
            FileReminder.status == ReminderStatus.pending,
            FileReminder.remind_at <= datetime.utcnow()
        ).options(
            selectinload(FileReminder.file),
            selectinload(FileReminder.creator)
        ).order_by(FileReminder.remind_at)
        
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def update_reminder(self, reminder_id: str, data: FileReminderUpdate) -> FileReminder:
        """Update reminder"""
        reminder = await self.get_reminder(reminder_id)
        if not reminder:
            raise http_404(msg="Reminder not found")
        
        for key, value in data.model_dump(exclude_unset=True).items():
            if key == "status" and value:
                setattr(reminder, key, ReminderStatus[value])
            else:
                setattr(reminder, key, value)
        
        await self.session.commit()
        await self.session.refresh(reminder)
        return reminder
    
    async def delete_reminder(self, reminder_id: str):
        """Delete reminder"""
        reminder = await self.get_reminder(reminder_id)
        if not reminder:
            raise http_404(msg="Reminder not found")
        
        await self.session.delete(reminder)
        await self.session.commit()
    
    async def mark_reminder_sent(self, reminder_id: str):
        """Mark reminder as sent"""
        reminder = await self.get_reminder(reminder_id)
        if reminder:
            reminder.status = ReminderStatus.sent
            await self.session.commit()
