import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../contexts/TenantContext';
import { apiRequest } from '../lib/queryClient';

export const useTenantData = (endpoint: string, options: any = {}) => {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: [endpoint, currentTenant?.id],
    queryFn: () => fetch(endpoint).then(res => res.json()),
    enabled: !!currentTenant && !options.disabled,
    staleTime: options.staleTime || 5 * 60 * 1000,
    gcTime: options.cacheTime || 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    ...options
  });
};

export const useTenantMutation = (endpoint: string, options: any = {}) => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  
  return useMutation({
    mutationFn: (data: any) => {
      const method = options.method || 'POST';
      return fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'DELETE' ? JSON.stringify(data) : undefined,
      }).then(res => res.json());
    },
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [endpoint, currentTenant?.id] });
      
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    onError: (error, variables, context) => {
      console.error(`Mutation failed for ${endpoint}:`, error);
      
      if (options.onError) {
        options.onError(error, variables, context);
      }
    },
    ...options
  });
};

export const useTenantStats = () => {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: ['tenant-stats', currentTenant?.id],
    queryFn: () => fetch('/api/dashboard/stats').then(res => res.json()),
    enabled: !!currentTenant,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });
};

export const useTenantSettings = () => {
  const queryClient = useQueryClient();
  const { currentTenant, updateTenantSettings } = useTenant();
  
  const query = useQuery({
    queryKey: ['tenant-settings', currentTenant?.id],
    queryFn: () => fetch(`/api/tenants/${currentTenant?.id}/settings`).then(res => res.json()),
    enabled: !!currentTenant,
    staleTime: 10 * 60 * 1000,
  });
  
  const mutation = useMutation({
    mutationFn: (settings: any) => 
      fetch(`/api/tenants/${currentTenant?.id}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      }).then(res => res.json()),
    onSuccess: (data) => {
      queryClient.setQueryData(['tenant-settings', currentTenant?.id], data);
      if (updateTenantSettings) {
        updateTenantSettings(data);
      }
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