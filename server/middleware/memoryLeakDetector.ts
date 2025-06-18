import { Request, Response, NextFunction } from 'express';

interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  percentage: number;
}

class MemoryLeakDetector {
  private snapshots: MemorySnapshot[] = [];
  private maxSnapshots: number = 100;
  private snapshotInterval: number = 30000; // 30 seconds
  private lastSnapshot: number = 0;
  private leakThreshold: number = 10; // MB increase over 5 minutes

  constructor() {
    this.startMonitoring();
  }

  private startMonitoring(): void {
    setInterval(() => {
      this.takeSnapshot();
      this.detectLeaks();
      this.cleanup();
    }, this.snapshotInterval);
  }

  private takeSnapshot(): void {
    const usage = process.memoryUsage();
    const now = Date.now();
    
    if (now - this.lastSnapshot < this.snapshotInterval) return;

    const snapshot: MemorySnapshot = {
      timestamp: now,
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024),
      external: Math.round(usage.external / 1024 / 1024),
      rss: Math.round(usage.rss / 1024 / 1024),
      percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100)
    };

    this.snapshots.push(snapshot);
    this.lastSnapshot = now;

    // Keep only recent snapshots
    if (this.snapshots.length > this.maxSnapshots) {
      this.snapshots = this.snapshots.slice(-this.maxSnapshots);
    }
  }

  private detectLeaks(): void {
    if (this.snapshots.length < 10) return;

    const recent = this.snapshots.slice(-10);
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    const oldSnapshots = this.snapshots.filter(s => s.timestamp < fiveMinutesAgo);
    
    if (oldSnapshots.length === 0) return;

    const oldAverage = oldSnapshots.reduce((sum, s) => sum + s.heapUsed, 0) / oldSnapshots.length;
    const recentAverage = recent.reduce((sum, s) => sum + s.heapUsed, 0) / recent.length;
    const increase = recentAverage - oldAverage;

    if (increase > this.leakThreshold) {
      console.warn(`🚨 MEMORY LEAK DETECTED: ${increase.toFixed(1)}MB increase over 5 minutes`);
      console.warn(`   Old average: ${oldAverage.toFixed(1)}MB, Recent average: ${recentAverage.toFixed(1)}MB`);
      
      // Force aggressive cleanup
      this.forceCleanup();
    }
  }

  private forceCleanup(): void {
    if (global.gc) {
      console.log('🧹 Forcing aggressive memory cleanup due to leak detection');
      // Multiple GC passes
      for (let i = 0; i < 5; i++) {
        setTimeout(() => global.gc(), i * 100);
      }
    }
  }

  private cleanup(): void {
    // Clear old snapshots beyond retention period
    const retentionPeriod = 30 * 60 * 1000; // 30 minutes
    const cutoff = Date.now() - retentionPeriod;
    this.snapshots = this.snapshots.filter(s => s.timestamp > cutoff);
  }

  getMemoryTrend(): { trend: 'increasing' | 'stable' | 'decreasing'; rate: number } {
    if (this.snapshots.length < 5) return { trend: 'stable', rate: 0 };

    const recent = this.snapshots.slice(-5);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const timeSpan = (last.timestamp - first.timestamp) / 1000 / 60; // minutes
    const memoryChange = last.heapUsed - first.heapUsed;
    const rate = memoryChange / timeSpan; // MB per minute

    if (Math.abs(rate) < 0.1) return { trend: 'stable', rate };
    return { trend: rate > 0 ? 'increasing' : 'decreasing', rate };
  }

  getStatus(): {
    current: MemorySnapshot | null;
    trend: ReturnType<typeof this.getMemoryTrend>;
    snapshotCount: number;
  } {
    return {
      current: this.snapshots[this.snapshots.length - 1] || null,
      trend: this.getMemoryTrend(),
      snapshotCount: this.snapshots.length
    };
  }

  middleware = (req: Request, res: Response, next: NextFunction) => {
    // Add memory trend info to response headers
    const status = this.getStatus();
    if (status.current) {
      res.setHeader('X-Memory-Trend', status.trend.trend);
      res.setHeader('X-Memory-Rate', status.trend.rate.toFixed(2));
    }
    next();
  };
}

export const memoryLeakDetector = new MemoryLeakDetector();
export { MemoryLeakDetector };