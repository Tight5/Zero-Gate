import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTenant } from '../contexts/TenantContext';
import { useResource } from '../contexts/ResourceContext';
import { apiRequest } from '../lib/queryClient';

interface RelationshipDataOptions {
  relationshipType?: string;
  limit?: string;
  offset?: string;
  filters?: any;
}

export const useRelationshipData = (options: RelationshipDataOptions = {}) => {
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
      
      return fetch(`/api/relationships?${queryParams}`).then(res => res.json());
    },
    enabled: !!currentTenant && isFeatureEnabled('relationship_mapping'),
    staleTime: 5 * 60 * 1000,
    ...options
  });
};

interface PathOptions {
  maxDepth?: number;
}

export const useRelationshipPath = (sourceId: string, targetId: string, options: PathOptions = {}) => {
  const { currentTenant } = useTenant();
  const { isFeatureEnabled } = useResource();
  
  return useQuery({
    queryKey: ['relationship-path', currentTenant?.id, sourceId, targetId],
    queryFn: () => fetch('/api/relationships/discover-path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        source_id: sourceId,
        target_id: targetId,
        max_depth: options.maxDepth || 7
      })
    }).then(res => res.json()),
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
    queryFn: () => fetch('/api/relationships/network-stats').then(res => res.json()),
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
    queryFn: () => fetch(`/api/relationships/graph-data?include_weak=${includeWeak}`).then(res => res.json()),
    enabled: !!currentTenant && isFeatureEnabled('relationship_mapping'),
    staleTime: 3 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });
};

interface RelationshipData {
  source_id: string;
  target_id: string;
  type: string;
  strength: number;
  metadata?: any;
}

export const useCreateRelationship = () => {
  const queryClient = useQueryClient();
  const { currentTenant } = useTenant();
  
  return useMutation({
    mutationFn: (relationshipData: RelationshipData) => 
      fetch('/api/relationships', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(relationshipData) 
      }).then(res => res.json()),
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
      fetch(`/api/relationships/${relationshipId}`, { 
        method: 'PUT', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data) 
      }).then(res => res.json()),
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
      fetch(`/api/relationships/${relationshipId}`, { method: 'DELETE' }).then(res => res.json()),
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
    queryFn: () => fetch(`/api/relationships/search?q=${encodeURIComponent(searchTerm)}`).then(res => res.json()),
    enabled: !!currentTenant && !!searchTerm && searchTerm.length > 2,
    staleTime: 30 * 1000,
    ...options
  });
};

export default useRelationshipData;