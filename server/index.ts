import express, { type Request, Response } from "express";
import { setupVite, serveStatic, log } from "./vite";
import { tenantContextMiddleware } from "./middleware/tenantMiddleware";
import authRouter from "./routes/auth";
import relationshipsRouter from "./routes/relationships";
import dashboardRouter from "./routes/dashboard";
import tenantsRouter from "./routes/tenants";
import workflowsRouter from "./routes/workflows";
import microsoft365DebugRouter from "./routes/microsoft365-debug";
import microsoft365IntegrationRouter from "./routes/microsoft365-integration";
import sponsorsRouter from "./routes/sponsors";
import grantsRouter from "./routes/grants";
import tenantDataFeedsRouter from "./routes/tenant-data-feeds";
import onedriveStorageRouter from "./routes/onedrive-storage";
import sponsorDiscoveryRouter from "./routes/sponsor-discovery";

// Create Express app with API-first routing
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Create a separate API router to ensure API routes are processed first
const apiRouter = express.Router();

// Apply tenant context middleware to all API routes
apiRouter.use(tenantContextMiddleware);

// Mount API routes on the API router
apiRouter.use('/auth', authRouter);
apiRouter.use('/relationships', relationshipsRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/tenants', tenantsRouter);
apiRouter.use('/workflows', workflowsRouter);
apiRouter.use('/microsoft365', microsoft365DebugRouter);
apiRouter.use('/integration/microsoft365', microsoft365IntegrationRouter);
apiRouter.use('/sponsors', sponsorsRouter);
apiRouter.use('/grants', grantsRouter);
apiRouter.use('/tenant-data-feeds', tenantDataFeedsRouter);
apiRouter.use('/onedrive-storage', onedriveStorageRouter);
apiRouter.use('/sponsor-discovery', sponsorDiscoveryRouter);

// Mount the API router with highest priority
app.use('/api', apiRouter);

// Health endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      percentage: Math.round((process.memoryUsage().heapUsed / process.memoryUsage().heapTotal) * 100),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    version: "1.0.0"
  });
});

// Email switching endpoint for seamless mode switching
app.post('/api/auth/switch-email', (req: Request, res: Response) => {
  const { email } = req.body;
  
  if (!email || !['clint.phillips@thecenter.nasdaq.org', 'admin@tight5digital.com'].includes(email)) {
    return res.status(400).json({
      error: 'Invalid email',
      message: 'Only tenant and admin emails are supported'
    });
  }
  
  res.json({
    success: true,
    email: email,
    message: `Switched to ${email}`,
    isAdmin: email === 'admin@tight5digital.com'
  });
});

// Simple auth endpoint for development
app.get('/api/auth/user', (req: Request, res: Response) => {
  const tenantReq = req as any;
  // Check for email switching first, then fall back to header, then default
  const requestedEmail = req.headers['x-user-email'] as string;
  const userEmail = requestedEmail || tenantReq.userEmail || 'clint.phillips@thecenter.nasdaq.org';
  
  const user = {
    id: 'dev-user-123',
    email: userEmail,
    firstName: userEmail === 'admin@tight5digital.com' ? 'Admin' : 'Clint',
    lastName: userEmail === 'admin@tight5digital.com' ? 'User' : 'Phillips',
    profileImageUrl: null,
    isAdmin: tenantReq.isAdmin || userEmail === 'admin@tight5digital.com',
    currentTenantId: tenantReq.tenantId
  };
  res.json(user);
});

// Admin mode switching endpoints
app.post('/api/auth/enter-admin-mode', (req: Request, res: Response) => {
  const tenantReq = req as any;
  
  if (!tenantReq.isAdmin) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Only admin users can enter admin mode'
    });
  }
  
  res.json({
    success: true,
    message: 'Admin mode activated',
    isAdminMode: true,
    availableTenants: 'all'
  });
});

app.post('/api/auth/exit-admin-mode', (req: Request, res: Response) => {
  const tenantReq = req as any;
  
  res.json({
    success: true,
    message: 'Admin mode deactivated',
    isAdminMode: false,
    currentTenant: tenantReq.tenantId
  });
});

// Switch tenant endpoint
app.post('/api/auth/switch-tenant', (req: Request, res: Response) => {
  const { tenantId } = req.body;
  const tenantReq = req as any;
  
  if (!tenantId) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Tenant ID required'
    });
  }
  
  // Verify admin can switch to any tenant, regular users need validation
  if (!tenantReq.isAdminMode && tenantReq.userEmail !== 'clint.phillips@thecenter.nasdaq.org') {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Unauthorized tenant access'
    });
  }
  
  res.json({
    success: true,
    message: 'Tenant switched successfully',
    tenantId: tenantId,
    isAdminMode: tenantReq.isAdminMode
  });
});

// Remove duplicate routes - handled by apiRouter above

// System resource endpoints
app.get('/api/system/resources', (req: Request, res: Response) => {
  const mockResources = {
    memory: Math.floor(Math.random() * 20) + 70,
    cpu: Math.floor(Math.random() * 30) + 40,
  };
  res.json(mockResources);
});

// Tenant settings endpoints
app.get('/api/tenants/:tenantId/settings', (req: Request, res: Response) => {
  res.json({
    theme: 'light',
    notifications: true,
    autoRefresh: true
  });
});

app.put('/api/tenants/:tenantId/settings', (req: Request, res: Response) => {
  const settings = req.body;
  res.json(settings);
});

// Simple login/logout for development
app.get('/api/login', (req: Request, res: Response) => {
  res.redirect('/dashboard');
});

app.get('/api/logout', (req: Request, res: Response) => {
  res.redirect('/');
});

// Setup server and Vite
const setupServer = async () => {
  const port = Number(process.env.PORT) || 5000;
  
  // Emergency memory optimization
  setInterval(() => {
    if (global.gc && process.memoryUsage().heapUsed / process.memoryUsage().heapTotal > 0.85) {
      global.gc();
    }
  }, 5000);

  // Start the server
  const server = app.listen(port, "0.0.0.0", () => {
    log(`Express server running on port ${port}`);
    log("Debug mode active - simplified authentication");
  });
  
  // Setup Vite with the server instance - but AFTER all API routes are defined
  if (process.env.NODE_ENV === "development") {
    log("Development mode - setting up Vite (after API routes)");
    try {
      // Vite will be set up after all Express routes to avoid intercepting API calls
      await setupVite(app, server);
    } catch (error) {
      log("Vite setup error (continuing without WebSocket):", error instanceof Error ? error.message : String(error));
    }
  } else {
    log("Production mode - serving static files");
    serveStatic(app);
  }

  return server;
};

setupServer().catch(console.error);