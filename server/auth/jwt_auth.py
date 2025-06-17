"""
JWT-based authentication system for Zero Gate ESO Platform
Simplified implementation with proper type handling
"""

import os
import jwt
import bcrypt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from fastapi import HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
import secrets

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Security scheme
security = HTTPBearer()

# Role hierarchy for permission checking
ROLE_HIERARCHY = {
    "viewer": 1,
    "user": 2, 
    "manager": 3,
    "admin": 4
}

class TokenData(BaseModel):
    user_id: str
    email: str
    tenant_id: str
    role: str
    exp: datetime
    token_type: str  # "access" or "refresh"

class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    tenant_id: Optional[str] = None

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: Dict[str, Any]
    tenant: Dict[str, Any]

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

class AuthService:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')
    
    @staticmethod
    def verify_password(password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        try:
            return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))
        except Exception:
            return False
    
    @staticmethod
    def create_access_token(user_id: str, email: str, tenant_id: str, role: str) -> str:
        """Create JWT access token"""
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        payload = {
            "user_id": user_id,
            "email": email,
            "tenant_id": tenant_id,
            "role": role,
            "exp": expire,
            "iat": datetime.utcnow(),
            "token_type": "access"
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def create_refresh_token(user_id: str, email: str, tenant_id: str, role: str) -> str:
        """Create JWT refresh token"""
        expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
        payload = {
            "user_id": user_id,
            "email": email,
            "tenant_id": tenant_id,
            "role": role,
            "exp": expire,
            "iat": datetime.utcnow(),
            "token_type": "refresh"
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def create_reset_token(user_id: str, email: str) -> str:
        """Create password reset token"""
        expire = datetime.utcnow() + timedelta(hours=24)
        payload = {
            "user_id": user_id,
            "email": email,
            "exp": expire,
            "iat": datetime.utcnow(),
            "token_type": "reset"
        }
        return jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
    
    @staticmethod
    def decode_token(token: str) -> TokenData:
        """Decode and validate JWT token"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return TokenData(
                user_id=payload["user_id"],
                email=payload["email"],
                tenant_id=payload.get("tenant_id", ""),
                role=payload.get("role", "viewer"),
                exp=datetime.fromtimestamp(payload["exp"]),
                token_type=payload.get("token_type", "access")
            )
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token has expired"
            )
        except jwt.InvalidTokenError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    @staticmethod
    def send_reset_email(email: str, reset_token: str):
        """Send password reset email (simplified implementation)"""
        # In production, implement proper email sending
        print(f"Password reset email for {email} with token: {reset_token[:20]}...")
        pass

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """Get current user from JWT token"""
    token = credentials.credentials
    token_data = AuthService.decode_token(token)
    
    if token_data.token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    return token_data

def get_current_active_user(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Get current active user"""
    return current_user

def check_role_permission(required_role: str):
    """Check if user has required role or higher"""
    def role_checker(current_user: TokenData = Depends(get_current_user)) -> TokenData:
        user_role_level = ROLE_HIERARCHY.get(current_user.role, 0)
        required_role_level = ROLE_HIERARCHY.get(required_role, 5)
        
        if user_role_level < required_role_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required: {required_role}"
            )
        
        return current_user
    
    return role_checker

# Role-based permission dependencies
require_viewer = check_role_permission("viewer")
require_user = check_role_permission("user")
require_manager = check_role_permission("manager")
require_admin = check_role_permission("admin")