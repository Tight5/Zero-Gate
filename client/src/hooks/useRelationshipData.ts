/**
 * Relationship Data Hook
 * Based on attached asset File 19 specification with TypeScript support
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { useTenantData } from './useTenantData';
import { apiRequest } from '../lib/queryClient';

interface RelationshipNode {
  id: string;
  label: string;
  type: string;
  color?: string;
  lat?: number;
  lng?: number;
  connections?: number;
}

interface RelationshipLink {
  source: string;
  target: string;
  color?: string;
  width?: number;
  strength?: number;
}

interface GraphData {
  nodes: RelationshipNode[];
  links: RelationshipLink[];
  stats?: {
    node_count: number;
    edge_count: number;
  };
}

export const useGraphData = (includeWeak: boolean = false) => {
  return useTenantData<GraphData>('/relationships/graph', {
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: includeWeak ? undefined : 5 * 60 * 1000, // 5 minutes if not including weak
  });
};

export const useRelationshipData = (sponsorId?: string) => {
  return useTenantData('/relationships', {
    enabled: !!sponsorId,
    staleTime: 60 * 1000, // 1 minute
  });
};

export const usePathDiscovery = () => {
  return useMutation({
    mutationFn: ({ sourceId, targetId, maxDegrees = 7 }: {
      sourceId: string;
      targetId: string;
      maxDegrees?: number;
    }) => {
      return apiRequest('/relationships/path-discovery', {
        method: 'POST',
        body: {
          source_id: sourceId,
          target_id: targetId,
          max_degrees: maxDegrees
        }
      });
    }
  });
};

export const useRelationshipStrength = (userId1: string, userId2: string) => {
  return useQuery({
    queryKey: ['relationship-strength', userId1, userId2],
    queryFn: () => apiRequest(`/relationships/strength/${userId1}/${userId2}`),
    enabled: !!(userId1 && userId2),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useNetworkMetrics = () => {
  return useTenantData('/relationships/network-metrics', {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
};

export const useCreateRelationship = () => {
  return useMutation({
    mutationFn: (relationshipData: {
      source_id: string;
      target_id: string;
      relationship_type: string;
      strength?: number;
      notes?: string;
    }) => {
      return apiRequest('/relationships', {
        method: 'POST',
        body: relationshipData
      });
    }
  });
};

export const useUpdateRelationship = () => {
  return useMutation({
    mutationFn: ({ id, ...updateData }: {
      id: string;
      relationship_type?: string;
      strength?: number;
      notes?: string;
    }) => {
      return apiRequest(`/relationships/${id}`, {
        method: 'PATCH',
        body: updateData
      });
    }
  });
};

export const useDeleteRelationship = () => {
  return useMutation({
    mutationFn: (relationshipId: string) => {
      return apiRequest(`/relationships/${relationshipId}`, {
        method: 'DELETE'
      });
    }
  });
};