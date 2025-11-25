from sqlalchemy import Column, String, Text, TIMESTAMP, Boolean, ForeignKey, Table, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql.expression import text

from app.api.dependencies.repositories import get_ulid
from app.db.models import Base


# Association tables for many-to-many relationships
user_roles = Table(
    "user_roles",
    Base.metadata,
    Column("user_id", String(26), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", String(26), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", TIMESTAMP(timezone=True), server_default=text("now()")),
)

user_groups = Table(
    "user_groups",
    Base.metadata,
    Column("user_id", String(26), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("group_id", String(26), ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", TIMESTAMP(timezone=True), server_default=text("now()")),
)

group_roles = Table(
    "group_roles",
    Base.metadata,
    Column("group_id", String(26), ForeignKey("groups.id", ondelete="CASCADE"), primary_key=True),
    Column("role_id", String(26), ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True),
    Column("created_at", TIMESTAMP(timezone=True), server_default=text("now()")),
)

account_users = Table(
    "account_users",
    Base.metadata,
    Column("account_id", String(26), ForeignKey("accounts.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", String(26), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role_type", String(20), nullable=False, default="member"),  # owner, admin, member
    Column("notification_preferences", Text, nullable=True),  # JSON string for notification settings
    Column("created_at", TIMESTAMP(timezone=True), server_default=text("now()")),
    Column("updated_at", TIMESTAMP(timezone=True), server_default=text("now()"), onupdate=text("now()")),
)


class Role(Base):
    __tablename__ = "roles"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    account_id = Column(String(26), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True, index=True)
    is_system = Column(Boolean, default=False, nullable=False)  # System roles can't be deleted
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))

    # Relationships
    permissions = relationship("Permission", back_populates="role", cascade="all, delete-orphan")
    users = relationship("User", secondary=user_roles, back_populates="roles")
    groups = relationship("Group", secondary=group_roles, back_populates="roles")
    account = relationship("Account", back_populates="roles")


class Group(Base):
    __tablename__ = "groups"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    account_id = Column(String(26), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))

    __table_args__ = (
        UniqueConstraint("name", "account_id", name="uq_group_name_account"),
    )

    # Relationships
    users = relationship("User", secondary=user_groups, back_populates="groups")
    roles = relationship("Role", secondary=group_roles, back_populates="groups")
    account = relationship("Account", back_populates="groups")


class Module(Base):
    __tablename__ = "modules"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    key = Column(String(50), unique=True, nullable=False, index=True)  # e.g., "files", "admin_users"
    display_name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

    # Relationships
    permissions = relationship("Permission", back_populates="module", cascade="all, delete-orphan")


class Permission(Base):
    __tablename__ = "permissions"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    role_id = Column(String(26), ForeignKey("roles.id", ondelete="CASCADE"), nullable=False, index=True)
    module_id = Column(String(26), ForeignKey("modules.id", ondelete="CASCADE"), nullable=False, index=True)
    can_create = Column(Boolean, default=False, nullable=False)
    can_read = Column(Boolean, default=False, nullable=False)
    can_update = Column(Boolean, default=False, nullable=False)
    can_delete = Column(Boolean, default=False, nullable=False)
    can_admin = Column(Boolean, default=False, nullable=False)  # Full admin access to module
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))

    __table_args__ = (
        UniqueConstraint("role_id", "module_id", name="uq_permission_role_module"),
    )

    # Relationships
    role = relationship("Role", back_populates="permissions")
    module = relationship("Module", back_populates="permissions")


class Account(Base):
    __tablename__ = "accounts"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    slug = Column(String(100), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    
    # Inbox address for email-import functionality
    inbox_address = Column(String(200), unique=True, nullable=True, index=True)
    
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))

    # Relationships
    users = relationship("User", secondary=account_users, back_populates="accounts")
    roles = relationship("Role", back_populates="account", cascade="all, delete-orphan")
    groups = relationship("Group", back_populates="account", cascade="all, delete-orphan")
    password_policy = relationship("PasswordPolicy", back_populates="account", uselist=False, cascade="all, delete-orphan")
    api_keys = relationship("APIKey", back_populates="account", cascade="all, delete-orphan")


class PasswordPolicy(Base):
    __tablename__ = "password_policies"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    account_id = Column(String(26), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=True, unique=True, index=True)
    min_length = Column(Integer, default=8, nullable=False)
    require_uppercase = Column(Boolean, default=True, nullable=False)
    require_lowercase = Column(Boolean, default=True, nullable=False)
    require_numbers = Column(Boolean, default=True, nullable=False)
    require_special_chars = Column(Boolean, default=True, nullable=False)
    min_special_chars = Column(Integer, default=1, nullable=False)
    rotation_days = Column(Integer, default=90, nullable=True)  # Null = no rotation
    prevent_reuse_count = Column(Integer, default=5, nullable=False)  # Prevent reusing last N passwords
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    updated_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"), onupdate=text("now()"))

    # Relationships
    account = relationship("Account", back_populates="password_policy")


class APIKey(Base):
    __tablename__ = "api_keys"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    account_id = Column(String(26), ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    token_hash = Column(String(255), unique=True, nullable=False, index=True)
    scopes = Column(Text, nullable=True)  # JSON array of allowed scopes/modules
    is_active = Column(Boolean, default=True, nullable=False)
    created_by = Column(String(26), ForeignKey("users.id"), nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))
    expires_at = Column(TIMESTAMP(timezone=True), nullable=True)
    last_used_at = Column(TIMESTAMP(timezone=True), nullable=True)

    # Relationships
    account = relationship("Account", back_populates="api_keys")
    creator = relationship("User", foreign_keys=[created_by])


class PasswordHistory(Base):
    __tablename__ = "password_history"

    id = Column(String(26), primary_key=True, default=get_ulid, unique=True, index=True, nullable=False)
    user_id = Column(String(26), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    password_hash = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP(timezone=True), nullable=False, server_default=text("now()"))

    # Relationships
    user = relationship("User", foreign_keys=[user_id])
