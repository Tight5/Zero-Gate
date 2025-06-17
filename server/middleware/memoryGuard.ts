import { Request, Response, NextFunction } from 'express';

interface MemoryThresholds {
  warning: number;    // 70% - Start warnings
  critical: number;   // 85% - Block new requests
  emergency: number;  // 90% - Force garbage collection
}

class MemoryGuard {
  private thresholds: MemoryThresholds = {
    warning: 0.70,
    critical: 0.85,
    emergency: 0.90
  };

  private isBlocking = false;
  private lastGcTime = 0;
  private gcCooldown = 30000; // 30 seconds between forced GC
  private memoryHistory: number[] = [];
  private maxHistorySize = 60; // Keep 60 samples (10 minutes at 10s intervals)

  constructor() {
    this.startMemoryMonitoring();
    this.enableGarbageCollection();
  }

  private enableGarbageCollection() {
    // Enable garbage collection if running with --expose-gc
    if (typeof global.gc === 'function') {
      console.log('✅ Garbage collection is available');
    } else {
      console.warn('⚠️ Garbage collection is not available. Start with --expose-gc for better memory management');
    }
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const memoryUsage = this.getMemoryUsage();
      
      // Block requests if memory usage is critical
      if (memoryUsage.percentage > this.thresholds.critical && this.isBlocking) {
        res.status(503).json({
          error: 'Service temporarily unavailable due to high memory usage',
          memoryUsage: `${Math.round(memoryUsage.percentage * 100)}%`,
          retryAfter: 30
        });
        return;
      }

      // Add memory usage headers for monitoring
      res.setHeader('X-Memory-Usage', `${Math.round(memoryUsage.percentage * 100)}%`);
      res.setHeader('X-Memory-Status', this.getMemoryStatus(memoryUsage.percentage));

      next();
    };
  }

  private startMemoryMonitoring() {
    setInterval(() => {
      this.checkMemoryUsage();
    }, 10000); // Check every 10 seconds
  }

  private checkMemoryUsage() {
    const memoryUsage = this.getMemoryUsage();
    const percentage = memoryUsage.percentage;
    
    // Add to history
    this.memoryHistory.push(percentage);
    if (this.memoryHistory.length > this.maxHistorySize) {
      this.memoryHistory.shift();
    }

    // Check thresholds
    if (percentage > this.thresholds.emergency) {
      this.handleEmergencyMemory(memoryUsage);
    } else if (percentage > this.thresholds.critical) {
      this.handleCriticalMemory(memoryUsage);
    } else if (percentage > this.thresholds.warning) {
      this.handleWarningMemory(memoryUsage);
    } else {
      this.handleNormalMemory(memoryUsage);
    }

    // Log memory trends
    this.logMemoryTrends();
  }

  private handleEmergencyMemory(memoryUsage: any) {
    console.error('🚨 EMERGENCY: Memory usage extremely high!', {
      percentage: `${Math.round(memoryUsage.percentage * 100)}%`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
    });

    // Force garbage collection immediately
    this.forceGarbageCollection('emergency');
    
    // Enable request blocking
    this.isBlocking = true;
    
    // Log memory dump for debugging (in development)
    if (process.env.NODE_ENV === 'development') {
      this.logMemoryDump();
    }
  }

  private handleCriticalMemory(memoryUsage: any) {
    console.warn('⚠️ CRITICAL: Memory usage very high', {
      percentage: `${Math.round(memoryUsage.percentage * 100)}%`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    });

    // Force garbage collection if not done recently
    this.forceGarbageCollection('critical');
    
    // Start blocking new requests
    this.isBlocking = true;
  }

  private handleWarningMemory(memoryUsage: any) {
    console.warn('⚠️ WARNING: Memory usage high', {
      percentage: `${Math.round(memoryUsage.percentage * 100)}%`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`
    });

    // Suggest garbage collection
    this.forceGarbageCollection('warning');
  }

  private handleNormalMemory(memoryUsage: any) {
    // Resume normal operations
    if (this.isBlocking) {
      console.log('✅ Memory usage back to normal, resuming operations');
      this.isBlocking = false;
    }
  }

  private forceGarbageCollection(reason: string) {
    const now = Date.now();
    
    // Respect cooldown period
    if (now - this.lastGcTime < this.gcCooldown) {
      return;
    }

    if (typeof global.gc === 'function') {
      console.log(`🧹 Running garbage collection (${reason})`);
      
      const beforeMemory = process.memoryUsage();
      global.gc();
      const afterMemory = process.memoryUsage();
      
      const freedMemory = beforeMemory.heapUsed - afterMemory.heapUsed;
      console.log(`🧹 GC completed: freed ${Math.round(freedMemory / 1024 / 1024)}MB`);
      
      this.lastGcTime = now;
    }
  }

  private getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      ...usage,
      percentage: usage.heapUsed / usage.heapTotal
    };
  }

  private getMemoryStatus(percentage: number): string {
    if (percentage > this.thresholds.emergency) return 'emergency';
    if (percentage > this.thresholds.critical) return 'critical';
    if (percentage > this.thresholds.warning) return 'warning';
    return 'normal';
  }

  private logMemoryTrends() {
    if (this.memoryHistory.length < 6) return; // Need at least 1 minute of data
    
    const recent = this.memoryHistory.slice(-6); // Last 6 samples (1 minute)
    const older = this.memoryHistory.slice(-12, -6); // Previous 6 samples
    
    if (older.length === 6) {
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      const trend = recentAvg - olderAvg;
      
      if (Math.abs(trend) > 0.05) { // 5% change
        const direction = trend > 0 ? 'increasing' : 'decreasing';
        console.log(`📈 Memory trend: ${direction} by ${Math.round(Math.abs(trend) * 100)}% over last minute`);
      }
    }
  }

  private logMemoryDump() {
    const usage = this.getMemoryUsage();
    console.log('🔍 Memory dump:', {
      rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(usage.external / 1024 / 1024)}MB`,
      arrayBuffers: `${Math.round(usage.arrayBuffers / 1024 / 1024)}MB`,
      percentage: `${Math.round(usage.percentage * 100)}%`,
      isBlocking: this.isBlocking
    });
  }

  getHealthStatus() {
    const memoryUsage = this.getMemoryUsage();
    const status = this.getMemoryStatus(memoryUsage.percentage);
    
    return {
      status,
      percentage: Math.round(memoryUsage.percentage * 100),
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      isBlocking: this.isBlocking,
      lastGc: this.lastGcTime > 0 ? new Date(this.lastGcTime) : null,
      trend: this.getMemoryTrend()
    };
  }

  private getMemoryTrend(): string {
    if (this.memoryHistory.length < 6) return 'unknown';
    
    const recent = this.memoryHistory.slice(-3); // Last 3 samples
    const older = this.memoryHistory.slice(-6, -3); // Previous 3 samples
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    const trend = recentAvg - olderAvg;
    
    if (Math.abs(trend) < 0.02) return 'stable';
    return trend > 0 ? 'increasing' : 'decreasing';
  }

  // Manual memory cleanup for critical situations
  forceCleanup() {
    console.log('🧹 Manual memory cleanup initiated');
    
    // Clear any large data structures that can be recreated
    this.memoryHistory = this.memoryHistory.slice(-10); // Keep only recent history
    
    // Force garbage collection
    this.forceGarbageCollection('manual');
    
    return this.getHealthStatus();
  }
}

const memoryGuard = new MemoryGuard();

export { memoryGuard, MemoryGuard };
export default memoryGuard.middleware();