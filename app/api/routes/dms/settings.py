from fastapi import APIRouter, Depends, UploadFile, File, Header
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import os
import shutil
from pathlib import Path

from app.api.dependencies.repositories import get_db
from app.api.dependencies.auth_utils import get_current_user
from app.api.dependencies.rbac import require_permission
from app.db.tables.auth.auth import User
from app.db.repositories.dms.settings_repository import SettingsRepository
from app.schemas.dms.settings_schemas import SettingsOut, SettingsUpdate, TestEmailRequest
from app.core.config import settings as app_settings

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get("", response_model=SettingsOut)
async def get_settings(
    x_account_id: str = Header(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin_users", "read"))
):
    """Get application settings"""
    repo = SettingsRepository(db)
    return await repo.get_settings(x_account_id)


@router.put("", response_model=SettingsOut)
async def update_settings(
    data: SettingsUpdate,
    x_account_id: str = Header(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin_users", "update"))
):
    """Update application settings"""
    repo = SettingsRepository(db)
    return await repo.update_settings(x_account_id, data)


@router.post("/upload")
async def upload_asset(
    file: UploadFile = File(...),
    type: str = "logo",  # logo or favicon
    x_account_id: str = Header(...),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin_users", "update"))
):
    """Upload logo or favicon"""
    # Create uploads directory if it doesn't exist
    upload_dir = Path("uploads/branding")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Generate filename
    file_extension = os.path.splitext(file.filename)[1]
    filename = f"{x_account_id}_{type}{file_extension}"
    file_path = upload_dir / filename
    
    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Return URL (adjust based on your static file serving setup)
    url = f"/uploads/branding/{filename}"
    
    return {"url": url, "filename": filename}


@router.post("/test-email")
async def send_test_email(
    data: TestEmailRequest,
    x_account_id: str = Header(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(require_permission("admin_users", "update"))
):
    """Send a test email to verify SMTP configuration"""
    repo = SettingsRepository(db)
    settings = await repo.get_settings(x_account_id)
    
    # TODO: Implement email sending logic using settings
    # For now, just return success
    return {
        "success": True,
        "message": f"Test email would be sent to {data.to_email}",
        "smtp_configured": bool(settings.smtp_host)
    }
