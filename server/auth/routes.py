"""
FastAPI authentication routes with JWT and tenant context
Provides login, logout, token refresh, and password reset endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import HTTPAuthorizationCredentials
from typing import Dict, Any
import asyncpg
import os
from datetime import timedelta

from .jwt_auth import (
    AuthService, 
    TokenData, 
    LoginRequest, 
    LoginResponse,
    RefreshTokenRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    ChangePasswordRequest,
    get_current_user,
    get_current_active_user,
    require_admin,
    require_manager,
    require_user,
    require_viewer,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

# Create router
auth_router = APIRouter(prefix="/auth", tags=["authentication"])

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL")

async def get_db_connection():
    """Get database connection"""
    return await asyncpg.connect(DATABASE_URL)

async def get_user_by_email(email: str) -> Dict[str, Any]:
    """Get user by email from database"""
    conn = await get_db_connection()
    try:
        query = """
        SELECT u.*, ut.tenant_id, ut.role, t.name as tenant_name
        FROM users u
        LEFT JOIN user_tenants ut ON u.id = ut.user_id
        LEFT JOIN tenants t ON ut.tenant_id = t.id::text
        WHERE u.email = $1
        """
        row = await conn.fetchrow(query, email)
        if row:
            return dict(row)
        return None
    finally:
        await conn.close()

async def get_user_by_id(user_id: str) -> Dict[str, Any]:
    """Get user by ID from database"""
    conn = await get_db_connection()
    try:
        query = """
        SELECT u.*, ut.tenant_id, ut.role, t.name as tenant_name
        FROM users u
        LEFT JOIN user_tenants ut ON u.id = ut.user_id
        LEFT JOIN tenants t ON ut.tenant_id = t.id::text
        WHERE u.id = $1
        """
        row = await conn.fetchrow(query, user_id)
        if row:
            return dict(row)
        return None
    finally:
        await conn.close()

async def create_user_account(email: str, password: str, first_name: str = None, last_name: str = None) -> str:
    """Create new user account"""
    conn = await get_db_connection()
    try:
        hashed_password = AuthService.hash_password(password)
        
        # Generate user ID (you might want to use UUID)
        import uuid
        user_id = str(uuid.uuid4())
        
        query = """
        INSERT INTO users (id, email, first_name, last_name, password_hash)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
        """
        result = await conn.fetchval(query, user_id, email, first_name, last_name, hashed_password)
        return result
    finally:
        await conn.close()

async def update_user_password(user_id: str, new_password: str):
    """Update user password"""
    conn = await get_db_connection()
    try:
        hashed_password = AuthService.hash_password(new_password)
        query = "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2"
        await conn.execute(query, hashed_password, user_id)
    finally:
        await conn.close()

@auth_router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """Authenticate user and return JWT tokens"""
    user = await get_user_by_email(login_data.email)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Verify password
    if not AuthService.verify_password(login_data.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user has tenant access
    if not user.get("tenant_id"):
        # Create default tenant for user if none exists
        conn = await get_db_connection()
        try:
            tenant_query = "SELECT create_default_tenant_for_user($1, $2)"
            tenant_id = await conn.fetchval(tenant_query, user["id"], user["email"])
            user["tenant_id"] = tenant_id
            user["role"] = "admin"
            user["tenant_name"] = "Personal Workspace"
        finally:
            await conn.close()
    
    # Handle specific tenant selection
    if login_data.tenant_id and login_data.tenant_id != user["tenant_id"]:
        # Verify user has access to requested tenant
        conn = await get_db_connection()
        try:
            tenant_check = """
            SELECT ut.role, t.name
            FROM user_tenants ut
            JOIN tenants t ON ut.tenant_id = t.id::text
            WHERE ut.user_id = $1 AND ut.tenant_id = $2
            """
            tenant_access = await conn.fetchrow(tenant_check, user["id"], login_data.tenant_id)
            if tenant_access:
                user["tenant_id"] = login_data.tenant_id
                user["role"] = tenant_access["role"]
                user["tenant_name"] = tenant_access["name"]
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied to requested tenant"
                )
        finally:
            await conn.close()
    
    # Create tokens
    access_token = AuthService.create_access_token(
        user_id=user["id"],
        email=user["email"],
        tenant_id=user["tenant_id"],
        role=user["role"]
    )
    
    refresh_token = AuthService.create_refresh_token(
        user_id=user["id"],
        email=user["email"],
        tenant_id=user["tenant_id"],
        role=user["role"]
    )
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user={
            "id": user["id"],
            "email": user["email"],
            "first_name": user.get("first_name"),
            "last_name": user.get("last_name"),
            "role": user["role"]
        },
        tenant={
            "id": user["tenant_id"],
            "name": user["tenant_name"]
        }
    )

@auth_router.post("/refresh")
async def refresh_token(refresh_data: RefreshTokenRequest):
    """Refresh access token using refresh token"""
    try:
        token_data = AuthService.decode_token(refresh_data.refresh_token)
        
        if token_data.token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Verify user still exists and has access
        user = await get_user_by_id(token_data.user_id)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        
        # Create new access token
        new_access_token = AuthService.create_access_token(
            user_id=token_data.user_id,
            email=token_data.email,
            tenant_id=token_data.tenant_id,
            role=token_data.role
        )
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@auth_router.post("/logout")
async def logout(current_user: TokenData = Depends(get_current_user)):
    """Logout user (client should discard tokens)"""
    # In a production system, you might want to maintain a token blacklist
    # For now, we rely on client-side token removal
    return {"message": "Successfully logged out"}

@auth_router.post("/password-reset/request")
async def request_password_reset(
    reset_data: PasswordResetRequest,
    background_tasks: BackgroundTasks
):
    """Request password reset email"""
    user = await get_user_by_email(reset_data.email)
    
    # Always return success to prevent email enumeration
    if user:
        reset_token = AuthService.create_reset_token(user["id"], user["email"])
        background_tasks.add_task(AuthService.send_reset_email, reset_data.email, reset_token)
    
    return {"message": "If the email exists, a reset link has been sent"}

@auth_router.post("/password-reset/confirm")
async def confirm_password_reset(reset_data: PasswordResetConfirm):
    """Confirm password reset with token"""
    try:
        token_data = AuthService.decode_token(reset_data.token)
        
        if token_data.token_type != "reset":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid reset token"
            )
        
        # Update password
        await update_user_password(token_data.user_id, reset_data.new_password)
        
        return {"message": "Password successfully reset"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )

@auth_router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: TokenData = Depends(get_current_user)
):
    """Change user password (requires current password)"""
    user = await get_user_by_id(current_user.user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify current password
    if not AuthService.verify_password(password_data.current_password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )
    
    # Update password
    await update_user_password(current_user.user_id, password_data.new_password)
    
    return {"message": "Password successfully changed"}

@auth_router.get("/me")
async def get_current_user_info(current_user: TokenData = Depends(get_current_user)):
    """Get current user information"""
    user = await get_user_by_id(current_user.user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {
        "id": user["id"],
        "email": user["email"],
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "role": current_user.role,
        "tenant": {
            "id": current_user.tenant_id,
            "name": user.get("tenant_name")
        }
    }

# Role-based test endpoints
@auth_router.get("/test/viewer")
async def test_viewer_access(current_user: TokenData = Depends(require_viewer)):
    """Test endpoint requiring viewer role or higher"""
    return {"message": f"Viewer access granted to {current_user.email}"}

@auth_router.get("/test/user")
async def test_user_access(current_user: TokenData = Depends(require_user)):
    """Test endpoint requiring user role or higher"""
    return {"message": f"User access granted to {current_user.email}"}

@auth_router.get("/test/manager")
async def test_manager_access(current_user: TokenData = Depends(require_manager)):
    """Test endpoint requiring manager role or higher"""
    return {"message": f"Manager access granted to {current_user.email}"}

@auth_router.get("/test/admin")
async def test_admin_access(current_user: TokenData = Depends(require_admin)):
    """Test endpoint requiring admin role"""
    return {"message": f"Admin access granted to {current_user.email}"}