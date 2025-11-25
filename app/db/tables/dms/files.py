from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, BigInteger, DateTime, ForeignKey, Boolean, ARRAY, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql.expression import text

from app.api.dependencies.repositories import get_ulid
from app.db.models import Base


class FileNew(Base):
    """
    Enhanced file model with account scoping and folder support.
    Stores metadata about uploaded files with S3/MinIO storage.
    """
    __tablename__ = "files_new"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    account_id = Column(String(26), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    folder_id = Column(String(26), ForeignKey("folders_new.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Document ID - unique identifier for linking (unique per account)
    document_id = Column(String(50), nullable=False, index=True)
    
    # File information
    name = Column(String(500), nullable=False)  # Display name
    original_filename = Column(String(500), nullable=False)  # Original uploaded filename
    mime_type = Column(String(200), nullable=True)
    size_bytes = Column(BigInteger, nullable=False, default=0)
    
    # Storage
    storage_path = Column(String(1000), nullable=False)  # S3/MinIO path
    file_hash = Column(String(64), nullable=True)  # SHA-256 hash for deduplication
    
    # Versioning
    current_version_id = Column(String(26), nullable=True)  # Points to current active version
    
    # Tags and Notes
    tags = Column(ARRAY(String), nullable=True)  # Simple tags array
    notes = Column(Text, nullable=True)  # Free-form notes with support for links
    
    # Office document support
    is_office_doc = Column(Boolean, default=False, nullable=False)
    office_type = Column(String(50), nullable=True)  # word, excel, powerpoint
    office_url = Column(Text, nullable=True)  # Office 365 edit URL if applicable
    
    # Metadata
    created_by = Column(String(26), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))
    
    # Soft delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    account = relationship("Account", foreign_keys=[account_id])
    folder = relationship("FolderNew", back_populates="files")
    creator = relationship("User", foreign_keys=[created_by])

    # Ensure unique document_id per account
    __table_args__ = (
        UniqueConstraint("account_id", "document_id", name="uq_file_account_document_id"),
    )
