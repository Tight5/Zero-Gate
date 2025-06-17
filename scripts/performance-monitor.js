#!/usr/bin/env node

import { execSync } from 'child_process';
import os from 'os';
import { performance } from 'perf_hooks';

class PerformanceMonitor {
  constructor() {
    this.metrics = {
      cpu: [],
      memory: [],
      responseTime: [],
      dbQueries: []
    };
    this.startTime = performance.now();
  }

  async collectSystemMetrics() {
    const cpuUsage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    return {
      timestamp: Date.now(),
      cpu: {
        user: cpuUsage.user / 1000, // Convert to milliseconds
        system: cpuUsage.system / 1000,
        percent: (process.cpuUsage().user + process.cpuUsage().system) / 1000000 // Rough percentage
      },
      memory: {
        used: memUsage.heapUsed / 1024 / 1024, // MB
        total: memUsage.heapTotal / 1024 / 1024, // MB
        external: memUsage.external / 1024 / 1024, // MB
        rss: memUsage.rss / 1024 / 1024 // MB
      },
      system: {
        loadAvg: os.loadavg(),
        uptime: os.uptime(),
        freeMem: os.freemem() / 1024 / 1024, // MB
        totalMem: os.totalmem() / 1024 / 1024 // MB
      }
    };
  }

  async testDatabasePerformance() {
    const tests = [
      { name: 'User Query', endpoint: '/api/auth/user' },
      { name: 'Dashboard KPIs', endpoint: '/api/dashboard/kpis' },
      { name: 'System Metrics', endpoint: '/api/dashboard/metrics' }
    ];

    const results = [];

    for (const test of tests) {
      try {
        const start = performance.now();
        
        const response = await fetch(`http://localhost:5000${test.endpoint}`, {
          headers: {
            'Cookie': 'connect.sid=test', // Mock session for testing
            'X-Tenant-ID': 'a9ce749c-9d1b-4d72-837a-5c7938cb4b36'
          }
        });

        const end = performance.now();
        const responseTime = end - start;

        results.push({
          test: test.name,
          endpoint: test.endpoint,
          status: response.status,
          responseTime: Math.round(responseTime * 100) / 100,
          success: response.status < 400
        });

      } catch (error) {
        results.push({
          test: test.name,
          endpoint: test.endpoint,
          status: 'ERROR',
          responseTime: 0,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  async analyzeBuildPerformance() {
    console.log('Analyzing build performance...');
    
    const buildStart = performance.now();
    
    try {
      // Test build process
      execSync('npm run build:fast', { 
        stdio: 'pipe',
        timeout: 60000 // 1 minute timeout
      });
      
      const buildEnd = performance.now();
      const buildTime = buildEnd - buildStart;

      return {
        buildTime: Math.round(buildTime),
        status: 'success'
      };

    } catch (error) {
      return {
        buildTime: 0,
        status: 'failed',
        error: error.message
      };
    }
  }

  generateReport() {
    const uptime = performance.now() - this.startTime;
    
    return {
      timestamp: new Date().toISOString(),
      uptime: Math.round(uptime),
      summary: {
        totalTests: this.metrics.responseTime.length,
        avgResponseTime: this.metrics.responseTime.length > 0 
          ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
          : 0,
        memoryPeak: Math.max(...this.metrics.memory.map(m => m.used)),
        cpuPeak: Math.max(...this.metrics.cpu.map(c => c.percent))
      }
    };
  }

  async runComprehensiveTest() {
    console.log('Zero Gate ESO Platform - Performance Analysis');
    console.log('============================================');

    // System metrics
    console.log('Collecting system metrics...');
    const systemMetrics = await this.collectSystemMetrics();
    console.log(`Memory Usage: ${systemMetrics.memory.used.toFixed(1)}MB / ${systemMetrics.memory.total.toFixed(1)}MB`);
    console.log(`System Load: ${systemMetrics.system.loadAvg[0].toFixed(2)}`);

    // Database performance
    console.log('\nTesting database performance...');
    const dbTests = await this.testDatabasePerformance();
    
    dbTests.forEach(test => {
      const status = test.success ? '✓' : '✗';
      console.log(`${status} ${test.test}: ${test.responseTime}ms (${test.status})`);
    });

    // Build performance
    console.log('\nAnalyzing build performance...');
    const buildPerf = await this.analyzeBuildPerformance();
    
    if (buildPerf.status === 'success') {
      console.log(`✓ Build completed in ${buildPerf.buildTime}ms`);
    } else {
      console.log(`✗ Build failed: ${buildPerf.error}`);
    }

    // Performance recommendations
    console.log('\nPerformance Recommendations:');
    
    if (systemMetrics.memory.used > 100) {
      console.log('⚠ Memory usage high - consider optimization');
    }
    
    const slowTests = dbTests.filter(t => t.responseTime > 500);
    if (slowTests.length > 0) {
      console.log('⚠ Slow database queries detected - review indexing');
    }

    if (buildPerf.buildTime > 30000) {
      console.log('⚠ Build time slow - consider build optimization');
    }

    console.log('\n============================================');
    console.log('Performance analysis complete');

    return {
      systemMetrics,
      databaseTests: dbTests,
      buildPerformance: buildPerf,
      recommendations: this.generateOptimizationRecommendations(systemMetrics, dbTests, buildPerf)
    };
  }

  generateOptimizationRecommendations(system, db, build) {
    const recommendations = [];

    if (system.memory.used > 100) {
      recommendations.push('Optimize memory usage with efficient data structures');
    }

    if (db.some(t => t.responseTime > 500)) {
      recommendations.push('Add database indexes for frequently queried fields');
    }

    if (build.buildTime > 30000) {
      recommendations.push('Implement build caching and code splitting');
    }

    return recommendations;
  }
}

// Run performance monitoring
const monitor = new PerformanceMonitor();
monitor.runComprehensiveTest().catch(console.error);