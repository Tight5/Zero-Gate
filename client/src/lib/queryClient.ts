import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Emergency memory compliance configuration per attached asset specifications
const MEMORY_COMPLIANCE_CONFIG = {
  threshold: 70, // CRITICAL: 70% threshold per File 45 specifications
  maxCacheSize: 10, // Emergency reduction from 25 to 10
  staleTime: 30000, // Emergency: 30 seconds (was 1 minute)
  cacheTime: 60000, // Emergency: 1 minute (was 2 minutes)
  checkInterval: 15000, // Emergency: Check every 15 seconds (was 30)
  maxRetries: 0, // Emergency: No retries to prevent memory accumulation
  emergencyThreshold: 85, // Trigger emergency protocols
  criticalThreshold: 90, // Trigger critical protocols
};

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Memory usage monitoring utility
function getMemoryUsage(): number {
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize;
    const total = performance.memory.totalJSHeapSize;
    return (used / total) * 100;
  }
  return 0;
}

// Memory-aware API request with compliance checking
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Check memory before making request
  const memoryUsage = getMemoryUsage();
  if (memoryUsage > MEMORY_COMPLIANCE_CONFIG.threshold) {
    console.warn(`Memory compliance violation: ${memoryUsage.toFixed(1)}% > 70% threshold`);
    // Clear caches before proceeding
    queryClient.clear();
  }

  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Memory compliance check before fetch
    const memoryUsage = getMemoryUsage();
    if (memoryUsage > MEMORY_COMPLIANCE_CONFIG.threshold) {
      console.warn(`Query blocked: Memory usage ${memoryUsage.toFixed(1)}% exceeds 70% threshold`);
      return null; // Prevent additional memory allocation
    }

    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

// Memory-compliant QueryClient configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      
      // Aggressive memory compliance settings
      staleTime: MEMORY_COMPLIANCE_CONFIG.staleTime, // 1 minute
      gcTime: MEMORY_COMPLIANCE_CONFIG.cacheTime, // 2 minutes
      
      // Memory-aware retry logic
      retry: (failureCount, error) => {
        const memoryUsage = getMemoryUsage();
        if (memoryUsage > MEMORY_COMPLIANCE_CONFIG.threshold) {
          return false; // No retries during high memory usage
        }
        return failureCount < MEMORY_COMPLIANCE_CONFIG.maxRetries;
      },
      
      // Network mode optimization
      networkMode: 'online',
      refetchOnReconnect: false,
    },
    mutations: {
      retry: 0, // No mutation retries for memory efficiency
      gcTime: MEMORY_COMPLIANCE_CONFIG.cacheTime / 2, // 1 minute for mutations
    },
  },
});

// Enhanced memory compliance monitoring and cleanup
let lastCleanupTime = Date.now();
const CLEANUP_COOLDOWN = 10000; // 10 seconds between cleanups

const memoryComplianceMonitor = setInterval(() => {
  const memoryUsage = getMemoryUsage();
  const cacheSize = queryClient.getQueryCache().size;
  const now = Date.now();
  
  // Aggressive cache size management
  if (cacheSize > MEMORY_COMPLIANCE_CONFIG.maxCacheSize) {
    queryClient.clear();
    console.warn(`Cache cleared: Size limit exceeded (${cacheSize} > ${MEMORY_COMPLIANCE_CONFIG.maxCacheSize})`);
    lastCleanupTime = now;
    return;
  }
  
  // Emergency memory threshold compliance - immediate action required
  if (memoryUsage > MEMORY_COMPLIANCE_CONFIG.threshold) {
    // Immediate cleanup without cooldown for compliance violations
    if (memoryUsage > MEMORY_COMPLIANCE_CONFIG.criticalThreshold) {
      // Critical: Immediate full clear + emergency protocols
      queryClient.clear();
      queryClient.getMutationCache().clear();
      console.error(`CRITICAL: Full cache clear at ${memoryUsage.toFixed(1)}% memory usage`);
      
      // Emergency garbage collection
      if (window.gc) {
        try {
          window.gc();
          // Force multiple GC cycles
          setTimeout(() => window.gc && window.gc(), 100);
          setTimeout(() => window.gc && window.gc(), 500);
        } catch (e) {
          console.warn('GC failed:', e);
        }
      }
      
    } else if (memoryUsage > MEMORY_COMPLIANCE_CONFIG.emergencyThreshold) {
      // Emergency: Clear everything immediately
      queryClient.clear();
      console.error(`EMERGENCY: Cache cleared at ${memoryUsage.toFixed(1)}% memory usage`);
      
      if (window.gc) {
        window.gc();
      }
      
    } else {
      // Compliance violation: Clear queries immediately
      queryClient.getQueryCache().clear();
      console.warn(`COMPLIANCE: Query cache cleared at ${memoryUsage.toFixed(1)}% memory usage - exceeds 70% threshold`);
      
      // Reduce cache size limits for compliance
      MEMORY_COMPLIANCE_CONFIG.maxCacheSize = Math.max(5, MEMORY_COMPLIANCE_CONFIG.maxCacheSize - 1);
    }
    
    lastCleanupTime = now;
  }
  
  // Report compliance status every 2 minutes
  if (now % 120000 < MEMORY_COMPLIANCE_CONFIG.checkInterval) {
    const compliant = memoryUsage <= MEMORY_COMPLIANCE_CONFIG.threshold;
    console.log(`Memory Compliance: ${memoryUsage.toFixed(1)}% (${compliant ? 'COMPLIANT' : 'VIOLATION'}) | Cache: ${cacheSize} queries`);
  }
}, MEMORY_COMPLIANCE_CONFIG.checkInterval);

// Export cleanup function for manual control
export const forceMemoryCompliance = () => {
  queryClient.clear();
  if (window.gc) {
    window.gc();
  }
  console.log('Manual memory compliance enforcement executed');
};

// Export memory status for monitoring
export const getMemoryStatus = () => {
  return {
    usage: getMemoryUsage(),
    threshold: MEMORY_COMPLIANCE_CONFIG.threshold,
    cacheSize: queryClient.getQueryCache().size,
    maxCacheSize: MEMORY_COMPLIANCE_CONFIG.maxCacheSize,
    compliant: getMemoryUsage() <= MEMORY_COMPLIANCE_CONFIG.threshold
  };
};
