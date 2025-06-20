
// Emergency Query Cache Optimization for 70% Memory Compliance
import { QueryClient } from '@tanstack/react-query';

export const createMemoryCompliantQueryClient = () => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Reduced stale time for aggressive cache cleanup
        staleTime: 60000, // 1 minute (reduced from 5 minutes)
        
        // Aggressive cache cleanup
        cacheTime: 120000, // 2 minutes (reduced from 10 minutes)
        
        // Limit concurrent queries to prevent memory accumulation
        networkMode: 'online',
        
        // Disable background refetching during high memory usage
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        
        // Memory-aware retry logic
        retry: (failureCount, error) => {
          const memoryUsage = getMemoryUsage();
          if (memoryUsage > 70) return false; // Stop retries at threshold
          return failureCount < 1; // Reduced retry attempts
        }
      },
      mutations: {
        retry: 0, // Disable mutation retries to save memory
      }
    }
  });
};

// Memory usage monitoring utility
const getMemoryUsage = () => {
  if (performance.memory) {
    const used = performance.memory.usedJSHeapSize;
    const total = performance.memory.totalJSHeapSize;
    return (used / total) * 100;
  }
  return 0;
};

// Automatic cache cleanup when approaching threshold
export const enforceMemoryCompliance = (queryClient) => {
  const memoryUsage = getMemoryUsage();
  
  if (memoryUsage > 65) { // 5% buffer before 70% threshold
    // Clear all caches
    queryClient.clear();
    
    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    console.warn('Memory compliance enforced: caches cleared at', memoryUsage, '%');
  }
};
