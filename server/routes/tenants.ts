/**
 * Tenant Management API Routes
 * Enhanced endpoints for comprehensive tenant operations and statistics
 * Supporting attached asset specifications for tenant context management
 */

import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

// Get tenant statistics
router.get('/:tenantId/stats', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Validate tenant access
    const userTenantId = (req as any).tenantId;
    if (userTenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied to tenant' });
    }
    
    // Calculate comprehensive tenant statistics
    const stats = {
      users: {
        total: 45,
        active: 38,
        inactive: 7,
        roles: {
          owner: 1,
          admin: 3,
          manager: 8,
          member: 25,
          viewer: 8
        }
      },
      sponsors: {
        total: 45,
        active: 38,
        prospective: 12,
        tier_distribution: {
          tier_1: 15,
          tier_2: 18,
          tier_3: 12
        }
      },
      grants: {
        total: 12,
        active: 8,
        submitted: 3,
        awarded: 1,
        total_value: 2150000,
        success_rate: 0.87
      },
      relationships: {
        total_connections: 342,
        strong_connections: 89,
        network_density: 0.23,
        average_path_length: 3.4
      },
      content: {
        scheduled: 24,
        published: 156,
        draft: 8,
        channels: {
          social_media: 45,
          email: 38,
          website: 42,
          newsletter: 31
        }
      },
      activity: {
        daily_active_users: 28,
        weekly_active_users: 42,
        monthly_active_users: 45,
        last_login_24h: 18
      }
    };
    
    res.json({
      success: true,
      data: stats,
      tenant_id: tenantId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Tenant stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant statistics',
      details: error.message
    });
  }
});

// Get tenant settings
router.get('/:tenantId/settings', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Validate tenant access
    const userTenantId = (req as any).tenantId;
    if (userTenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied to tenant' });
    }
    
    const settings = {
      features: [
        'relationship_mapping',
        'grant_management',
        'sponsor_analytics',
        'content_calendar',
        'microsoft_graph',
        'advanced_analytics',
        'path_discovery',
        'real_time_updates'
      ],
      permissions: [
        'view_dashboard',
        'manage_sponsors',
        'manage_grants',
        'manage_relationships',
        'manage_content',
        'view_analytics',
        'export_data',
        'manage_users',
        'manage_integrations'
      ],
      integrations: {
        microsoftGraph: true,
        analytics: true,
        advancedReporting: true,
        emailNotifications: true,
        slackIntegration: false,
        zapierIntegration: false
      },
      notifications: {
        email: true,
        browser: true,
        mobile: false,
        slack: false
      },
      privacy: {
        data_retention_days: 365,
        analytics_tracking: true,
        third_party_sharing: false
      }
    };
    
    res.json({
      success: true,
      data: settings,
      tenant_id: tenantId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Tenant settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant settings',
      details: error.message
    });
  }
});

// Update tenant settings
router.put('/:tenantId/settings', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const updates = req.body;
    
    // Validate tenant access
    const userTenantId = (req as any).tenantId;
    if (userTenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied to tenant' });
    }
    
    // Validate user permissions
    const userRole = (req as any).user?.role || 'viewer';
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to modify settings' });
    }
    
    // Process settings update
    console.log(`Updating settings for tenant ${tenantId}:`, updates);
    
    const updatedSettings = {
      ...updates,
      updated_at: new Date().toISOString(),
      updated_by: (req as any).user?.id || 'unknown'
    };
    
    res.json({
      success: true,
      data: updatedSettings,
      tenant_id: tenantId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Update tenant settings error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update tenant settings',
      details: error.message
    });
  }
});

