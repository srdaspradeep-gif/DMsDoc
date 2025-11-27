from typing import List, Optional, Dict, Any
from sqlalchemy import select, func, and_, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
import hashlib
import os
import secrets
from datetime import datetime

from app.core.exceptions import http_400, http_404, http_403
from app.db.tables.dms.sections import Section
from app.db.tables.dms.folders_new import FolderNew
from app.db.tables.dms.files import FileNew
from app.db.tables.dms.metadata import MetadataDefinition, FileMetadata, RelatedFile
from app.schemas.dms.schemas import (
    SectionCreate, SectionUpdate,
    FolderCreate, FolderUpdate,
    FileCreate, FileUpdate,
    OfficeDocCreate,
    MetadataDefinitionCreate, MetadataDefinitionUpdate,
    FileMetadataUpdate, RelatedFileCreate
)


class DMSRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    # ==================== SECTIONS ====================
    
    async def create_section(self, data: SectionCreate, created_by: str) -> Section:
        """Create a new section"""
        # Check if section name exists in account
        stmt = select(Section).where(
            Section.account_id == data.account_id,
            Section.name == data.name
        )
        result = await self.session.execute(stmt)
        if result.scalar_one_or_none():
            raise http_400(msg="Section name already exists in this account")
        
        section = Section(**data.model_dump(), created_by=created_by)
        self.session.add(section)
        await self.session.commit()
        await self.session.refresh(section)
        return section
    
    async def get_section(self, section_id: str, account_id: Optional[str] = None) -> Optional[Section]:
        """Get section by ID"""
        stmt = select(Section).where(Section.id == section_id)
        if account_id:
            stmt = stmt.where(Section.account_id == account_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def list_sections(self, account_id: str, skip: int = 0, limit: int = 100) -> List[dict]:
        """List all sections for an account with folder and file counts"""
        stmt = select(Section).where(
            Section.account_id == account_id
        ).order_by(Section.position, Section.name).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        sections = result.scalars().all()
        
        # Add folder and file counts
        sections_with_counts = []
        for section in sections:
            # Count folders
            folder_stmt = select(func.count(FolderNew.id)).where(FolderNew.section_id == section.id)
            folder_result = await self.session.execute(folder_stmt)
            folder_count = folder_result.scalar() or 0
            
            # Count files (via folders)
            file_stmt = select(func.count(FileNew.id)).join(
                FolderNew, FileNew.folder_id == FolderNew.id
            ).where(
                FolderNew.section_id == section.id,
                FileNew.is_deleted == False
            )
            file_result = await self.session.execute(file_stmt)
            file_count = file_result.scalar() or 0
            
            section_dict = {
                "id": section.id,
                "account_id": section.account_id,
                "name": section.name,
                "description": section.description,
                "position": section.position,
                "created_by": section.created_by,
                "created_at": section.created_at,
                "updated_at": section.updated_at,
                "folder_count": folder_count,
                "file_count": file_count
            }
            sections_with_counts.append(section_dict)
        
        return sections_with_counts
    
    async def update_section(self, section_id: str, data: SectionUpdate, account_id: Optional[str] = None) -> Section:
        """Update section"""
        section = await self.get_section(section_id, account_id)
        if not section:
            raise http_404(msg="Section not found")
        
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(section, key, value)
        
        await self.session.commit()
        await self.session.refresh(section)
        return section
    
    async def delete_section(self, section_id: str, account_id: Optional[str] = None):
        """Delete section (cascades to folders and files)"""
        section = await self.get_section(section_id, account_id)
        if not section:
            raise http_404(msg="Section not found")
        
        await self.session.delete(section)
        await self.session.commit()
    
    # ==================== FOLDERS ====================
    
    async def create_folder(self, data: FolderCreate, created_by: str) -> FolderNew:
        """Create a new folder"""
        # Check if folder name exists in same parent/section
        stmt = select(FolderNew).where(
            FolderNew.section_id == data.section_id,
            FolderNew.name == data.name
        )
        if data.parent_folder_id:
            stmt = stmt.where(FolderNew.parent_folder_id == data.parent_folder_id)
        else:
            stmt = stmt.where(FolderNew.parent_folder_id.is_(None))
        
        result = await self.session.execute(stmt)
        if result.scalar_one_or_none():
            raise http_400(msg="Folder name already exists in this location")
        
        folder = FolderNew(**data.model_dump(), created_by=created_by)
        self.session.add(folder)
        await self.session.commit()
        await self.session.refresh(folder)
        return folder
    
    async def get_folder(self, folder_id: str, account_id: Optional[str] = None) -> Optional[FolderNew]:
        """Get folder by ID"""
        stmt = select(FolderNew).where(FolderNew.id == folder_id)
        if account_id:
            stmt = stmt.where(FolderNew.account_id == account_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def list_folders(self, account_id: str, section_id: Optional[str] = None, 
                          parent_folder_id: Optional[str] = None, skip: int = 0, limit: int = 100) -> List[FolderNew]:
        """List folders"""
        stmt = select(FolderNew).where(FolderNew.account_id == account_id)
        
        if section_id:
            stmt = stmt.where(FolderNew.section_id == section_id)
        
        if parent_folder_id:
            stmt = stmt.where(FolderNew.parent_folder_id == parent_folder_id)
        else:
            # Root folders only
            stmt = stmt.where(FolderNew.parent_folder_id.is_(None))
        
        stmt = stmt.order_by(FolderNew.name).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def get_folder_tree(self, section_id: str, account_id: str) -> List[dict]:
        """Get complete folder tree for a section"""
        # Get all folders in section
        stmt = select(FolderNew).where(
            FolderNew.section_id == section_id,
            FolderNew.account_id == account_id
        ).order_by(FolderNew.name)
        result = await self.session.execute(stmt)
        folders = result.scalars().all()
        
        # Build tree structure
        folder_dict = {f.id: {**f.__dict__, 'subfolders': [], 'file_count': 0} for f in folders}
        root_folders = []
        
        for folder in folders:
            if folder.parent_folder_id:
                if folder.parent_folder_id in folder_dict:
                    folder_dict[folder.parent_folder_id]['subfolders'].append(folder_dict[folder.id])
            else:
                root_folders.append(folder_dict[folder.id])
        
        # Count files in each folder
        for folder_id in folder_dict:
            stmt = select(func.count(FileNew.id)).where(
                FileNew.folder_id == folder_id,
                FileNew.is_deleted == False
            )
            result = await self.session.execute(stmt)
            folder_dict[folder_id]['file_count'] = result.scalar()
        
        return root_folders
    
    async def update_folder(self, folder_id: str, data: FolderUpdate, account_id: Optional[str] = None) -> FolderNew:
        """Update folder"""
        folder = await self.get_folder(folder_id, account_id)
        if not folder:
            raise http_404(msg="Folder not found")
        
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(folder, key, value)
        
        await self.session.commit()
        await self.session.refresh(folder)
        return folder
    
    async def delete_folder(self, folder_id: str, account_id: Optional[str] = None):
        """Delete folder (cascades to files)"""
        folder = await self.get_folder(folder_id, account_id)
        if not folder:
            raise http_404(msg="Folder not found")
        
        await self.session.delete(folder)
        await self.session.commit()
    
    # ==================== FILES ====================
    
    async def create_file(self, data: FileCreate, created_by: str) -> FileNew:
        """Create file record with auto-generated document_id"""
        # Generate document_id if not provided
        if not data.document_id:
            data.document_id = await self._generate_document_id(data.account_id)
        
        file = FileNew(**data.model_dump(), created_by=created_by)
        self.session.add(file)
        await self.session.commit()
        await self.session.refresh(file)
        return file
    
    async def _generate_document_id(self, account_id: str) -> str:
        """Generate unique document ID for account"""
        while True:
            # Generate format: DOC-XXXXXX (6 random alphanumeric)
            doc_id = f"DOC-{secrets.token_hex(3).upper()}"
            
            # Check if exists
            stmt = select(FileNew).where(
                FileNew.account_id == account_id,
                FileNew.document_id == doc_id
            )
            result = await self.session.execute(stmt)
            if not result.scalar_one_or_none():
                return doc_id
    
    async def get_file(self, file_id: str, account_id: Optional[str] = None) -> Optional[FileNew]:
        """Get file by ID"""
        stmt = select(FileNew).where(FileNew.id == file_id, FileNew.is_deleted == False)
        if account_id:
            stmt = stmt.where(FileNew.account_id == account_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def list_files(self, account_id: str, folder_id: Optional[str] = None, 
                        skip: int = 0, limit: int = 100) -> List[FileNew]:
        """List files"""
        stmt = select(FileNew).where(
            FileNew.account_id == account_id,
            FileNew.is_deleted == False
        )
        
        if folder_id:
            stmt = stmt.where(FileNew.folder_id == folder_id)
        
        stmt = stmt.order_by(FileNew.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def update_file(self, file_id: str, data: FileUpdate, account_id: Optional[str] = None) -> FileNew:
        """Update file"""
        file = await self.get_file(file_id, account_id)
        if not file:
            raise http_404(msg="File not found")
        
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(file, key, value)
        
        await self.session.commit()
        await self.session.refresh(file)
        return file
    
    async def soft_delete_file(self, file_id: str, account_id: Optional[str] = None):
        """Soft delete file"""
        file = await self.get_file(file_id, account_id)
        if not file:
            raise http_404(msg="File not found")
        
        file.is_deleted = True
        file.deleted_at = datetime.utcnow()
        await self.session.commit()
    
    async def restore_file(self, file_id: str, account_id: Optional[str] = None):
        """Restore soft-deleted file"""
        stmt = select(FileNew).where(FileNew.id == file_id)
        if account_id:
            stmt = stmt.where(FileNew.account_id == account_id)
        result = await self.session.execute(stmt)
        file = result.scalar_one_or_none()
        
        if not file:
            raise http_404(msg="File not found")
        
        file.is_deleted = False
        file.deleted_at = None
        await self.session.commit()
    
    async def permanent_delete_file(self, file_id: str, account_id: Optional[str] = None):
        """Permanently delete file"""
        stmt = select(FileNew).where(FileNew.id == file_id)
        if account_id:
            stmt = stmt.where(FileNew.account_id == account_id)
        result = await self.session.execute(stmt)
        file = result.scalar_one_or_none()
        
        if not file:
            raise http_404(msg="File not found")
        
        await self.session.delete(file)
        await self.session.commit()
    
    async def create_office_document(self, data: OfficeDocCreate, created_by: str) -> FileNew:
        """Create empty Office document placeholder"""
        # Generate storage path
        storage_path = f"office/{data.account_id}/{data.office_type}/{data.name}"
        
        file = FileNew(
            account_id=data.account_id,
            folder_id=data.folder_id,
            name=data.name,
            original_filename=f"{data.name}.{self._get_office_extension(data.office_type)}",
            mime_type=self._get_office_mime_type(data.office_type),
            size_bytes=0,
            storage_path=storage_path,
            is_office_doc=True,
            office_type=data.office_type,
            created_by=created_by
        )
        
        self.session.add(file)
        await self.session.commit()
        await self.session.refresh(file)
        return file
    
    def _get_office_extension(self, office_type: str) -> str:
        """Get file extension for Office type"""
        extensions = {
            'word': 'docx',
            'excel': 'xlsx',
            'powerpoint': 'pptx'
        }
        return extensions.get(office_type, 'docx')
    
    def _get_office_mime_type(self, office_type: str) -> str:
        """Get MIME type for Office type"""
        mime_types = {
            'word': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'excel': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'powerpoint': 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        }
        return mime_types.get(office_type, mime_types['word'])
    
    async def get_files_by_hash(self, file_hash: str, account_id: str) -> Optional[FileNew]:
        """Check if file with same hash exists (deduplication)"""
        stmt = select(FileNew).where(
            FileNew.file_hash == file_hash,
            FileNew.account_id == account_id,
            FileNew.is_deleted == False
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
