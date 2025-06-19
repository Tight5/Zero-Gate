import express, { type Request, Response } from "express";
import { setupVite, serveStatic, log } from "./vite";

// Simple debug server for troubleshooting
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

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

// Simple auth endpoint for development
app.get('/api/auth/user', (req: Request, res: Response) => {
  const user = {
    id: 'dev-user-123',
    email: 'admin@nasdaq-ec.org',
    firstName: 'Admin',
    lastName: 'User',
    profileImageUrl: null
  };
  res.json(user);
});

// Tenant endpoints for development
app.get('/api/auth/user/tenants', (req: Request, res: Response) => {
  const mockTenants = [
    {
      id: '1',
      name: 'NASDAQ Entrepreneur Center',
      description: 'Leading technology entrepreneurship hub',
      role: 'admin',
      userCount: 245,
      status: 'active',
      domain: 'nasdaq-ec.org',
      lastActivity: '2 hours ago',
      features: ['Analytics', 'Microsoft 365', 'Advanced Reporting']
    }
  ];
  res.json({ tenants: mockTenants });
});

app.post('/api/auth/switch-tenant', (req: Request, res: Response) => {
  const { tenantId } = req.body;
  res.json({ success: true, tenantId });
});

// Dashboard endpoints
app.get('/api/dashboard/stats', (req: Request, res: Response) => {
  const mockStats = {
    totalFunding: 2150000,
    activeGrants: 12,
    totalSponsors: 45,
    relationshipStrength: 87
  };
  res.json(mockStats);
});

// System resource endpoints
app.get('/api/system/resources', (req: Request, res: Response) => {
  const mockResources = {
    memory: Math.floor(Math.random() * 20) + 70,
    cpu: Math.floor(Math.random() * 30) + 40,
  };
  res.json(mockResources);
});

// Relationship endpoints
app.get('/api/relationships', (req: Request, res: Response) => {
  res.json([]);
});

app.get('/api/relationships/network-stats', (req: Request, res: Response) => {
  const mockStats = {
    totalNodes: 156,
    totalEdges: 243,
    avgConnections: 3.2,
    strongConnections: 89
  };
  res.json(mockStats);
});

app.get('/api/relationships/graph-data', (req: Request, res: Response) => {
  const mockGraphData = {
    nodes: [],
    links: []
  };
  res.json(mockGraphData);
});

app.post('/api/relationships/discover-path', (req: Request, res: Response) => {
  const { source_id, target_id } = req.body;
  res.json({
    paths: [],
    analysis: {
      total_paths_found: 0,
      shortest_path_length: -1,
      strongest_path_strength: 0,
      average_confidence: 0
    }
  });
});

app.get('/api/relationships/search', (req: Request, res: Response) => {
  res.json([]);
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

// Dashboard API mock data
app.get('/api/dashboard/kpis', (req: Request, res: Response) => {
  res.json({
    active_sponsors: 12,
    total_grants: 8,
    funding_secured: 2500000,
    success_rate: 75,
    relationships_mapped: 156,
    content_published: 24,
    trends: {
      sponsors: 15,
      grants: -5,
      funding: 12,
      success: 3,
      relationships: 8,
      content: 20
    }
  });
});

// Relationship network mock data
app.get('/api/relationships/network', (req: Request, res: Response) => {
  res.json({
    nodes: [
      { id: '1', name: 'Microsoft Foundation', type: 'sponsor', tier: 1, centrality_score: 0.8, influence_score: 9.2, connections: 45 },
      { id: '2', name: 'Gates Foundation', type: 'sponsor', tier: 1, centrality_score: 0.9, influence_score: 9.8, connections: 52 },
      { id: '3', name: 'Local Community Center', type: 'organization', tier: 3, centrality_score: 0.4, influence_score: 6.1, connections: 18 }
    ],
    edges: [
      { source: '1', target: '2', strength: 85, type: 'partnership', verified: true, distance: 1 },
      { source: '2', target: '3', strength: 62, type: 'funding', verified: true, distance: 2 }
    ],
    stats: {
      total_nodes: 45,
      total_edges: 78,
      max_degree: 12,
      avg_clustering: 0.65,
      network_density: 0.12
    }
  });
});

// Setup server and Vite
const setupServer = async () => {
  const port = Number(process.env.PORT) || 5000;
  const server = app.listen(port, "0.0.0.0", () => {
    log(`Express server running on port ${port}`);
    log("Debug mode active - simplified authentication");
  });
  
  // Setup Vite with the server instance
  if (process.env.NODE_ENV === "development") {
    log("Development mode - setting up Vite");
    await setupVite(app, server);
  } else {
    log("Production mode - serving static files");
    serveStatic(app);
  }
};

setupServer().catch(console.error);