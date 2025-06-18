import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Import monitoring modules dynamically to avoid memory issues
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Lightweight logging middleware - minimal memory usage
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api") && duration > 100) {
      log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Lightweight health check endpoints 
  app.get('/health', (req: Request, res: Response) => {
    const memUsage = process.memoryUsage();
    const memPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    
    // Force garbage collection if memory is high
    if (memPercent > 85 && global.gc) {
      global.gc();
    }
    
    const healthStatus = {
      status: memPercent < 90 ? 'ok' : 'critical',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      memory: {
        percentage: memPercent,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024)
      },
      version: '1.0.0'
    };

    res.status(memPercent < 90 ? 200 : 503).json(healthStatus);
  });

  // Basic metrics endpoint
  app.get('/metrics', (req: Request, res: Response) => {
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    res.json({
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        uptime: Math.round(process.uptime()),
        memory: {
          rss: Math.round(memUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
        },
        cpu: {
          user: cpuUsage.user,
          system: cpuUsage.system
        }
      }
    });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Graceful shutdown handling
  process.on('SIGTERM', () => {
    log('SIGTERM received, starting graceful shutdown...');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    log('SIGINT received, starting graceful shutdown...');
    process.exit(0);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
    log('Health endpoints active');
  });
})();
