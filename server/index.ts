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
    email: 'developer@zerogate.dev',
    firstName: 'Developer',
    lastName: 'User',
    profileImageUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tenants: []
  };
  res.json(user);
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

// Setup Vite for development
if (process.env.NODE_ENV === "development") {
  setupVite(app);
} else {
  serveStatic(app);
}

const port = process.env.PORT || 5000;
app.listen(port, () => {
  log(`serving on port ${port}`);
  log("Debug mode active - simplified authentication");
});