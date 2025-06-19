import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SystemMetrics {
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  responseTime: number;
}

interface ResourceStatus {
  level: 'optimal' | 'warning' | 'critical' | 'emergency';
  memory: number;
  cpu: number;
  features: Record<string, boolean>;
}

interface FeatureAvailability {
  [key: string]: boolean;
}

interface ResourceContextType {
  memoryUsage: number;
  cpuUsage: number;
  isFeatureEnabled: (feature: string) => boolean;
  features: Record<string, boolean>;
  resourceLimits: {
    memory: number;
    cpu: number;
  };
}

// Export types for external use
export type { SystemMetrics, ResourceStatus, FeatureAvailability, ResourceContextType };

const ResourceContext = createContext<ResourceContextType | undefined>(undefined);

export const useResource = () => {
  const context = useContext(ResourceContext);
  if (context === undefined) {
    throw new Error('useResource must be used within a ResourceProvider');
  }
  return context;
};

export const useFeatureCheck = (feature: string) => {
  const { isFeatureEnabled } = useResource();
  return isFeatureEnabled(feature);
};

interface ResourceProviderProps {
  children: ReactNode;
}

export const ResourceProvider: React.FC<ResourceProviderProps> = ({ children }) => {
  const [memoryUsage, setMemoryUsage] = useState(75);
  const [cpuUsage, setCpuUsage] = useState(45);
  const [features, setFeatures] = useState({
    relationship_mapping: true,
    advanced_analytics: true,
    excel_processing: true,
    real_time_updates: true,
  });

  const resourceLimits = {
    memory: 85, // Disable features above 85% memory
    cpu: 80,    // Disable features above 80% CPU
  };

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/system/resources');
        if (response.ok) {
          const data = await response.json();
          setMemoryUsage(data.memory || 75);
          setCpuUsage(data.cpu || 45);
        }
      } catch (error) {
        console.warn('Failed to fetch resource usage:', error);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Disable resource-intensive features when limits exceeded
    const newFeatures = {
      relationship_mapping: memoryUsage < resourceLimits.memory && cpuUsage < resourceLimits.cpu,
      advanced_analytics: memoryUsage < resourceLimits.memory - 5,
      excel_processing: memoryUsage < resourceLimits.memory - 10,
      real_time_updates: memoryUsage < resourceLimits.memory,
    };

    setFeatures(newFeatures);
  }, [memoryUsage, cpuUsage]);

  const isFeatureEnabled = (feature: string): boolean => {
    return (features as any)[feature] ?? true;
  };

  const value: ResourceContextType = {
    memoryUsage,
    cpuUsage,
    isFeatureEnabled,
    features,
    resourceLimits,
  };

  return (
    <ResourceContext.Provider value={value}>
      {children}
    </ResourceContext.Provider>
  );
};

export default ResourceProvider;