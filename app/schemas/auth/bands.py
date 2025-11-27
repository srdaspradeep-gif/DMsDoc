from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserAuth(BaseModel):
    username: str = Field(...)
    email: EmailStr = Field(..., description="Email ID")
    password: str = Field(..., min_length=5, max_length=14, description="Password")
    full_name: Optional[str] = Field(None, description="Full name of the user")


class UserOut(BaseModel):
    id: str
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    is_active: bool
    user_since: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class AccountInfo(BaseModel):
    id: str
    name: str

    class Config:
        from_attributes = True


class TokenData(BaseModel):
    id: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    is_active: Optional[bool] = None
    default_account_id: Optional[str] = None
    accounts: Optional[list[AccountInfo]] = None
