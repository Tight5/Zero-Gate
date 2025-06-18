import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { memoryOptimizer } from "./middleware/memoryOptimizer";
import { memoryLeakDetector } from "./middleware/memoryLeakDetector";

// Memory optimization: limit request size and enable compression
const app = express();

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Apply memory optimization middleware
app.use(memoryOptimizer.middleware);
app.use(memoryLeakDetector.middleware);

// Aggressive memory management
process.on('warning', (warning) => {
  if (warning.name === 'MaxListenersExceededWarning') {
    console.warn('Memory warning detected, forcing garbage collection');
    if (global.gc) global.gc();
  }
});

// Emergency memory management with aggressive GC
setInterval(() => {
  const memUsage = process.memoryUsage();
  const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  
  if (memPercent >= 90 && global.gc) {
    // Emergency mode: Multiple GC passes at 90%+
    console.log(`🚨 EMERGENCY: ${memPercent}% memory usage, forcing aggressive cleanup`);
    global.gc();
    setTimeout(() => global.gc(), 50);
    setTimeout(() => global.gc(), 100);
    setTimeout(() => global.gc(), 200);
    setTimeout(() => global.gc(), 400);
  } else if (memPercent >= 85 && global.gc) {
    // Critical mode: Triple GC at 85%+
    console.log(`⚠️ CRITICAL: ${memPercent}% memory usage, forcing cleanup`);
    global.gc();
    setTimeout(() => global.gc(), 50);
    setTimeout(() => global.gc(), 150);
  } else if (memPercent > 75 && global.gc) {
    global.gc();
  }
}, 10000); // Every 10 seconds for emergency mode

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

  // Optimized health check endpoints with aggressive memory management
  app.get('/health', (req: Request, res: Response) => {
    const memUsage = process.memoryUsage();
    const memPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    
    // Aggressive garbage collection for memory management
    if (memPercent > 80 && global.gc) {
      global.gc();
      // Force additional cleanup after GC
      setTimeout(() => {
        if (global.gc) global.gc();
      }, 100);
    }
    
    const healthStatus = {
      status: memPercent < 85 ? 'ok' : 'critical', // Lower threshold for stability
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      memory: {
        percentage: memPercent,
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024),
        rss: Math.round(memUsage.rss / 1024 / 1024)
      },
      version: '1.0.0'
    };

    res.status(memPercent < 85 ? 200 : 503).json(healthStatus);
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
