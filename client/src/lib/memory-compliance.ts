
// Emergency Memory Compliance - Dashboard Optimizations
export const MEMORY_COMPLIANT_INTERVALS = {
  // Reduced from 30s to 300s (5 minutes) - 90% reduction
  kpiCards: 300000,
  
  // Reduced from 60s to 600s (10 minutes) - 90% reduction  
  relationshipChart: 600000,
  
  // Reduced from 60s to 600s (10 minutes) - 90% reduction
  grantTimeline: 600000,
  
  // Reduced from 30s to 300s (5 minutes) - 90% reduction
  recentActivity: 300000,
  
  // Reduced from 5s to 60s (1 minute) - 92% reduction
  systemResources: 60000,
  
  // Disabled real-time updates during high memory usage
  realTimeUpdates: false
};

// Memory compliance check before data fetching
export const shouldFetchData = (memoryUsage) => {
  return memoryUsage < 70; // Attached asset specification threshold
};
