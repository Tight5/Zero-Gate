import { Request, Response, NextFunction } from 'express';

// Admin and tenant email configuration
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
    // Extract user email from headers (development mode)
    const userEmail = req.headers['x-user-email'] as string || 'clint.phillips@thecenter.nasdaq.org';
    const adminModeHeader = req.headers['x-admin-mode'] as string;
    
    // Set user email context
    req.userEmail = userEmail;
    
    // Determine admin status and mode
    const isAdmin = userEmail === ADMIN_EMAIL;
    const isAdminMode = adminModeHeader === 'true' && isAdmin;
    
    // Set admin context
    req.isAdmin = isAdmin;
    req.isAdminMode = isAdminMode;
    
    // Extract tenant ID (skip for admin mode)
    let tenantId: string | undefined = undefined;
    if (!isAdminMode) {
      const extractedTenantId = extractTenantId(req);
      
      // Tenant ID mapping to UUIDs
      const TENANT_UUID_MAP: Record<string, string> = {
        '1': 'e65c0a99-fbbe-424c-9152-e1778ccdf03d', // NASDAQ Center
        '2': 'f75d1b88-6abe-435d-a263-f1889ddef04e', // Tight5 Digital
        '3': 'a85e2c77-7bce-446e-b374-e2990eeff05f'  // Innovation Hub
      };

      // Default tenant assignment based on user email
      if (!extractedTenantId) {
        if (userEmail.includes('thecenter.nasdaq.org')) {
          tenantId = TENANT_UUID_MAP['1']; // NASDAQ Center
        } else if (userEmail.includes('tight5digital.com')) {
          tenantId = TENANT_UUID_MAP['2']; // Tight5 Digital
        } else {
          tenantId = TENANT_UUID_MAP['1']; // Default fallback
        }
      } else {
        // Map string tenant IDs to UUIDs if needed
        tenantId = TENANT_UUID_MAP[extractedTenantId] || extractedTenantId;
      }
    }
    
    req.tenantId = tenantId;
    
    // Minimal development logging (5% sample rate)
    if (process.env.NODE_ENV === 'development' && Math.random() < 0.05) {
      console.log(`[TenantMiddleware] ${userEmail} -> Tenant: ${tenantId}, Admin: ${isAdminMode}`);
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
      user_email: req.userEmail,
      is_admin: req.isAdmin,
      admin_mode: req.isAdminMode,
      admin_email: ADMIN_EMAIL,
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
      user_email: req.userEmail,
      current_tenant: req.tenantId,
      timestamp: new Date().toISOString()
    });
  }
  next();
};

// Allow both admin mode and tenant mode
export const allowBothModes = (req: TenantRequest, res: Response, next: NextFunction) => {
  // This middleware passes through both admin mode and tenant mode requests
  // Used for endpoints that should be accessible in both contexts
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