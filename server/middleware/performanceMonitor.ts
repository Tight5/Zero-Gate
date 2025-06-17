import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';

interface PerformanceMetrics {
  timestamp: number;
  endpoint: string;
  method: string;
  responseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private maxMetrics = 1000; // Keep last 1000 requests
  private alertThresholds = {
    responseTime: 2000, // 2 seconds
    memoryUsage: 0.85, // 85% of available memory
    consecutiveSlowRequests: 5
  };
  private slowRequestCount = 0;
  private lastMemoryCheck = Date.now();
  private memoryCheckInterval = 30000; // 30 seconds

  constructor() {
    // Start memory monitoring
    this.startMemoryMonitoring();
  }

  middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      const startCpuUsage = process.cpuUsage();
      
      // Override res.end to capture response time
      const originalEnd = res.end;
      res.end = function(this: Response, ...args: any[]) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        const endCpuUsage = process.cpuUsage(startCpuUsage);
        const memoryUsage = process.memoryUsage();
        
        // Record metrics
        const metric: PerformanceMetrics = {
          timestamp: Date.now(),
          endpoint: req.path,
          method: req.method,
          responseTime,
          memoryUsage,
          cpuUsage: endCpuUsage
        };
        
        monitor.recordMetric(metric);
        
        // Check for performance alerts
        monitor.checkAlerts(metric);
        
        return originalEnd.apply(this, args);
      };
      
      next();
    };
  }

  private recordMetric(metric: PerformanceMetrics) {
    this.metrics.push(metric);
    
    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }
  }

  private checkAlerts(metric: PerformanceMetrics) {
    // Check response time alert
    if (metric.responseTime > this.alertThresholds.responseTime) {
      this.slowRequestCount++;
      console.warn(`🚨 Slow request detected: ${metric.endpoint} took ${metric.responseTime.toFixed(2)}ms`);
      
      if (this.slowRequestCount >= this.alertThresholds.consecutiveSlowRequests) {
        this.triggerPerformanceAlert('consecutive_slow_requests', {
          count: this.slowRequestCount,
          lastEndpoint: metric.endpoint,
          responseTime: metric.responseTime
        });
      }
    } else {
      this.slowRequestCount = 0; // Reset counter on fast request
    }

    // Check memory usage
    const memoryUsagePercent = metric.memoryUsage.heapUsed / metric.memoryUsage.heapTotal;
    if (memoryUsagePercent > this.alertThresholds.memoryUsage) {
      this.triggerPerformanceAlert('high_memory_usage', {
        usage: memoryUsagePercent,
        heapUsed: metric.memoryUsage.heapUsed,
        heapTotal: metric.memoryUsage.heapTotal
      });
    }
  }

  private startMemoryMonitoring() {
    setInterval(() => {
      const memoryUsage = process.memoryUsage();
      const now = Date.now();
      
      // Force garbage collection if memory usage is high
      const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
      if (memoryUsagePercent > 0.8 && global.gc) {
        console.log('🧹 Running garbage collection due to high memory usage');
        global.gc();
      }
      
      // Log memory trends
      if (now - this.lastMemoryCheck > this.memoryCheckInterval) {
        console.log(`📊 Memory usage: ${(memoryUsagePercent * 100).toFixed(1)}% (${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB used)`);
        this.lastMemoryCheck = now;
      }
    }, 10000); // Check every 10 seconds
  }

  private triggerPerformanceAlert(type: string, data: any) {
    const alert = {
      type,
      timestamp: new Date().toISOString(),
      data,
      action: this.getRecommendedAction(type)
    };
    
    console.error(`🚨 PERFORMANCE ALERT: ${type}`, alert);
    
    // Execute automatic recovery actions
    this.executeRecoveryAction(type, data);
  }

  private getRecommendedAction(type: string): string {
    switch (type) {
      case 'consecutive_slow_requests':
        return 'Consider restarting the application or scaling resources';
      case 'high_memory_usage':
        return 'Run garbage collection and check for memory leaks';
      default:
        return 'Monitor system resources and application logs';
    }
  }

  private executeRecoveryAction(type: string, data: any) {
    switch (type) {
      case 'consecutive_slow_requests':
        // Clear any cached data that might be causing issues
        this.clearCaches();
        break;
      case 'high_memory_usage':
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
          console.log('🧹 Executed garbage collection for memory recovery');
        }
        break;
    }
  }

  private clearCaches() {
    // Clear metrics history to free memory
    this.metrics = this.metrics.slice(-100); // Keep only last 100
    console.log('🧹 Cleared performance metrics cache');
  }

  getHealthStatus() {
    const recentMetrics = this.metrics.slice(-10); // Last 10 requests
    if (recentMetrics.length === 0) {
      return {
        status: 'unknown',
        averageResponseTime: 0,
        requestCount: 0
      };
    }

    const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
    const memoryUsage = process.memoryUsage();
    const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;

    return {
      status: avgResponseTime < 1000 && memoryUsagePercent < 0.8 ? 'healthy' : 'degraded',
      averageResponseTime: Math.round(avgResponseTime),
      memoryUsagePercent: Math.round(memoryUsagePercent * 100),
      requestCount: this.metrics.length,
      slowRequestCount: this.slowRequestCount
    };
  }

  getDetailedMetrics() {
    const recentMetrics = this.metrics.slice(-50); // Last 50 requests
    const endpoints = new Map<string, { count: number; totalTime: number; errors: number }>();
    
    recentMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.endpoint}`;
      const existing = endpoints.get(key) || { count: 0, totalTime: 0, errors: 0 };
      
      existing.count++;
      existing.totalTime += metric.responseTime;
      if (metric.responseTime > this.alertThresholds.responseTime) {
        existing.errors++;
      }
      
      endpoints.set(key, existing);
    });

    const endpointStats = Array.from(endpoints.entries()).map(([endpoint, stats]) => ({
      endpoint,
      averageResponseTime: Math.round(stats.totalTime / stats.count),
      requestCount: stats.count,
      errorRate: Math.round((stats.errors / stats.count) * 100)
    }));

    return {
      totalRequests: this.metrics.length,
      recentRequests: recentMetrics.length,
      endpointStats,
      systemHealth: this.getHealthStatus()
    };
  }
}

const monitor = new PerformanceMonitor();

export { monitor, PerformanceMonitor };
export default monitor.middleware();