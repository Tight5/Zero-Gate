"""
Zero Gate ESO Platform - FastAPI Application with JWT Authentication
Complete implementation with tenant context and role-based permissions
Based on attached assets specifications
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer
import uvicorn
import os
from contextlib import asynccontextmanager
from datetime import datetime

# Import authentication modules
from auth.routes import auth_router
from auth.jwt_auth import (
    get_current_user, 
    get_current_active_user,
    require_admin,
    require_manager,
    require_user,
    require_viewer,
    TokenData,
    auth_service
)

# Database setup
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan management"""
    # Startup
    print("🚀 Starting Zero Gate ESO Platform - FastAPI JWT Authentication Service")
    print("📡 JWT authentication endpoints available at /auth/*")
    print("🔒 Role-based access control: viewer < user < manager < admin < owner")
    print("🏢 Multi-tenant support with complete data isolation")
    yield
    # Shutdown
    print("🛑 Shutting down Zero Gate ESO Platform FastAPI Service")

# Create FastAPI app
app = FastAPI(
    title="Zero Gate ESO Platform - JWT Authentication API",
    description="Complete JWT authentication system with multi-tenant support, role-based permissions (admin, manager, user, viewer), and secure tenant context management for the Zero Gate ESO Platform",
    version="3.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    openapi_tags=[
        {
            "name": "authentication",
            "description": "JWT-based authentication with tenant context and role-based permissions"
        },
        {
            "name": "user-management", 
            "description": "User profile and tenant management operations"
        },
        {
            "name": "protected-endpoints",
            "description": "Role-based protected endpoints for testing access control"
        }
    ]
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add trusted host middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"]  # Configure appropriately for production
)

# Include authentication router
app.include_router(auth_router)

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "jwt-auth"}

# Protected endpoint examples with different role requirements
@app.get("/api/v2/dashboard")
async def get_dashboard(current_user: TokenData = Depends(require_user)):
    """Dashboard endpoint requiring user role or higher"""
    return {
        "message": "Dashboard access granted",
        "user": current_user.email,
        "tenant": current_user.tenant_id,
        "role": current_user.role
    }

@app.get("/api/v2/admin/users")
async def list_users(current_user: TokenData = Depends(require_admin)):
    """Admin endpoint for listing users"""
    return {
        "message": "Admin access granted",
        "endpoint": "user_management",
        "admin": current_user.email
    }

@app.get("/api/v2/manager/reports")
async def get_reports(current_user: TokenData = Depends(require_manager)):
    """Manager endpoint for reports"""
    return {
        "message": "Manager access granted",
        "endpoint": "reports",
        "manager": current_user.email,
        "tenant": current_user.tenant_id
    }

@app.get("/api/v2/viewer/readonly")
async def get_readonly_data(current_user: TokenData = Depends(require_viewer)):
    """Viewer endpoint for read-only data"""
    return {
        "message": "Viewer access granted",
        "endpoint": "readonly_data",
        "viewer": current_user.email
    }

# Tenant context examples
@app.get("/api/v2/tenant/info")
async def get_tenant_info(current_user: TokenData = Depends(get_current_active_user)):
    """Get current tenant information"""
    return {
        "tenant_id": current_user.tenant_id,
        "user_role": current_user.role,
        "user_email": current_user.email
    }

@app.get("/api/v2/tenant/switch/{tenant_id}")
async def switch_tenant(
    tenant_id: str,
    current_user: TokenData = Depends(get_current_active_user)
):
    """Switch to different tenant (would require new token in real implementation)"""
    # In a real implementation, you'd verify tenant access and issue new tokens
    return {
        "message": "Tenant switch requested",
        "requested_tenant": tenant_id,
        "current_tenant": current_user.tenant_id,
        "note": "New login required to switch tenants"
    }

# Error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions"""
    return {
        "error": exc.detail,
        "status_code": exc.status_code
    }

if __name__ == "__main__":
    # Run FastAPI server
    port = int(os.getenv("FASTAPI_PORT", "8000"))
    host = os.getenv("FASTAPI_HOST", "0.0.0.0")
    
    uvicorn.run(
        "fastapi_app:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )