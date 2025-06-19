/**
 * Tenant Data Hook
 * Based on attached asset File 18 specification with TypeScript support
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Note: TenantContext and apiRequest will be implemented later
// import { useTenant } from '../contexts/TenantContext';
// import { apiRequest } from '../lib/queryClient';

interface UseTenantDataOptions {
  disabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
  refetchOnWindowFocus?: boolean;
  refetchInterval?: number;
}

export const useTenantData = <T = any>(endpoint: string, options: UseTenantDataOptions = {}) => {
  // For now, return a basic query without tenant context
  // This will be enhanced when TenantContext is properly implemented
  
  return useQuery<T>({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      return response.json();
    },
    enabled: !options.disabled,
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
  
  return useMutation({
    mutationFn: async (data: any) => {
      const method = options.method || 'POST';
      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method !== 'DELETE' ? JSON.stringify(data) : undefined,
      });
      
      if (!response.ok) {
        throw new Error('Mutation failed');
      }
      
      return response.json();
    },
    onSuccess: (data, variables, context) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: [endpoint] });
      
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
  return useQuery({
    queryKey: ['tenant-stats'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
  });
};

export const useTenantSettings = () => {
  const queryClient = useQueryClient();
  
  const query = useQuery({
    queryKey: ['tenant-settings'],
    queryFn: async () => {
      const response = await fetch('/api/settings');
      if (!response.ok) throw new Error('Failed to fetch settings');
      return response.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  const mutation = useMutation({
    mutationFn: async (settings: any) => {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      if (!response.ok) throw new Error('Failed to update settings');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['tenant-settings'], data);
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