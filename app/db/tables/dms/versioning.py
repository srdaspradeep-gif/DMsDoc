from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, BigInteger, DateTime, ForeignKey, Integer, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql.expression import text
import enum

from app.api.dependencies.repositories import get_ulid
from app.db.models import Base


class FileVersion(Base):
    """
    Stores historical versions of files.
    Each upload creates a new version.
    """
    __tablename__ = "file_versions"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    file_id = Column(String(26), ForeignKey("files_new.id", ondelete="CASCADE"), nullable=False, index=True)
    
    version_number = Column(Integer, nullable=False)  # 1, 2, 3, etc.
    storage_path = Column(String(1000), nullable=False)  # S3/MinIO path for this version
    mime_type = Column(String(200), nullable=True)
    size_bytes = Column(BigInteger, nullable=False, default=0)
    file_hash = Column(String(64), nullable=True)  # SHA-256 hash
    
    comment = Column(Text, nullable=True)  # Version comment/description
    
    created_by = Column(String(26), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    # Relationships
    file = relationship("FileNew", foreign_keys=[file_id], backref="versions")
    creator = relationship("User", foreign_keys=[created_by])


class FileLock(Base):
    """
    Manages file check-in/check-out locking.
    Only one active lock per file at a time.
    """
    __tablename__ = "file_locks"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    file_id = Column(String(26), ForeignKey("files_new.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    locked_by = Column(String(26), ForeignKey("users.id"), nullable=False)
    locked_until = Column(DateTime(timezone=True), nullable=False)  # Auto-unlock time
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))

    # Relationships
    file = relationship("FileNew", foreign_keys=[file_id], backref="lock")
    user = relationship("User", foreign_keys=[locked_by])


class ReminderStatus(enum.Enum):
    """Status of a reminder"""
    pending = "pending"
    sent = "sent"
    dismissed = "dismissed"


class FileReminder(Base):
    """
    Reminders for files.
    Users can set reminders for themselves or others.
    """
    __tablename__ = "file_reminders"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    file_id = Column(String(26), ForeignKey("files_new.id", ondelete="CASCADE"), nullable=False, index=True)
    
    created_by = Column(String(26), ForeignKey("users.id"), nullable=False)
    target_user_id = Column(String(26), ForeignKey("users.id"), nullable=False, index=True)
    
    remind_at = Column(DateTime(timezone=True), nullable=False, index=True)
    message = Column(Text, nullable=False)
    status = Column(SQLEnum(ReminderStatus), default=ReminderStatus.pending, nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))

    # Relationships
    file = relationship("FileNew", foreign_keys=[file_id], backref="reminders")
    creator = relationship("User", foreign_keys=[created_by])
    target_user = relationship("User", foreign_keys=[target_user_id])
