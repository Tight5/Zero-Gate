import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { useAuthMode } from './AuthModeContext';

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
  isAdminMode: boolean;
  toggleAdminMode: () => void;
  isAdmin: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
}

export function TenantProvider({ children }: TenantProviderProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { isAdminMode: authModeIsAdmin, getCurrentEmail } = useAuthMode();
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(
    localStorage.getItem('currentTenantId')
  );
  const [isAdminMode, setIsAdminMode] = useState<boolean>(
    localStorage.getItem('admin-mode') === 'true'
  );
  
  // Check if user is admin based on email
  const isAdmin = user?.email === 'admin@tight5digital.com' || getCurrentEmail() === 'admin@tight5digital.com';

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
      setIsAdminMode(false);
      localStorage.removeItem('currentTenantId');
      localStorage.removeItem('admin-mode');
    }
  }, [isAuthenticated]);

  // Sync admin mode with auth mode context
  useEffect(() => {
    if (authModeIsAdmin !== isAdminMode && isAdmin) {
      setIsAdminMode(authModeIsAdmin);
      localStorage.setItem('admin-mode', authModeIsAdmin.toString());
    }
  }, [authModeIsAdmin, isAdminMode, isAdmin]);

  const switchTenant = (tenantId: string) => {
    const tenant = availableTenants.find(t => t.id === tenantId);
    if (tenant) {
      setCurrentTenantId(tenantId);
      localStorage.setItem('currentTenantId', tenantId);
      // Reload page to clear any tenant-specific cached data
      window.location.reload();
    }
  };

  // Toggle between admin and tenant mode
  const toggleAdminMode = () => {
    if (isAdmin) {
      const newAdminMode = !isAdminMode;
      setIsAdminMode(newAdminMode);
      localStorage.setItem('admin-mode', newAdminMode.toString());
      // Clear cached data when switching modes
      localStorage.removeItem('auth-cache');
      // Force reload to ensure clean state
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
    getTenantSetting,
    isAdminMode,
    toggleAdminMode,
    isAdmin
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
  const { currentTenant, isAdminMode } = useTenant();
  
  return {
    getTenantHeaders: () => ({
      'X-Tenant-ID': currentTenant?.id || '',
      'X-Admin-Mode': isAdminMode.toString(),
    }),
    tenantId: currentTenant?.id || null,
    isAdminMode,
  };
}

export type { Tenant, TenantContextType };