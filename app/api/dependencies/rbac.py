from typing import Optional, List, Set
from fastapi import Depends, HTTPException, status, Header
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.dependencies.auth_utils import get_current_user, oauth2_scheme
from app.api.dependencies.repositories import get_db
from app.core.exceptions import http_403
from app.db.tables.auth.auth import User
from app.db.tables.rbac.models import Role, Permission, Module, Account, APIKey
from app.schemas.auth.bands import TokenData
import hashlib
from datetime import datetime


class RBACService:
    """Service for RBAC permission checking"""
    
    def __init__(self, session: AsyncSession):
        self.session = session
    
    async def get_user_permissions(self, user_id: str, account_id: Optional[str] = None) -> Set[str]:
        """
        Get all permissions for a user across their roles and groups.
        Returns a set of permission strings like "files:read", "admin_users:admin"
        """
        # Get user with roles and groups
        stmt = select(User).where(User.id == user_id).options(
            selectinload(User.roles).selectinload(Role.permissions).selectinload(Permission.module),
            selectinload(User.groups).selectinload("roles").selectinload(Role.permissions).selectinload(Permission.module)
        )
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return set()
        
        # Super admin has all permissions
        if user.is_super_admin:
            return {"*:*"}  # Wildcard for all permissions
        
        permissions = set()
        
        # Get permissions from user's direct roles
        for role in user.roles:
            # Filter by account if specified
            if account_id and role.account_id and role.account_id != account_id:
                continue
            
            for perm in role.permissions:
                module_key = perm.module.key
                if perm.can_create:
                    permissions.add(f"{module_key}:create")
                if perm.can_read:
                    permissions.add(f"{module_key}:read")
                if perm.can_update:
                    permissions.add(f"{module_key}:update")
                if perm.can_delete:
                    permissions.add(f"{module_key}:delete")
                if perm.can_admin:
                    permissions.add(f"{module_key}:admin")
        
        # Get permissions from user's groups
        for group in user.groups:
            # Filter by account
            if account_id and group.account_id != account_id:
                continue
            
            for role in group.roles:
                if account_id and role.account_id and role.account_id != account_id:
                    continue
                
                for perm in role.permissions:
                    module_key = perm.module.key
                    if perm.can_create:
                        permissions.add(f"{module_key}:create")
                    if perm.can_read:
                        permissions.add(f"{module_key}:read")
                    if perm.can_update:
                        permissions.add(f"{module_key}:update")
                    if perm.can_delete:
                        permissions.add(f"{module_key}:delete")
                    if perm.can_admin:
                        permissions.add(f"{module_key}:admin")
        
        return permissions
    
    async def check_permission(self, user_id: str, module_key: str, action: str, account_id: Optional[str] = None) -> bool:
        """Check if user has specific permission"""
        permissions = await self.get_user_permissions(user_id, account_id)
        
        # Check for wildcard (super admin)
        if "*:*" in permissions:
            return True
        
        # Check for specific permission
        required_perm = f"{module_key}:{action}"
        if required_perm in permissions:
            return True
        
        # Check for admin permission on module (admin implies all actions)
        admin_perm = f"{module_key}:admin"
        if admin_perm in permissions:
            return True
        
        return False
    
    async def get_user_accounts(self, user_id: str) -> List[Account]:
        """Get all accounts a user belongs to"""
        stmt = select(User).where(User.id == user_id).options(selectinload(User.accounts))
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user:
            return []
        
        return user.accounts
    
    async def is_account_admin(self, user_id: str, account_id: str) -> bool:
        """Check if user is admin or owner of an account"""
        # Super admin is admin of all accounts
        stmt = select(User).where(User.id == user_id)
        result = await self.session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if user and user.is_super_admin:
            return True
        
        # Check account_users table for role_type
        from sqlalchemy import text as sql_text
        query = sql_text("""
            SELECT role_type FROM account_users 
            WHERE user_id = :user_id AND account_id = :account_id
        """)
        result = await self.session.execute(query, {"user_id": user_id, "account_id": account_id})
        row = result.fetchone()
        
        if row and row[0] in ["owner", "admin"]:
            return True
        
        return False


