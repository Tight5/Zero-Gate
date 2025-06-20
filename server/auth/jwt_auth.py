"""
JWT Authentication module for Zero Gate ESO Platform
Handles token validation, role-based access control, and tenant context
"""
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
import bcrypt
from passlib.context import CryptContext

logger = logging.getLogger("zero-gate.jwt-auth")

# JWT Configuration
JWT_SECRET_KEY = "zero-gate-jwt-secret-key-2025"  # In production, use environment variable
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

class UserClaims:
    """User claims extracted from JWT token"""
    def __init__(self, user_id: str, email: str, tenant_id: str, role: str):
        self.user_id = user_id
        self.email = email
        self.tenant_id = tenant_id
        self.role = role

def create_access_token(user_id: str, email: str, tenant_id: str, role: str) -> str:
    """Create JWT access token"""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "sub": user_id,
        "email": email,
        "tenant_id": tenant_id,
        "role": role,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "access"
    }
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str, email: str) -> str:
    """Create JWT refresh token"""
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh"
    }
    return jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)

def verify_token(token: str) -> Dict[str, Any]:
    """Verify and decode JWT token"""
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        
        # Check if token is expired
        if datetime.utcnow() > datetime.fromtimestamp(payload.get("exp", 0)):
            raise HTTPException(status_code=401, detail="Token expired")
        
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> UserClaims:
    """Extract current user from JWT token"""
    try:
        token = credentials.credentials
        payload = verify_token(token)
        
        # Ensure it's an access token
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        
        user_id = payload.get("sub")
        email = payload.get("email")
        tenant_id = payload.get("tenant_id")
        role = payload.get("role")
        
        if not all([user_id, email, tenant_id, role]):
            raise HTTPException(status_code=401, detail="Invalid token payload")
        
        return UserClaims(
            user_id=str(user_id) if user_id is not None else "", 
            email=str(email) if email is not None else "", 
            tenant_id=str(tenant_id) if tenant_id is not None else "", 
            role=str(role) if role is not None else ""
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error extracting user from token: {str(e)}")
        raise HTTPException(status_code=401, detail="Authentication failed")

async def require_auth(current_user: UserClaims = Depends(get_current_user)) -> UserClaims:
    """Require authenticated user"""
    return current_user

def require_role(required_role: str):
    """Require specific role or higher"""
    
    # Role hierarchy: viewer < user < manager < admin < owner
    role_hierarchy = {
        "viewer": 1,
        "user": 2,
        "manager": 3,
        "admin": 4,
        "owner": 5
    }
    
    async def role_checker(current_user: UserClaims = Depends(get_current_user)) -> UserClaims:
        user_role_level = role_hierarchy.get(current_user.role, 0)
        required_role_level = role_hierarchy.get(required_role, 99)
        
        if user_role_level < required_role_level:
            raise HTTPException(
                status_code=403, 
                detail=f"Insufficient permissions. Required: {required_role}, Current: {current_user.role}"
            )
        
        return current_user
    
    return role_checker

def get_current_user_tenant(current_user: UserClaims) -> str:
    """Extract tenant ID from current user"""
    return current_user.tenant_id

def require_tenant_access(tenant_id: str):
    """Require access to specific tenant"""
    
    async def tenant_checker(current_user: UserClaims = Depends(get_current_user)) -> UserClaims:
        if current_user.tenant_id != tenant_id:
            raise HTTPException(
                status_code=403,
                detail="Access denied: Tenant mismatch"
            )
        
        return current_user
    
    return tenant_checker

# Development bypass for testing
def create_dev_user_claims(user_id: str = "dev-user", email: str = "dev@nasdaq-center.org", 
                          tenant_id: str = "nasdaq-center", role: str = "admin") -> UserClaims:
    """Create development user claims for testing"""
    return UserClaims(user_id, email, tenant_id, role)

# Mock authentication for development
async def get_dev_user() -> UserClaims:
    """Get development user for testing"""
    return create_dev_user_claims()

# Export authentication functions
__all__ = [
    "create_access_token",
    "create_refresh_token", 
    "verify_token",
    "hash_password",
    "verify_password",
    "get_current_user",
    "require_auth",
    "require_role",
    "get_current_user_tenant",
    "require_tenant_access",
    "UserClaims"
]