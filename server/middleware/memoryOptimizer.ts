import { Request, Response, NextFunction } from 'express';

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  percentage: number;
}

class MemoryOptimizer {
  private lastGC: number = 0;
  private gcInterval: number = 5000; // 5 seconds for emergency mode
  private criticalThreshold: number = 70; // Lower threshold for more aggressive GC
  private warningThreshold: number = 60;

  getMemoryMetrics(): MemoryMetrics {
    const usage = process.memoryUsage();
    const percentage = Math.round((usage.heapUsed / usage.heapTotal) * 100);
    
    return {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
      percentage
    };
  }

  shouldTriggerGC(metrics: MemoryMetrics): boolean {
    const now = Date.now();
    const timeSinceLastGC = now - this.lastGC;
    
    // Emergency mode: Force GC more aggressively
    return (
      metrics.percentage >= this.criticalThreshold ||
      (metrics.percentage >= this.warningThreshold && timeSinceLastGC > this.gcInterval) ||
      timeSinceLastGC > 10000 // Force GC every 10 seconds
    );
  }

  triggerGarbageCollection(): void {
    if (global.gc) {
      // Multiple GC passes for emergency situations
      global.gc();
      setTimeout(() => global.gc(), 100);
      this.lastGC = Date.now();
      console.log('🧹 Emergency garbage collection triggered');
    }
  }

  middleware = (req: Request, res: Response, next: NextFunction) => {
    const metrics = this.getMemoryMetrics();
    
    // Add memory info to response headers for monitoring
    res.setHeader('X-Memory-Usage', `${metrics.percentage}%`);
    res.setHeader('X-Memory-Heap', `${metrics.heapUsed}MB`);
    
    // Trigger GC if needed
    if (this.shouldTriggerGC(metrics)) {
      this.triggerGarbageCollection();
    }
    
    // Log warnings for high memory usage
    if (metrics.percentage >= this.criticalThreshold) {
      console.warn(`🚨 CRITICAL memory usage: ${metrics.percentage}%`);
    } else if (metrics.percentage >= this.warningThreshold) {
      console.warn(`⚠️ HIGH memory usage: ${metrics.percentage}%`);
    }
    
    next();
  };
}

export const memoryOptimizer = new MemoryOptimizer();
export { MemoryOptimizer };