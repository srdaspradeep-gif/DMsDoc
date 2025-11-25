from typing import List, Optional
from sqlalchemy import select, and_, or_, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from datetime import datetime
import secrets

from app.core.exceptions import http_400, http_404
from app.db.tables.dms.sharing import Share, ResourceType, TargetType, AccessLevel
from app.schemas.dms.sharing_schemas import ShareCreate, ShareUpdate


class SharingRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create_share(self, data: ShareCreate, created_by: str) -> Share:
        """Create a new share"""
        share_data = data.model_dump()
        share_data["created_by"] = created_by
        
        # Generate public token if target_type is public_link
        if data.target_type == "public_link":
            share_data["public_token"] = secrets.token_urlsafe(32)
        
        share = Share(**share_data)
        self.session.add(share)
        await self.session.commit()
        await self.session.refresh(share)
        return share
    
    async def get_share(self, share_id: str) -> Optional[Share]:
        """Get share by ID"""
        stmt = select(Share).where(Share.id == share_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_share_by_token(self, token: str) -> Optional[Share]:
        """Get share by public token"""
        stmt = select(Share).where(
            and_(
                Share.public_token == token,
                Share.target_type == TargetType.PUBLIC_LINK,
                or_(
                    Share.expires_at.is_(None),
                    Share.expires_at > datetime.utcnow()
                )
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def list_shares(
        self,
        account_id: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100
    ) -> List[Share]:
        """List shares for an account"""
        stmt = select(Share).where(Share.account_id == account_id)
        
        if resource_type:
            stmt = stmt.where(Share.resource_type == resource_type)
        if resource_id:
            stmt = stmt.where(Share.resource_id == resource_id)
        
        stmt = stmt.offset(skip).limit(limit).order_by(Share.created_at.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def list_shares_for_user(
        self,
        account_id: str,
        user_id: str,
        group_ids: List[str],
        skip: int = 0,
        limit: int = 100
    ) -> List[Share]:
        """List shares accessible by a user (direct or through groups)"""
        stmt = select(Share).where(
            and_(
                Share.account_id == account_id,
                or_(
                    and_(Share.target_type == TargetType.USER, Share.target_id == user_id),
                    and_(Share.target_type == TargetType.GROUP, Share.target_id.in_(group_ids))
                ),
                or_(
                    Share.expires_at.is_(None),
                    Share.expires_at > datetime.utcnow()
                )
            )
        )
        
        stmt = stmt.offset(skip).limit(limit).order_by(Share.created_at.desc())
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def update_share(self, share_id: str, data: ShareUpdate) -> Share:
        """Update a share"""
        share = await self.get_share(share_id)
        if not share:
            raise http_404(msg="Share not found")
        
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(share, key, value)
        
        await self.session.commit()
        await self.session.refresh(share)
        return share
    
    async def delete_share(self, share_id: str):
        """Delete a share"""
        share = await self.get_share(share_id)
        if not share:
            raise http_404(msg="Share not found")
        
        await self.session.delete(share)
        await self.session.commit()
    
    async def check_share_access(
        self,
        resource_type: str,
        resource_id: str,
        user_id: str,
        group_ids: List[str]
    ) -> Optional[Share]:
        """Check if user has share access to a resource"""
        stmt = select(Share).where(
            and_(
                Share.resource_type == resource_type,
                Share.resource_id == resource_id,
                or_(
                    and_(Share.target_type == TargetType.USER, Share.target_id == user_id),
                    and_(Share.target_type == TargetType.GROUP, Share.target_id.in_(group_ids))
                ),
                or_(
                    Share.expires_at.is_(None),
                    Share.expires_at > datetime.utcnow()
                )
            )
        ).order_by(Share.access_level.desc())  # Return highest access level
        
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
