"""
JWT-based authentication system for Zero Gate ESO Platform
Complete implementation with tenant context and role-based permissions
Based on attached assets specifications
"""

import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import secrets
import asyncpg
from enum import Enum

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Security scheme
security = HTTPBearer()

# Role hierarchy for permission checking
class UserRole(str, Enum):
    VIEWER = "viewer"
    USER = "user"
    MANAGER = "manager"
    ADMIN = "admin"
    OWNER = "owner"

ROLE_HIERARCHY = {
    UserRole.VIEWER: 1,
    UserRole.USER: 2,
    UserRole.MANAGER: 3,
    UserRole.ADMIN: 4,
    UserRole.OWNER: 5
}

# Pydantic models
class TokenData(BaseModel):
    user_id: str
    email: str
    tenant_id: Optional[str] = None
    role: str
    exp: datetime
    token_type: str  # "access" or "refresh"
    iat: datetime
    permissions: List[str] = []

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    tenant_id: Optional[str] = None

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    tenant_id: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]
    tenant: Optional[Dict[str, Any]] = None

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class TenantSwitchRequest(BaseModel):
    tenant_id: str

class UserInfo(BaseModel):
    id: str
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str
    tenant_id: Optional[str]
    tenant_name: Optional[str]
    is_active: bool
    last_login: Optional[datetime]
    permissions: List[str] = []

