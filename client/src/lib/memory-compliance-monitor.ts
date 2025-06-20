
/**
 * Comprehensive Memory Monitoring for 70% Compliance
 * Implements monitoring and alerting per attached asset specifications
 */

export class MemoryComplianceMonitor {
  constructor() {
    this.complianceThreshold = 70; // Attached asset specification
    this.warningThreshold = 65;
    this.criticalThreshold = 85;
    this.isMonitoring = false;
    this.metrics = [];
    this.alerts = [];
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    
    // Monitor every 10 seconds for compliance
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.checkCompliance();
    }, 10000);
    
    // Report every minute
    this.reportingInterval = setInterval(() => {
      this.generateComplianceReport();
    }, 60000);
    
    console.log('Memory compliance monitoring started (70% threshold)');
  }

  collectMetrics() {
    const timestamp = new Date();
    const memory = this.getDetailedMemoryUsage();
    
    const metric = {
      timestamp,
      ...memory,
      compliant: memory.usage <= this.complianceThreshold
    };
    
    this.metrics.push(metric);
    
    // Keep only last hour of metrics
    const oneHourAgo = new Date(Date.now() - 3600000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
  }

  getDetailedMemoryUsage() {
    if (performance.memory) {
      const memory = performance.memory;
      return {
        usage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        usedMB: Math.round(memory.usedJSHeapSize / 1048576),
        totalMB: Math.round(memory.totalJSHeapSize / 1048576),
        limitMB: Math.round(memory.jsHeapSizeLimit / 1048576)
      };
    }
    
    return {
      usage: 0,
      usedMB: 0,
      totalMB: 0,
      limitMB: 0
    };
  }

  checkCompliance() {
    const currentMetric = this.metrics[this.metrics.length - 1];
    if (!currentMetric) return;
    
    const usage = currentMetric.usage;
    
    if (usage > this.criticalThreshold) {
      this.createAlert('CRITICAL', `Memory usage at ${usage.toFixed(1)}% - Emergency protocols activated`);
      this.triggerEmergencyProtocols();
    } else if (usage > this.complianceThreshold) {
      this.createAlert('WARNING', `Memory usage at ${usage.toFixed(1)}% - Exceeds 70% compliance threshold`);
      this.triggerComplianceProtocols();
    } else if (usage > this.warningThreshold) {
      this.createAlert('INFO', `Memory usage at ${usage.toFixed(1)}% - Approaching 70% threshold`);
    }
  }

  createAlert(level, message) {
    const alert = {
      timestamp: new Date(),
      level,
      message,
      id: Date.now()
    };
    
    this.alerts.push(alert);
    console.log(`[MEMORY ${level}] ${message}`);
    
    // Keep only last 50 alerts
    if (this.alerts.length > 50) {
      this.alerts = this.alerts.slice(-50);
    }
    
    // Emit alert event
    window.dispatchEvent(new CustomEvent('memory-alert', { detail: alert }));
  }

  triggerComplianceProtocols() {
    // Trigger feature degradation
    window.dispatchEvent(new CustomEvent('memory-compliance-violation', {
      detail: {
        threshold: this.complianceThreshold,
        currentUsage: this.metrics[this.metrics.length - 1].usage,
        action: 'feature_degradation'
      }
    }));
  }

  triggerEmergencyProtocols() {
    // Trigger emergency shutdown
    window.dispatchEvent(new CustomEvent('memory-emergency', {
      detail: {
        threshold: this.criticalThreshold,
        currentUsage: this.metrics[this.metrics.length - 1].usage,
        action: 'emergency_shutdown'
      }
    }));
  }

  generateComplianceReport() {
    const recentMetrics = this.metrics.slice(-60); // Last 10 minutes
    if (recentMetrics.length === 0) return;
    
    const avgUsage = recentMetrics.reduce((sum, m) => sum + m.usage, 0) / recentMetrics.length;
    const maxUsage = Math.max(...recentMetrics.map(m => m.usage));
    const minUsage = Math.min(...recentMetrics.map(m => m.usage));
    const complianceRate = (recentMetrics.filter(m => m.compliant).length / recentMetrics.length) * 100;
    
    const report = {
      timestamp: new Date(),
      period: '10 minutes',
      compliance: {
        threshold: this.complianceThreshold,
        rate: complianceRate,
        status: complianceRate >= 90 ? 'COMPLIANT' : 'NON_COMPLIANT'
      },
      memory: {
        average: avgUsage,
        maximum: maxUsage,
        minimum: minUsage,
        current: recentMetrics[recentMetrics.length - 1].usage
      },
      alerts: this.alerts.filter(a => 
        a.timestamp > new Date(Date.now() - 600000) // Last 10 minutes
      ).length
    };
    
    console.log('Memory Compliance Report:', report);
    
    // Emit report event
    window.dispatchEvent(new CustomEvent('memory-compliance-report', { detail: report }));
    
    return report;
  }

  getStatus() {
    const current = this.metrics[this.metrics.length - 1];
    
    return {
      monitoring: this.isMonitoring,
      threshold: this.complianceThreshold,
      current: current ? current.usage : 0,
      compliant: current ? current.compliant : true,
      recentAlerts: this.alerts.slice(-5),
      metricsCount: this.metrics.length
    };
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.reportingInterval) {
      clearInterval(this.reportingInterval);
    }
    this.isMonitoring = false;
    console.log('Memory compliance monitoring stopped');
  }
}

// Global monitor instance
export const memoryMonitor = new MemoryComplianceMonitor();

// Auto-start monitoring
memoryMonitor.startMonitoring();

export default memoryMonitor;
