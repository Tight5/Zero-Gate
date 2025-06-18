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
  private gcInterval: number = 30000; // 30 seconds
  private criticalThreshold: number = 85;
  private warningThreshold: number = 75;

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
    
    // Force GC if memory is critical or if enough time has passed
    return (
      metrics.percentage >= this.criticalThreshold ||
      (metrics.percentage >= this.warningThreshold && timeSinceLastGC > this.gcInterval)
    );
  }

  triggerGarbageCollection(): void {
    if (global.gc) {
      global.gc();
      this.lastGC = Date.now();
      console.log('🧹 Garbage collection triggered');
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