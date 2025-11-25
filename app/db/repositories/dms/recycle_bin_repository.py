from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.core.exceptions import http_404, http_400
from app.db.tables.dms.files import FileNew
from app.db.tables.dms.folders_new import FolderNew


class RecycleBinRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def list_deleted_files(
        self,
        account_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[FileNew]:
        """List deleted files in recycle bin"""
        stmt = select(FileNew).where(
            and_(
                FileNew.account_id == account_id,
                FileNew.is_deleted == True
            )
        ).order_by(FileNew.deleted_at.desc()).offset(skip).limit(limit)
        
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def list_deleted_folders(
        self,
        account_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[FolderNew]:
        """List deleted folders in recycle bin"""
        stmt = select(FolderNew).where(
            and_(
                FolderNew.account_id == account_id,
                FolderNew.is_deleted == True
            )
        ).order_by(FolderNew.deleted_at.desc()).offset(skip).limit(limit)
        
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def restore_files(self, file_ids: List[str], account_id: str) -> List[FileNew]:
        """Restore files from recycle bin"""
        stmt = select(FileNew).where(
            and_(
                FileNew.id.in_(file_ids),
                FileNew.account_id == account_id,
                FileNew.is_deleted == True
            )
        )
        result = await self.session.execute(stmt)
        files = result.scalars().all()
        
        if not files:
            raise http_404(msg="No deleted files found with provided IDs")
        
        restored = []
        for file in files:
            file.is_deleted = False
            file.deleted_at = None
            restored.append(file)
        
        await self.session.commit()
        return restored
    
    async def restore_folders(self, folder_ids: List[str], account_id: str) -> List[FolderNew]:
        """Restore folders from recycle bin"""
        stmt = select(FolderNew).where(
            and_(
                FolderNew.id.in_(folder_ids),
                FolderNew.account_id == account_id,
                FolderNew.is_deleted == True
            )
        )
        result = await self.session.execute(stmt)
        folders = result.scalars().all()
        
        if not folders:
            raise http_404(msg="No deleted folders found with provided IDs")
        
        restored = []
        for folder in folders:
            folder.is_deleted = False
            folder.deleted_at = None
            restored.append(folder)
        
        await self.session.commit()
        return restored
    
    async def permanently_delete_files(
        self,
        file_ids: List[str],
        account_id: str,
        storage_service
    ) -> int:
        """Permanently delete files from recycle bin"""
        stmt = select(FileNew).where(
            and_(
                FileNew.id.in_(file_ids),
                FileNew.account_id == account_id,
                FileNew.is_deleted == True
            )
        )
        result = await self.session.execute(stmt)
        files = result.scalars().all()
        
        if not files:
            raise http_404(msg="No deleted files found with provided IDs")
        
        count = 0
        for file in files:
            # Delete from storage
            try:
                await storage_service.delete_file(file.storage_path)
            except Exception:
                pass  # Continue even if storage deletion fails
            
            # Delete from database
            await self.session.delete(file)
            count += 1
        
        await self.session.commit()
        return count
    
    async def permanently_delete_folders(
        self,
        folder_ids: List[str],
        account_id: str
    ) -> int:
        """Permanently delete folders from recycle bin"""
        stmt = select(FolderNew).where(
            and_(
                FolderNew.id.in_(folder_ids),
                FolderNew.account_id == account_id,
                FolderNew.is_deleted == True
            )
        )
        result = await self.session.execute(stmt)
        folders = result.scalars().all()
        
        if not folders:
            raise http_404(msg="No deleted folders found with provided IDs")
        
        count = 0
        for folder in folders:
            await self.session.delete(folder)
            count += 1
        
        await self.session.commit()
        return count
    
    async def empty_recycle_bin(
        self,
        account_id: str,
        storage_service
    ) -> dict:
        """Empty entire recycle bin for an account"""
        # Get all deleted files
        files = await self.list_deleted_files(account_id, limit=10000)
        
        # Get all deleted folders
        folders = await self.list_deleted_folders(account_id, limit=10000)
        
        # Delete files
        file_count = 0
        for file in files:
            try:
                await storage_service.delete_file(file.storage_path)
            except Exception:
                pass
            await self.session.delete(file)
            file_count += 1
        
        # Delete folders
        folder_count = 0
        for folder in folders:
            await self.session.delete(folder)
            folder_count += 1
        
        await self.session.commit()
        
        return {
            "files_deleted": file_count,
            "folders_deleted": folder_count
        }
