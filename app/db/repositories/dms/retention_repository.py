from typing import List, Optional
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta

from app.core.exceptions import http_400, http_404
from app.db.tables.dms.retention import RetentionPolicy, RetentionMode
from app.db.tables.dms.files import FileNew
from app.db.tables.dms.folders_new import FolderNew
from app.schemas.dms.sharing_schemas import RetentionPolicyCreate, RetentionPolicyUpdate


class RetentionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def create_policy(self, data: RetentionPolicyCreate, created_by: str) -> RetentionPolicy:
        """Create a retention policy"""
        # Check if policy already exists for this folder
        stmt = select(RetentionPolicy).where(
            and_(
                RetentionPolicy.folder_id == data.folder_id,
                RetentionPolicy.account_id == data.account_id
            )
        )
        result = await self.session.execute(stmt)
        if result.scalar_one_or_none():
            raise http_400(msg="Retention policy already exists for this folder")
        
        policy_data = data.model_dump()
        policy_data["created_by"] = created_by
        
        policy = RetentionPolicy(**policy_data)
        self.session.add(policy)
        await self.session.commit()
        await self.session.refresh(policy)
        return policy
    
    async def get_policy(self, policy_id: str) -> Optional[RetentionPolicy]:
        """Get policy by ID"""
        stmt = select(RetentionPolicy).where(RetentionPolicy.id == policy_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def get_policy_by_folder(self, folder_id: str) -> Optional[RetentionPolicy]:
        """Get policy for a specific folder"""
        stmt = select(RetentionPolicy).where(RetentionPolicy.folder_id == folder_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
    
    async def list_policies(
        self,
        account_id: str,
        skip: int = 0,
        limit: int = 100
    ) -> List[RetentionPolicy]:
        """List all retention policies for an account"""
        stmt = select(RetentionPolicy).where(
            RetentionPolicy.account_id == account_id
        ).offset(skip).limit(limit).order_by(RetentionPolicy.created_at.desc())
        
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def update_policy(self, policy_id: str, data: RetentionPolicyUpdate) -> RetentionPolicy:
        """Update a retention policy"""
        policy = await self.get_policy(policy_id)
        if not policy:
            raise http_404(msg="Retention policy not found")
        
        for key, value in data.model_dump(exclude_unset=True).items():
            setattr(policy, key, value)
        
        await self.session.commit()
        await self.session.refresh(policy)
        return policy
    
    async def delete_policy(self, policy_id: str):
        """Delete a retention policy"""
        policy = await self.get_policy(policy_id)
        if not policy:
            raise http_404(msg="Retention policy not found")
        
        await self.session.delete(policy)
        await self.session.commit()
    
    async def apply_retention_policies(self, account_id: str) -> dict:
        """Apply all retention policies for an account"""
        # Get all policies for the account
        policies = await self.list_policies(account_id, limit=1000)
        
        moved_count = 0
        deleted_count = 0
        
        for policy in policies:
            cutoff_date = datetime.utcnow() - timedelta(days=policy.retention_days)
            
            # Get files in the folder that are older than retention period
            stmt = select(FileNew).where(
                and_(
                    FileNew.folder_id == policy.folder_id,
                    FileNew.created_at < cutoff_date,
                    FileNew.is_deleted == False
                )
            )
            result = await self.session.execute(stmt)
            files = result.scalars().all()
            
            for file in files:
                if policy.mode == RetentionMode.MOVE_TO_RECYCLE:
                    # Soft delete
                    file.is_deleted = True
                    file.deleted_at = datetime.utcnow()
                    moved_count += 1
                elif policy.mode == RetentionMode.DELETE:
                    # Hard delete
                    await self.session.delete(file)
                    deleted_count += 1
            
            # If apply_to_subfolders, handle subfolders recursively
            if policy.apply_to_subfolders:
                # Get all subfolders
                stmt = select(FolderNew).where(
                    and_(
                        FolderNew.parent_id == policy.folder_id,
                        FolderNew.is_deleted == False
                    )
                )
                result = await self.session.execute(stmt)
                subfolders = result.scalars().all()
                
                for subfolder in subfolders:
                    # Apply policy to subfolder files
                    stmt = select(FileNew).where(
                        and_(
                            FileNew.folder_id == subfolder.id,
                            FileNew.created_at < cutoff_date,
                            FileNew.is_deleted == False
                        )
                    )
                    result = await self.session.execute(stmt)
                    subfolder_files = result.scalars().all()
                    
                    for file in subfolder_files:
                        if policy.mode == RetentionMode.MOVE_TO_RECYCLE:
                            file.is_deleted = True
                            file.deleted_at = datetime.utcnow()
                            moved_count += 1
                        elif policy.mode == RetentionMode.DELETE:
                            await self.session.delete(file)
                            deleted_count += 1
        
        await self.session.commit()
        
        return {
            "moved_to_recycle": moved_count,
            "permanently_deleted": deleted_count,
            "policies_applied": len(policies)
        }
