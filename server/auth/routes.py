"""
FastAPI authentication routes with JWT and tenant context
Complete implementation with login, logout, token refresh, and password reset endpoints
Based on attached assets specifications for Zero Gate ESO Platform
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Request
from fastapi.security import HTTPAuthorizationCredentials
from typing import Dict, Any, Optional, List
import asyncpg
import os
from datetime import timedelta, datetime
import secrets
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

from .jwt_auth import (
    AuthService, 
    TokenData, 
    LoginRequest,
    RegisterRequest,
    LoginResponse,
    RefreshTokenRequest,
    PasswordResetRequest,
    PasswordResetConfirm,
    ChangePasswordRequest,
    TenantSwitchRequest,
    UserInfo,
    get_current_user,
    get_current_active_user,
    require_admin,
    require_manager,
    require_user,
    require_viewer,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    auth_service
)

# Create router
auth_router = APIRouter(prefix="/auth", tags=["authentication"])

# Password reset token storage (in production, use Redis or database)
password_reset_tokens = {}

async def send_password_reset_email(email: str, reset_token: str):
    """Send password reset email (mock implementation)"""
    # In production, implement actual email sending
    print(f"Password reset token for {email}: {reset_token}")
    print(f"Reset URL: http://localhost:8000/auth/reset-password?token={reset_token}")

@auth_router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest):
    """
    Authenticate user and return JWT tokens with tenant context
    """
    user = await auth_service.authenticate_user(
        email=login_data.email,
        password=login_data.password,
        tenant_id=login_data.tenant_id
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Create token data
    token_data = {
        "sub": user["id"],
        "email": user["email"],
        "tenant_id": user["tenant_id"],
        "role": user["role"],
        "permissions": user["permissions"]
    }
    
    # Generate tokens
    access_token = auth_service.create_access_token(token_data)
    refresh_token = auth_service.create_refresh_token(token_data)
    
    # Prepare user info (excluding sensitive data)
    user_info = {
        "id": user["id"],
        "email": user["email"],
        "first_name": user["first_name"],
        "last_name": user["last_name"],
        "role": user["role"],
        "tenant_id": user["tenant_id"],
        "permissions": user["permissions"],
        "last_login": user["last_login"].isoformat() if user["last_login"] else None
    }
    
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=user_info,
        tenant=user["tenant_info"]
    )

@auth_router.post("/register")
async def register(register_data: RegisterRequest):
    """
    Register new user account
    """
    conn = await auth_service.get_db_connection()
    
    try:
        # Check if user already exists
        existing_user = await conn.fetchrow(
            "SELECT id FROM users WHERE email = $1",
            register_data.email
        )
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Hash password
        hashed_password = auth_service.hash_password(register_data.password)
        
        # Create user
        user_id = await conn.fetchval("""
            INSERT INTO users (id, email, first_name, last_name, password_hash, is_active, created_at)
            VALUES ($1, $2, $3, $4, $5, true, $6)
            RETURNING id
        """, 
        secrets.token_urlsafe(16),
        register_data.email,
        register_data.first_name,
        register_data.last_name,
        hashed_password,
        datetime.utcnow()
        )
        
        # If tenant_id provided, add user to tenant
        if register_data.tenant_id:
            # Verify tenant exists
            tenant = await conn.fetchrow(
                "SELECT id FROM tenants WHERE id = $1::uuid AND is_active = true",
                register_data.tenant_id
            )
            
            if tenant:
                await conn.execute("""
                    INSERT INTO user_tenants (id, user_id, tenant_id, role, is_active, joined_at, created_at)
                    VALUES ($1, $2, $3::uuid, $4, true, $5, $6)
                """,
                secrets.token_urlsafe(16),
                user_id,
                register_data.tenant_id,
                "user",  # Default role
                datetime.utcnow(),
                datetime.utcnow()
                )
        
        return {
            "message": "User registered successfully",
            "user_id": user_id,
            "email": register_data.email
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {str(e)}"
        )
    finally:
        await conn.close()

@auth_router.post("/refresh")
async def refresh_token(refresh_data: RefreshTokenRequest):
    """
    Refresh JWT access token using refresh token
    """
    try:
        # Verify refresh token
        token_data = auth_service.verify_token(refresh_data.refresh_token)
        
        if token_data.token_type != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type"
            )
        
        # Verify user still exists and is active
        user = await auth_service.get_user_by_id(token_data.user_id)
        if not user or not user.get('is_active'):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or inactive"
            )
        
        # Create new access token with same data
        new_token_data = {
            "sub": token_data.user_id,
            "email": token_data.email,
            "tenant_id": token_data.tenant_id,
            "role": token_data.role,
            "permissions": token_data.permissions
        }
        
        new_access_token = auth_service.create_access_token(new_token_data)
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

@auth_router.post("/logout")
async def logout(current_user: TokenData = Depends(get_current_active_user)):
    """
    Logout user (token invalidation would be handled by token blacklist in production)
    """
    return {
        "message": "Logged out successfully",
        "user_id": current_user.user_id
    }

@auth_router.get("/me", response_model=UserInfo)
async def get_current_user_info(current_user: TokenData = Depends(get_current_active_user)):
    """
    Get current authenticated user information
    """
    user = await auth_service.get_user_by_id(current_user.user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Get tenant name if tenant_id exists
    tenant_name = None
    if current_user.tenant_id:
        conn = await auth_service.get_db_connection()
        try:
            tenant_row = await conn.fetchrow(
                "SELECT name FROM tenants WHERE id = $1::uuid",
                current_user.tenant_id
            )
            if tenant_row:
                tenant_name = tenant_row['name']
        finally:
            await conn.close()
    
    return UserInfo(
        id=user["id"],
        email=user["email"],
        first_name=user["first_name"],
        last_name=user["last_name"],
        role=current_user.role,
        tenant_id=current_user.tenant_id,
        tenant_name=tenant_name,
        is_active=user["is_active"],
        last_login=user["last_login"],
        permissions=current_user.permissions
    )

@auth_router.get("/tenants")
async def get_user_tenants(current_user: TokenData = Depends(get_current_active_user)):
    """
    Get all tenants accessible to current user
    """
    tenants = await auth_service.get_user_tenants(current_user.user_id)
    return {
        "tenants": tenants,
        "current_tenant_id": current_user.tenant_id
    }

@auth_router.post("/switch-tenant")
async def switch_tenant(
    switch_data: TenantSwitchRequest,
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Switch to different tenant (requires new login for security)
    """
    # Verify user has access to requested tenant
    tenants = await auth_service.get_user_tenants(current_user.user_id)
    tenant_ids = [tenant["id"] for tenant in tenants]
    
    if switch_data.tenant_id not in tenant_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to requested tenant"
        )
    
    return {
        "message": "Tenant switch requested",
        "requested_tenant_id": switch_data.tenant_id,
        "current_tenant_id": current_user.tenant_id,
        "note": "Please login again to switch tenant context"
    }

