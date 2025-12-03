from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.tables.dms.settings import AppSettings
from app.schemas.dms.settings_schemas import SettingsUpdate


class SettingsRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_settings(self, account_id: str) -> AppSettings:
        """Get settings for an account, create default if not exists"""
        stmt = select(AppSettings).where(AppSettings.account_id == account_id)
        result = await self.session.execute(stmt)
        settings = result.scalar_one_or_none()
        
        if not settings:
            # Create default settings
            settings = AppSettings(
                account_id=account_id,
                app_name="DocFlow",
                app_title="Document Management System",
                primary_color="#2563eb"
            )
            self.session.add(settings)
            await self.session.commit()
            await self.session.refresh(settings)
        
        return settings
    
    async def update_settings(self, account_id: str, data: SettingsUpdate) -> AppSettings:
        """Update settings for an account"""
        settings = await self.get_settings(account_id)
        
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(settings, key, value)
        
        await self.session.commit()
        await self.session.refresh(settings)
        return settings
