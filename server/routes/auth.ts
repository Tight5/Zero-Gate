import { Router, Request, Response } from 'express';

const router = Router();

// Single tenant configuration for NASDAQ Center
const nasdaqCenterTenant = {
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
};

// GET /api/auth/user/tenants - Get user tenants (Single NASDAQ Center tenant)
router.get('/user/tenants', async (req: Request, res: Response) => {
  try {
    const isAdminMode = req.headers['x-admin-mode'] === 'true';
    const userEmail = req.headers['x-user-email'] || 'clint.phillips@thecenter.nasdaq.org';
    
    console.log(`[Auth] Loading NASDAQ Center tenant for ${userEmail}, admin mode: ${isAdminMode}`);
    
    // Always return only the NASDAQ Center tenant
    const userTenants = [nasdaqCenterTenant];
    
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

// POST /api/auth/switch-tenant - Always return NASDAQ Center tenant
router.post('/switch-tenant', async (req: Request, res: Response) => {
  try {
    const userEmail = req.headers['x-user-email'] || 'clint.phillips@thecenter.nasdaq.org';
    
    console.log(`[Auth] Confirming NASDAQ Center tenant for ${userEmail}`);
    
    // Always return the NASDAQ Center tenant
    res.json({
      success: true,
      tenant: nasdaqCenterTenant,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('Error confirming tenant:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to confirm tenant',
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