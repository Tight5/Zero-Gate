import { Router, Request, Response } from 'express';

const router = Router();

// Mock tenant data for development
const mockTenants = [
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
  },
  {
    id: '2',
    name: 'Tight5 Digital',
    description: 'Digital Innovation Agency',
    role: 'admin',
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
    role: 'manager',
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
];

// GET /api/auth/user/tenants - Get user tenants
router.get('/user/tenants', async (req: Request, res: Response) => {
  try {
    const isAdminMode = req.headers['x-admin-mode'] === 'true';
    const userEmail = req.headers['x-user-email'] || 'clint.phillips@thecenter.nasdaq.org';
    
    console.log(`[Auth] Loading tenants for ${userEmail}, admin mode: ${isAdminMode}`);
    
    // In admin mode, return all tenants with additional admin data
    if (isAdminMode && userEmail === 'admin@tight5digital.com') {
      const adminTenants = mockTenants.map(tenant => ({
        ...tenant,
        adminAccess: true,
        platformStats: {
          totalUsers: tenant.userCount,
          activeGrants: Math.floor(Math.random() * 5) + 1,
          totalSponsors: Math.floor(Math.random() * 10) + 5
        }
      }));
      
      return res.json({
        success: true,
        tenants: adminTenants,
        adminMode: true,
        timestamp: new Date().toISOString()
      });
    }
    
    // Regular tenant mode - filter by user email domain
    let userTenants = mockTenants;
    
    // If user is from NASDAQ Center, only show NASDAQ tenant
    if (userEmail.includes('thecenter.nasdaq.org')) {
      userTenants = mockTenants.filter(t => t.id === '1');
    }
    // If user is from Tight5 Digital, show Tight5 and Innovation Hub
    else if (userEmail.includes('tight5digital.com')) {
      userTenants = mockTenants.filter(t => t.id === '2' || t.id === '3');
    }
    
    res.json({
      success: true,
      tenants: userTenants,
      adminMode: false,
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

// POST /api/auth/switch-tenant - Switch tenant context
router.post('/switch-tenant', async (req: Request, res: Response) => {
  try {
    const { tenantId } = req.body;
    const userEmail = req.headers['x-user-email'] || 'clint.phillips@thecenter.nasdaq.org';
    
    console.log(`[Auth] Switching to tenant ${tenantId} for ${userEmail}`);
    
    const tenant = mockTenants.find(t => t.id === tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        error: 'Tenant not found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Validate user has access to this tenant
    if (userEmail.includes('thecenter.nasdaq.org') && tenantId !== '1') {
      return res.status(403).json({
        success: false,
        error: 'Access denied to tenant',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      tenant: tenant,
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