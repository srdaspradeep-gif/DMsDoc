from typing import List
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.db.tables.dms.sharing import Share, ResourceType, TargetType
from app.db.tables.dms.files import FileNew
from app.db.tables.dms.folders_new import FolderNew
from app.db.tables.dms.sections import Section
from app.db.tables.rbac.models import Role, Group, Permission, user_roles, user_groups, group_roles
from app.db.tables.auth.auth import User
from app.schemas.dms.sharing_schemas import UserAccessItem, ResourceAccessItem


class AccessOverviewRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_user_access(
        self,
        account_id: str,
        user_id: str
    ) -> List[UserAccessItem]:
        """Get all resources a user can access"""
        access_items = []
        
        # Get user's groups
        stmt = select(Group.id).select_from(user_groups).join(
            Group, Group.id == user_groups.c.group_id
        ).where(
            and_(
                user_groups.c.user_id == user_id,
                Group.account_id == account_id
            )
        )
        result = await self.session.execute(stmt)
        group_ids = [row[0] for row in result.all()]
        
        # Get shares for user (direct and through groups)
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
        result = await self.session.execute(stmt)
        shares = result.scalars().all()
        
        # Build access items from shares
        for share in shares:
            # Get resource name
            resource_name = await self._get_resource_name(
                share.resource_type,
                share.resource_id
            )
            
            access_source = "share"
            if share.target_type == TargetType.GROUP:
                access_source = "group_share"
            
            access_items.append(UserAccessItem(
                resource_type=share.resource_type.value,
                resource_id=share.resource_id,
                resource_name=resource_name,
                access_level=share.access_level.value,
                access_source=access_source,
                expires_at=share.expires_at
            ))
        
        # TODO: Add role-based access (files/folders accessible through RBAC permissions)
        # This would require checking module permissions and mapping to resources
        
        return access_items
    
    async def get_resource_access(
        self,
        account_id: str,
        resource_type: str,
        resource_id: str
    ) -> List[ResourceAccessItem]:
        """Get all users/groups that can access a resource"""
        access_items = []
        
        # Get shares for this resource
        stmt = select(Share).where(
            and_(
                Share.account_id == account_id,
                Share.resource_type == resource_type,
                Share.resource_id == resource_id,
                or_(
                    Share.expires_at.is_(None),
                    Share.expires_at > datetime.utcnow()
                )
            )
        )
        result = await self.session.execute(stmt)
        shares = result.scalars().all()
        
        for share in shares:
            target_name = None
            
            if share.target_type == TargetType.USER:
                # Get user name
                stmt = select(User).where(User.id == share.target_id)
                result = await self.session.execute(stmt)
                user = result.scalar_one_or_none()
                target_name = user.username if user else "Unknown User"
            
            elif share.target_type == TargetType.GROUP:
                # Get group name
                stmt = select(Group).where(Group.id == share.target_id)
                result = await self.session.execute(stmt)
                group = result.scalar_one_or_none()
                target_name = group.name if group else "Unknown Group"
            
            elif share.target_type == TargetType.PUBLIC_LINK:
                target_name = "Public Link"
            
            access_items.append(ResourceAccessItem(
                target_type=share.target_type.value,
                target_id=share.target_id,
                target_name=target_name,
                access_level=share.access_level.value,
                access_source="share",
                expires_at=share.expires_at
            ))
        
        # TODO: Add role-based access (users/groups with RBAC permissions)
        
        return access_items
    
    async def _get_resource_name(self, resource_type: str, resource_id: str) -> str:
        """Helper to get resource name"""
        if resource_type == "file":
            stmt = select(FileNew.name).where(FileNew.id == resource_id)
            result = await self.session.execute(stmt)
            name = result.scalar_one_or_none()
            return name or "Unknown File"
        
        elif resource_type == "folder":
            stmt = select(FolderNew.name).where(FolderNew.id == resource_id)
            result = await self.session.execute(stmt)
            name = result.scalar_one_or_none()
            return name or "Unknown Folder"
        
        elif resource_type == "section":
            stmt = select(Section.name).where(Section.id == resource_id)
            result = await self.session.execute(stmt)
            name = result.scalar_one_or_none()
            return name or "Unknown Section"
        
        elif resource_type == "account":
            from app.db.tables.rbac.models import Account
            stmt = select(Account.name).where(Account.id == resource_id)
            result = await self.session.execute(stmt)
            name = result.scalar_one_or_none()
            return name or "Unknown Account"
        
        return "Unknown Resource"
