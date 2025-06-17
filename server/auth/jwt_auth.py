"""
JWT-based authentication system for Zero Gate ESO Platform
Implements token-based auth with tenant context and role-based permissions
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
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

# JWT Configuration
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", secrets.token_urlsafe(32))
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30
REFRESH_TOKEN_EXPIRE_DAYS = 7
RESET_TOKEN_EXPIRE_HOURS = 24

# Security scheme
security = HTTPBearer()

# Role hierarchy for permission checking
ROLE_HIERARCHY = {
    "viewer": 1,
    "user": 2, 
    "manager": 3,
    "admin": 4
}

class UserRole:
    VIEWER = "viewer"
    USER = "user"
    MANAGER = "manager" 
    ADMIN = "admin"

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
    """JWT Authentication Service with tenant context"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(
            plain_password.encode('utf-8'), 
            hashed_password.encode('utf-8')
        )
    
    @staticmethod
    def create_access_token(
        user_id: str, 
        email: str, 
        tenant_id: str, 
        role: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create JWT access token"""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
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
    def create_refresh_token(
        user_id: str,
        email: str,
        tenant_id: str,
        role: str
    ) -> str:
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
        expire = datetime.utcnow() + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)
        
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
            
            # Validate required fields
            required_fields = ["user_id", "email", "exp", "token_type"]
            for field in required_fields:
                if field not in payload:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid token format"
                    )
            
            # Check expiration
            exp_timestamp = payload["exp"]
            if datetime.utcnow().timestamp() > exp_timestamp:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token has expired"
                )
            
            return TokenData(
                user_id=payload["user_id"],
                email=payload["email"],
                tenant_id=payload.get("tenant_id"),
                role=payload.get("role"),
                exp=datetime.fromtimestamp(exp_timestamp),
                token_type=payload["token_type"]
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
        """Send password reset email"""
        smtp_server = os.getenv("SMTP_SERVER", "localhost")
        smtp_port = int(os.getenv("SMTP_PORT", "587"))
        smtp_username = os.getenv("SMTP_USERNAME")
        smtp_password = os.getenv("SMTP_PASSWORD")
        from_email = os.getenv("FROM_EMAIL", "noreply@zerogateeso.com")
        
        if not all([smtp_username, smtp_password]):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Email service not configured"
            )
        
        # Create reset URL
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5000")
        reset_url = f"{frontend_url}/reset-password?token={reset_token}"
        
        # Email content
        subject = "Password Reset - Zero Gate ESO Platform"
        html_content = f"""
        <html>
        <body>
            <h2>Password Reset Request</h2>
            <p>You have requested to reset your password for Zero Gate ESO Platform.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="{reset_url}">Reset Password</a></p>
            <p>This link will expire in {RESET_TOKEN_EXPIRE_HOURS} hours.</p>
            <p>If you didn't request this reset, please ignore this email.</p>
        </body>
        </html>
        """
        
        # Create message
        message = MimeMultipart("alternative")
        message["Subject"] = subject
        message["From"] = from_email
        message["To"] = email
        
        html_part = MimeText(html_content, "html")
        message.attach(html_part)
        
        # Send email
        try:
            with smtplib.SMTP(smtp_server, smtp_port) as server:
                server.starttls()
                server.login(smtp_username, smtp_password)
                server.send_message(message)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send email: {str(e)}"
            )

class PermissionChecker:
    """Role-based permission checking"""
    
    @staticmethod
    def check_role_permission(user_role: str, required_role: str) -> bool:
        """Check if user role meets minimum required role"""
        user_level = ROLE_HIERARCHY.get(user_role, 0)
        required_level = ROLE_HIERARCHY.get(required_role, 999)
        return user_level >= required_level
    
    @staticmethod
    def require_role(required_role: str):
        """Decorator to require minimum role level"""
        def decorator(current_user: TokenData):
            if not PermissionChecker.check_role_permission(current_user.role, required_role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Insufficient permissions. {required_role} role required"
                )
            return current_user
        return decorator
    
    @staticmethod
    def require_tenant_access(tenant_id: str):
        """Decorator to require access to specific tenant"""
        def decorator(current_user: TokenData):
            if current_user.tenant_id != tenant_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to this tenant"
                )
            return current_user
        return decorator

# Dependency functions for FastAPI
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> TokenData:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    token_data = AuthService.decode_token(token)
    
    # Validate token type
    if token_data.token_type != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type"
        )
    
    return token_data

async def get_current_active_user(current_user: TokenData = Depends(get_current_user)) -> TokenData:
    """Get current active user (can be extended with user status checks)"""
    # Here you could add additional checks like user.is_active
    return current_user

# Role-based dependencies
async def require_viewer(current_user: TokenData = Depends(get_current_active_user)) -> TokenData:
    return PermissionChecker.require_role(UserRole.VIEWER)(current_user)

async def require_user(current_user: TokenData = Depends(get_current_active_user)) -> TokenData:
    return PermissionChecker.require_role(UserRole.USER)(current_user)

async def require_manager(current_user: TokenData = Depends(get_current_active_user)) -> TokenData:
    return PermissionChecker.require_role(UserRole.MANAGER)(current_user)

async def require_admin(current_user: TokenData = Depends(get_current_active_user)) -> TokenData:
    return PermissionChecker.require_role(UserRole.ADMIN)(current_user)