from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class SettingsBase(BaseModel):
    app_name: str = Field("DocFlow", max_length=100)
    app_title: Optional[str] = Field(None, max_length=200)
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = Field("#2563eb", max_length=20)
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    smtp_use_tls: bool = True


class SettingsUpdate(BaseModel):
    app_name: Optional[str] = Field(None, max_length=100)
    app_title: Optional[str] = Field(None, max_length=200)
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: Optional[str] = Field(None, max_length=20)
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = None
    smtp_use_tls: Optional[bool] = None


class SettingsOut(SettingsBase):
    id: str
    account_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TestEmailRequest(BaseModel):
    to_email: EmailStr
