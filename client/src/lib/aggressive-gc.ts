
/**
 * Aggressive Garbage Collection for 70% Memory Compliance
 * Implements memory monitoring and cleanup per attached asset specifications
 */

class AggressiveGarbageCollector {
  constructor() {
    this.memoryThreshold = 70; // Attached asset specification
    this.checkInterval = 30000; // Check every 30 seconds
    this.isMonitoring = false;
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.checkMemoryAndCleanup();
    }, this.checkInterval);
    
    console.log('Aggressive GC monitoring started for 70% memory compliance');
  }

  stopMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.isMonitoring = false;
    }
  }

  checkMemoryAndCleanup() {
    const memoryUsage = this.getMemoryUsage();
    
    if (memoryUsage > this.memoryThreshold) {
      this.performAggressiveCleanup(memoryUsage);
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

  performAggressiveCleanup(currentUsage) {
    console.warn(`Memory compliance violation: ${currentUsage}% > 70% threshold`);
    
    // 1. Clear React Query caches
    if (window.queryClient) {
      window.queryClient.clear();
    }
    
    // 2. Clear component state caches
    this.clearComponentCaches();
    
    // 3. Force garbage collection
    if (window.gc) {
      window.gc();
    }
    
    // 4. Disable non-essential features
    this.disableNonEssentialFeatures();
    
    // 5. Schedule follow-up check
    setTimeout(() => {
      const newUsage = this.getMemoryUsage();
      console.log(`Memory after cleanup: ${newUsage}%`);
      
      if (newUsage > this.memoryThreshold) {
        // Emergency protocol: disable all non-critical features
        this.emergencyFeatureShutdown();
      }
    }, 5000);
  }

  clearComponentCaches() {
    // Clear localStorage non-essential data
    const keysToKeep = ['auth-token', 'tenant-context', 'user-preferences'];
    
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key && !keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    }
    
    // Clear sessionStorage
    sessionStorage.clear();
  }

  disableNonEssentialFeatures() {
    // Emit event to disable features per attached asset specifications
    window.dispatchEvent(new CustomEvent('memory-compliance-mode', {
      detail: {
        memoryThreshold: this.memoryThreshold,
        disabledFeatures: [
          'relationship_mapping',
          'advanced_analytics',
          'excel_processing',
          'real_time_updates'
        ]
      }
    }));
  }

  emergencyFeatureShutdown() {
    console.error('EMERGENCY: Memory usage exceeds 70% threshold after cleanup');
    
    window.dispatchEvent(new CustomEvent('emergency-memory-shutdown', {
      detail: {
        message: 'Platform entering emergency mode for memory compliance',
        disabledFeatures: 'all_non_essential'
      }
    }));
  }
}

// Initialize global garbage collector
export const aggressiveGC = new AggressiveGarbageCollector();

// Start monitoring on module load
aggressiveGC.startMonitoring();

export default aggressiveGC;