async def get_rbac_service(session: AsyncSession = Depends(get_db)) -> RBACService:
    """Dependency to get RBAC service"""
    return RBACService(session)


async def get_current_active_user(
    token_data: TokenData = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> User:
    """Get current active user from token"""
    stmt = select(User).where(User.id == token_data.id)
    result = await self.session.execute(stmt)
    user = result.scalar_one_or_none()
    
    if not user:
        raise http_403(msg="User not found")
    
    if not user.is_active:
        raise http_403(msg="User account is inactive")
    
    return user


def require_permission(module_key: str, action: str):
    """
    Dependency factory to require specific permission.
    Usage: @router.get("/files", dependencies=[Depends(require_permission("files", "read"))])
    """
    async def permission_checker(
        current_user: TokenData = Depends(get_current_user),
        rbac_service: RBACService = Depends(get_rbac_service),
        x_account_id: Optional[str] = Header(None)
    ):
        has_permission = await rbac_service.check_permission(
            current_user.id, 
            module_key, 
            action,
            x_account_id
        )
        
        if not has_permission:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {module_key}:{action}"
            )
        
        return current_user
    
    return permission_checker


def require_super_admin():
    """Dependency to require super admin access"""
    async def super_admin_checker(
        current_user: TokenData = Depends(get_current_user),
        session: AsyncSession = Depends(get_db)
    ):
        stmt = select(User).where(User.id == current_user.id)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user or not user.is_super_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Super admin access required"
            )
        
        return user
    
    return super_admin_checker


def require_account_admin(account_id: Optional[str] = None):
    """Dependency to require account admin access"""
    async def account_admin_checker(
        current_user: TokenData = Depends(get_current_user),
        rbac_service: RBACService = Depends(get_rbac_service),
        x_account_id: Optional[str] = Header(None)
    ):
        check_account_id = account_id or x_account_id
        
        if not check_account_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Account ID required"
            )
        
        is_admin = await rbac_service.is_account_admin(current_user.id, check_account_id)
        
        if not is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account admin access required"
            )
        
        return current_user
    
    return account_admin_checker


async def verify_api_key(
    x_api_key: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_db)
) -> Optional[APIKey]:
    """Verify API key from header"""
    if not x_api_key:
        return None
    
    # Hash the provided key
    key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()
    
    # Find API key
    stmt = select(APIKey).where(
        APIKey.token_hash == key_hash,
        APIKey.is_active == True
    )
    result = await session.execute(stmt)
    api_key = result.scalar_one_or_none()
    
    if not api_key:
        return None
    
    # Check expiration
    if api_key.expires_at and api_key.expires_at < datetime.utcnow():
        return None
    
    # Update last used
    api_key.last_used_at = datetime.utcnow()
    await session.commit()
    
    return api_key


async def get_current_user_or_api_key(
    token: Optional[str] = Depends(oauth2_scheme),
    api_key: Optional[APIKey] = Depends(verify_api_key),
    session: AsyncSession = Depends(get_db)
):
    """Get current user from JWT token or API key"""
    if api_key:
        # Return API key context
        return {"type": "api_key", "api_key": api_key, "account_id": api_key.account_id}
    
    if token:
        # Use existing JWT validation
        from app.api.dependencies.auth_utils import verify_access_token
        from app.core.exceptions import http_401
        
        credentials_exception = http_401(
            msg="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"}
        )
        token_data = verify_access_token(token, credentials_exception)
        
        # Get user
        stmt = select(User).where(User.id == token_data.id)
        result = await session.execute(stmt)
        user = result.scalar_one_or_none()
        
        if not user or not user.is_active:
            raise credentials_exception
        
        return {"type": "user", "user": user, "user_id": user.id}
    
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication required"
    )
