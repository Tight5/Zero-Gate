import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';

interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  uptime: number;
  timestamp: string;
}

interface ResourceStatus {
  level: 'optimal' | 'warning' | 'critical' | 'emergency';
  message: string;
  recommendations: string[];
}

interface FeatureAvailability {
  processing: boolean;
  integration: boolean;
  analytics: boolean;
  realTimeUpdates: boolean;
  bulkOperations: boolean;
}

interface ResourceContextType {
  metrics: SystemMetrics | null;
  status: ResourceStatus;
  featureAvailability: FeatureAvailability;
  isLoading: boolean;
  refreshMetrics: () => void;
  getResourceLevel: () => 'optimal' | 'warning' | 'critical' | 'emergency';
  isFeatureEnabled: (feature: keyof FeatureAvailability) => boolean;
  getPerformanceRecommendations: () => string[];
}

const ResourceContext = createContext<ResourceContextType | undefined>(undefined);

interface ResourceProviderProps {
  children: ReactNode;
}

export function ResourceProvider({ children }: ResourceProviderProps) {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<ResourceStatus>({
    level: 'optimal',
    message: 'System running normally',
    recommendations: []
  });
  const [featureAvailability, setFeatureAvailability] = useState<FeatureAvailability>({
    processing: true,
    integration: true,
    analytics: true,
    realTimeUpdates: true,
    bulkOperations: true
  });

  // Fetch system metrics every 5 seconds
  const {
    data: metrics,
    isLoading,
    refetch: refreshMetrics
  } = useQuery({
    queryKey: ['/api/dashboard/metrics'],
    enabled: isAuthenticated,
    refetchInterval: 5000, // 5 seconds
    staleTime: 2000, // 2 seconds
    retry: 2
  });

  // Update status and feature availability based on metrics
  useEffect(() => {
    if (!metrics) return;

    const { cpuUsage, memoryUsage, diskUsage } = metrics;
    const maxUsage = Math.max(cpuUsage, memoryUsage, diskUsage);

    let newStatus: ResourceStatus;
    let newFeatureAvailability: FeatureAvailability;

    if (maxUsage >= 95) {
      // Emergency level - critical resource shortage
      newStatus = {
        level: 'emergency',
        message: 'Critical system resources detected. Emergency mode active.',
        recommendations: [
          'All non-essential features disabled',
          'Contact system administrator immediately',
          'Consider system restart if issues persist'
        ]
      };
      newFeatureAvailability = {
        processing: false,
        integration: false,
        analytics: false,
        realTimeUpdates: false,
        bulkOperations: false
      };
    } else if (maxUsage >= 85) {
      // Critical level - significant performance impact
      newStatus = {
        level: 'critical',
        message: 'High resource usage detected. Performance may be impacted.',
        recommendations: [
          'Heavy processing features disabled',
          'Consider reducing concurrent operations',
          'Monitor system performance closely'
        ]
      };
      newFeatureAvailability = {
        processing: false,
        integration: true,
        analytics: false,
        realTimeUpdates: true,
        bulkOperations: false
      };
    } else if (maxUsage >= 70) {
      // Warning level - some features may be limited
      newStatus = {
        level: 'warning',
        message: 'Moderate resource usage. Some features may be limited.',
        recommendations: [
          'Bulk operations temporarily disabled',
          'Consider spacing out intensive tasks',
          'Monitor resource usage trends'
        ]
      };
      newFeatureAvailability = {
        processing: true,
        integration: true,
        analytics: true,
        realTimeUpdates: true,
        bulkOperations: false
      };
    } else {
      // Optimal level - all features available
      newStatus = {
        level: 'optimal',
        message: 'System running normally with optimal performance.',
        recommendations: []
      };
      newFeatureAvailability = {
        processing: true,
        integration: true,
        analytics: true,
        realTimeUpdates: true,
        bulkOperations: true
      };
    }

    setStatus(newStatus);
    setFeatureAvailability(newFeatureAvailability);
  }, [metrics]);

  const getResourceLevel = () => status.level;

  const isFeatureEnabled = (feature: keyof FeatureAvailability): boolean => {
    return featureAvailability[feature];
  };

  const getPerformanceRecommendations = (): string[] => {
    if (!metrics) return [];

    const recommendations: string[] = [];
    const { cpuUsage, memoryUsage, diskUsage } = metrics;

    if (cpuUsage > 80) {
      recommendations.push('High CPU usage detected - consider reducing background processes');
    }
    if (memoryUsage > 80) {
      recommendations.push('High memory usage detected - close unused applications');
    }
    if (diskUsage > 80) {
      recommendations.push('High disk usage detected - consider cleaning up temporary files');
    }

    return recommendations;
  };

  const contextValue: ResourceContextType = {
    metrics: metrics || null,
    status,
    featureAvailability,
    isLoading,
    refreshMetrics,
    getResourceLevel,
    isFeatureEnabled,
    getPerformanceRecommendations
  };

  return (
    <ResourceContext.Provider value={contextValue}>
      {children}
    </ResourceContext.Provider>
  );
}

export function useResource(): ResourceContextType {
  const context = useContext(ResourceContext);
  if (context === undefined) {
    throw new Error('useResource must be used within a ResourceProvider');
  }
  return context;
}

// Custom hook for feature-aware operations
export function useFeatureCheck() {
  const { isFeatureEnabled, getResourceLevel } = useResource();
  
  return {
    canProcess: () => isFeatureEnabled('processing'),
    canIntegrate: () => isFeatureEnabled('integration'),
    canAnalyze: () => isFeatureEnabled('analytics'),
    hasRealTimeUpdates: () => isFeatureEnabled('realTimeUpdates'),
    canBulkOperate: () => isFeatureEnabled('bulkOperations'),
    isSystemHealthy: () => ['optimal', 'warning'].includes(getResourceLevel()),
    requiresResourceCheck: (feature: keyof FeatureAvailability) => !isFeatureEnabled(feature)
  };
}

export type { SystemMetrics, ResourceStatus, FeatureAvailability, ResourceContextType };