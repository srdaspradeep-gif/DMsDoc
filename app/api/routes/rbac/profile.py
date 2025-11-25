from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.api.dependencies.database import get_db
from app.api.dependencies.auth import get_current_user
from app.db.tables.auth.auth import User
from app.db.tables.rbac.models import account_users
from app.schemas.dms.sharing_schemas import (
    ProfileSettingsUpdate, ProfileSettingsOut, NotificationPreferencesUpdate
)

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/me", response_model=ProfileSettingsOut)
async def get_my_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get current user's profile settings"""
    return ProfileSettingsOut(
        user_id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        language=current_user.language,
        timezone=current_user.timezone,
        default_account_id=current_user.default_account_id
    )


@router.put("/me", response_model=ProfileSettingsOut)
async def update_my_profile(
    data: ProfileSettingsUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update current user's profile settings"""
    # Update user fields
    for key, value in data.model_dump(exclude_unset=True).items():
        if value is not None:
            setattr(current_user, key, value)
    
    await db.commit()
    await db.refresh(current_user)
    
    return ProfileSettingsOut(
        user_id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        full_name=current_user.full_name,
        language=current_user.language,
        timezone=current_user.timezone,
        default_account_id=current_user.default_account_id
    )


@router.get("/notifications/{account_id}")
async def get_notification_preferences(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get notification preferences for an account"""
    stmt = select(account_users.c.notification_preferences).where(
        account_users.c.user_id == current_user.id,
        account_users.c.account_id == account_id
    )
    result = await db.execute(stmt)
    prefs = result.scalar_one_or_none()
    
    if prefs:
        import json
        return {"preferences": json.loads(prefs)}
    
    return {"preferences": {}}


@router.put("/notifications")
async def update_notification_preferences(
    data: NotificationPreferencesUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update notification preferences for an account"""
    import json
    
    stmt = update(account_users).where(
        account_users.c.user_id == current_user.id,
        account_users.c.account_id == data.account_id
    ).values(notification_preferences=json.dumps(data.preferences))
    
    await db.execute(stmt)
    await db.commit()
    
    return {"message": "Notification preferences updated", "preferences": data.preferences}
