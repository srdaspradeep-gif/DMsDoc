from typing import List, Optional
from sqlalchemy import select, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.db.tables.dms.audit import AuditLog
from app.schemas.dms.sharing_schemas import AuditLogQuery


class AuditRepository:
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def log_action(
        self,
        account_id: str,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        api_key_id: Optional[str] = None,
        metadata: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AuditLog:
        """Log an action to the audit trail"""
        log = AuditLog(
            account_id=account_id,
            user_id=user_id,
            api_key_id=api_key_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            metadata=metadata,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.session.add(log)
        await self.session.commit()
        await self.session.refresh(log)
        return log
    
    async def query_logs(
        self,
        account_id: str,
        query: AuditLogQuery
    ) -> List[AuditLog]:
        """Query audit logs with filters"""
        stmt = select(AuditLog).where(AuditLog.account_id == account_id)
        
        # Apply filters
        if query.start_date:
            stmt = stmt.where(AuditLog.created_at >= query.start_date)
        if query.end_date:
            stmt = stmt.where(AuditLog.created_at <= query.end_date)
        if query.user_id:
            stmt = stmt.where(AuditLog.user_id == query.user_id)
        if query.action:
            stmt = stmt.where(AuditLog.action == query.action)
        if query.resource_type:
            stmt = stmt.where(AuditLog.resource_type == query.resource_type)
        if query.resource_id:
            stmt = stmt.where(AuditLog.resource_id == query.resource_id)
        
        # Order and paginate
        stmt = stmt.order_by(AuditLog.created_at.desc())
        stmt = stmt.offset(query.skip).limit(query.limit)
        
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def get_resource_history(
        self,
        account_id: str,
        resource_type: str,
        resource_id: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[AuditLog]:
        """Get audit history for a specific resource"""
        stmt = select(AuditLog).where(
            and_(
                AuditLog.account_id == account_id,
                AuditLog.resource_type == resource_type,
                AuditLog.resource_id == resource_id
            )
        ).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def get_user_activity(
        self,
        account_id: str,
        user_id: str,
        skip: int = 0,
        limit: int = 50
    ) -> List[AuditLog]:
        """Get audit history for a specific user"""
        stmt = select(AuditLog).where(
            and_(
                AuditLog.account_id == account_id,
                AuditLog.user_id == user_id
            )
        ).order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        
        result = await self.session.execute(stmt)
        return result.scalars().all()
    
    async def get_action_count(
        self,
        account_id: str,
        action: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> int:
        """Count occurrences of a specific action"""
        from sqlalchemy import func
        
        stmt = select(func.count(AuditLog.id)).where(
            and_(
                AuditLog.account_id == account_id,
                AuditLog.action == action
            )
        )
        
        if start_date:
            stmt = stmt.where(AuditLog.created_at >= start_date)
        if end_date:
            stmt = stmt.where(AuditLog.created_at <= end_date)
        
        result = await self.session.execute(stmt)
        return result.scalar_one()
