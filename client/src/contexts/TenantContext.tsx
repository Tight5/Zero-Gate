import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  settings: {
    features: string[];
    limits: {
      users: number;
      sponsors: number;
      grants: number;
    };
    branding: {
      primaryColor: string;
      logo?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  isLoading: boolean;
  switchTenant: (tenantId: string) => void;
  getTenantFeatures: () => string[];
  isTenantFeatureEnabled: (feature: string) => boolean;
  getTenantSetting: <T = any>(key: string, defaultValue?: T) => T;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(
    localStorage.getItem('currentTenantId')
  );

  // Fetch available tenants
  const {
    data: availableTenants = [],
    isLoading: tenantsLoading
  } = useQuery({
    queryKey: ['/api/tenants'],
    enabled: isAuthenticated && !authLoading,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Fetch current tenant details
  const {
    data: currentTenant = null,
    isLoading: currentTenantLoading
  } = useQuery({
    queryKey: ['/api/tenants', currentTenantId],
    enabled: isAuthenticated && !authLoading && !!currentTenantId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Auto-select first tenant if none selected and tenants are available
  useEffect(() => {
    if (!currentTenantId && availableTenants.length > 0) {
      const firstTenant = availableTenants[0];
      setCurrentTenantId(firstTenant.id);
      localStorage.setItem('currentTenantId', firstTenant.id);
    }
  }, [currentTenantId, availableTenants]);

  // Clear tenant on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setCurrentTenantId(null);
      localStorage.removeItem('currentTenantId');
    }
  }, [isAuthenticated]);

  const switchTenant = (tenantId: string) => {
    const tenant = availableTenants.find(t => t.id === tenantId);
    if (tenant) {
      setCurrentTenantId(tenantId);
      localStorage.setItem('currentTenantId', tenantId);
      // Reload page to clear any tenant-specific cached data
      window.location.reload();
    }
  };

  const getTenantFeatures = (): string[] => {
    return currentTenant?.settings?.features || [];
  };

  const isTenantFeatureEnabled = (feature: string): boolean => {
    return getTenantFeatures().includes(feature);
  };

  const getTenantSetting = <T = any>(key: string, defaultValue?: T): T => {
    if (!currentTenant?.settings) {
      return defaultValue as T;
    }

    const keys = key.split('.');
    let value: any = currentTenant.settings;
    
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined) {
        return defaultValue as T;
      }
    }
    
    return value as T;
  };

  const isLoading = authLoading || tenantsLoading || currentTenantLoading;

  const contextValue: TenantContextType = {
    currentTenant,
    availableTenants,
    isLoading,
    switchTenant,
    getTenantFeatures,
    isTenantFeatureEnabled,
    getTenantSetting
  };

  return (
    <TenantContext.Provider value={contextValue}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant(): TenantContextType {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

// Custom hook for tenant-aware API requests
export function useTenantRequest() {
  const { currentTenant } = useTenant();
  
  return {
    getTenantHeaders: () => ({
      'X-Tenant-ID': currentTenant?.id || '',
    }),
    tenantId: currentTenant?.id || null,
  };
}

export type { Tenant, TenantContextType };