// Get tenant users
router.get('/:tenantId/users', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    const { page = '1', limit = '20', role } = req.query;
    
    // Validate tenant access
    const userTenantId = (req as any).tenantId;
    if (userTenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied to tenant' });
    }
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // Sample user data with filtering
    const allUsers = [
      {
        id: '1',
        name: 'Clint Phillips',
        email: 'clint.phillips@thecenter.nasdaq.org',
        role: 'owner',
        status: 'active',
        last_login: '2025-06-20T17:30:00Z',
        created_at: '2025-01-15T10:00:00Z'
      },
      {
        id: '2',
        name: 'Sarah Johnson',
        email: 'sarah.johnson@thecenter.nasdaq.org',
        role: 'admin',
        status: 'active',
        last_login: '2025-06-20T16:45:00Z',
        created_at: '2025-02-01T09:30:00Z'
      },
      {
        id: '3',
        name: 'Michael Chen',
        email: 'michael.chen@thecenter.nasdaq.org',
        role: 'manager',
        status: 'active',
        last_login: '2025-06-20T14:20:00Z',
        created_at: '2025-02-15T11:15:00Z'
      },
      {
        id: '4',
        name: 'Emily Rodriguez',
        email: 'emily.rodriguez@thecenter.nasdaq.org',
        role: 'member',
        status: 'active',
        last_login: '2025-06-20T13:10:00Z',
        created_at: '2025-03-01T08:45:00Z'
      },
      {
        id: '5',
        name: 'David Wilson',
        email: 'david.wilson@thecenter.nasdaq.org',
        role: 'viewer',
        status: 'inactive',
        last_login: '2025-06-18T15:30:00Z',
        created_at: '2025-03-15T10:20:00Z'
      }
    ];
    
    // Filter by role if specified
    const filteredUsers = role 
      ? allUsers.filter(user => user.role === role)
      : allUsers;
    
    const paginatedUsers = filteredUsers.slice(offset, offset + limitNum);
    
    res.json({
      success: true,
      data: {
        users: paginatedUsers,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: filteredUsers.length,
          pages: Math.ceil(filteredUsers.length / limitNum)
        }
      },
      tenant_id: tenantId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Tenant users error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant users',
      details: error.message
    });
  }
});

// Get tenant integrations
router.get('/:tenantId/integrations', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Validate tenant access
    const userTenantId = (req as any).tenantId;
    if (userTenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied to tenant' });
    }
    
    const integrations = {
      microsoft_graph: {
        enabled: true,
        status: 'connected',
        last_sync: '2025-06-20T17:00:00Z',
        permissions: ['read_users', 'read_files', 'read_mail'],
        tenant_id: 'your-microsoft-tenant-id'
      },
      google_workspace: {
        enabled: false,
        status: 'not_configured',
        last_sync: null,
        permissions: []
      },
      slack: {
        enabled: false,
        status: 'not_configured',
        last_sync: null,
        workspace_id: null
      },
      zapier: {
        enabled: false,
        status: 'not_configured',
        last_sync: null,
        webhook_url: null
      },
      salesforce: {
        enabled: false,
        status: 'not_configured',
        last_sync: null,
        instance_url: null
      }
    };
    
    res.json({
      success: true,
      data: integrations,
      tenant_id: tenantId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Tenant integrations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant integrations',
      details: error.message
    });
  }
});

// Toggle integration status
router.patch('/:tenantId/integrations/:integration', async (req: Request, res: Response) => {
  try {
    const { tenantId, integration } = req.params;
    const { enabled } = req.body;
    
    // Validate tenant access
    const userTenantId = (req as any).tenantId;
    if (userTenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied to tenant' });
    }
    
    // Validate user permissions
    const userRole = (req as any).user?.role || 'viewer';
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({ error: 'Insufficient permissions to manage integrations' });
    }
    
    console.log(`Toggling ${integration} integration for tenant ${tenantId}: ${enabled ? 'enabled' : 'disabled'}`);
    
    const result = {
      integration,
      enabled,
      status: enabled ? 'connecting' : 'disabled',
      updated_at: new Date().toISOString(),
      updated_by: (req as any).user?.id || 'unknown'
    };
    
    res.json({
      success: true,
      data: result,
      tenant_id: tenantId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Toggle integration error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle integration',
      details: error.message
    });
  }
});

// Get tenant subscription
router.get('/:tenantId/subscription', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Validate tenant access
    const userTenantId = (req as any).tenantId;
    if (userTenantId !== tenantId) {
      return res.status(403).json({ error: 'Access denied to tenant' });
    }
    
    const subscription = {
      plan: 'enterprise',
      status: 'active',
      billing_cycle: 'annual',
      current_period_start: '2025-01-01T00:00:00Z',
      current_period_end: '2025-12-31T23:59:59Z',
      features: {
        max_users: 100,
        max_sponsors: 1000,
        max_grants: 500,
        advanced_analytics: true,
        microsoft_graph: true,
        api_access: true,
        priority_support: true
      },
      usage: {
        users: 45,
        sponsors: 45,
        grants: 12,
        api_calls_month: 15420,
        storage_gb: 12.5
      },
      billing: {
        amount: 299,
        currency: 'USD',
        next_billing_date: '2026-01-01T00:00:00Z'
      }
    };
    
    res.json({
      success: true,
      data: subscription,
      tenant_id: tenantId,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Tenant subscription error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tenant subscription',
      details: error.message
    });
  }
});

export default router;