class AuthService:
    """JWT Authentication service with tenant context"""
    
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
    
    async def get_db_connection(self):
        """Get database connection"""
        return await asyncpg.connect(self.db_url)
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    def verify_password(self, password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
    
    def create_access_token(self, data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """Create JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "token_type": "access"
        })
        
        return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    def create_refresh_token(self, data: Dict[str, Any]) -> str:
        """Create JWT refresh token"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "token_type": "refresh"
        })
        
        return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    def verify_token(self, token: str) -> TokenData:
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            
            user_id = payload.get("sub")
            email = payload.get("email")
            tenant_id = payload.get("tenant_id")
            role = payload.get("role")
            token_type = payload.get("token_type")
            exp = datetime.fromtimestamp(payload.get("exp"))
            iat = datetime.fromtimestamp(payload.get("iat"))
            permissions = payload.get("permissions", [])
            
            if user_id is None or email is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token: missing user data",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            
            return TokenData(
                user_id=user_id,
                email=email,
                tenant_id=tenant_id,
                role=role,
                token_type=token_type,
                exp=exp,
                iat=iat,
                permissions=permissions
            )
            
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token expired",
                headers={"WWW-Authenticate": "Bearer"},
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token",
                headers={"WWW-Authenticate": "Bearer"},
            )
    
    async def authenticate_user(self, email: str, password: str, tenant_id: Optional[str] = None) -> Optional[Dict[str, Any]]:
        """Authenticate user with email and password"""
        conn = await self.get_db_connection()
        
        try:
            # Get user from database
            user_query = """
                SELECT u.id, u.email, u.first_name, u.last_name, u.password_hash, u.is_active, u.last_login
                FROM users u
                WHERE u.email = $1 AND u.is_active = true
            """
            user_row = await conn.fetchrow(user_query, email)
            
            if not user_row:
                return None
            
            # Verify password
            if not self.verify_password(password, user_row['password_hash']):
                return None
            
            # Get tenant relationship if tenant_id provided
            tenant_info = None
            role = "user"  # Default role
            permissions = []
            
            if tenant_id:
                tenant_query = """
                    SELECT ut.role, ut.permissions, t.id, t.name, t.slug, t.is_active
                    FROM user_tenants ut
                    JOIN tenants t ON ut.tenant_id = t.id
                    WHERE ut.user_id = $1 AND ut.tenant_id = $2::uuid 
                    AND ut.is_active = true AND t.is_active = true
                """
                tenant_row = await conn.fetchrow(tenant_query, user_row['id'], tenant_id)
                
                if tenant_row:
                    role = tenant_row['role']
                    permissions = tenant_row['permissions'] or []
                    tenant_info = {
                        "id": str(tenant_row['id']),
                        "name": tenant_row['name'],
                        "slug": tenant_row['slug']
                    }
            else:
                # Get user's first available tenant
                first_tenant_query = """
                    SELECT ut.role, ut.permissions, t.id, t.name, t.slug, ut.tenant_id
                    FROM user_tenants ut
                    JOIN tenants t ON ut.tenant_id = t.id
                    WHERE ut.user_id = $1 AND ut.is_active = true AND t.is_active = true
                    ORDER BY ut.created_at
                    LIMIT 1
                """
                first_tenant_row = await conn.fetchrow(first_tenant_query, user_row['id'])
                
                if first_tenant_row:
                    role = first_tenant_row['role']
                    permissions = first_tenant_row['permissions'] or []
                    tenant_id = str(first_tenant_row['tenant_id'])
                    tenant_info = {
                        "id": tenant_id,
                        "name": first_tenant_row['name'],
                        "slug": first_tenant_row['slug']
                    }
            
            # Update last login
            await conn.execute(
                "UPDATE users SET last_login = $1 WHERE id = $2",
                datetime.utcnow(), user_row['id']
            )
            
            return {
                "id": user_row['id'],
                "email": user_row['email'],
                "first_name": user_row['first_name'],
                "last_name": user_row['last_name'],
                "role": role,
                "tenant_id": tenant_id,
                "tenant_info": tenant_info,
                "permissions": permissions,
                "is_active": user_row['is_active'],
                "last_login": user_row['last_login']
            }
            
        finally:
            await conn.close()
    
    async def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID with current tenant context"""
        conn = await self.get_db_connection()
        
        try:
            user_query = """
                SELECT u.id, u.email, u.first_name, u.last_name, u.is_active, u.last_login
                FROM users u
                WHERE u.id = $1 AND u.is_active = true
            """
            user_row = await conn.fetchrow(user_query, user_id)
            
            if not user_row:
                return None
            
            return {
                "id": user_row['id'],
                "email": user_row['email'],
                "first_name": user_row['first_name'],
                "last_name": user_row['last_name'],
                "is_active": user_row['is_active'],
                "last_login": user_row['last_login']
            }
            
        finally:
            await conn.close()
    
    async def get_user_tenants(self, user_id: str) -> List[Dict[str, Any]]:
        """Get all tenants accessible to user"""
        conn = await self.get_db_connection()
        
        try:
            query = """
                SELECT ut.tenant_id::text, ut.role, t.name, t.slug, t.is_active
                FROM user_tenants ut
                JOIN tenants t ON ut.tenant_id = t.id
                WHERE ut.user_id = $1 AND ut.is_active = true AND t.is_active = true
                ORDER BY t.name
            """
            rows = await conn.fetch(query, user_id)
            
            return [
                {
                    "id": row['tenant_id'],
                    "name": row['name'],
                    "slug": row['slug'],
                    "role": row['role'],
                    "is_active": row['is_active']
                }
                for row in rows
            ]
            
        finally:
            await conn.close()
    
    def has_permission(self, user_role: str, required_role: str) -> bool:
        """Check if user role has required permission level"""
        user_level = ROLE_HIERARCHY.get(user_role, 0)
        required_level = ROLE_HIERARCHY.get(required_role, 0)
        return user_level >= required_level

# Initialize auth service
auth_service = AuthService()

# Dependency functions
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    token_data = auth_service.verify_token(token)
    
    if token_data.token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return token_data

async def get_current_active_user(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Get current active user and verify account status"""
    user = await auth_service.get_user_by_id(current_user.user_id)
    
    if not user or not user.get('is_active'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    return current_user

# Role-based permission decorators
def require_role(required_role: str):
    """Decorator to require specific role level"""
    def role_checker(current_user: TokenData = Depends(get_current_active_user)) -> TokenData:
        if not auth_service.has_permission(current_user.role, required_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {required_role}, Current: {current_user.role}"
            )
        return current_user
    return role_checker

# Specific role requirements
require_viewer = require_role(UserRole.VIEWER)
require_user = require_role(UserRole.USER)
require_manager = require_role(UserRole.MANAGER)
require_admin = require_role(UserRole.ADMIN)
require_owner = require_role(UserRole.OWNER)