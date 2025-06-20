import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import ForceGraph2D from 'react-force-graph-2d';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Map, Network, Maximize2, Filter, Loader2, AlertCircle } from 'lucide-react';
import { useRelationshipData } from '@/hooks/useRelationshipData';
import { useResource } from '@/contexts/ResourceContext';
import { useTenant } from '@/contexts/TenantContext';
import 'leaflet/dist/leaflet.css';

interface RelationshipNode {
  id: string;
  label: string;
  type: 'person' | 'organization' | 'sponsor' | 'grantmaker';
  lat?: number;
  lng?: number;
  connections?: number;
  color?: string;
  size?: number;
  strength?: number;
  tier?: string;
}

interface RelationshipLink {
  source: string;
  target: string;
  type: string;
  strength: number;
  color?: string;
  width?: number;
}

interface GraphData {
  nodes: RelationshipNode[];
  links: RelationshipLink[];
  stats?: {
    node_count: number;
    edge_count: number;
    density: number;
    avg_clustering: number;
  };
}

interface HybridRelationshipMapProps {
  data?: GraphData;
  viewMode?: 'geographic' | 'network' | 'hybrid';
  onNodeClick?: (node: RelationshipNode) => void;
  onLinkClick?: (link: RelationshipLink) => void;
}

const HybridRelationshipMap: React.FC<HybridRelationshipMapProps> = ({ 
  data, 
  viewMode = 'hybrid',
  onNodeClick,
  onLinkClick 
}) => {
  const mapRef = useRef<any>(null);
  const graphRef = useRef<any>(null);
  const { isFeatureEnabled } = useResource();
  const { currentTenant } = useTenant();
  const [activeView, setActiveView] = useState(viewMode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filters, setFilters] = useState({
    relationshipType: 'all',
    strengthThreshold: 0.3,
    nodeType: 'all',
    includeWeak: false
  });

  // Mock data for development - will be replaced with actual API calls
  const graphData: GraphData | undefined = {
    nodes: [
      { id: '1', label: 'John Smith', type: 'person', lat: 40.7128, lng: -74.0060, connections: 5, tier: 'tier1' },
      { id: '2', label: 'NASDAQ Center', type: 'organization', lat: 39.9526, lng: -75.1652, connections: 12 },
      { id: '3', label: 'Foundation XYZ', type: 'grantmaker', lat: 37.7749, lng: -122.4194, connections: 8 }
    ],
    links: [
      { source: '1', target: '2', type: 'professional', strength: 0.8 },
      { source: '2', target: '3', type: 'partnership', strength: 0.6 }
    ],
    stats: { node_count: 3, edge_count: 2, density: 0.67, avg_clustering: 0.33 }
  };
  
  const isLoading = false;
  const error = null;
  const refetch = () => Promise.resolve();

  const processedData = data || graphData;

  useEffect(() => {
    if (!isFeatureEnabled('relationship_mapping')) {
      console.warn('Relationship mapping disabled due to resource constraints');
    }
  }, [isFeatureEnabled]);

  const getNodeColor = (node: RelationshipNode): string => {
    if (node.color) return node.color;
    
    switch (node.type) {
      case 'person': return '#3366ff';
      case 'organization': return '#ff6633';
      case 'sponsor': return '#33ff66';
      case 'grantmaker': return '#ff3366';
      default: return '#666666';
    }
  };

  const getNodeSize = (node: RelationshipNode): number => {
    if (node.size) return node.size;
    return Math.max(4, Math.min(12, (node.connections || 1) * 2));
  };

  const getLinkColor = (link: RelationshipLink): string => {
    if (link.color) return link.color;
    
    const opacity = Math.max(0.3, link.strength);
    return `rgba(153, 153, 153, ${opacity})`;
  };

  const getLinkWidth = (link: RelationshipLink): number => {
    return Math.max(1, link.strength * 4);
  };

  const filteredData = React.useMemo(() => {
    if (!processedData?.nodes || !processedData?.links) {
      return { nodes: [], links: [], stats: undefined };
    }

    let filteredNodes = [...processedData.nodes];
    let filteredLinks = [...processedData.links];

    // Filter by relationship type
    if (filters.relationshipType !== 'all') {
      filteredLinks = filteredLinks.filter((link: RelationshipLink) => link.type === filters.relationshipType);
      const connectedNodeIds = new Set([
        ...filteredLinks.map((link: RelationshipLink) => link.source),
        ...filteredLinks.map((link: RelationshipLink) => link.target)
      ]);
      filteredNodes = filteredNodes.filter((node: RelationshipNode) => connectedNodeIds.has(node.id));
    }

    // Filter by node type
    if (filters.nodeType !== 'all') {
      filteredNodes = filteredNodes.filter((node: RelationshipNode) => node.type === filters.nodeType);
      const nodeIds = new Set(filteredNodes.map((node: RelationshipNode) => node.id));
      filteredLinks = filteredLinks.filter((link: RelationshipLink) => 
        nodeIds.has(link.source as string) && nodeIds.has(link.target as string)
      );
    }

    // Filter by strength threshold
    filteredLinks = filteredLinks.filter((link: RelationshipLink) => link.strength >= filters.strengthThreshold);

    return {
      nodes: filteredNodes,
      links: filteredLinks,
      stats: processedData.stats
    };
  }, [processedData, filters]);

  const renderGeographicView = () => (
    <div className="h-full w-full">
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
        {filteredData.nodes.map((node) => (
          node.lat && node.lng && (
            <Marker 
              key={node.id} 
              position={[node.lat, node.lng]}
              eventHandlers={{
                click: () => onNodeClick?.(node)
              }}
            >
              <Popup>
                <div className="space-y-2">
                  <div className="font-semibold">{node.label}</div>
                  <div className="text-sm space-y-1">
                    <div>Type: <Badge variant="outline">{node.type}</Badge></div>
                    <div>Connections: {node.connections || 0}</div>
                    {node.tier && <div>Tier: <Badge>{node.tier}</Badge></div>}
                    {node.strength && (
                      <div>Strength: {(node.strength * 100).toFixed(0)}%</div>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        ))}
      </MapContainer>
    </div>
  );

  const renderNetworkView = () => (
    <div className="h-full w-full">
      <ForceGraph2D
        ref={graphRef}
        graphData={filteredData}
        nodeLabel={(node: any) => `${node.label} (${node.type})`}
        nodeColor={getNodeColor}
        nodeRelSize={6}
        nodeCanvasObjectMode={() => 'after'}
        nodeCanvasObject={(node: any, ctx: any, globalScale: number) => {
          const label = node.label;
          const fontSize = 12 / globalScale;
          ctx.font = `${fontSize}px Sans-Serif`;
          const textWidth = ctx.measureText(label).width;
          const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fillRect(
            node.x - bckgDimensions[0] / 2,
            node.y - bckgDimensions[1] / 2,
            bckgDimensions[0],
            bckgDimensions[1]
          );

          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#333';
          ctx.fillText(label, node.x, node.y);
        }}
        linkColor={getLinkColor}
        linkWidth={getLinkWidth}
        linkDirectionalParticles={2}
        linkDirectionalParticleSpeed={0.005}
        onNodeClick={(node: any) => onNodeClick?.(node)}
        onLinkClick={(link: any) => onLinkClick?.(link)}
        width={800}
        height={600}
        cooldownTime={3000}
        warmupTicks={100}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
      />
    </div>
  );

  const renderHybridView = () => (
    <div className="h-full flex">
      <div className="flex-1 border-r">
        {renderGeographicView()}
      </div>
      <div className="flex-1">
        {renderNetworkView()}
      </div>
    </div>
  );

  if (!isFeatureEnabled('relationship_mapping')) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full space-y-4">
          <Network size={48} className="text-muted-foreground" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Relationship Mapping Unavailable</h3>
            <p className="text-muted-foreground">
              This feature is temporarily disabled due to system resource constraints.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full space-y-4">
          <Loader2 size={48} className="animate-spin text-primary" />
          <p className="text-muted-foreground">Loading relationship data...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-full space-y-4">
          <AlertCircle size={48} className="text-destructive" />
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Failed to Load Relationship Data</h3>
              <p className="text-muted-foreground">Unable to load relationship data</p>
            </div>
            <Button onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'}`}>
      <CardHeader className="pb-4">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <CardTitle>Relationship Network Analysis</CardTitle>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{filteredData.nodes.length} people</span>
              <span>{filteredData.links.length} connections</span>
              {filteredData.stats?.density && (
                <span>Density: {(filteredData.stats.density * 100).toFixed(1)}%</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select
              value={filters.relationshipType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, relationshipType: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="colleague">Colleague</SelectItem>
                <SelectItem value="sponsor">Sponsor</SelectItem>
                <SelectItem value="collaborator">Collaborator</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
              </SelectContent>
            </Select>
            
            <Select
              value={filters.nodeType}
              onValueChange={(value) => setFilters(prev => ({ ...prev, nodeType: value }))}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="person">People</SelectItem>
                <SelectItem value="organization">Organizations</SelectItem>
                <SelectItem value="sponsor">Sponsors</SelectItem>
                <SelectItem value="grantmaker">Grantmakers</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 size={16} />
              {isFullscreen ? 'Exit' : 'Fullscreen'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        <Tabs value={activeView} onValueChange={(value: string) => setActiveView(value as 'geographic' | 'network' | 'hybrid')} className="h-full flex flex-col">
          <div className="px-6 pb-4">
            <TabsList>
              <TabsTrigger value="geographic" className="flex items-center space-x-2">
                <Map size={16} />
                <span>Geographic</span>
              </TabsTrigger>
              <TabsTrigger value="network" className="flex items-center space-x-2">
                <Network size={16} />
                <span>Network</span>
              </TabsTrigger>
              <TabsTrigger value="hybrid" className="flex items-center space-x-2">
                <span>Hybrid View</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 px-6 pb-6">
            <TabsContent value="geographic" className="h-full m-0">
              {renderGeographicView()}
            </TabsContent>

            <TabsContent value="network" className="h-full m-0">
              {renderNetworkView()}
            </TabsContent>

            <TabsContent value="hybrid" className="h-full m-0">
              {renderHybridView()}
            </TabsContent>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default HybridRelationshipMap;