@auth_router.post("/password-reset/request")
async def request_password_reset(
    reset_request: PasswordResetRequest,
    background_tasks: BackgroundTasks
):
    """
    Request password reset email
    """
    conn = await auth_service.get_db_connection()
    
    try:
        # Check if user exists
        user = await conn.fetchrow(
            "SELECT id, email FROM users WHERE email = $1 AND is_active = true",
            reset_request.email
        )
        
        if user:
            # Generate reset token
            reset_token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(hours=1)  # 1 hour expiry
            
            # Store token (in production, use database or Redis)
            password_reset_tokens[reset_token] = {
                "user_id": user["id"],
                "email": user["email"],
                "expires_at": expires_at
            }
            
            # Send email in background
            background_tasks.add_task(
                send_password_reset_email,
                user["email"],
                reset_token
            )
        
        # Always return success to prevent email enumeration
        return {
            "message": "If the email exists, a password reset link has been sent"
        }
        
    finally:
        await conn.close()

@auth_router.post("/password-reset/confirm")
async def confirm_password_reset(reset_data: PasswordResetConfirm):
    """
    Confirm password reset with token
    """
    # Verify reset token
    token_info = password_reset_tokens.get(reset_data.token)
    
    if not token_info or datetime.utcnow() > token_info["expires_at"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password
    conn = await auth_service.get_db_connection()
    
    try:
        hashed_password = auth_service.hash_password(reset_data.new_password)
        
        await conn.execute(
            "UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3",
            hashed_password,
            datetime.utcnow(),
            token_info["user_id"]
        )
        
        # Remove used token
        del password_reset_tokens[reset_data.token]
        
        return {
            "message": "Password reset successfully"
        }
        
    finally:
        await conn.close()

@auth_router.post("/change-password")
async def change_password(
    password_data: ChangePasswordRequest,
    current_user: TokenData = Depends(get_current_active_user)
):
    """
    Change user password (requires current password)
    """
    conn = await auth_service.get_db_connection()
    
    try:
        # Get current password hash
        user_row = await conn.fetchrow(
            "SELECT password_hash FROM users WHERE id = $1",
            current_user.user_id
        )
        
        if not user_row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Verify current password
        if not auth_service.verify_password(password_data.current_password, user_row['password_hash']):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Current password is incorrect"
            )
        
        # Update to new password
        new_password_hash = auth_service.hash_password(password_data.new_password)
        
        await conn.execute(
            "UPDATE users SET password_hash = $1, updated_at = $2 WHERE id = $3",
            new_password_hash,
            datetime.utcnow(),
            current_user.user_id
        )
        
        return {
            "message": "Password changed successfully"
        }
        
    finally:
        await conn.close()

# Role-based protected endpoints for testing
@auth_router.get("/test/viewer")
async def test_viewer_access(current_user: TokenData = Depends(require_viewer)):
    """Test endpoint requiring viewer role or higher"""
    return {
        "message": "Viewer access granted",
        "user": current_user.email,
        "role": current_user.role,
        "tenant": current_user.tenant_id
    }

@auth_router.get("/test/user")
async def test_user_access(current_user: TokenData = Depends(require_user)):
    """Test endpoint requiring user role or higher"""
    return {
        "message": "User access granted",
        "user": current_user.email,
        "role": current_user.role,
        "tenant": current_user.tenant_id
    }

@auth_router.get("/test/manager")
async def test_manager_access(current_user: TokenData = Depends(require_manager)):
    """Test endpoint requiring manager role or higher"""
    return {
        "message": "Manager access granted",
        "user": current_user.email,
        "role": current_user.role,
        "tenant": current_user.tenant_id
    }

@auth_router.get("/test/admin")
async def test_admin_access(current_user: TokenData = Depends(require_admin)):
    """Test endpoint requiring admin role or higher"""
    return {
        "message": "Admin access granted",
        "user": current_user.email,
        "role": current_user.role,
        "tenant": current_user.tenant_id
    }