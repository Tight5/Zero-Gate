import { Router, Request, Response } from 'express';

const router = Router();

// Multi-tenant configuration with NASDAQ Center as primary customer
const mockTenants = {
  'clint.phillips@thecenter.nasdaq.org': [
    {
      id: '1',
      name: 'NASDAQ Center',
      description: 'The Center for Entrepreneurship at Nasdaq',
      role: 'owner',
      userCount: 39,
      status: 'active',
      logo: null,
      domain: 'thecenter.nasdaq.org',
      lastActivity: '2 hours ago',
      features: ['microsoft365', 'grants', 'sponsors', 'relationships'],
      settings: {
        notifications: true,
        microsoftIntegration: true,
        analyticsEnabled: true
      }
    }
  ],
  'admin@tight5digital.com': [
    {
      id: '1',
      name: 'NASDAQ Center',
      description: 'The Center for Entrepreneurship at Nasdaq',
      role: 'admin',
      userCount: 39,
      status: 'active',
      logo: null,
      domain: 'thecenter.nasdaq.org',
      lastActivity: '2 hours ago',
      features: ['microsoft365', 'grants', 'sponsors', 'relationships'],
      settings: {
        notifications: true,
        microsoftIntegration: true,
        analyticsEnabled: true
      }
    },
    {
      id: '2',
      name: 'Tight5 Digital',
      description: 'Digital Innovation Agency',
      role: 'owner',
      userCount: 8,
      status: 'active',
      logo: null,
      domain: 'tight5digital.com',
      lastActivity: '1 day ago',
      features: ['grants', 'sponsors'],
      settings: {
        notifications: true,
        microsoftIntegration: false,
        analyticsEnabled: true
      }
    },
    {
      id: '3',
      name: 'Innovation Hub',
      description: 'Technology Innovation Center',
      role: 'viewer',
      userCount: 12,
      status: 'active',
      logo: null,
      domain: 'innovationhub.org',
      lastActivity: '3 hours ago',
      features: ['grants', 'sponsors', 'relationships'],
      settings: {
        notifications: false,
        microsoftIntegration: false,
        analyticsEnabled: false
      }
    }
  ]
};

// GET /api/auth/user/tenants - Get user tenants based on email and admin mode
router.get('/user/tenants', async (req: Request, res: Response) => {
  try {
    const isAdminMode = req.headers['x-admin-mode'] === 'true';
    const userEmail = req.headers['x-user-email'] || 'clint.phillips@thecenter.nasdaq.org';
    
    console.log(`[Auth] Loading tenants for ${userEmail}, admin mode: ${isAdminMode}`);
    
    // Get tenants based on user email
    const userTenants = mockTenants[userEmail as keyof typeof mockTenants] || [];
    
    res.json({
      success: true,
      tenants: userTenants,
      adminMode: isAdminMode,
      userEmail: userEmail,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error loading user tenants:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to load user tenants',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/auth/switch-tenant - Switch to specified tenant
router.post('/switch-tenant', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.body;
    const userEmail = req.headers['x-user-email'] || 'clint.phillips@thecenter.nasdaq.org';
    
    console.log(`[Auth] Switching to tenant ${tenantId} for ${userEmail}`);
    
    // Get user's available tenants
    const userTenants = mockTenants[userEmail as keyof typeof mockTenants] || [];
    const selectedTenant = userTenants.find(t => t.id === tenantId);
    
    if (!selectedTenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found or access denied',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      tenant: selectedTenant,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error switching tenant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch tenant',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/auth/enter-admin-mode - Enter admin mode
router.post('/enter-admin-mode', async (req: Request, res: Response) => {
  try {
    const userEmail = req.headers['x-user-email'] || 'clint.phillips@thecenter.nasdaq.org';
    
    if (userEmail !== 'admin@tight5digital.com') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`[Auth] Entering admin mode for ${userEmail}`);
    
    res.json({
      success: true,
      adminMode: true,
      message: 'Admin mode activated',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error entering admin mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to enter admin mode',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/auth/exit-admin-mode - Exit admin mode
router.post('/exit-admin-mode', async (req: Request, res: Response) => {
  try {
    const userEmail = req.headers['x-user-email'] || 'clint.phillips@thecenter.nasdaq.org';
    
    console.log(`[Auth] Exiting admin mode for ${userEmail}`);
    
    res.json({
      success: true,
      adminMode: false,
      message: 'Admin mode deactivated',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error exiting admin mode:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to exit admin mode',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// POST /api/auth/switch-email - Switch user email context
router.post('/switch-email', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    const validEmails = [
      'clint.phillips@thecenter.nasdaq.org',
      'admin@tight5digital.com'
    ];
    
    if (!validEmails.includes(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email address',
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`[Auth] Switching email context to ${email}`);
    
    res.json({
      success: true,
      email: email,
      isAdmin: email === 'admin@tight5digital.com',
      message: 'Email context switched successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error switching email:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to switch email',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/auth/status - Get current authentication status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const userEmail = req.headers['x-user-email'] || 'clint.phillips@thecenter.nasdaq.org';
    const isAdminMode = req.headers['x-admin-mode'] === 'true';
    
    res.json({
      success: true,
      authenticated: true,
      userEmail: userEmail,
      isAdmin: userEmail === 'admin@tight5digital.com',
      adminMode: isAdminMode,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error getting auth status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get auth status',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;