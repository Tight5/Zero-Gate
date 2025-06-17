#!/usr/bin/env node

const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

class AutoRestartManager {
  constructor() {
    this.process = null;
    this.restartCount = 0;
    this.maxRestarts = 5;
    this.restartWindow = 300000; // 5 minutes
    this.restartTimes = [];
    this.healthCheckUrl = 'http://localhost:5000/health';
    this.healthCheckInterval = 60000; // 1 minute
    this.failureThreshold = 3;
    this.consecutiveFailures = 0;
  }

  start() {
    console.log('🚀 Starting Zero Gate ESO Platform with auto-restart...');
    this.startApplication();
    this.startHealthMonitoring();
    this.setupGracefulShutdown();
  }

  startApplication() {
    console.log('Starting application process...');
    
    this.process = spawn('npm', ['run', 'dev'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'inherit',
      env: { ...process.env, NODE_OPTIONS: '--expose-gc --max-old-space-size=4096' }
    });

    this.process.on('exit', (code, signal) => {
      console.log(`Application exited with code ${code}, signal ${signal}`);
      
      if (signal !== 'SIGTERM' && signal !== 'SIGINT') {
        this.handleUnexpectedExit(code);
      }
    });

    this.process.on('error', (error) => {
      console.error('Application process error:', error);
      this.handleUnexpectedExit(1);
    });
  }

  handleUnexpectedExit(exitCode) {
    const now = Date.now();
    this.restartTimes.push(now);
    
    // Remove old restart times outside the window
    this.restartTimes = this.restartTimes.filter(time => now - time < this.restartWindow);
    
    if (this.restartTimes.length >= this.maxRestarts) {
      console.error(`❌ Maximum restart limit reached (${this.maxRestarts} restarts in ${this.restartWindow / 60000} minutes)`);
      console.error('Stopping auto-restart to prevent restart loop');
      process.exit(1);
    }

    this.restartCount++;
    console.log(`🔄 Restarting application (attempt ${this.restartCount})...`);
    
    // Wait a bit before restarting
    setTimeout(() => {
      this.startApplication();
    }, 5000);
  }

  startHealthMonitoring() {
    console.log('Starting health monitoring...');
    
    setInterval(async () => {
      await this.performHealthCheck();
    }, this.healthCheckInterval);
    
    // Initial health check after app startup delay
    setTimeout(async () => {
      await this.performHealthCheck();
    }, 30000); // Wait 30 seconds for app to start
  }

  async performHealthCheck() {
    try {
      const response = await axios.get(this.healthCheckUrl, {
        timeout: 10000
      });
      
      const health = response.data;
      this.consecutiveFailures = 0;
      
      // Check for performance degradation
      if (health.performance?.status === 'degraded' || 
          health.memory?.status === 'critical' ||
          health.performance?.averageResponseTime > 3000) {
        
        console.warn('⚠️ Performance degradation detected, considering restart...');
        this.considerPerformanceRestart(health);
      }
      
    } catch (error) {
      this.consecutiveFailures++;
      console.error(`Health check failed (${this.consecutiveFailures}/${this.failureThreshold}):`, error.message);
      
      if (this.consecutiveFailures >= this.failureThreshold) {
        console.error('🚨 Multiple health check failures, triggering restart...');
        this.triggerRestart('health_check_failures');
      }
    }
  }

  considerPerformanceRestart(health) {
    const memoryUsage = health.memory?.percentage || 0;
    const responseTime = health.performance?.averageResponseTime || 0;
    
    // Trigger restart if memory usage is very high or response time is extremely slow
    if (memoryUsage > 90 || responseTime > 5000) {
      console.warn('🔄 Triggering performance-based restart...');
      this.triggerRestart('performance_degradation');
    }
  }

  triggerRestart(reason) {
    console.log(`🔄 Triggering restart due to: ${reason}`);
    
    if (this.process) {
      this.process.kill('SIGTERM');
      
      // Force kill if it doesn't shut down gracefully
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          console.log('Forcing application shutdown...');
          this.process.kill('SIGKILL');
        }
      }, 10000); // 10 second grace period
    }
  }

  setupGracefulShutdown() {
    const shutdown = (signal) => {
      console.log(`\nReceived ${signal}, shutting down gracefully...`);
      
      if (this.process) {
        this.process.kill('SIGTERM');
        
        setTimeout(() => {
          if (this.process && !this.process.killed) {
            this.process.kill('SIGKILL');
          }
          process.exit(0);
        }, 5000);
      } else {
        process.exit(0);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  }

  getStatus() {
    return {
      processRunning: this.process && !this.process.killed,
      restartCount: this.restartCount,
      consecutiveFailures: this.consecutiveFailures,
      recentRestarts: this.restartTimes.length,
      maxRestarts: this.maxRestarts,
      lastRestart: this.restartTimes.length > 0 ? new Date(this.restartTimes[this.restartTimes.length - 1]) : null
    };
  }
}

// CLI interface
if (require.main === module) {
  console.log('Zero Gate ESO Platform - Auto Restart Manager');
  console.log('============================================');
  
  const manager = new AutoRestartManager();
  manager.start();
}

module.exports = AutoRestartManager;