
// Emergency Dashboard Optimization - Aggressive Refresh Intervals
export const EMERGENCY_REFRESH_INTERVALS = {
  kpiCards: 300000,        // 5 minutes (was 30s)
  relationshipChart: 600000, // 10 minutes (was 60s) 
  grantTimeline: 600000,   // 10 minutes (was 60s)
  recentActivity: 300000,  // 5 minutes (was 30s)
  systemResources: 60000,  // 1 minute (was 5s)
  notifications: 300000,   // 5 minutes (was 60s)
  analytics: 900000,       // 15 minutes (was 180s)
  networkStats: 1200000,   // 20 minutes (was 240s)
};

// Emergency Query Client Configuration
export const EMERGENCY_QUERY_CONFIG = {
  defaultOptions: {
    queries: {
      staleTime: 300000,     // 5 minutes
      cacheTime: 600000,     // 10 minutes  
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,              // Reduce retry attempts
    },
    mutations: {
      retry: 1,
    }
  }
};

// Emergency Memory Monitoring
export const enableEmergencyMemoryMonitoring = () => {
  if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
    setInterval(() => {
      const memory = window.performance.memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      const percentage = (usedMB / limitMB) * 100;
      
      if (percentage > 85) {
        console.warn(`EMERGENCY: Memory usage at ${percentage.toFixed(1)}%`);
        // Force garbage collection if available
        if (window.gc) {
          window.gc();
        }
      }
    }, 10000); // Check every 10 seconds
  }
};
