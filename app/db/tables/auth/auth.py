from sqlalchemy import Column, String, Text, TIMESTAMP, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql.expression import text

from app.api.dependencies.repositories import get_ulid
from app.db.models import Base


class User(Base):
    __tablename__ = "users"

    id = Column(
        String(26),
        primary_key=True,
        default=get_ulid,
        unique=True,
        index=True,
        nullable=False,
    )
    username: str = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password = Column(Text, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_super_admin = Column(Boolean, default=False, nullable=False)  # First user becomes super admin
    
    # Profile settings
    language = Column(String(10), nullable=True, default="en")  # ISO 639-1 code
    timezone = Column(String(50), nullable=True, default="UTC")  # IANA timezone
    default_account_id = Column(String(26), ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True)
    
    user_since = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()")
    )
    updated_at = Column(
        TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()")
    )
    password_changed_at = Column(TIMESTAMP(timezone=True), nullable=True)

    # Document relationships
    owner_of = relationship("DocumentMetadata", back_populates="owner")
    comments = relationship("DocumentComment", back_populates="user")
    folders = relationship("Folder", back_populates="owner")
    
    # RBAC relationships
    roles = relationship("Role", secondary="user_roles", back_populates="users")
    groups = relationship("Group", secondary="user_groups", back_populates="users")
    accounts = relationship("Account", secondary="account_users", back_populates="users")
    default_account = relationship("Account", foreign_keys=[default_account_id])
