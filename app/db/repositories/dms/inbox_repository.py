from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime
import base64
import secrets

from app.core.exceptions import http_400, http_404
from app.db.tables.dms.inbox import InboxEntry, InboxAttachment
from app.db.tables.dms.files import FileNew
from app.db.tables.rbac.models import Account
from app.schemas.dms.sharing_schemas import InboxEntryCreate, InboxEntryMove


class InboxRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def generate_inbox_address(self, account_id: str) -> str:
        """Generate unique inbox address for an account"""
        stmt = select(Account).where(Account.id == account_id)
        result = await self.session.execute(stmt)
        account = result.scalar_one_or_none()
        
        if not account:
            raise http_404(msg="Account not found")
        
        if account.inbox_address:
            return account.inbox_address
        
        # Generate unique inbox address
        slug = account.slug
        unique_token = secrets.token_hex(8)
        inbox_address = f"{slug}-{unique_token}@docflow.inbox"
        
        account.inbox_address = inbox_address
        await self.session.commit()
        
        return inbox_address
    
    async def get_account_by_inbox_address(self, inbox_address: str) -> Optional[Account]:
        """Get account by inbox address"""
        stmt = select(Account).where(Account.inbox_address == inbox_address)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def create_inbox_entry(
        self,
        account_id: str,
        data: InboxEntryCreate,
        storage_service
    ) -> InboxEntry:
        """Create inbox entry from simulated email"""
        # Create inbox entry
        body_preview = data.body[:500] if data.body else None
        
        entry = InboxEntry(
            account_id=account_id,
            from_email=data.from_email,
            subject=data.subject,
            body_preview=body_preview,
            is_processed=False
        )
        self.session.add(entry)
        await self.session.flush()
        
        # Process attachments
        for attachment_data in data.attachments:
            filename = attachment_data.get("filename")
            content_base64 = attachment_data.get("content_base64")
            mime_type = attachment_data.get("mime_type")
            
            if not filename or not content_base64:
                continue
            
            # Decode base64 content
            try:
                content = base64.b64decode(content_base64)
            except Exception:
                continue
            
            # Store in temporary inbox location
            storage_path = f"inbox/{account_id}/{entry.id}/{filename}"
            await storage_service.upload_file(storage_path, content)
            
            # Create attachment record
            attachment = InboxAttachment(
                inbox_entry_id=entry.id,
                filename=filename,
                mime_type=mime_type,
                size_bytes=str(len(content)),
                storage_path=storage_path
            )
            self.session.add(attachment)
        
        await self.session.commit()
        await self.session.refresh(entry, ["attachments"])
        return entry
    
    async def get_inbox_entry(self, entry_id: str) -> Optional[InboxEntry]:
        """Get inbox entry by ID"""
        stmt = select(InboxEntry).where(InboxEntry.id == entry_id).options(
            selectinload(InboxEntry.attachments)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def list_inbox_entries(
        self,
        account_id: str,
        is_processed: Optional[bool] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[InboxEntry]:
        """List inbox entries for an account"""
        stmt = select(InboxEntry).where(InboxEntry.account_id == account_id)
        
        if is_processed is not None:
            stmt = stmt.where(InboxEntry.is_processed == is_processed)
        
        stmt = stmt.options(selectinload(InboxEntry.attachments))
        stmt = stmt.offset(skip).limit(limit).order_by(InboxEntry.created_at.desc())
        
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def move_to_folder(
        self,
        entry_id: str,
        data: InboxEntryMove,
        user_id: str,
        storage_service,
        dms_repository
    ) -> List[FileNew]:
        """Move inbox entry attachments to a folder as files"""
        entry = await self.get_inbox_entry(entry_id)
        if not entry:
            raise http_404(msg="Inbox entry not found")
        
        if entry.is_processed:
            raise http_400(msg="Inbox entry already processed")
        
        # Get attachments to move
        attachments = entry.attachments
        if data.attachment_ids:
            attachments = [a for a in attachments if a.id in data.attachment_ids]
        
        created_files = []
        
        for attachment in attachments:
            # Read file from inbox storage
            content = await storage_service.download_file(attachment.storage_path)
            
            # Create file in target folder
            file_data = {
                "account_id": entry.account_id,
                "folder_id": data.folder_id,
                "name": attachment.filename,
                "original_filename": attachment.filename,
                "mime_type": attachment.mime_type,
                "size_bytes": int(attachment.size_bytes),
                "tags": [f"from:{entry.from_email}"],
                "notes": f"Imported from inbox: {entry.subject or 'No subject'}"
            }
            
            # Use DMS repository to create file
            file = await dms_repository.create_file_from_content(
                file_data,
                content,
                user_id
            )
            
            # Link attachment to created file
            attachment.file_id = file.id
            created_files.append(file)
        
        # Mark entry as processed
        entry.is_processed = True
        entry.processed_at = datetime.utcnow()
        entry.processed_by = user_id
        entry.folder_id = data.folder_id
        
        await self.session.commit()
        
        return created_files
    
    async def delete_inbox_entry(self, entry_id: str, storage_service):
        """Delete inbox entry and its attachments"""
        entry = await self.get_inbox_entry(entry_id)
        if not entry:
            raise http_404(msg="Inbox entry not found")
        
        # Delete attachment files from storage
        for attachment in entry.attachments:
            try:
                await storage_service.delete_file(attachment.storage_path)
            except Exception:
                pass  # Continue even if file deletion fails
        
        await self.session.delete(entry)
        await self.session.commit()
