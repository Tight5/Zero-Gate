/**
 * Tenant Data Hook
 * Based on attached asset File 18 specification with TypeScript support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../contexts/TenantContext';
import { apiRequest } from '../lib/queryClient';

interface UseTenantDataOptions {
  disabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
}

export const useTenantData = <T = any>(endpoint: string, options: UseTenantDataOptions = {}) => {
  const { currentTenant } = useTenant();
  
  return useQuery<T>({
    queryKey: [endpoint, currentTenant?.id],
    queryFn: () => apiRequest(endpoint),
    enabled: !!currentTenant && !options.disabled,
    staleTime: options.staleTime || 5 * 60 * 1000,
    gcTime: options.cacheTime || 10 * 60 * 1000,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    refetchInterval: options.refetchInterval,
    ...options
  });
};

interface UseTenantMutationOptions {
  method?: 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  onSuccess?: (data: any, variables: any, context: any) => void;
  onError?: (error: any, variables: any, context: any) => void;
}

export const useTenantMutation = (endpoint: string, options: UseTenantMutationOptions = {}) => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  
  return useMutation({
    mutationFn: (data: any) => {
      const method = options.method || 'POST';
      switch (method.toLowerCase()) {
        case 'post':
          return apiRequest(endpoint, { method: 'POST', body: data });
        case 'put':
          return apiRequest(endpoint, { method: 'PUT', body: data });
        case 'patch':
          return apiRequest(endpoint, { method: 'PATCH', body: data });
        case 'delete':
          return apiRequest(endpoint, { method: 'DELETE' });
        default:
          return apiRequest(endpoint, { method: 'POST', body: data });
      }
    },
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [endpoint, currentTenant?.id] });
      
      // Custom success handler
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      console.error(`Mutation failed for ${endpoint}:`, error);
      
      // Custom error handler
      if (options.onError) {
        options.onError(error, variables, context);
      }
    }
  });
};

export const useTenantStats = () => {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: ['tenant-stats', currentTenant?.id],
    queryFn: () => apiRequest('/dashboard/stats'),
    enabled: !!currentTenant,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
};

export const useTenantSettings = () => {
  const queryClient = useQueryClient();
  const { currentTenant, updateTenantSettings } = useTenant();
  
  const query = useQuery({
    queryKey: ['tenant-settings', currentTenant?.id],
    queryFn: () => apiRequest(`/tenants/${currentTenant?.id}/settings`),
    enabled: !!currentTenant,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const mutation = useMutation({
    mutationFn: (settings: any) => 
      apiRequest(`/tenants/${currentTenant?.id}/settings`, {
        method: 'PUT',
        body: settings
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['tenant-settings', currentTenant?.id], data);
      updateTenantSettings(data.settings);
    },
  });
  
  return {
    ...query,
    updateSettings: mutation.mutate,
    isUpdating: mutation.isPending,
    updateError: mutation.error
  };
};

export default useTenantData;