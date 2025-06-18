import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Map, Network, Maximize2, Filter, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useResource } from '@/contexts/ResourceContext';
import { useTenant } from '@/contexts/TenantContext';

interface GraphData {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    lat?: number;
    lng?: number;
    connections?: number;
    color?: string;
  }>;
  links: Array<{
    source: string;
    target: string;
    color?: string;
    width?: number;
    strength?: number;
  }>;
  stats: {
    node_count: number;
    edge_count: number;
  };
}

interface HybridRelationshipMapProps {
  viewMode?: 'geographic' | 'network' | 'hybrid';
}

const HybridRelationshipMap: React.FC<HybridRelationshipMapProps> = ({ 
  viewMode = 'hybrid' 
}) => {
  const { isFeatureEnabled } = useResource();
  const { currentTenant } = useTenant();
  const [activeView, setActiveView] = useState(viewMode);
  const [filters, setFilters] = useState({
    relationshipType: 'all',
    strengthThreshold: 0.3,
    includeWeak: false
  });

  const { data: graphData, isLoading, error } = useQuery({
    queryKey: ['/api/relationships/graph', currentTenant?.id, filters],
    enabled: !!currentTenant && isFeatureEnabled('relationship_mapping'),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  useEffect(() => {
    if (!isFeatureEnabled('relationship_mapping')) {
      console.warn('Relationship mapping disabled due to resource constraints');
    }
  }, [isFeatureEnabled]);

  const renderGeographicView = () => (
    <div className="geographic-view h-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-center text-gray-600 dark:text-gray-400">
        <Map className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Geographic View</h3>
        <p className="text-sm">Interactive map visualization with location-based relationship markers</p>
        <p className="text-xs mt-2">Geographic data integration coming soon</p>
      </div>
    </div>
  );

  const renderNetworkView = () => (
    <div className="network-view h-full bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
      <div className="text-center text-gray-600 dark:text-gray-400">
        <Network className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <h3 className="text-lg font-semibold mb-2">Network Graph</h3>
        <p className="text-sm">Force-directed graph visualization of relationship connections</p>
        <div className="mt-4 text-xs">
          <p>Nodes: {graphData?.stats?.node_count || 0}</p>
          <p>Edges: {graphData?.stats?.edge_count || 0}</p>
        </div>
      </div>
    </div>
  );

  const renderHybridView = () => (
    <div className="hybrid-view h-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
        <div className="geographic-panel">
          {renderGeographicView()}
        </div>
        <div className="network-panel">
          {renderNetworkView()}
        </div>
      </div>
    </div>
  );

  if (!isFeatureEnabled('relationship_mapping')) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Network className="w-16 h-16 text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Relationship Mapping Unavailable
          </h3>
          <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
            This feature is temporarily disabled due to system resource constraints.
          </p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading relationship data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Failed to Load Relationship Data</h3>
          <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
            {error instanceof Error ? error.message : 'An error occurred'}
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Network className="w-5 h-5" />
              Relationship Network
            </CardTitle>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600 dark:text-gray-400">
              <Badge variant="outline">
                <Users className="w-3 h-3 mr-1" />
                {graphData?.stats?.node_count || 0} people
              </Badge>
              <Badge variant="outline">
                {graphData?.stats?.edge_count || 0} connections
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Select
              value={filters.relationshipType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, relationshipType: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Relationships</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="colleague">Colleague</SelectItem>
                <SelectItem value="sponsor">Sponsor</SelectItem>
                <SelectItem value="collaborator">Collaborator</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            
            <Button variant="outline" size="sm">
              <Maximize2 className="w-4 h-4 mr-2" />
              Fullscreen
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1">
        <Tabs value={activeView} onValueChange={setActiveView} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="geographic" className="flex items-center gap-2">
              <Map className="w-4 h-4" />
              Geographic
            </TabsTrigger>
            <TabsTrigger value="network" className="flex items-center gap-2">
              <Network className="w-4 h-4" />
              Network
            </TabsTrigger>
            <TabsTrigger value="hybrid">
              Hybrid View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="geographic" className="flex-1 mt-4">
            {renderGeographicView()}
          </TabsContent>

          <TabsContent value="network" className="flex-1 mt-4">
            {renderNetworkView()}
          </TabsContent>

          <TabsContent value="hybrid" className="flex-1 mt-4">
            {renderHybridView()}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default HybridRelationshipMap;