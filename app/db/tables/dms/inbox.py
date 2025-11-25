from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql.expression import text

from app.api.dependencies.repositories import get_ulid
from app.db.models import Base


class InboxEntry(Base):
    """
    Inbox entries for email-import equivalent functionality.
    Each account has a unique inbox address for receiving documents.
    """
    __tablename__ = "inbox_entries"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    account_id = Column(String(26), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Email metadata
    from_email = Column(String(500), nullable=False)
    subject = Column(String(1000), nullable=True)
    body_preview = Column(Text, nullable=True)  # First 500 chars of body
    
    # Processing status
    folder_id = Column(String(26), ForeignKey("folders_new.id", ondelete="SET NULL"), nullable=True, index=True)
    is_processed = Column(Boolean, default=False, nullable=False)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    processed_at = Column(DateTime(timezone=True), nullable=True)
    processed_by = Column(String(26), ForeignKey("users.id"), nullable=True)
    
    # Relationships
    account = relationship("Account", foreign_keys=[account_id])
    folder = relationship("FolderNew", foreign_keys=[folder_id])
    processor = relationship("User", foreign_keys=[processed_by])
    attachments = relationship("InboxAttachment", back_populates="inbox_entry", cascade="all, delete-orphan")


class InboxAttachment(Base):
    """
    Attachments associated with inbox entries.
    """
    __tablename__ = "inbox_attachments"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    inbox_entry_id = Column(String(26), ForeignKey("inbox_entries.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # File information
    filename = Column(String(500), nullable=False)
    mime_type = Column(String(200), nullable=True)
    size_bytes = Column(String(20), nullable=False)  # Store as string to avoid overflow
    
    # Storage (temporary until moved to folder)
    storage_path = Column(String(1000), nullable=False)
    
    # Link to created file (if moved)
    file_id = Column(String(26), ForeignKey("files_new.id", ondelete="SET NULL"), nullable=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    
    # Relationships
    inbox_entry = relationship("InboxEntry", back_populates="attachments")
    file = relationship("FileNew", foreign_keys=[file_id])
