import { Request, Response, NextFunction } from 'express';

// Admin email configuration
const ADMIN_EMAIL = 'admin@tight5digital.com';
const TENANT_EMAIL = 'clint.phillips@thecenter.nasdaq.org';

// Extended Request interface for tenant context
interface TenantRequest extends Request {
  tenantId?: string;
  isAdminMode?: boolean;
  isAdmin?: boolean;
  userEmail?: string;
}

// Extract tenant ID from request headers or user context
const extractTenantId = (req: TenantRequest): string | null => {
  // First check explicit tenant header
  const headerTenantId = req.headers['x-tenant-id'] as string;
  if (headerTenantId) {
    return headerTenantId;
  }

  // Check if user has a current tenant in session/auth
  const user = (req as any).user;
  if (user?.currentTenantId) {
    return user.currentTenantId;
  }

  return null;
};

// Extract user email from authentication context
const extractUserEmail = (req: TenantRequest): string | null => {
  const user = (req as any).user;
  if (user?.email) {
    return user.email;
  }

  // Check for email in auth headers if available
  const authEmail = req.headers['x-user-email'] as string;
  if (authEmail) {
    return authEmail;
  }

  return null;
};

// Main tenant context middleware
export const tenantContextMiddleware = (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    // Extract tenant ID and admin mode flag from headers
    const tenantId = extractTenantId(req);
    const isAdminModeHeader = req.headers['x-admin-mode'] === 'true';
    
    // Get user email from authentication context
    const userEmail = extractUserEmail(req);
    
    // Determine if user is admin
    const isAdmin = userEmail === ADMIN_EMAIL;
    
    // Validate admin mode request
    if (isAdminModeHeader && !isAdmin) {
      return res.status(403).json({
        error: 'Unauthorized',
        message: 'Admin mode access denied. Only admin users can enter admin mode.',
      });
    }
    
    // Set context on request object
    req.tenantId = tenantId ?? undefined;
    req.isAdminMode = isAdmin && isAdminModeHeader;
    req.isAdmin = isAdmin;
    req.userEmail = userEmail ?? undefined;
    
    // Add response headers to indicate current context
    res.setHeader('X-Current-Tenant', req.tenantId || 'none');
    res.setHeader('X-Admin-Mode', req.isAdminMode ? 'true' : 'false');
    res.setHeader('X-User-Admin', req.isAdmin ? 'true' : 'false');
    
    // Log context for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[TenantMiddleware] User: ${userEmail}, Tenant: ${tenantId}, AdminMode: ${req.isAdminMode}, IsAdmin: ${req.isAdmin}`);
    }
    
    next();
  } catch (error) {
    console.error('Tenant middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to process tenant context',
    });
  }
};

// Middleware to require admin mode
export const requireAdminMode = (req: TenantRequest, res: Response, next: NextFunction) => {
  if (!req.isAdmin) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin access required',
    });
  }
  
  if (!req.isAdminMode) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Admin mode required. Please enter admin mode to access this resource.',
    });
  }
  
  next();
};

// Middleware to require tenant context (non-admin mode)
export const requireTenantContext = (req: TenantRequest, res: Response, next: NextFunction) => {
  if (req.isAdminMode) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'This endpoint requires tenant context. Please exit admin mode.',
    });
  }
  
  if (!req.tenantId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Tenant context required. Please select a tenant.',
    });
  }
  
  next();
};

// Middleware to allow both admin and tenant access
export const allowBothModes = (req: TenantRequest, res: Response, next: NextFunction) => {
  // This middleware just passes through but ensures context is set
  // Useful for endpoints that work in both modes
  next();
};

// Helper function to get effective tenant IDs for queries
export const getEffectiveTenantIds = (req: TenantRequest): string[] => {
  if (req.isAdminMode && req.isAdmin) {
    // Admin mode: can access all tenants (return empty array to indicate "all")
    return [];
  }
  
  if (req.tenantId) {
    // Normal mode: return specific tenant
    return [req.tenantId];
  }
  
  // No tenant context
  return [];
};

// Helper function to check if user can access specific tenant
export const canAccessTenant = (req: TenantRequest, targetTenantId: string): boolean => {
  // Admin in admin mode can access any tenant
  if (req.isAdminMode && req.isAdmin) {
    return true;
  }
  
  // Regular users can only access their current tenant
  return req.tenantId === targetTenantId;
};

export default tenantContextMiddleware;