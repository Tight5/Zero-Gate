#!/usr/bin/env node
/**
 * Emergency Memory Optimization Script
 * Implements aggressive memory management for critical situations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmergencyMemoryOptimizer {
  constructor() {
    this.optimizations = [];
  }

  log(message) {
    console.log(`[MEMORY-OPT] ${new Date().toISOString()} - ${message}`);
  }

  // Reduce dashboard refresh intervals
  optimizeDashboardRefresh() {
    const configPath = path.join(__dirname, '../client/src/lib/constants.ts');
    if (fs.existsSync(configPath)) {
      let content = fs.readFileSync(configPath, 'utf8');
      
      // Increase refresh intervals to reduce memory pressure
      content = content.replace(/autoRefreshInterval:\s*5000/g, 'autoRefreshInterval: 15000');
      content = content.replace(/refetchInterval:\s*5000/g, 'refetchInterval: 15000');
      
      fs.writeFileSync(configPath, content);
      this.optimizations.push('Dashboard refresh intervals increased to 15s');
    }
  }

  // Optimize query client cache settings
  optimizeQueryClient() {
    const queryClientPath = path.join(__dirname, '../client/src/lib/queryClient.ts');
    if (fs.existsSync(queryClientPath)) {
      let content = fs.readFileSync(queryClientPath, 'utf8');
      
      // Reduce cache time and stale time
      content = content.replace(/cacheTime:\s*1000\s*\*\s*60\s*\*\s*15/g, 'cacheTime: 1000 * 60 * 5'); // 5 min instead of 15
      content = content.replace(/staleTime:\s*1000\s*\*\s*60\s*\*\s*5/g, 'staleTime: 1000 * 60 * 2'); // 2 min instead of 5
      
      fs.writeFileSync(queryClientPath, content);
      this.optimizations.push('Query cache times reduced for memory conservation');
    }
  }

  // Disable non-essential features temporarily
  disableNonEssentialFeatures() {
    const configPath = path.join(__dirname, '../client/src/config/features.ts');
    if (fs.existsSync(configPath)) {
      let content = fs.readFileSync(configPath, 'utf8');
      
      // Disable analytics and debug features
      content = content.replace(/analytics:\s*true/g, 'analytics: false');
      content = content.replace(/debug:\s*true/g, 'debug: false');
      content = content.replace(/resourceMonitoring:\s*true/g, 'resourceMonitoring: false');
      
      fs.writeFileSync(configPath, content);
      this.optimizations.push('Non-essential features disabled');
    }
  }

  // Optimize server middleware
  optimizeServerMiddleware() {
    const indexPath = path.join(__dirname, '../server/index.ts');
    if (fs.existsSync(indexPath)) {
      let content = fs.readFileSync(indexPath, 'utf8');
      
      // Add memory pressure monitoring
      const memoryMiddleware = `
// Emergency memory optimization middleware
app.use((req, res, next) => {
  const usage = process.memoryUsage();
  const percentage = Math.round((usage.heapUsed / usage.heapTotal) * 100);
  
  if (percentage > 95) {
    // Immediate response for high memory usage
    if (req.path.includes('/api/dashboard/metrics')) {
      return res.json({ 
        memory_critical: true, 
        memory_percentage: percentage,
        optimization_active: true 
      });
    }
  }
  
  // Force garbage collection every 30 requests when memory is high
  if (percentage > 90 && Math.random() < 0.033) {
    setImmediate(() => {
      if (global.gc) global.gc();
    });
  }
  
  next();
});
`;
      
      // Insert before the routes registration
      content = content.replace(
        /registerRoutes\(app\)/,
        `${memoryMiddleware.trim()}\n\n  const httpServer = await registerRoutes(app);`
      );
      
      fs.writeFileSync(indexPath, content);
      this.optimizations.push('Emergency memory middleware added');
    }
  }

  // Generate optimization report
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      optimizations_applied: this.optimizations,
      status: 'EMERGENCY_MEMORY_OPTIMIZATION_ACTIVE',
      recommendations: [
        'Monitor memory usage closely',
        'Microsoft integration ready once correct secret provided',
        'Dashboard functionality maintained with reduced refresh rates',
        'Consider restarting application after memory stabilizes'
      ]
    };

    fs.writeFileSync(
      path.join(__dirname, '../optimization-emergency-report.json'),
      JSON.stringify(report, null, 2)
    );

    this.log('Emergency optimization report generated');
    return report;
  }

  async run() {
    this.log('Starting emergency memory optimization...');
    
    try {
      this.optimizeDashboardRefresh();
      this.optimizeQueryClient();
      this.disableNonEssentialFeatures();
      this.optimizeServerMiddleware();
      
      const report = this.generateReport();
      
      this.log(`Applied ${this.optimizations.length} optimizations:`);
      this.optimizations.forEach(opt => this.log(`  ✓ ${opt}`));
      
      this.log('Emergency memory optimization completed');
      return report;
      
    } catch (error) {
      this.log(`Error during optimization: ${error.message}`);
      throw error;
    }
  }
}

// Run optimization if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const optimizer = new EmergencyMemoryOptimizer();
  optimizer.run()
    .then(report => {
      console.log('\nOptimization Summary:');
      console.log(JSON.stringify(report, null, 2));
      process.exit(0);
    })
    .catch(error => {
      console.error('Optimization failed:', error);
      process.exit(1);
    });
}

export default EmergencyMemoryOptimizer;