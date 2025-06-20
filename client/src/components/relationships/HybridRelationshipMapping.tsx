import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import ForceGraph2D from 'react-force-graph-2d';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Map, Network, Maximize2, Filter, Users, Search, ArrowRight, Zap } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getMemoryStatus } from '@/lib/queryClient';
import 'leaflet/dist/leaflet.css';

// Type definitions for API responses
interface RelationshipNode {
  id: string;
  label: string;
  type: 'person' | 'organization' | 'sponsor' | 'grantmaker' | 'influencer';
  lat?: number;
  lng?: number;
  connections: number;
  centrality_score: number;
  color?: string;
  size?: number;
  opacity?: number;
}

interface RelationshipLink {
  id: string;
  source: string;
  target: string;
  strength: number;
  type: string;
  color?: string;
  width?: number;
  opacity?: number;
}

interface GraphData {
  nodes: RelationshipNode[];
  links: RelationshipLink[];
  stats: {
    node_count: number;
    edge_count: number;
    avg_strength?: number;
    network_density?: number;
  };
}

interface PathData {
  path_found: boolean;
  path_length: number;
  path: string[];
  path_quality: string;
  confidence_score: number;
  relationship_analysis: {
    average_strength: number;
    minimum_strength: number;
    relationship_types: string[];
  };
  geographic_path?: [number, number][];
  edges?: string[];
}

// Memory-compliant data fetching with automatic degradation
const useRelationshipData = (filters: any) => {
  return useQuery<GraphData>({
    queryKey: ['/api/relationships/graph', filters],
    enabled: getMemoryStatus().compliant,
    staleTime: 300000, // 5 minutes for memory compliance
    select: (data: GraphData) => {
      // Memory-optimized data transformation
      const memoryStatus = getMemoryStatus();
      if (!memoryStatus.compliant) {
        // Return reduced dataset for memory compliance
        return {
          nodes: data.nodes?.slice(0, 50) || [],
          links: data.links?.slice(0, 100) || [],
          stats: data.stats || { node_count: 0, edge_count: 0 }
        };
      }
      return data;
    }
  });
};

const usePathDiscovery = (sourceId: string, targetId: string, enabled: boolean) => {
  return useQuery<PathData>({
    queryKey: ['/api/relationships/path-discovery', sourceId, targetId],
    enabled: enabled && getMemoryStatus().compliant,
    staleTime: 600000, // 10 minutes for expensive path calculations
  });
};

interface HybridRelationshipMappingProps {
  viewMode?: 'geographic' | 'network' | 'hybrid';
}

