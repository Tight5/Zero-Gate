#!/usr/bin/env node

/**
 * Emergency Memory Optimization Script
 * Implements aggressive memory management for critical situations
 */

const fs = require('fs').promises;
const path = require('path');

class EmergencyMemoryOptimizer {
  constructor() {
    this.optimizations = [];
    this.timestamp = new Date().toISOString();
  }

  log(message) {
    console.log(`[${new Date().toLocaleTimeString()}] ${message}`);
  }

  async optimizeDashboardRefresh() {
    this.log('🔧 Optimizing dashboard refresh intervals...');
    
    const dashboardFiles = [
      'client/src/pages/Dashboard.tsx',
      'client/src/components/dashboard/KPICards.tsx'
    ];

    for (const file of dashboardFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        let optimized = content
          // Increase refresh intervals dramatically
          .replace(/refetchInterval:\s*\d+000/g, 'refetchInterval: 300000') // 5 minutes
          .replace(/staleTime:\s*\d+000/g, 'staleTime: 600000') // 10 minutes
          .replace(/gcTime:\s*\d+000/g, 'gcTime: 1200000'); // 20 minutes

        await fs.writeFile(file, optimized);
        this.optimizations.push(`Dashboard refresh intervals optimized in ${file}`);
      } catch (error) {
        this.log(`⚠️ Could not optimize ${file}: ${error.message}`);
      }
    }
  }

  async optimizeQueryClient() {
    this.log('🔧 Optimizing React Query client settings...');
    
    try {
      const queryClientFile = 'client/src/lib/queryClient.ts';
      const content = await fs.readFile(queryClientFile, 'utf8');
      
      const optimized = content.replace(
        /staleTime:\s*\d+/g, 'staleTime: 1000 * 60 * 10' // 10 minutes
      ).replace(
        /gcTime:\s*\d+/g, 'gcTime: 1000 * 60 * 20' // 20 minutes  
      );

      await fs.writeFile(queryClientFile, optimized);
      this.optimizations.push('Query client optimized for memory efficiency');
    } catch (error) {
      this.log(`⚠️ Could not optimize query client: ${error.message}`);
    }
  }

  async disableNonEssentialFeatures() {
    this.log('🔧 Disabling non-essential features...');
    
    const featureFlags = {
      relationship_mapping: false,
      advanced_analytics: false,
      excel_processing: false,
      real_time_updates: false
    };

    try {
      await fs.writeFile(
        'client/src/config/emergency-flags.json',
        JSON.stringify(featureFlags, null, 2)
      );
      this.optimizations.push('Non-essential features disabled');
    } catch (error) {
      this.log(`⚠️ Could not write feature flags: ${error.message}`);
    }
  }

  async optimizeServerMiddleware() {
    this.log('🔧 Optimizing server middleware...');
    
    try {
      const serverFile = 'server/index.ts';
      const content = await fs.readFile(serverFile, 'utf8');
      
      // Add memory optimization middleware
      const optimizedContent = content.replace(
        'app.listen(port',
        `
// Emergency memory optimization
setInterval(() => {
  if (global.gc && process.memoryUsage().heapUsed / process.memoryUsage().heapTotal > 0.85) {
    global.gc();
  }
}, 5000);

app.listen(port`
      );

      await fs.writeFile(serverFile, optimizedContent);
      this.optimizations.push('Server memory optimization enabled');
    } catch (error) {
      this.log(`⚠️ Could not optimize server: ${error.message}`);
    }
  }

  generateReport() {
    const report = {
      timestamp: this.timestamp,
      status: 'EMERGENCY_OPTIMIZATION_APPLIED',
      optimizations: this.optimizations,
      memoryTarget: '< 85%',
      recommendations: [
        'Monitor memory usage closely',
        'Consider reducing component complexity',
        'Implement lazy loading for heavy components',
        'Use React.memo for expensive renders'
      ]
    };

    return report;
  }

  async run() {
    this.log('🚨 EMERGENCY MEMORY OPTIMIZATION STARTING 🚨');
    
    await this.optimizeDashboardRefresh();
    await this.optimizeQueryClient();
    await this.disableNonEssentialFeatures();
    await this.optimizeServerMiddleware();
    
    const report = this.generateReport();
    
    try {
      await fs.writeFile(
        'emergency-optimization-report.json',
        JSON.stringify(report, null, 2)
      );
    } catch (error) {
      this.log(`⚠️ Could not write report: ${error.message}`);
    }

    this.log('✅ Emergency memory optimization complete');
    this.log(`Applied ${this.optimizations.length} optimizations`);
    
    return report;
  }
}

// Run if called directly
if (require.main === module) {
  const optimizer = new EmergencyMemoryOptimizer();
  optimizer.run().catch(console.error);
}

module.exports = EmergencyMemoryOptimizer;