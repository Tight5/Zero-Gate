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
  private gcInterval: number = 2000; // 2 seconds for extreme emergency mode
  private criticalThreshold: number = 85; // Emergency threshold at 85%
  private warningThreshold: number = 75; // Warning at 75%
  private emergencyThreshold: number = 90; // Immediate action at 90%

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
    
    // Emergency mode: Immediate GC at 90%+
    if (metrics.percentage >= this.emergencyThreshold) {
      return true;
    }
    
    // Critical mode: Aggressive GC at 85%+
    if (metrics.percentage >= this.criticalThreshold) {
      return timeSinceLastGC > this.gcInterval;
    }
    
    // Warning mode: Regular GC at 75%+
    return (
      (metrics.percentage >= this.warningThreshold && timeSinceLastGC > this.gcInterval * 2) ||
      timeSinceLastGC > 15000 // Force GC every 15 seconds in normal mode
    );
  }

  triggerGarbageCollection(): void {
    if (global.gc) {
      const metrics = this.getMemoryMetrics();
      
      if (metrics.percentage >= this.emergencyThreshold) {
        // Emergency mode: Aggressive multiple GC passes
        console.log(`🚨 EMERGENCY GC at ${metrics.percentage}% memory usage`);
        global.gc();
        setTimeout(() => global.gc(), 50);
        setTimeout(() => global.gc(), 100);
        setTimeout(() => global.gc(), 200);
      } else if (metrics.percentage >= this.criticalThreshold) {
        // Critical mode: Double GC pass
        console.log(`⚠️ CRITICAL GC at ${metrics.percentage}% memory usage`);
        global.gc();
        setTimeout(() => global.gc(), 100);
      } else {
        // Normal GC
        global.gc();
      }
      
      this.lastGC = Date.now();
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