const HybridRelationshipMapping: React.FC<HybridRelationshipMappingProps> = ({ 
  viewMode = 'hybrid' 
}) => {
  const mapRef = useRef<any>(null);
  const graphRef = useRef<any>(null);
  const [activeView, setActiveView] = useState(viewMode);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedPath, setSelectedPath] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Filter state with memory-compliant defaults
  const [filters, setFilters] = useState({
    relationshipType: 'all',
    strengthThreshold: [0.3],
    nodeType: 'all',
    edgeType: 'all',
    includeWeak: false,
    geographicBounds: null,
    maxNodes: 100, // Memory compliance limit
    maxEdges: 200
  });

  // Path discovery state
  const [pathSearch, setPathSearch] = useState({
    sourceId: '',
    targetId: '',
    algorithm: 'bfs', // bfs, dfs, dijkstra
    maxDegrees: 7,
    enabled: false
  });

  const { data: graphData, isLoading, error } = useRelationshipData(filters);
  const { data: pathData, isLoading: pathLoading } = usePathDiscovery(
    pathSearch.sourceId, 
    pathSearch.targetId, 
    pathSearch.enabled
  );

  // Memory compliance monitoring
  useEffect(() => {
    const memoryStatus = getMemoryStatus();
    if (!memoryStatus.compliant) {
      console.warn('Relationship mapping running in reduced mode due to memory constraints');
      // Automatically reduce data complexity
      setFilters(prev => ({
        ...prev,
        maxNodes: 25,
        maxEdges: 50,
        includeWeak: false
      }));
    }
  }, []);

  // Node styling based on type and strength
  const getNodeStyle = (node: any) => {
    const typeColors = {
      person: '#3B82F6',      // Blue
      organization: '#10B981', // Green
      sponsor: '#F59E0B',     // Yellow
      grantmaker: '#EF4444',  // Red
      influencer: '#8B5CF6'   // Purple
    };

    const baseSize = 6;
    const strengthMultiplier = node.centrality_score || 1;
    const size = Math.max(4, Math.min(16, baseSize * strengthMultiplier));

    return {
      color: typeColors[node.type] || '#6B7280',
      size: size,
      opacity: selectedNodes.length === 0 || selectedNodes.includes(node.id) ? 1 : 0.6
    };
  };

  // Edge styling based on relationship strength
  const getEdgeStyle = (link: any) => {
    const strengthColor = (strength: number) => {
      if (strength >= 0.8) return '#10B981'; // Strong - Green
      if (strength >= 0.6) return '#3B82F6'; // Medium - Blue
      if (strength >= 0.4) return '#F59E0B'; // Fair - Yellow
      return '#EF4444'; // Weak - Red
    };

    return {
      color: strengthColor(link.strength || 0.5),
      width: Math.max(1, (link.strength || 0.5) * 4),
      opacity: selectedPath ? 
        (selectedPath.edges?.includes(link.id) ? 1 : 0.3) : 
        0.8
    };
  };

  // Geographic view rendering
  const renderGeographicView = () => {
    if (!graphData?.nodes) return null;

    const nodesWithLocation = graphData.nodes.filter(node => node.lat && node.lng);
    
    return (
      <div className="geographic-view h-full">
        <MapContainer
          center={[39.8283, -98.5795]} // Center of US
          zoom={4}
          style={{ height: '100%', width: '100%' }}
          ref={mapRef}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          
          {/* Render nodes as markers */}
          {nodesWithLocation.map((node) => {
            const style = getNodeStyle(node);
            return (
              <Marker 
                key={node.id} 
                position={[node.lat, node.lng]}
                eventHandlers={{
                  click: () => {
                    setSelectedNodes(prev => 
                      prev.includes(node.id) 
                        ? prev.filter(id => id !== node.id)
                        : [...prev, node.id]
                    );
                  }
                }}
              >
                <Popup>
                  <div className="p-2">
                    <div className="font-semibold">{node.label}</div>
                    <div className="text-sm text-gray-600">
                      Type: <Badge variant="outline">{node.type}</Badge>
                    </div>
                    <div className="text-sm">
                      Connections: {node.connections || 0}
                    </div>
                    <div className="text-sm">
                      Influence Score: {((node.centrality_score || 0) * 100).toFixed(1)}%
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Render connections as polylines */}
          {selectedPath?.geographic_path && (
            <Polyline
              positions={selectedPath.geographic_path}
              color="#EF4444"
              weight={3}
              opacity={0.8}
            />
          )}
        </MapContainer>
      </div>
    );
  };

  // Network view rendering
  const renderNetworkView = () => {
    if (!graphData) return null;

    const processedData = {
      nodes: graphData.nodes?.map(node => ({
        ...node,
        ...getNodeStyle(node)
      })) || [],
      links: graphData.links?.map(link => ({
        ...link,
        ...getEdgeStyle(link)
      })) || []
    };

    return (
      <div className="network-view h-full">
        <ForceGraph2D
          ref={graphRef}
          graphData={processedData}
          nodeLabel="label"
          nodeColor={node => node.color}
          nodeRelSize={node => node.size}
          nodeOpacity={node => node.opacity}
          linkColor={link => link.color}
          linkWidth={link => link.width}
          linkOpacity={link => link.opacity}
          onNodeClick={(node) => {
            setSelectedNodes(prev => 
              prev.includes(node.id) 
                ? prev.filter(id => id !== node.id)
                : [...prev, node.id]
            );
          }}
          onLinkClick={(link) => {
            console.log('Link clicked:', link);
          }}
          onNodeHover={(node) => {
            if (node) {
              // Highlight connected nodes
              const connectedNodeIds = graphData.links
                ?.filter(link => link.source === node.id || link.target === node.id)
                .map(link => link.source === node.id ? link.target : link.source) || [];
              
              setSelectedNodes([node.id, ...connectedNodeIds]);
            } else {
              setSelectedNodes([]);
            }
          }}
          width={800}
          height={600}
          enableZoomInteraction={true}
          enablePanInteraction={true}
        />
      </div>
    );
  };

  // Hybrid view rendering
  const renderHybridView = () => (
    <div className="hybrid-view h-full">
      <div className="grid grid-cols-2 gap-4 h-full">
        <div className="geographic-panel">
          <div className="text-sm font-medium mb-2 flex items-center">
            <Map className="w-4 h-4 mr-2" />
            Geographic View
          </div>
          {renderGeographicView()}
        </div>
        <div className="network-panel">
          <div className="text-sm font-medium mb-2 flex items-center">
            <Network className="w-4 h-4 mr-2" />
            Network Analysis
          </div>
          {renderNetworkView()}
        </div>
      </div>
    </div>
  );

  // Path discovery component
  const renderPathDiscovery = () => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Path Discovery
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <Label htmlFor="source">From Person</Label>
            <Select value={pathSearch.sourceId} onValueChange={(value) => 
              setPathSearch(prev => ({ ...prev, sourceId: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select source person" />
              </SelectTrigger>
              <SelectContent>
                {graphData?.nodes?.map(node => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.label} ({node.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="target">To Person</Label>
            <Select value={pathSearch.targetId} onValueChange={(value) => 
              setPathSearch(prev => ({ ...prev, targetId: value }))
            }>
              <SelectTrigger>
                <SelectValue placeholder="Select target person" />
              </SelectTrigger>
              <SelectContent>
                {graphData?.nodes?.map(node => (
                  <SelectItem key={node.id} value={node.id}>
                    {node.label} ({node.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-4 mb-4">
          <div>
            <Label>Algorithm</Label>
            <Select value={pathSearch.algorithm} onValueChange={(value) => 
              setPathSearch(prev => ({ ...prev, algorithm: value }))
            }>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bfs">BFS</SelectItem>
                <SelectItem value="dfs">DFS</SelectItem>
                <SelectItem value="dijkstra">Dijkstra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => setPathSearch(prev => ({ ...prev, enabled: true }))}
            disabled={!pathSearch.sourceId || !pathSearch.targetId || pathLoading}
            className="ml-auto"
          >
            {pathLoading ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Find Path
              </>
            )}
          </Button>
        </div>

        {pathData && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {pathData.path_length} {pathData.path_length === 1 ? 'degree' : 'degrees'}
              </Badge>
              <Badge variant="secondary">
                {pathData.path_quality} quality
              </Badge>
              <Badge variant="outline">
                {pathData.confidence_score}% confidence
              </Badge>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-medium">Avg Strength</div>
                <div>{(pathData.relationship_analysis.average_strength * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="font-medium">Weakest Link</div>
                <div>{(pathData.relationship_analysis.minimum_strength * 100).toFixed(1)}%</div>
              </div>
              <div>
                <div className="font-medium">Types</div>
                <div>{pathData.relationship_analysis.relationship_types.join(', ')}</div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm">
              <ArrowRight className="w-4 h-4" />
              <span className="font-medium">Path:</span>
              {pathData.path.map((person: string, index: number) => (
                <React.Fragment key={person}>
                  <span>{person}</span>
                  {index < pathData.path.length - 1 && <ArrowRight className="w-3 h-3" />}
                </React.Fragment>
              ))}
            </div>

            <Button 
              onClick={() => setSelectedPath(pathData)}
              variant="outline"
              size="sm"
            >
              <Zap className="w-4 h-4 mr-2" />
              Highlight Path
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Filter controls
  const renderFilterControls = () => (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filters & Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <Label>Relationship Type</Label>
            <Select 
              value={filters.relationshipType} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, relationshipType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="colleague">Colleague</SelectItem>
                <SelectItem value="sponsor">Sponsor</SelectItem>
                <SelectItem value="collaborator">Collaborator</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Node Type</Label>
            <Select 
              value={filters.nodeType} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, nodeType: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nodes</SelectItem>
                <SelectItem value="person">People</SelectItem>
                <SelectItem value="organization">Organizations</SelectItem>
                <SelectItem value="sponsor">Sponsors</SelectItem>
                <SelectItem value="grantmaker">Grantmakers</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Strength Threshold: {filters.strengthThreshold[0]}</Label>
            <Slider
              value={filters.strengthThreshold}
              onValueChange={(value) => setFilters(prev => ({ ...prev, strengthThreshold: value }))}
              max={1}
              min={0}
              step={0.1}
              className="mt-2"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="include-weak"
              checked={filters.includeWeak}
              onCheckedChange={(checked) => setFilters(prev => ({ ...prev, includeWeak: checked }))}
            />
            <Label htmlFor="include-weak">Include Weak Links</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  // Memory compliance check
  if (!getMemoryStatus().compliant) {
    return (
      <Card className="text-center p-8">
        <Network className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <h3 className="text-lg font-semibold mb-2">Relationship Mapping Unavailable</h3>
        <p className="text-gray-600">
          This feature is temporarily disabled due to system resource constraints.
        </p>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="text-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
        <p>Loading relationship data...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="text-center p-8">
        <h3 className="text-lg font-semibold mb-2 text-red-600">Failed to Load Relationship Data</h3>
        <p className="text-gray-600 mb-4">{error.message}</p>
        <Button onClick={() => window.location.reload()}>
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="hybrid-relationship-mapping space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Relationship Network</h2>
          <p className="text-gray-600">
            {graphData?.stats?.node_count || 0} people, {graphData?.stats?.edge_count || 0} connections
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            <Maximize2 className="w-4 h-4 mr-2" />
            {isFullscreen ? 'Exit' : 'Fullscreen'}
          </Button>
        </div>
      </div>

      {/* Path Discovery */}
      {renderPathDiscovery()}

      {/* Filter Controls */}
      {renderFilterControls()}

      {/* Main Visualization */}
      <Card className={`${isFullscreen ? 'fixed inset-4 z-50' : ''}`}>
        <CardContent className="p-0">
          <Tabs value={activeView} onValueChange={setActiveView} className="w-full">
            <div className="border-b px-4 py-2">
              <TabsList>
                <TabsTrigger value="geographic" className="flex items-center">
                  <Map className="w-4 h-4 mr-2" />
                  Geographic
                </TabsTrigger>
                <TabsTrigger value="network" className="flex items-center">
                  <Network className="w-4 h-4 mr-2" />
                  Network
                </TabsTrigger>
                <TabsTrigger value="hybrid">
                  Hybrid View
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="geographic" className="p-0 m-0">
              <div className={`${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-96'}`}>
                {renderGeographicView()}
              </div>
            </TabsContent>

            <TabsContent value="network" className="p-0 m-0">
              <div className={`${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-96'}`}>
                {renderNetworkView()}
              </div>
            </TabsContent>

            <TabsContent value="hybrid" className="p-0 m-0">
              <div className={`${isFullscreen ? 'h-[calc(100vh-200px)]' : 'h-96'}`}>
                {renderHybridView()}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Selected nodes info */}
      {selectedNodes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Nodes ({selectedNodes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedNodes.map(nodeId => {
                const node = graphData?.nodes?.find(n => n.id === nodeId);
                return node ? (
                  <Badge key={nodeId} variant="outline">
                    {node.label} ({node.type})
                  </Badge>
                ) : null;
              })}
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setSelectedNodes([])}
              className="mt-2"
            >
              Clear Selection
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default HybridRelationshipMapping;