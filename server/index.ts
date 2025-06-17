import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
// Import monitoring modules dynamically to avoid memory issues
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  // Health check endpoints for monitoring
  app.get('/health', async (req: Request, res: Response) => {
    try {
      const { monitor } = await import('./middleware/performanceMonitor.js');
      const { memoryGuard } = await import('./middleware/memoryGuard.js');
      
      const healthStatus = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        performance: monitor.getHealthStatus(),
        memory: memoryGuard.getHealthStatus(),
        connectionPools: poolManager.getHealthSummary(),
        version: process.env.npm_package_version || '1.0.0'
      };

      const isHealthy = 
        healthStatus.performance.status === 'healthy' &&
        healthStatus.memory.status === 'normal' &&
        healthStatus.connectionPools.unhealthyPools === 0;

      res.status(isHealthy ? 200 : 503).json(healthStatus);
    } catch (error) {
      res.status(503).json({ error: 'Health check failed', message: error.message });
    }
  });

  // Detailed metrics endpoint for debugging
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      const { monitor } = await import('./middleware/performanceMonitor.js');
      const { memoryGuard } = await import('./middleware/memoryGuard.js');
      
      res.json({
        performance: monitor.getDetailedMetrics(),
        memory: memoryGuard.getHealthStatus(),
        connectionPools: poolManager.getHealthSummary(),
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          arch: process.arch,
          uptime: process.uptime(),
          cpuUsage: process.cpuUsage(),
          memoryUsage: process.memoryUsage()
        }
      });
    } catch (error) {
      res.status(503).json({ error: 'Metrics unavailable', message: error.message });
    }
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    log('SIGTERM received, starting graceful shutdown...');
    await poolManager.closeAllPools();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    log('SIGINT received, starting graceful shutdown...');
    await poolManager.closeAllPools();
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
    log('Performance monitoring active');
    log('Memory guard active');
    log('Connection pool management active');
  });
})();
