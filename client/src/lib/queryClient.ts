import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Optimized memory compliance configuration balancing performance with resource availability
const MEMORY_COMPLIANCE_CONFIG = {
  threshold: 85, // Adjusted from 70% - browser heap != system memory
  maxCacheSize: 50, // Restored reasonable cache size for 62GB system
  staleTime: 300000, // 5 minutes - appropriate for our system resources
  cacheTime: 600000, // 10 minutes - leveraging available memory effectively
  checkInterval: 60000, // Check every minute - reduces monitoring overhead
  maxRetries: 2, // Restored retries for better user experience
  emergencyThreshold: 92, // Browser heap emergency threshold
  criticalThreshold: 96, // Browser heap critical threshold
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

// Memory-aware API request with intelligent resource assessment
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Intelligent memory check - only intervene if genuinely problematic
  const memoryUsage = getMemoryUsage();
  if (memoryUsage > MEMORY_COMPLIANCE_CONFIG.emergencyThreshold) {
    console.warn(`High browser heap usage: ${memoryUsage.toFixed(1)}% - optimizing cache`);
    // Only clear caches during genuine high usage
    const cacheSize = queryClient.getQueryCache().size;
    if (cacheSize > MEMORY_COMPLIANCE_CONFIG.maxCacheSize) {
      queryClient.getQueryCache().clear();
    }
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
    // Intelligent memory check - only block genuinely problematic requests
    const memoryUsage = getMemoryUsage();
    if (memoryUsage > MEMORY_COMPLIANCE_CONFIG.criticalThreshold) {
      console.warn(`Query temporarily blocked: Critical browser heap usage ${memoryUsage.toFixed(1)}%`);
      return null; // Only block at critical levels
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
  
  // Intelligent memory management based on actual resource availability
  if (memoryUsage > MEMORY_COMPLIANCE_CONFIG.threshold && now - lastCleanupTime > CLEANUP_COOLDOWN) {
    
    if (memoryUsage > MEMORY_COMPLIANCE_CONFIG.criticalThreshold) {
      // Critical: Browser approaching heap limit - immediate action needed
      queryClient.clear();
      console.warn(`Browser heap critical: ${memoryUsage.toFixed(1)}% - Cache cleared`);
      
      // Gentle garbage collection
      if (window.gc) {
        setTimeout(() => window.gc && window.gc(), 1000);
      }
      
    } else if (memoryUsage > MEMORY_COMPLIANCE_CONFIG.emergencyThreshold) {
      // High usage: Progressive cleanup
      const queries = queryClient.getQueryCache().getAll();
      const oldQueries = queries.filter(query => 
        query.state.dataUpdatedAt < Date.now() - MEMORY_COMPLIANCE_CONFIG.staleTime
      );
      
      if (oldQueries.length > 0) {
        oldQueries.forEach(query => queryClient.getQueryCache().remove(query));
        console.log(`Memory optimization: Removed ${oldQueries.length} stale queries at ${memoryUsage.toFixed(1)}%`);
      } else {
        // No stale queries, reduce cache size
        queryClient.getQueryCache().clear();
        console.log(`Memory optimization: Cache cleared at ${memoryUsage.toFixed(1)}%`);
      }
      
    } else {
      // Normal management: Remove only oldest queries
      const cacheSize = queryClient.getQueryCache().size;
      if (cacheSize > MEMORY_COMPLIANCE_CONFIG.maxCacheSize) {
        const queries = queryClient.getQueryCache().getAll()
          .sort((a, b) => a.state.dataUpdatedAt - b.state.dataUpdatedAt)
          .slice(0, cacheSize - MEMORY_COMPLIANCE_CONFIG.maxCacheSize);
        
        queries.forEach(query => queryClient.getQueryCache().remove(query));
        console.log(`Cache optimized: Removed ${queries.length} oldest queries`);
      }
    }
    
    lastCleanupTime = now;
  }
  
  // Intelligent resource reporting every 2 minutes
  if (now % 120000 < MEMORY_COMPLIANCE_CONFIG.checkInterval) {
    const heapUsage = memoryUsage;
    const heapMB = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : 0;
    const limitMB = performance.memory ? Math.round(performance.memory.jsHeapSizeLimit / 1048576) : 0;
    
    console.log(`Browser Heap: ${heapUsage.toFixed(1)}% (${heapMB}MB/${limitMB}MB) | Cache: ${cacheSize} queries | System: 62GB available`);
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
