from datetime import datetime
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Index, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql.expression import text

from app.api.dependencies.repositories import get_ulid
from app.db.models import Base


class AuditLog(Base):
    """
    Audit log for tracking all significant actions in the system.
    Provides comprehensive audit trail for compliance and security.
    """
    __tablename__ = "audit_logs"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    account_id = Column(String(26), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Actor (user or API key)
    user_id = Column(String(26), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    api_key_id = Column(String(26), ForeignKey("api_keys.id", ondelete="SET NULL"), nullable=True, index=True)
    
    # Action details
    action = Column(String(100), nullable=False, index=True)  # e.g., "file.upload", "file.download", "share.create"
    resource_type = Column(String(50), nullable=False, index=True)  # e.g., "file", "folder", "share"
    resource_id = Column(String(26), nullable=True, index=True)
    
    # Additional context
    metadata = Column(JSON, nullable=True)  # Flexible JSON for action-specific data
    ip_address = Column(String(45), nullable=True)  # IPv4 or IPv6
    user_agent = Column(Text, nullable=True)
    
    # Timestamp
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"), index=True)
    
    # Relationships
    account = relationship("Account", foreign_keys=[account_id])
    user = relationship("User", foreign_keys=[user_id])
    api_key = relationship("APIKey", foreign_keys=[api_key_id])

    __table_args__ = (
        Index("idx_audit_account_action", "account_id", "action"),
        Index("idx_audit_resource", "resource_type", "resource_id"),
        Index("idx_audit_created", "created_at"),
    )
