"""
Tenant Context Middleware for Zero Gate ESO Platform
Handles multi-tenant request processing and validation
"""
import logging
from typing import Optional, Dict, Any
from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware

logger = logging.getLogger("zero-gate.tenant-context")

class TenantMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        self.app = app
    
    async def dispatch(self, request: Request, call_next):
        # Extract tenant context from headers or session
        tenant_id = request.headers.get("X-Tenant-ID")
        user_id = request.headers.get("X-User-ID")
        admin_mode = request.headers.get("X-Admin-Mode", "false").lower() == "true"
        
        # Add tenant context to request state
        request.state.tenant_id = tenant_id
        request.state.user_id = user_id
        request.state.admin_mode = admin_mode
        
        logger.debug(f"Processing request with tenant_id: {tenant_id}, user_id: {user_id}, admin_mode: {admin_mode}")
        
        response = await call_next(request)
        return response

def get_current_tenant(request: Request) -> Optional[str]:
    """Get current tenant ID from request"""
    return getattr(request.state, 'tenant_id', None)

def get_current_user(request: Request) -> Optional[str]:
    """Get current user ID from request"""
    return getattr(request.state, 'user_id', None)

def is_admin_mode(request: Request) -> bool:
    """Check if request is in admin mode"""
    return getattr(request.state, 'admin_mode', False)