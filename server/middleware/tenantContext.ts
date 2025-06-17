import type { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

// Extend Express Request to include tenant context
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      userTenants?: Array<{
        tenantId: string;
        tenantName: string;
        role: string;
      }>;
    }
  }
}

/**
 * Middleware to set PostgreSQL session variables for Row-Level Security
 * This ensures that RLS policies can properly filter data by tenant
 */
export async function setUserContext(req: Request, res: Response, next: NextFunction) {
  try {
    const user = req.user as any;
    
    if (!user?.claims?.sub) {
      return next();
    }

    const userId = user.claims.sub;

    // Set the current user ID in PostgreSQL session for RLS policies
    await db.execute(sql`SELECT set_current_user_context(${userId})`);

    // Get user's tenant memberships with error handling
    try {
      const userTenants = await db.execute(sql`SELECT * FROM get_user_tenants(${userId})`);
      
      req.userTenants = userTenants.rows.map((row: any) => ({
        tenantId: row.tenant_id,
        tenantName: row.tenant_name,
        role: row.role
      }));
    } catch (error) {
      console.error('Error getting user tenants:', error);
      req.userTenants = [];
    }

    // Set primary tenant from header or use first available tenant
    const headerTenantId = req.headers['x-tenant-id'] as string;
    
    if (headerTenantId && req.userTenants.some(t => t.tenantId === headerTenantId)) {
      req.tenantId = headerTenantId;
    } else if (req.userTenants.length > 0) {
      req.tenantId = req.userTenants[0].tenantId;
    }

    next();
  } catch (error) {
    console.error('Error setting user context:', error);
    next(error);
  }
}

/**
 * Middleware to ensure user has access to a specific tenant
 */
export function requireTenantAccess(req: Request, res: Response, next: NextFunction) {
  if (!req.tenantId) {
    return res.status(403).json({ 
      message: 'No tenant access available. Please join a workspace.' 
    });
  }

  if (!req.userTenants?.some(t => t.tenantId === req.tenantId)) {
    return res.status(403).json({ 
      message: 'Access denied to this workspace' 
    });
  }

  next();
}

/**
 * Middleware to require specific role within tenant
 */
export function requireTenantRole(minimumRole: 'member' | 'admin' | 'owner') {
  const roleHierarchy = { member: 0, admin: 1, owner: 2 };
  
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.tenantId || !req.userTenants) {
      return res.status(403).json({ message: 'Tenant access required' });
    }

    const userTenant = req.userTenants.find(t => t.tenantId === req.tenantId);
    
    if (!userTenant) {
      return res.status(403).json({ message: 'Access denied to this workspace' });
    }

    const userRoleLevel = roleHierarchy[userTenant.role as keyof typeof roleHierarchy] ?? -1;
    const requiredRoleLevel = roleHierarchy[minimumRole];

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({ 
        message: `${minimumRole} role required for this action` 
      });
    }

    next();
  };
}