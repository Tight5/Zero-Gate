
/**
 * Automatic Feature Degradation for 70% Memory Compliance
 * Implements resource-aware feature management per attached asset specifications
 */

export class MemoryCompliantFeatureManager {
  constructor() {
    this.memoryThreshold = 70; // Attached asset specification
    this.criticalThreshold = 85;
    this.features = new Map();
    this.isMonitoring = false;
  }

  registerFeature(name, component, priority = 'medium') {
    this.features.set(name, {
      component,
      priority,
      enabled: true,
      lastDisabled: null
    });
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryAndManageFeatures();
    }, 15000); // Check every 15 seconds
    
    console.log('Feature degradation monitoring started for 70% memory compliance');
  }

  checkMemoryAndManageFeatures() {
    const memoryUsage = this.getMemoryUsage();
    
    if (memoryUsage > this.criticalThreshold) {
      this.disableAllNonEssential();
    } else if (memoryUsage > this.memoryThreshold) {
      this.disableByPriority();
    } else if (memoryUsage < this.memoryThreshold - 5) {
      this.enableByPriority();
    }
  }

  getMemoryUsage() {
    if (performance.memory) {
      const used = performance.memory.usedJSHeapSize;
      const total = performance.memory.totalJSHeapSize;
      return (used / total) * 100;
    }
    return 0;
  }

  disableByPriority() {
    const priorities = ['low', 'medium', 'high'];
    
    for (const priority of priorities) {
      const features = Array.from(this.features.entries())
        .filter(([_, feature]) => feature.priority === priority && feature.enabled);
      
      if (features.length > 0) {
        const [name, feature] = features[0];
        this.disableFeature(name);
        console.warn(`Disabled ${name} (priority: ${priority}) for memory compliance`);
        break;
      }
    }
  }

  disableAllNonEssential() {
    console.error('CRITICAL: Disabling all non-essential features for memory compliance');
    
    for (const [name, feature] of this.features.entries()) {
      if (feature.priority !== 'critical') {
        this.disableFeature(name);
      }
    }
  }

  enableByPriority() {
    const priorities = ['high', 'medium', 'low'];
    
    for (const priority of priorities) {
      const features = Array.from(this.features.entries())
        .filter(([_, feature]) => feature.priority === priority && !feature.enabled);
      
      if (features.length > 0) {
        const [name, _] = features[0];
        this.enableFeature(name);
        console.log(`Re-enabled ${name} (priority: ${priority}) - memory compliant`);
        break;
      }
    }
  }

  disableFeature(name) {
    const feature = this.features.get(name);
    if (feature) {
      feature.enabled = false;
      feature.lastDisabled = new Date();
      
      // Emit event for component to handle
      window.dispatchEvent(new CustomEvent('feature-disabled', {
        detail: { feature: name, reason: 'memory_compliance' }
      }));
    }
  }

  enableFeature(name) {
    const feature = this.features.get(name);
    if (feature) {
      feature.enabled = true;
      
      // Emit event for component to handle
      window.dispatchEvent(new CustomEvent('feature-enabled', {
        detail: { feature: name, reason: 'memory_available' }
      }));
    }
  }

  isFeatureEnabled(name) {
    const feature = this.features.get(name);
    return feature ? feature.enabled : false;
  }

  getStatus() {
    return {
      memoryUsage: this.getMemoryUsage(),
      threshold: this.memoryThreshold,
      features: Object.fromEntries(
        Array.from(this.features.entries()).map(([name, feature]) => [
          name,
          {
            enabled: feature.enabled,
            priority: feature.priority,
            lastDisabled: feature.lastDisabled
          }
        ])
      )
    };
  }
}

// Global feature manager instance
export const featureManager = new MemoryCompliantFeatureManager();

// Register default features with priorities per attached asset specifications
featureManager.registerFeature('relationship_mapping', null, 'low');
featureManager.registerFeature('advanced_analytics', null, 'low');
featureManager.registerFeature('excel_processing', null, 'medium');
featureManager.registerFeature('real_time_updates', null, 'medium');
featureManager.registerFeature('dashboard_charts', null, 'high');
featureManager.registerFeature('basic_navigation', null, 'critical');

// Start monitoring
featureManager.startMonitoring();

export default featureManager;
