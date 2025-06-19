import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../contexts/TenantContext';
import { apiRequest } from '../lib/queryClient';

export const useTenantData = (endpoint: string, options: any = {}) => {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: [endpoint, currentTenant?.id],
    queryFn: () => apiRequest(endpoint),
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
    queryFn: () => apiRequest('/api/dashboard/stats'),
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
    queryFn: () => apiRequest(`/api/tenants/${currentTenant?.id}/settings`),
    enabled: !!currentTenant,
    staleTime: 10 * 60 * 1000,
  });
  
  const mutation = useMutation({
    mutationFn: (settings: any) => 
      apiRequest(`/api/tenants/${currentTenant?.id}/settings`, {
        method: 'PUT',
        body: settings
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(['tenant-settings', currentTenant?.id], data);
      if (updateTenantSettings) {
        updateTenantSettings(data.settings);
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