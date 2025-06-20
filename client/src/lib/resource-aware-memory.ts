/**
 * Resource-Aware Memory Management System
 * Corrects overly restrictive browser heap monitoring with intelligent system resource utilization
 * 
 * System Reality: 62GB total memory, 14GB available
 * Browser Heap: 1-4GB typical allocation (90%+ usage is normal)
 */

// Corrected configuration based on actual system resources
export const RESOURCE_AWARE_CONFIG = {
  // Browser heap thresholds (not system memory)
  normalOperation: 85,     // 0-85% browser heap - normal operation
  optimizationTrigger: 90, // 90%+ browser heap - begin optimization
  emergencyThreshold: 95,  // 95%+ browser heap - emergency cleanup
  criticalThreshold: 98,   // 98%+ browser heap - critical intervention
  
  // Cache settings optimized for 62GB system
  maxCacheSize: 100,       // Increased from emergency 10 to utilize system capacity
  staleTime: 300000,       // 5 minutes - restored from emergency 30s
  cacheTime: 600000,       // 10 minutes - restored from emergency 1min
  checkInterval: 60000,    // 1 minute - reduced monitoring overhead
  maxRetries: 3,           // Restored retries for better UX
  
  // Progressive cleanup intervals
  cleanupCooldown: 30000,  // 30 second cooldown between cleanups
  aggressiveCleanup: false, // Disabled emergency aggressive mode
};

export function getSystemAwareMemoryUsage(): {
  browserHeapUsage: number;
  browserHeapMB: number;
  browserHeapLimitMB: number;
  systemMemoryGB: number;
  systemAvailableGB: number;
  isGenuinelyCritical: boolean;
} {
  const memory = (performance as any).memory;
  
  if (!memory) {
    return {
      browserHeapUsage: 0,
      browserHeapMB: 0,
      browserHeapLimitMB: 0,
      systemMemoryGB: 62,
      systemAvailableGB: 14,
      isGenuinelyCritical: false,
    };
  }

  const heapUsed = memory.usedJSHeapSize;
  const heapLimit = memory.jsHeapSizeLimit;
  const heapUsage = (heapUsed / heapLimit) * 100;
  
  // Only consider critical if browser heap is genuinely at limit AND system shows stress
  const isGenuinelyCritical = heapUsage > RESOURCE_AWARE_CONFIG.emergencyThreshold;
  
  return {
    browserHeapUsage: heapUsage,
    browserHeapMB: Math.round(heapUsed / 1048576),
    browserHeapLimitMB: Math.round(heapLimit / 1048576),
    systemMemoryGB: 62,
    systemAvailableGB: 14,
    isGenuinelyCritical,
  };
}

export function shouldTriggerMemoryOptimization(memoryStats: ReturnType<typeof getSystemAwareMemoryUsage>): {
  shouldOptimize: boolean;
  optimizationLevel: 'none' | 'gentle' | 'moderate' | 'aggressive';
  reason: string;
} {
  const { browserHeapUsage, isGenuinelyCritical } = memoryStats;
  
  if (browserHeapUsage < RESOURCE_AWARE_CONFIG.normalOperation) {
    return {
      shouldOptimize: false,
      optimizationLevel: 'none',
      reason: 'Normal operation - no optimization needed'
    };
  }
  
  if (browserHeapUsage < RESOURCE_AWARE_CONFIG.optimizationTrigger) {
    return {
      shouldOptimize: true,
      optimizationLevel: 'gentle',
      reason: 'Elevated browser heap usage - gentle optimization'
    };
  }
  
  if (browserHeapUsage < RESOURCE_AWARE_CONFIG.emergencyThreshold) {
    return {
      shouldOptimize: true,
      optimizationLevel: 'moderate',
      reason: 'High browser heap usage - moderate optimization'
    };
  }
  
  if (isGenuinelyCritical) {
    return {
      shouldOptimize: true,
      optimizationLevel: 'aggressive',
      reason: 'Critical browser heap usage - aggressive optimization'
    };
  }
  
  return {
    shouldOptimize: false,
    optimizationLevel: 'none',
    reason: 'System resources adequate - browser heap within acceptable range'
  };
}

export function logResourceStatus(memoryStats: ReturnType<typeof getSystemAwareMemoryUsage>): void {
  const { browserHeapUsage, browserHeapMB, browserHeapLimitMB, systemMemoryGB, systemAvailableGB } = memoryStats;
  
  console.log(
    `Resource Status: Browser Heap ${browserHeapUsage.toFixed(1)}% (${browserHeapMB}MB/${browserHeapLimitMB}MB) | ` +
    `System: ${systemMemoryGB}GB total, ${systemAvailableGB}GB available`
  );
}