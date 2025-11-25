from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


# Sharing Schemas
class ShareBase(BaseModel):
    resource_type: str = Field(..., pattern=r'^(file|folder|section|account)$')
    resource_id: str
    target_type: str = Field(..., pattern=r'^(user|group|public_link)$')
    target_id: Optional[str] = None  # Null for public_link
    access_level: str = Field("view", pattern=r'^(preview|view|edit)$')
    expires_at: Optional[datetime] = None


class ShareCreate(ShareBase):
    account_id: str


class ShareUpdate(BaseModel):
    access_level: Optional[str] = Field(None, pattern=r'^(preview|view|edit)$')
    expires_at: Optional[datetime] = None


class ShareOut(ShareBase):
    id: str
    account_id: str
    public_token: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PublicLinkOut(BaseModel):
    """Public link response with URL"""
    share_id: str
    public_token: str
    public_url: str
    access_level: str
    expires_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


# Retention Schemas
class RetentionPolicyBase(BaseModel):
    folder_id: str
    apply_to_subfolders: bool = False
    retention_days: int = Field(..., ge=1, le=3650)  # 1 day to 10 years
    mode: str = Field("move_to_recycle", pattern=r'^(move_to_recycle|delete)$')


class RetentionPolicyCreate(RetentionPolicyBase):
    account_id: str


class RetentionPolicyUpdate(BaseModel):
    apply_to_subfolders: Optional[bool] = None
    retention_days: Optional[int] = Field(None, ge=1, le=3650)
    mode: Optional[str] = Field(None, pattern=r'^(move_to_recycle|delete)$')


class RetentionPolicyOut(RetentionPolicyBase):
    id: str
    account_id: str
    created_by: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Inbox Schemas
class InboxAttachmentOut(BaseModel):
    id: str
    filename: str
    mime_type: Optional[str]
    size_bytes: str
    file_id: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class InboxEntryOut(BaseModel):
    id: str
    account_id: str
    from_email: str
    subject: Optional[str]
    body_preview: Optional[str]
    folder_id: Optional[str]
    is_processed: bool
    created_at: datetime
    processed_at: Optional[datetime]
    processed_by: Optional[str]
    attachments: list[InboxAttachmentOut] = []

    class Config:
        from_attributes = True


class InboxEntryCreate(BaseModel):
    """Simulate receiving an email"""
    from_email: str = Field(..., max_length=500)
    subject: Optional[str] = Field(None, max_length=1000)
    body: Optional[str] = None
    attachments: list[dict] = []  # List of {filename, content_base64, mime_type}


class InboxEntryMove(BaseModel):
    """Move inbox entry attachments to a folder"""
    folder_id: str
    attachment_ids: Optional[list[str]] = None  # If None, move all


# Audit Schemas
class AuditLogOut(BaseModel):
    id: str
    account_id: str
    user_id: Optional[str]
    api_key_id: Optional[str]
    action: str
    resource_type: str
    resource_id: Optional[str]
    metadata: Optional[dict]
    ip_address: Optional[str]
    user_agent: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class AuditLogQuery(BaseModel):
    """Query parameters for audit log search"""
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    user_id: Optional[str] = None
    action: Optional[str] = None
    resource_type: Optional[str] = None
    resource_id: Optional[str] = None
    skip: int = Field(0, ge=0)
    limit: int = Field(50, ge=1, le=500)


# Profile Settings Schemas
class ProfileSettingsUpdate(BaseModel):
    language: Optional[str] = Field(None, max_length=10)
    timezone: Optional[str] = Field(None, max_length=50)
    default_account_id: Optional[str] = None


class NotificationPreferencesUpdate(BaseModel):
    account_id: str
    preferences: dict  # Flexible JSON for notification settings


class ProfileSettingsOut(BaseModel):
    user_id: str
    username: str
    email: str
    full_name: Optional[str]
    language: Optional[str]
    timezone: Optional[str]
    default_account_id: Optional[str]

    class Config:
        from_attributes = True


# Access Overview Schemas
class UserAccessItem(BaseModel):
    """Resource that a user can access"""
    resource_type: str
    resource_id: str
    resource_name: str
    access_level: str
    access_source: str  # "role", "group", "share"
    expires_at: Optional[datetime] = None


class ResourceAccessItem(BaseModel):
    """User/group that can access a resource"""
    target_type: str  # "user", "group", "public_link"
    target_id: Optional[str]
    target_name: Optional[str]
    access_level: str
    access_source: str  # "role", "group", "share"
    expires_at: Optional[datetime] = None


class UserAccessOverview(BaseModel):
    user_id: str
    username: str
    resources: list[UserAccessItem] = []


class ResourceAccessOverview(BaseModel):
    resource_type: str
    resource_id: str
    resource_name: str
    accessors: list[ResourceAccessItem] = []


# Recycle Bin Schemas
class RecycleBinItemOut(BaseModel):
    """Deleted file or folder"""
    id: str
    type: str  # "file" or "folder"
    name: str
    original_path: str
    deleted_at: datetime
    deleted_by: Optional[str]
    size_bytes: Optional[int] = None

    class Config:
        from_attributes = True


class RecycleBinRestore(BaseModel):
    """Restore items from recycle bin"""
    item_ids: list[str]
    item_type: str = Field(..., pattern=r'^(file|folder)$')
