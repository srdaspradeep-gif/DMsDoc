from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql.expression import text
import enum

from app.api.dependencies.repositories import get_ulid
from app.db.models import Base


class RetentionMode(str, enum.Enum):
    MOVE_TO_RECYCLE = "move_to_recycle"  # Soft delete (set deleted_at)
    DELETE = "delete"  # Permanent delete


class RetentionPolicy(Base):
    """
    Retention policies for folders.
    Automatically moves or deletes files after a specified period.
    """
    __tablename__ = "retention_policies"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    account_id = Column(String(26), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    folder_id = Column(String(26), ForeignKey("folders_new.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Policy settings
    apply_to_subfolders = Column(Boolean, default=False, nullable=False)
    retention_days = Column(Integer, nullable=False)  # Days after creation/modification
    mode = Column(SQLEnum(RetentionMode), nullable=False, default=RetentionMode.MOVE_TO_RECYCLE)
    
    # Metadata
    created_by = Column(String(26), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))
    
    # Relationships
    account = relationship("Account", foreign_keys=[account_id])
    folder = relationship("FolderNew", foreign_keys=[folder_id])
    creator = relationship("User", foreign_keys=[created_by])
