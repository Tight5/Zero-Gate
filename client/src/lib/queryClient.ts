import { QueryClient, QueryFunction } from "@tanstack/react-query";

// Memory compliance configuration per attached asset specifications
const MEMORY_COMPLIANCE_CONFIG = {
  threshold: 70, // Attached asset specification
  maxCacheSize: 25, // Reduced from 50 for compliance
  staleTime: 60000, // 1 minute (reduced from 5 minutes)
  cacheTime: 120000, // 2 minutes (reduced from 10 minutes)
  checkInterval: 30000, // Check every 30 seconds
  maxRetries: 1, // Reduced retries for memory efficiency
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
  
  // Memory threshold compliance
  if (memoryUsage > MEMORY_COMPLIANCE_CONFIG.threshold && now - lastCleanupTime > CLEANUP_COOLDOWN) {
    // Progressive cleanup based on memory pressure
    if (memoryUsage > 85) {
      // Critical: Clear everything
      queryClient.clear();
      console.error(`CRITICAL: Full cache clear at ${memoryUsage.toFixed(1)}% memory usage`);
    } else if (memoryUsage > 75) {
      // High: Clear old queries
      queryClient.getQueryCache().clear();
      console.warn(`HIGH: Query cache cleared at ${memoryUsage.toFixed(1)}% memory usage`);
    } else {
      // Warning: Remove stale queries
      const queries = queryClient.getQueryCache().getAll();
      const staleQueries = queries.filter(query => 
        query.state.dataUpdatedAt < Date.now() - MEMORY_COMPLIANCE_CONFIG.staleTime
      );
      staleQueries.forEach(query => {
        queryClient.getQueryCache().remove(query);
      });
      console.warn(`Stale queries removed: ${staleQueries.length} at ${memoryUsage.toFixed(1)}% memory usage`);
    }
    
    lastCleanupTime = now;
    
    // Trigger garbage collection if available
    if (window.gc) {
      window.gc();
    }
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
