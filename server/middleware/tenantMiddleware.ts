import { Request, Response, NextFunction } from 'express';

// NASDAQ Center organization configuration
const NASDAQ_DOMAIN = 'thecenter.nasdaq.org';
const DEFAULT_USER_EMAIL = 'clint.phillips@thecenter.nasdaq.org';

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

// Main tenant context middleware for NASDAQ Center organization
export const tenantContextMiddleware = (req: TenantRequest, res: Response, next: NextFunction) => {
  try {
    // Extract user email from headers (development mode)
    const userEmail = req.headers['x-user-email'] as string || DEFAULT_USER_EMAIL;
    
    // Validate user is from NASDAQ Center domain
    if (!userEmail.includes(NASDAQ_DOMAIN)) {
      return res.status(403).json({
        error: 'Access denied - only NASDAQ Center users allowed',
        allowed_domain: NASDAQ_DOMAIN,
        timestamp: new Date().toISOString()
      });
    }
    
    // Set user email context
    req.userEmail = userEmail;
    
    // Always assign NASDAQ Center tenant (ID: 1)
    req.tenantId = '1';
    req.isAdmin = false;
    req.isAdminMode = false;
    
    // Minimal development logging
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
      console.log(`[TenantMiddleware] NASDAQ Center user: ${userEmail}`);
    }
    
    next();
  } catch (error) {
    console.error('Error in tenant middleware:', error);
    res.status(500).json({ 
      error: 'Internal server error in tenant context',
      timestamp: new Date().toISOString()
    });
  }
};

// Require admin mode middleware
export const requireAdminMode = (req: TenantRequest, res: Response, next: NextFunction) => {
  if (!req.isAdminMode) {
    return res.status(403).json({
      error: 'Admin mode required',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Require tenant context middleware
export const requireTenantContext = (req: TenantRequest, res: Response, next: NextFunction) => {
  if (!req.tenantId) {
    return res.status(400).json({
      error: 'Tenant context required',
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Allow both modes middleware
export const allowBothModes = (req: TenantRequest, res: Response, next: NextFunction) => {
  // This middleware allows both admin and tenant mode
  next();
};

// Get effective tenant IDs based on mode
export const getEffectiveTenantIds = (req: TenantRequest): string[] => {
  if (req.isAdminMode) {
    // Admin mode can access all tenants
    return ['1', '2', '3'];
  } else if (req.tenantId) {
    // Regular mode only accesses current tenant
    return [req.tenantId];
  }
  return [];
};

// Check if user can access specific tenant
export const canAccessTenant = (req: TenantRequest, targetTenantId: string): boolean => {
  const effectiveTenantIds = getEffectiveTenantIds(req);
  return effectiveTenantIds.includes(targetTenantId);
};