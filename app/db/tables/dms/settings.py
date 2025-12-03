from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql.expression import text

from app.api.dependencies.repositories import get_ulid
from app.db.models import Base


class AppSettings(Base):
    """
    Application settings per account
    """
    __tablename__ = "app_settings"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    account_id = Column(String(26), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, unique=True, index=True)
    
    # General settings
    app_name = Column(String(100), nullable=False, default="DocFlow")
    app_title = Column(String(200), nullable=True)
    logo_url = Column(String(500), nullable=True)
    favicon_url = Column(String(500), nullable=True)
    primary_color = Column(String(20), nullable=False, default="#2563eb")
    
    # Email settings
    smtp_host = Column(String(200), nullable=True)
    smtp_port = Column(Integer, nullable=True, default=587)
    smtp_user = Column(String(200), nullable=True)
    smtp_password = Column(Text, nullable=True)  # Should be encrypted in production
    smtp_from_email = Column(String(200), nullable=True)
    smtp_from_name = Column(String(100), nullable=True)
    smtp_use_tls = Column(Boolean, nullable=False, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(DateTime(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))
    
    # Relationships
    account = relationship("Account", foreign_keys=[account_id])
