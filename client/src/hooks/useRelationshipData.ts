import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../contexts/TenantContext';
import { useResource } from '../contexts/ResourceContext';
import { apiRequest } from '../lib/queryClient';

export const useRelationshipData = (options: any = {}) => {
  const { currentTenant } = useTenant();
  const { isFeatureEnabled } = useResource();
  
  return useQuery({
    queryKey: ['relationships', currentTenant?.id, options.filters],
    queryFn: () => {
      const queryParams = new URLSearchParams({
        ...(options.relationshipType && { relationship_type: options.relationshipType }),
        limit: options.limit || '100',
        offset: options.offset || '0'
      });
      
      return apiRequest(`/api/relationships?${queryParams}`);
    },
    enabled: !!currentTenant && isFeatureEnabled('relationship_mapping'),
    staleTime: 5 * 60 * 1000,
    ...options
  });
};

export const useRelationshipPath = (sourceId: string, targetId: string, options: any = {}) => {
  const { currentTenant } = useTenant();
  const { isFeatureEnabled } = useResource();
  
  return useQuery({
    queryKey: ['relationship-path', currentTenant?.id, sourceId, targetId],
    queryFn: () => apiRequest('/api/relationships/discover-path', {
      method: 'POST',
      body: {
        source_id: sourceId,
        target_id: targetId,
        max_depth: options.maxDepth || 7
      }
    }),
    enabled: !!currentTenant && !!sourceId && !!targetId && isFeatureEnabled('relationship_mapping'),
    staleTime: 10 * 60 * 1000,
    retry: 1,
    ...options
  });
};

export const useNetworkStats = () => {
  const { currentTenant } = useTenant();
  const { isFeatureEnabled } = useResource();
  
  return useQuery({
    queryKey: ['network-stats', currentTenant?.id],
    queryFn: () => apiRequest('/api/relationships/network-stats'),
    enabled: !!currentTenant && isFeatureEnabled('relationship_mapping'),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

export const useGraphData = (includeWeak = false) => {
  const { currentTenant } = useTenant();
  const { isFeatureEnabled } = useResource();
  
  return useQuery({
    queryKey: ['graph-data', currentTenant?.id, includeWeak],
    queryFn: () => apiRequest(`/api/relationships/graph-data?include_weak=${includeWeak}`),
    enabled: !!currentTenant && isFeatureEnabled('relationship_mapping'),
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

export const useCreateRelationship = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  
  return useMutation({
    mutationFn: (relationshipData: any) => 
      apiRequest('/api/relationships', { method: 'POST', body: relationshipData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships', currentTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['network-stats', currentTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['graph-data', currentTenant?.id] });
    },
  });
};

export const useUpdateRelationship = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  
  return useMutation({
    mutationFn: ({ relationshipId, data }: { relationshipId: string; data: any }) => 
      apiRequest(`/api/relationships/${relationshipId}`, { method: 'PUT', body: data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships', currentTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['network-stats', currentTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['graph-data', currentTenant?.id] });
    },
  });
};

export const useDeleteRelationship = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  
  return useMutation({
    mutationFn: (relationshipId: string) => 
      apiRequest(`/api/relationships/${relationshipId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['relationships', currentTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['network-stats', currentTenant?.id] });
      queryClient.invalidateQueries({ queryKey: ['graph-data', currentTenant?.id] });
    },
  });
};

export const useRelationshipSearch = (searchTerm: string, options: any = {}) => {
  const { currentTenant } = useTenant();
  
  return useQuery({
    queryKey: ['relationship-search', currentTenant?.id, searchTerm],
    queryFn: () => apiRequest(`/api/relationships/search?q=${encodeURIComponent(searchTerm)}`),
    enabled: !!currentTenant && !!searchTerm && searchTerm.length > 2,
    staleTime: 30 * 1000,
    ...options
  });
};

export default useRelationshipData;