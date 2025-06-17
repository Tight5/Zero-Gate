#!/usr/bin/env node

const axios = require('axios');
const { performance } = require('perf_hooks');

class HealthMonitor {
  constructor(baseUrl = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
    this.alertThresholds = {
      responseTime: 2000, // 2 seconds
      memoryUsage: 85, // 85%
      errorRate: 10, // 10%
      consecutiveFailures: 3
    };
    this.failureCount = 0;
    this.checkInterval = 30000; // 30 seconds
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) {
      console.log('Health monitor is already running');
      return;
    }

    this.isRunning = true;
    console.log(`Starting health monitor for ${this.baseUrl}`);
    console.log(`Check interval: ${this.checkInterval / 1000}s`);
    
    this.intervalId = setInterval(async () => {
      await this.performHealthCheck();
    }, this.checkInterval);

    // Perform initial check
    await this.performHealthCheck();
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.isRunning = false;
      console.log('Health monitor stopped');
    }
  }

  async performHealthCheck() {
    const timestamp = new Date().toISOString();
    console.log(`\n[${timestamp}] Performing health check...`);

    try {
      const healthResult = await this.checkHealth();
      const metricsResult = await this.checkMetrics();
      
      const overallHealth = this.evaluateHealth(healthResult, metricsResult);
      
      if (overallHealth.status === 'healthy') {
        this.failureCount = 0;
        this.logHealthStatus('✅', 'System healthy', overallHealth);
      } else {
        this.failureCount++;
        this.logHealthStatus('⚠️', 'System degraded', overallHealth);
        
        if (this.failureCount >= this.alertThresholds.consecutiveFailures) {
          await this.triggerAlert(overallHealth);
        }
      }

    } catch (error) {
      this.failureCount++;
      console.error('❌ Health check failed:', error.message);
      
      if (this.failureCount >= this.alertThresholds.consecutiveFailures) {
        await this.triggerCriticalAlert(error);
      }
    }
  }

  async checkHealth() {
    const startTime = performance.now();
    
    try {
      const response = await axios.get(`${this.baseUrl}/health`, {
        timeout: 10000 // 10 second timeout
      });
      
      const responseTime = performance.now() - startTime;
      
      return {
        status: response.status,
        responseTime,
        data: response.data,
        isAvailable: true
      };
    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      return {
        status: error.response?.status || 0,
        responseTime,
        error: error.message,
        isAvailable: false
      };
    }
  }

  async checkMetrics() {
    try {
      const response = await axios.get(`${this.baseUrl}/metrics`, {
        timeout: 10000
      });
      
      return {
        status: response.status,
        data: response.data,
        isAvailable: true
      };
    } catch (error) {
      return {
        status: error.response?.status || 0,
        error: error.message,
        isAvailable: false
      };
    }
  }

  evaluateHealth(healthResult, metricsResult) {
    const issues = [];
    let status = 'healthy';

    // Check availability
    if (!healthResult.isAvailable) {
      issues.push('Service unavailable');
      status = 'critical';
    }

    // Check response time
    if (healthResult.responseTime > this.alertThresholds.responseTime) {
      issues.push(`Slow response time: ${Math.round(healthResult.responseTime)}ms`);
      status = status === 'critical' ? 'critical' : 'degraded';
    }

    // Check memory usage
    if (healthResult.data?.memory?.percentage > this.alertThresholds.memoryUsage) {
      issues.push(`High memory usage: ${healthResult.data.memory.percentage}%`);
      status = status === 'critical' ? 'critical' : 'degraded';
    }

    // Check performance metrics
    if (metricsResult.isAvailable && metricsResult.data?.performance) {
      const perf = metricsResult.data.performance;
      if (perf.systemHealth?.status !== 'healthy') {
        issues.push('Performance degradation detected');
        status = status === 'critical' ? 'critical' : 'degraded';
      }
    }

    return {
      status,
      issues,
      responseTime: healthResult.responseTime,
      memoryUsage: healthResult.data?.memory?.percentage || 0,
      consecutiveFailures: this.failureCount,
      lastCheck: new Date().toISOString()
    };
  }

  logHealthStatus(icon, message, health) {
    console.log(`${icon} ${message}`);
    console.log(`  Response time: ${Math.round(health.responseTime)}ms`);
    console.log(`  Memory usage: ${health.memoryUsage}%`);
    console.log(`  Consecutive failures: ${health.consecutiveFailures}`);
    
    if (health.issues.length > 0) {
      console.log(`  Issues: ${health.issues.join(', ')}`);
    }
  }

  async triggerAlert(health) {
    console.error('\n🚨 ALERT: System health degraded!');
    console.error('Details:', JSON.stringify(health, null, 2));
    
    // Here you could integrate with alerting systems like:
    // - Send email notifications
    // - Post to Slack/Discord
    // - Create monitoring system tickets
    // - Send SMS alerts
    
    this.logRecommendedActions(health);
  }

  async triggerCriticalAlert(error) {
    console.error('\n🚨 CRITICAL ALERT: Service unavailable!');
    console.error('Error:', error.message);
    console.error(`Consecutive failures: ${this.failureCount}`);
    
    this.logCriticalActions();
  }

  logRecommendedActions(health) {
    console.log('\n📋 Recommended Actions:');
    
    if (health.memoryUsage > this.alertThresholds.memoryUsage) {
      console.log('  - Check for memory leaks');
      console.log('  - Consider restarting the application');
      console.log('  - Review recent code changes');
    }
    
    if (health.responseTime > this.alertThresholds.responseTime) {
      console.log('  - Check database connection pool');
      console.log('  - Review slow queries');
      console.log('  - Monitor CPU usage');
    }
    
    console.log('  - Check application logs');
    console.log('  - Verify database connectivity');
    console.log('  - Monitor system resources');
  }

  logCriticalActions() {
    console.log('\n📋 Critical Actions Required:');
    console.log('  - Restart the application immediately');
    console.log('  - Check system resources (CPU, memory, disk)');
    console.log('  - Verify database connectivity');
    console.log('  - Check network connectivity');
    console.log('  - Review error logs for root cause');
    console.log('  - Consider scaling resources if needed');
  }

  generateReport() {
    return {
      monitoringStatus: this.isRunning ? 'active' : 'stopped',
      checkInterval: this.checkInterval,
      consecutiveFailures: this.failureCount,
      thresholds: this.alertThresholds,
      lastCheck: new Date().toISOString()
    };
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const baseUrl = args[0] || 'http://localhost:5000';
  
  const monitor = new HealthMonitor(baseUrl);
  
  console.log('Zero Gate ESO Platform - Health Monitor');
  console.log('=====================================');
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\nShutting down health monitor...');
    monitor.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\nShutting down health monitor...');
    monitor.stop();
    process.exit(0);
  });
  
  // Start monitoring
  monitor.start().catch(console.error);
}

module.exports = HealthMonitor;