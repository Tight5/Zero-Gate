import { Router, Request, Response } from 'express';

const router = Router();

interface TenantRequest extends Request {
  tenantId?: string;
  isAdminMode?: boolean;
  isAdmin?: boolean;
  userEmail?: string;
}

// Single NASDAQ Center organization data
const nasdaqCenterData = {
  id: "1",
  name: "NASDAQ Center",
  description: "The Center for Entrepreneurship at Nasdaq",
  domain: "thecenter.nasdaq.org",
  status: "active",
  userCount: 39,
  settings: {
    notifications: true,
    microsoftIntegration: true,
    analyticsEnabled: true,
    features: ["microsoft365", "grants", "sponsors", "relationships"]
  },
  platformStats: {
    totalUsers: 39,
    activeGrants: 12,
    totalSponsors: 247,
    totalFunding: 2150000,
    lastActivity: "2 hours ago"
  }
};

// GET /api/tenants/admin/overview - Admin overview of NASDAQ Center organization
router.get('/admin/overview', (req: TenantRequest, res: Response) => {
  try {
    if (!req.isAdminMode) {
      return res.status(403).json({
        error: 'Admin mode required',
        timestamp: new Date().toISOString()
      });
    }

    // Return single NASDAQ Center tenant data
    const tenants = [nasdaqCenterData];
    const platformHealth = {
      totalTenants: 1,
      activeTenants: 1,
      totalUsers: nasdaqCenterData.userCount,
      totalGrants: nasdaqCenterData.platformStats.activeGrants,
      totalSponsors: nasdaqCenterData.platformStats.totalSponsors,
      totalFunding: nasdaqCenterData.platformStats.totalFunding,
      averageHealth: 98.5,
      systemLoad: 23.4,
      memoryUsage: 67.8
    };

    res.json({
      success: true,
      tenants: tenants,
      platform_health: platformHealth,
      admin_capabilities: {
        can_manage_tenants: true,
        can_view_analytics: true,
        can_configure_integrations: true,
        can_access_all_data: true
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting admin overview:', error);
    res.status(500).json({
      error: 'Failed to get admin overview',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/tenants/:tenantId/settings - Get tenant settings
router.get('/:tenantId/settings', (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Verify access permissions
    if (!req.isAdminMode && req.tenantId !== tenantId) {
      return res.status(403).json({
        error: 'Access denied to tenant',
        timestamp: new Date().toISOString()
      });
    }

    // Always return NASDAQ Center tenant data (only valid tenant)
    if (tenantId !== '1') {
      return res.status(404).json({
        error: 'Tenant not found - only NASDAQ Center is available',
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      tenant_id: '1',
      settings: nasdaqCenterData.settings,
      platform_stats: nasdaqCenterData.platformStats,
      tenant_info: {
        name: nasdaqCenterData.name,
        description: nasdaqCenterData.description,
        domain: nasdaqCenterData.domain,
        status: nasdaqCenterData.status,
        user_count: nasdaqCenterData.userCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting tenant settings:', error);
    res.status(500).json({
      error: 'Failed to get tenant settings',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// PUT /api/tenants/:tenantId/settings - Update tenant settings
router.put('/:tenantId/settings', (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = req.params;
    const updates = req.body;
    
    // Verify access permissions
    if (!req.isAdminMode && req.tenantId !== tenantId) {
      return res.status(403).json({
        error: 'Access denied to tenant',
        timestamp: new Date().toISOString()
      });
    }

    const tenant = mockTenantData[tenantId as keyof typeof mockTenantData];
    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        timestamp: new Date().toISOString()
      });
    }

    // Update settings (in production, this would update the database)
    if (updates.notifications !== undefined) {
      tenant.settings.notifications = updates.notifications;
    }
    if (updates.microsoftIntegration !== undefined) {
      tenant.settings.microsoftIntegration = updates.microsoftIntegration;
    }
    if (updates.analyticsEnabled !== undefined) {
      tenant.settings.analyticsEnabled = updates.analyticsEnabled;
    }
    if (updates.features && Array.isArray(updates.features)) {
      tenant.settings.features = updates.features;
    }

    res.json({
      success: true,
      tenant_id: tenantId,
      settings: tenant.settings,
      message: 'Settings updated successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error updating tenant settings:', error);
    res.status(500).json({
      error: 'Failed to update tenant settings',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/tenants/:tenantId/stats - Get tenant statistics
router.get('/:tenantId/stats', (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Verify access permissions
    if (!req.isAdminMode && req.tenantId !== tenantId) {
      return res.status(403).json({
        error: 'Access denied to tenant',
        timestamp: new Date().toISOString()
      });
    }

    const tenant = mockTenantData[tenantId as keyof typeof mockTenantData];
    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        timestamp: new Date().toISOString()
      });
    }

    // Enhanced statistics for tenant dashboard
    const stats = {
      ...tenant.platformStats,
      growth_metrics: {
        user_growth: 12.5,
        grant_growth: 8.3,
        sponsor_growth: 15.7,
        funding_growth: 22.1
      },
      engagement_metrics: {
        daily_active_users: Math.floor(tenant.userCount * 0.65),
        weekly_active_users: Math.floor(tenant.userCount * 0.85),
        monthly_active_users: tenant.userCount,
        average_session_time: "24m 35s"
      },
      performance_metrics: {
        api_response_time: "145ms",
        uptime_percentage: 99.8,
        error_rate: 0.02
      }
    };

    res.json({
      success: true,
      tenant_id: tenantId,
      statistics: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting tenant stats:', error);
    res.status(500).json({
      error: 'Failed to get tenant statistics',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/tenants/:tenantId/refresh-data - Refresh tenant data
router.post('/:tenantId/refresh-data', (req: TenantRequest, res: Response) => {
  try {
    const { tenantId } = req.params;
    
    // Verify access permissions
    if (!req.isAdminMode && req.tenantId !== tenantId) {
      return res.status(403).json({
        error: 'Access denied to tenant',
        timestamp: new Date().toISOString()
      });
    }

    const tenant = mockTenantData[tenantId as keyof typeof mockTenantData];
    if (!tenant) {
      return res.status(404).json({
        error: 'Tenant not found',
        timestamp: new Date().toISOString()
      });
    }

    // Simulate data refresh
    const refreshResults = {
      microsoft365_sync: {
        status: tenant.settings.microsoftIntegration ? 'completed' : 'skipped',
        users_synced: tenant.settings.microsoftIntegration ? tenant.userCount : 0,
        groups_synced: tenant.settings.microsoftIntegration ? Math.floor(tenant.userCount / 5) : 0,
        last_sync: new Date().toISOString()
      },
      analytics_refresh: {
        status: tenant.settings.analyticsEnabled ? 'completed' : 'skipped',
        metrics_updated: tenant.settings.analyticsEnabled ? 45 : 0,
        dashboards_refreshed: tenant.settings.analyticsEnabled ? 8 : 0
      },
      cache_cleared: true,
      total_refresh_time: "2.3s"
    };

    res.json({
      success: true,
      tenant_id: tenantId,
      refresh_results: refreshResults,
      message: 'Data refresh completed successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error refreshing tenant data:', error);
    res.status(500).json({
      error: 'Failed to refresh tenant data',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;