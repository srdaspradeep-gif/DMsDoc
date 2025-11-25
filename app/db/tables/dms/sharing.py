from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum, Index
from sqlalchemy.orm import relationship
from sqlalchemy.sql.expression import text
import enum

from app.api.dependencies.repositories import get_ulid
from app.db.models import Base


class ResourceType(str, enum.Enum):
    FILE = "file"
    FOLDER = "folder"
    SECTION = "section"
    ACCOUNT = "account"


class TargetType(str, enum.Enum):
    USER = "user"
    GROUP = "group"
    PUBLIC_LINK = "public_link"


class AccessLevel(str, enum.Enum):
    PREVIEW = "preview"  # View preview only, no download/print/copy
    VIEW = "view"  # Can download/print, no metadata changes
    EDIT = "edit"  # Can change metadata and upload new versions


class Share(Base):
    """
    Sharing model for files, folders, sections, and accounts.
    Grants additional access rights on top of RBAC.
    """
    __tablename__ = "shares"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    account_id = Column(String(26), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Resource being shared
    resource_type = Column(SQLEnum(ResourceType), nullable=False, index=True)
    resource_id = Column(String(26), nullable=False, index=True)
    
    # Target of the share
    target_type = Column(SQLEnum(TargetType), nullable=False, index=True)
    target_id = Column(String(26), nullable=True, index=True)  # Null for public_link
    
    # Access control
    access_level = Column(SQLEnum(AccessLevel), nullable=False, default=AccessLevel.VIEW)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    
    # Public link token (for public_link target_type)
    public_token = Column(String(64), unique=True, nullable=True, index=True)
    
    # Metadata
    created_by = Column(String(26), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))
    
    # Relationships
    account = relationship("Account", foreign_keys=[account_id])
    creator = relationship("User", foreign_keys=[created_by])

    __table_args__ = (
        Index("idx_share_resource", "resource_type", "resource_id"),
        Index("idx_share_target", "target_type", "target_id"),
    )
