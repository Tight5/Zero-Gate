/**
 * Hybrid Relationship Mapping Component
 * Advanced relationship visualization with React-Leaflet geographic maps and ForceGraph2D network analysis
 * Based on attached asset 26 specifications with seven-degree path discovery
 */

import React, { useState, useCallback, useEffect, useMemo, memo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import ForceGraph2D from 'react-force-graph-2d';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { 
  Search, 
  Filter, 
  Network, 
  MapPin, 
  Users, 
  Zap, 
  Target,
  Settings,
  Download,
  RefreshCw,
  Maximize2,
  Eye,
  EyeOff,
  GitBranch,
  Route,
  Globe,
  Layers
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Data interfaces
interface RelationshipNode {
  id: string;
  name: string;
  type: 'sponsor' | 'organization' | 'individual' | 'grant' | 'opportunity';
  tier: 'A' | 'B' | 'C';
  strength: number;
  coordinates?: { lat: number; lng: number };
  connections: number;
  lastContact?: string;
  status: 'active' | 'pending' | 'dormant';
  value?: number;
  tags: string[];
  // ForceGraph properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

interface RelationshipEdge {
  source: string;
  target: string;
  type: 'partnership' | 'funding' | 'collaboration' | 'referral' | 'advisory';
  strength: number;
  weight: number;
  lastInteraction?: string;
  value?: number;
  status: 'active' | 'inactive';
}

interface PathDiscoveryResult {
  path: string[];
  distance: number;
  strength: number;
  intermediaries: string[];
  confidence: number;
  pathType: 'direct' | 'indirect' | 'multi-hop';
}

interface GeographicCluster {
  center: { lat: number; lng: number };
  radius: number;
  nodes: string[];
  strength: number;
}

// Generate comprehensive mock data with geographic distribution
const generateMockRelationshipData = (): { nodes: RelationshipNode[], edges: RelationshipEdge[] } => {
  const nodes: RelationshipNode[] = [
    {
      id: 'center-hub',
      name: 'The Center Hub',
      type: 'organization',
      tier: 'A',
      strength: 1.0,
      coordinates: { lat: 40.7128, lng: -74.0060 }, // NYC
      connections: 15,
      lastContact: '2024-12-18',
      status: 'active',
      value: 2500000,
      tags: ['startup', 'accelerator', 'fintech']
    },
    {
      id: 'tech-sponsor-1',
      name: 'Innovation Capital',
      type: 'sponsor',
      tier: 'A',
      strength: 0.9,
      coordinates: { lat: 37.7749, lng: -122.4194 }, // SF
      connections: 12,
      lastContact: '2024-12-15',
      status: 'active',
      value: 5000000,
      tags: ['venture-capital', 'technology', 'series-a']
    },
    {
      id: 'edu-partner',
      name: 'University Research Lab',
      type: 'organization',
      tier: 'B',
      strength: 0.75,
      coordinates: { lat: 42.3601, lng: -71.0589 }, // Boston
      connections: 8,
      lastContact: '2024-12-10',
      status: 'active',
      value: 750000,
      tags: ['research', 'education', 'ai-ml']
    },
    {
      id: 'individual-connector',
      name: 'Sarah Thompson',
      type: 'individual',
      tier: 'A',
      strength: 0.85,
      coordinates: { lat: 41.8781, lng: -87.6298 }, // Chicago
      connections: 20,
      lastContact: '2024-12-16',
      status: 'active',
      value: 0,
      tags: ['advisor', 'network-hub', 'entrepreneur']
    },
    {
      id: 'gov-opportunity',
      name: 'SBIR Phase II Grant',
      type: 'opportunity',
      tier: 'A',
      strength: 0.8,
      coordinates: { lat: 38.9072, lng: -77.0369 }, // DC
      connections: 5,
      lastContact: '2024-12-12',
      status: 'pending',
      value: 1500000,
      tags: ['government', 'sbir', 'phase-ii']
    },
    {
      id: 'corp-partner',
      name: 'Global Tech Solutions',
      type: 'sponsor',
      tier: 'B',
      strength: 0.7,
      coordinates: { lat: 47.6062, lng: -122.3321 }, // Seattle
      connections: 10,
      lastContact: '2024-12-08',
      status: 'active',
      value: 3000000,
      tags: ['enterprise', 'b2b', 'cloud']
    },
    {
      id: 'regional-hub',
      name: 'Austin Innovation District',
      type: 'organization',
      tier: 'B',
      strength: 0.65,
      coordinates: { lat: 30.2672, lng: -97.7431 }, // Austin
      connections: 15,
      lastContact: '2024-11-28',
      status: 'active',
      value: 1200000,
      tags: ['regional', 'innovation', 'startup-hub']
    },
    {
      id: 'international-sponsor',
      name: 'European Investment Fund',
      type: 'sponsor',
      tier: 'A',
      strength: 0.6,
      coordinates: { lat: 51.5074, lng: -0.1278 }, // London
      connections: 8,
      lastContact: '2024-11-25',
      status: 'dormant',
      value: 8000000,
      tags: ['international', 'fintech', 'cross-border']
    },
    {
      id: 'west-coast-accelerator',
      name: 'Silicon Valley Accelerator',
      type: 'organization',
      tier: 'A',
      strength: 0.8,
      coordinates: { lat: 37.4419, lng: -122.1430 }, // Palo Alto
      connections: 25,
      lastContact: '2024-12-14',
      status: 'active',
      value: 4000000,
      tags: ['accelerator', 'early-stage', 'tech']
    },
    {
      id: 'midwest-foundation',
      name: 'Great Lakes Foundation',
      type: 'sponsor',
      tier: 'B',
      strength: 0.7,
      coordinates: { lat: 43.0389, lng: -87.9065 }, // Milwaukee
      connections: 12,
      lastContact: '2024-12-11',
      status: 'active',
      value: 2000000,
      tags: ['foundation', 'social-impact', 'sustainability']
    }
  ];

  const edges: RelationshipEdge[] = [
    {
      source: 'center-hub',
      target: 'tech-sponsor-1',
      type: 'funding',
      strength: 0.9,
      weight: 3,
      lastInteraction: '2024-12-15',
      value: 2500000,
      status: 'active'
    },
    {
      source: 'center-hub',
      target: 'individual-connector',
      type: 'advisory',
      strength: 0.85,
      weight: 2,
      lastInteraction: '2024-12-16',
      value: 0,
      status: 'active'
    },
    {
      source: 'tech-sponsor-1',
      target: 'individual-connector',
      type: 'referral',
      strength: 0.8,
      weight: 2,
      lastInteraction: '2024-12-14',
      value: 0,
      status: 'active'
    },
    {
      source: 'individual-connector',
      target: 'edu-partner',
      type: 'collaboration',
      strength: 0.75,
      weight: 2,
      lastInteraction: '2024-12-10',
      value: 750000,
      status: 'active'
    },
    {
      source: 'center-hub',
      target: 'gov-opportunity',
      type: 'funding',
      strength: 0.8,
      weight: 3,
      lastInteraction: '2024-12-12',
      value: 1500000,
      status: 'active'
    },
    {
      source: 'corp-partner',
      target: 'regional-hub',
      type: 'partnership',
      strength: 0.7,
      weight: 2,
      lastInteraction: '2024-11-30',
      value: 1200000,
      status: 'active'
    }
  ];

  return { nodes, edges };
};

export const HybridRelationshipMapping: React.FC = memo(() => {
  const [data, setData] = useState(generateMockRelationshipData());
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  const [activeView, setActiveView] = useState<'network' | 'geographic' | 'hybrid'>('network');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    nodeTypes: [] as string[],
    edgeTypes: [] as string[],
    strengthRange: [0, 1] as [number, number],
    tierFilter: '' as string,
    statusFilter: '' as string,
    showInactive: true,
    geographicBounds: null as { ne: [number, number], sw: [number, number] } | null
  });
  const [pathDiscovery, setPathDiscovery] = useState({
    sourceNode: '',
    targetNode: '',
    maxDegrees: 7,
    results: [] as PathDiscoveryResult[],
    isAnalyzing: false,
    highlightedPath: null as string[] | null
  });
  const [viewSettings, setViewSettings] = useState({
    showLabels: true,
    showStrengthWeights: true,
    enablePhysics: true,
    clusterByType: false,
    highlightPaths: true,
    mapZoom: 4,
    mapCenter: [39.8283, -98.5795] as [number, number], // Center US
    nodeSize: 8,
    linkDistance: 100,
    chargeStrength: -300
  });
  
  // Refs for graph and map instances
  const forceGraphRef = useRef<any>(null);
  const mapRef = useRef<any>(null);

  // Advanced seven-degree path discovery algorithm
  const discoverPaths = useCallback(async (source: string, target: string, maxDegrees: number = 7) => {
    setPathDiscovery(prev => ({ ...prev, isAnalyzing: true }));
    
    console.log(`Discovering paths from ${source} to ${target} within ${maxDegrees} degrees`);
    
    // Build adjacency graph for efficient traversal
    const graph = new Map<string, Array<{node: string, edge: RelationshipEdge}>>();
    
    data.edges.forEach(edge => {
      if (!graph.has(edge.source)) graph.set(edge.source, []);
      if (!graph.has(edge.target)) graph.set(edge.target, []);
      
      graph.get(edge.source)!.push({ node: edge.target, edge });
      graph.get(edge.target)!.push({ node: edge.source, edge });
    });
    
    const paths: PathDiscoveryResult[] = [];
    
    // BFS with path tracking for shortest paths
    const queue: Array<{
      node: string;
      path: string[];
      distance: number;
      totalStrength: number;
      pathType: 'direct' | 'indirect' | 'multi-hop';
    }> = [{
      node: source,
      path: [source],
      distance: 0,
      totalStrength: 0,
      pathType: 'direct'
    }];
    
    const visited = new Map<string, number>();
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      
      if (current.distance > maxDegrees) continue;
      
      if (visited.has(current.node) && visited.get(current.node)! <= current.distance) {
        continue;
      }
      visited.set(current.node, current.distance);
      
      if (current.node === target && current.distance > 0) {
        const avgStrength = current.totalStrength / current.distance;
        const confidence = Math.max(0, 1 - (current.distance / maxDegrees)) * avgStrength;
        
        paths.push({
          path: current.path,
          distance: current.distance,
          strength: avgStrength,
          intermediaries: current.path.slice(1, -1),
          confidence,
          pathType: current.distance === 1 ? 'direct' : current.distance <= 3 ? 'indirect' : 'multi-hop'
        });
        continue;
      }
      
      // Explore neighbors
      const neighbors = graph.get(current.node) || [];
      neighbors.forEach(({ node: nextNode, edge }) => {
        if (!current.path.includes(nextNode)) {
          const pathType = current.distance === 0 ? 'direct' : 
                          current.distance < 3 ? 'indirect' : 'multi-hop';
          
          queue.push({
            node: nextNode,
            path: [...current.path, nextNode],
            distance: current.distance + 1,
            totalStrength: current.totalStrength + edge.strength,
            pathType
          });
        }
      });
    }
    
    paths.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return b.confidence - a.confidence;
    });
    
    setTimeout(() => {
      setPathDiscovery(prev => ({
        ...prev,
        results: paths.slice(0, 15),
        isAnalyzing: false
      }));
    }, 500);
    
    return paths;
  }, [data]);

  // Data filtering
  const filteredData = useMemo(() => {
    let filteredNodes = data.nodes.filter(node => {
      if (searchTerm && !node.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filters.nodeTypes.length > 0 && !filters.nodeTypes.includes(node.type)) return false;
      if (filters.tierFilter && node.tier !== filters.tierFilter) return false;
      if (filters.statusFilter && node.status !== filters.statusFilter) return false;
      if (node.strength < filters.strengthRange[0] || node.strength > filters.strengthRange[1]) return false;
      return true;
    });

    let filteredEdges = data.edges.filter(edge => {
      if (filters.edgeTypes.length > 0 && !filters.edgeTypes.includes(edge.type)) return false;
      if (!filters.showInactive && edge.status === 'inactive') return false;
      if (edge.strength < filters.strengthRange[0] || edge.strength > filters.strengthRange[1]) return false;
      
      const sourceExists = filteredNodes.some(node => node.id === edge.source);
      const targetExists = filteredNodes.some(node => node.id === edge.target);
      return sourceExists && targetExists;
    });

    return { nodes: filteredNodes, edges: filteredEdges };
  }, [data, searchTerm, filters]);

  // Node and edge styling functions
  const getNodeColor = useCallback((node: RelationshipNode) => {
    const baseColors = {
      'sponsor': '#3B82F6',
      'organization': '#10B981',
      'individual': '#F59E0B',
      'grant': '#8B5CF6',
      'opportunity': '#EF4444'
    };
    
    if (pathDiscovery.highlightedPath && pathDiscovery.highlightedPath.includes(node.id)) {
      return '#FF6B6B';
    }
    
    if (selectedNodes.includes(node.id)) {
      return '#1F2937';
    }
    
    return baseColors[node.type];
  }, [selectedNodes, pathDiscovery.highlightedPath]);

  const getNodeSize = useCallback((node: RelationshipNode) => {
    let size = viewSettings.nodeSize;
    
    const connectionsMultiplier = 1 + (node.connections / 25);
    const strengthMultiplier = 0.5 + (node.strength * 1.5);
    
    size = size * connectionsMultiplier * strengthMultiplier;
    
    if (selectedNodes.includes(node.id) || 
        (pathDiscovery.highlightedPath && pathDiscovery.highlightedPath.includes(node.id))) {
      size *= 1.5;
    }
    
    return Math.max(4, Math.min(size, 25));
  }, [viewSettings.nodeSize, selectedNodes, pathDiscovery.highlightedPath]);

  const getEdgeColor = useCallback((edge: RelationshipEdge) => {
    const baseColors = {
      'partnership': '#059669',
      'funding': '#DC2626',
      'collaboration': '#7C3AED',
      'referral': '#D97706',
      'advisory': '#1D4ED8'
    };
    
    if (pathDiscovery.highlightedPath) {
      for (let i = 0; i < pathDiscovery.highlightedPath.length - 1; i++) {
        const source = pathDiscovery.highlightedPath[i];
        const target = pathDiscovery.highlightedPath[i + 1];
        if ((edge.source === source && edge.target === target) ||
            (edge.source === target && edge.target === source)) {
          return '#FF6B6B';
        }
      }
    }
    
    const baseColor = baseColors[edge.type];
    return edge.status === 'active' ? baseColor : `${baseColor}80`;
  }, [pathDiscovery.highlightedPath]);

  const getEdgeWidth = useCallback((edge: RelationshipEdge) => {
    let width = Math.max(1, edge.weight * edge.strength);
    
    if (pathDiscovery.highlightedPath) {
      for (let i = 0; i < pathDiscovery.highlightedPath.length - 1; i++) {
        const source = pathDiscovery.highlightedPath[i];
        const target = pathDiscovery.highlightedPath[i + 1];
        if ((edge.source === source && edge.target === target) ||
            (edge.source === target && edge.target === source)) {
          width *= 2;
          break;
        }
      }
    }
    
    return Math.max(1, Math.min(width, 8));
  }, [pathDiscovery.highlightedPath]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Hybrid Relationship Mapping</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Advanced network visualization with geographic intelligence and seven-degree path discovery
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div>
          <Input
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>
        <div>
          <Select value={filters.tierFilter} onValueChange={(value) => setFilters(prev => ({ ...prev, tierFilter: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Tiers</SelectItem>
              <SelectItem value="A">Tier A</SelectItem>
              <SelectItem value="B">Tier B</SelectItem>
              <SelectItem value="C">Tier C</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Select value={filters.statusFilter} onValueChange={(value) => setFilters(prev => ({ ...prev, statusFilter: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="dormant">Dormant</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center space-x-2">
          <Switch 
            checked={filters.showInactive}
            onCheckedChange={(checked) => setFilters(prev => ({ ...prev, showInactive: checked }))}
          />
          <Label>Show Inactive</Label>
        </div>
      </div>

      {/* Main Visualization */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'network' | 'geographic' | 'hybrid')}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="network" className="flex items-center gap-2">
                <Network className="w-4 h-4" />
                Network View
              </TabsTrigger>
              <TabsTrigger value="geographic" className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Geographic View
              </TabsTrigger>
              <TabsTrigger value="hybrid" className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Hybrid View
              </TabsTrigger>
            </TabsList>

            {/* Network Visualization */}
            <TabsContent value="network" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="w-5 h-5" />
                    Network Graph
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[600px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
                    <ForceGraph2D
                      ref={forceGraphRef}
                      graphData={{ nodes: filteredData.nodes, links: filteredData.edges }}
                      width={undefined}
                      height={600}
                      backgroundColor="#f9fafb"
                      nodeId="id"
                      nodeLabel={(node: any) => `
                        <div class="p-2 bg-white border rounded shadow-lg">
                          <div class="font-semibold">${node.name}</div>
                          <div class="text-sm text-gray-600">Type: ${node.type}</div>
                          <div class="text-sm text-gray-600">Tier: ${node.tier}</div>
                          <div class="text-sm text-gray-600">Strength: ${(node.strength * 100).toFixed(1)}%</div>
                          <div class="text-sm text-gray-600">Connections: ${node.connections}</div>
                          ${node.value ? `<div class="text-sm text-gray-600">Value: $${node.value.toLocaleString()}</div>` : ''}
                        </div>
                      `}
                      nodeColor={getNodeColor}
                      nodeVal={getNodeSize}
                      linkSource="source"
                      linkTarget="target"
                      linkColor={getEdgeColor}
                      linkWidth={getEdgeWidth}
                      onNodeClick={(node: any) => {
                        setSelectedNodes(prev => 
                          prev.includes(node.id) 
                            ? prev.filter(id => id !== node.id)
                            : [...prev, node.id]
                        );
                      }}
                      enableNodeDrag={viewSettings.enablePhysics}
                      enableZoomInteraction={true}
                      enablePanInteraction={true}
                      cooldownTicks={100}
                      linkDistance={viewSettings.linkDistance}
                      chargeStrength={viewSettings.chargeStrength}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Geographic Visualization */}
            <TabsContent value="geographic" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Geographic Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[600px] rounded-lg overflow-hidden">
                    <MapContainer
                      ref={mapRef}
                      center={viewSettings.mapCenter}
                      zoom={viewSettings.mapZoom}
                      style={{ height: '100%', width: '100%' }}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      
                      {filteredData.nodes
                        .filter(node => node.coordinates)
                        .map(node => (
                          <Marker
                            key={node.id}
                            position={[node.coordinates!.lat, node.coordinates!.lng]}
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
                                <div className="font-semibold text-lg">{node.name}</div>
                                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                                  <div>Type: <span className="font-medium">{node.type}</span></div>
                                  <div>Tier: <span className="font-medium">{node.tier}</span></div>
                                  <div>Strength: <span className="font-medium">{(node.strength * 100).toFixed(1)}%</span></div>
                                  <div>Connections: <span className="font-medium">{node.connections}</span></div>
                                </div>
                              </div>
                            </Popup>
                          </Marker>
                        ))
                      }
                      
                      {filteredData.edges
                        .filter(edge => {
                          const sourceNode = filteredData.nodes.find(n => n.id === edge.source);
                          const targetNode = filteredData.nodes.find(n => n.id === edge.target);
                          return sourceNode?.coordinates && targetNode?.coordinates;
                        })
                        .map((edge, index) => {
                          const sourceNode = filteredData.nodes.find(n => n.id === edge.source);
                          const targetNode = filteredData.nodes.find(n => n.id === edge.target);
                          if (!sourceNode?.coordinates || !targetNode?.coordinates) return null;
                          
                          return (
                            <Polyline
                              key={`${edge.source}-${edge.target}-${index}`}
                              positions={[
                                [sourceNode.coordinates.lat, sourceNode.coordinates.lng],
                                [targetNode.coordinates.lat, targetNode.coordinates.lng]
                              ]}
                              color={getEdgeColor(edge)}
                              weight={getEdgeWidth(edge)}
                              opacity={edge.status === 'active' ? 0.7 : 0.3}
                            />
                          );
                        })
                      }
                    </MapContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Hybrid View */}
            <TabsContent value="hybrid" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Network className="w-5 h-5" />
                      Network Analysis
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[400px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
                      <ForceGraph2D
                        graphData={{ nodes: filteredData.nodes, links: filteredData.edges }}
                        width={undefined}
                        height={400}
                        backgroundColor="#f9fafb"
                        nodeId="id"
                        nodeColor={getNodeColor}
                        nodeVal={getNodeSize}
                        linkColor={getEdgeColor}
                        linkWidth={getEdgeWidth}
                        onNodeClick={(node: any) => {
                          setSelectedNodes(prev => 
                            prev.includes(node.id) 
                              ? prev.filter(id => id !== node.id)
                              : [...prev, node.id]
                          );
                        }}
                        enableNodeDrag={false}
                        enableZoomInteraction={true}
                        cooldownTicks={50}
                        linkDistance={80}
                        chargeStrength={-200}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Globe className="w-5 h-5" />
                      Geographic Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="w-full h-[400px] rounded-lg overflow-hidden">
                      <MapContainer
                        center={viewSettings.mapCenter}
                        zoom={viewSettings.mapZoom}
                        style={{ height: '100%', width: '100%' }}
                      >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        {filteredData.nodes
                          .filter(node => node.coordinates)
                          .map(node => (
                            <Marker
                              key={node.id}
                              position={[node.coordinates!.lat, node.coordinates!.lng]}
                            >
                              <Popup>
                                <div className="font-semibold">{node.name}</div>
                                <div className="text-sm">{node.type} - Tier {node.tier}</div>
                              </Popup>
                            </Marker>
                          ))
                        }
                      </MapContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Path Discovery Panel */}
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Route className="w-5 h-5" />
              Seven-Degree Path Discovery
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="source-node">Source Node</Label>
                <Select 
                  value={pathDiscovery.sourceNode} 
                  onValueChange={(value) => setPathDiscovery(prev => ({ ...prev, sourceNode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.nodes.map(node => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="target-node">Target Node</Label>
                <Select 
                  value={pathDiscovery.targetNode} 
                  onValueChange={(value) => setPathDiscovery(prev => ({ ...prev, targetNode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select target" />
                  </SelectTrigger>
                  <SelectContent>
                    {data.nodes.map(node => (
                      <SelectItem key={node.id} value={node.id}>
                        {node.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div>
              <Label>Maximum Degrees: {pathDiscovery.maxDegrees}</Label>
              <Slider
                value={[pathDiscovery.maxDegrees]}
                onValueChange={([value]) => setPathDiscovery(prev => ({ ...prev, maxDegrees: value }))}
                min={1}
                max={7}
                step={1}
                className="mt-2"
              />
            </div>
            
            <Button 
              onClick={() => {
                if (pathDiscovery.sourceNode && pathDiscovery.targetNode) {
                  discoverPaths(pathDiscovery.sourceNode, pathDiscovery.targetNode, pathDiscovery.maxDegrees);
                }
              }}
              disabled={!pathDiscovery.sourceNode || !pathDiscovery.targetNode || pathDiscovery.isAnalyzing}
              className="w-full"
            >
              {pathDiscovery.isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <GitBranch className="w-4 h-4 mr-2" />
                  Discover Paths
                </>
              )}
            </Button>
            
            {/* Path Results */}
            {pathDiscovery.results.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Paths ({pathDiscovery.results.length}):</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPathDiscovery(prev => ({ ...prev, highlightedPath: null }))}
                  >
                    Clear
                  </Button>
                </div>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {pathDiscovery.results.map((result, index) => (
                    <Card 
                      key={index} 
                      className={`p-3 cursor-pointer transition-colors ${
                        pathDiscovery.highlightedPath === result.path ? 'bg-blue-50 border-blue-300' : ''
                      }`}
                      onClick={() => setPathDiscovery(prev => ({ 
                        ...prev, 
                        highlightedPath: prev.highlightedPath === result.path ? null : result.path 
                      }))}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-sm font-medium">Path {index + 1}</span>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {result.distance}°
                          </Badge>
                          <Badge variant={
                            result.pathType === 'direct' ? 'default' :
                            result.pathType === 'indirect' ? 'secondary' : 'outline'
                          }>
                            {result.pathType}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {result.path.map((nodeId, pathIndex) => {
                          const node = data.nodes.find(n => n.id === nodeId);
                          return (
                            <span key={nodeId}>
                              {node?.name}
                              {pathIndex < result.path.length - 1 && (
                                <span className="mx-1 text-gray-400">→</span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        <span>Strength: {(result.strength * 100).toFixed(1)}%</span>
                        <span>Confidence: {(result.confidence * 100).toFixed(1)}%</span>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
});

export default HybridRelationshipMapping;