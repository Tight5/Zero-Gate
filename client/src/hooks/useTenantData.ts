import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../contexts/TenantContext';

// Enhanced interfaces for tenant data management
interface TenantDataOptions {
  endpoint?: string;
  disabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchInterval?: number;
  dependencies?: string[];
}

interface TenantMutationOptions {
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  onSuccess?: (data: any, variables: any, context: any) => void;
  onError?: (error: any, variables: any, context: any) => void;
  invalidateKeys?: string[];
}

interface TenantContextData {
  id: string;
  name: string;
  domain?: string;
  settings?: {
    features: string[];
    permissions: string[];
    integrations: {
      microsoftGraph: boolean;
      analytics: boolean;
      advancedReporting: boolean;
    };
  };
  users?: {
    total: number;
    active: number;
    roles: Record<string, number>;
  };
  subscription?: {
    plan: string;
    status: 'active' | 'suspended' | 'expired';
    expiresAt?: string;
  };
}

export const useTenantData = (endpoint: string, options: TenantDataOptions = {}) => {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: [endpoint, currentTenant?.id, ...(options.dependencies || [])],
    queryFn: async () => {
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant?.id || '',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!currentTenant && !options.disabled,
    staleTime: options.staleTime || 5 * 60 * 1000,
    gcTime: options.cacheTime || 10 * 60 * 1000,
    refetchInterval: options.refetchInterval,
    refetchOnWindowFocus: false,
    retry: (failureCount, error: any) => {
      // Don't retry on authentication errors
      if (error?.status === 401 || error?.status === 403) {
        return false;
      }
      return failureCount < 3;
    }
  });
};

export const useTenantMutation = (endpoint: string, options: TenantMutationOptions = {}) => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  
  return useMutation({
    mutationFn: async (data: any) => {
      const method = options.method || 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant?.id || '',
        },
        credentials: 'include',
        body: method !== 'DELETE' ? JSON.stringify(data) : undefined,
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      const keysToInvalidate = options.invalidateKeys || [endpoint];
      keysToInvalidate.forEach(key => {
        queryClient.invalidateQueries({ queryKey: [key, currentTenant?.id] });
      });
      
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      console.error(`Mutation failed for ${endpoint}:`, error);
      
      if (options.onError) {
        options.onError(error, variables, context);
      }
    }
  });
};

// Advanced tenant-specific hooks for comprehensive data management

export const useTenantStats = () => {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: ['tenant-stats', currentTenant?.id],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${currentTenant?.id}/stats`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant?.id || '',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tenant statistics: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!currentTenant,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
};

export const useTenantSettings = () => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['tenant-settings', currentTenant?.id],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${currentTenant?.id}/settings`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant?.id || '',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tenant settings: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!currentTenant,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const mutation = useMutation({
    mutationFn: async (settings: Partial<TenantContextData['settings']>) => {
      const response = await fetch(`/api/tenants/${currentTenant?.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant?.id || '',
        },
        credentials: 'include',
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update tenant settings: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', currentTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['tenant-stats', currentTenant?.id] });
    }
  });
  
  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateSettings: mutation.mutate,
    isUpdating: mutation.isPending
  };
};

export const useTenantUsers = (options: { page?: number; limit?: number; role?: string } = {}) => {
  const { currentTenant } = useTenant();
  const { page = 1, limit = 20, role } = options;
  
  return useQuery({
    queryKey: ['tenant-users', currentTenant?.id, page, limit, role],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(role && { role })
      });
      
      const response = await fetch(`/api/tenants/${currentTenant?.id}/users?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant?.id || '',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tenant users: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!currentTenant,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTenantIntegrations = () => {
  const { currentTenant } = useTenant();
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['tenant-integrations', currentTenant?.id],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${currentTenant?.id}/integrations`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant?.id || '',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch integrations: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!currentTenant,
    staleTime: 15 * 60 * 1000, // 15 minutes
  });
  
  const toggleIntegration = useMutation({
    mutationFn: async ({ integration, enabled }: { integration: string; enabled: boolean }) => {
      const response = await fetch(`/api/tenants/${currentTenant?.id}/integrations/${integration}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant?.id || '',
        },
        credentials: 'include',
        body: JSON.stringify({ enabled })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to toggle integration: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-integrations', currentTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['tenant-settings', currentTenant?.id] });
    }
  });
  
  return {
    integrations: query.data,
    isLoading: query.isLoading,
    error: query.error,
    toggleIntegration: toggleIntegration.mutate,
    isToggling: toggleIntegration.isPending
  };
};

// Hook for tenant subscription management
export const useTenantSubscription = () => {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: ['tenant-subscription', currentTenant?.id],
    queryFn: async () => {
      const response = await fetch(`/api/tenants/${currentTenant?.id}/subscription`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': currentTenant?.id || '',
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch subscription: ${response.statusText}`);
      }
      
      return response.json();
    },
    enabled: !!currentTenant,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
};

// Hook for tenant feature availability checks
export const useTenantFeatures = () => {
  const { currentTenant } = useTenant();
  const { settings } = useTenantSettings();
  const { data: subscription } = useTenantSubscription();
  
  const isFeatureEnabled = (feature: string): boolean => {
    if (!currentTenant || !settings) return false;
    
    // Check if feature is enabled in tenant settings
    const featureEnabled = settings.features?.includes(feature) || false;
    
    // Check subscription status
    const subscriptionActive = subscription?.status === 'active';
    
    return featureEnabled && subscriptionActive;
  };
  
  const hasPermission = (permission: string): boolean => {
    if (!currentTenant || !settings) return false;
    
    return settings.permissions?.includes(permission) || false;
  };
  
  return {
    isFeatureEnabled,
    hasPermission,
    features: settings?.features || [],
    permissions: settings?.permissions || [],
    subscriptionStatus: subscription?.status || 'unknown'
  };
};