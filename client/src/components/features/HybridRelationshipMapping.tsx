/**
 * Hybrid Relationship Mapping Component
 * Based on attached asset File 26 specification with NetworkX integration
 * Displays interactive relationship network with 7-degree path discovery
 */

import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { 
  Network, 
  Users, 
  Search, 
  Target, 
  GitBranch,
  Zap,
  MapPin,
  TrendingUp,
  Filter,
  Download
} from 'lucide-react';
import { useRelationshipData } from '../../hooks/useRelationshipData';

interface RelationshipNode {
  id: string;
  name: string;
  type: 'sponsor' | 'organization' | 'person' | 'grant';
  tier: number;
  centrality_score: number;
  influence_score: number;
  x?: number;
  y?: number;
  connections: number;
}

interface RelationshipEdge {
  source: string;
  target: string;
  strength: number;
  type: string;
  verified: boolean;
  distance: number;
}

interface NetworkData {
  nodes: RelationshipNode[];
  edges: RelationshipEdge[];
  stats: {
    total_nodes: number;
    total_edges: number;
    max_degree: number;
    avg_clustering: number;
    network_density: number;
  };
}

interface PathDiscoveryResult {
  paths: Array<{
    nodes: RelationshipNode[];
    strength: number;
    distance: number;
    confidence: number;
  }>;
  landmarks: RelationshipNode[];
  analysis: {
    shortest_path_length: number;
    alternative_paths: number;
    bottleneck_nodes: RelationshipNode[];
  };
}

export default function HybridRelationshipMapping() {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [maxDegrees, setMaxDegrees] = useState([3]);
  const [filterType, setFilterType] = useState<string>('all');
  const [visualMode, setVisualMode] = useState<'force' | 'hierarchical' | 'circular'>('force');
  const [showPaths, setShowPaths] = useState(false);
  const [pathSource, setPathSource] = useState<string>('');
  const [pathTarget, setPathTarget] = useState<string>('');
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const queryClient = useQueryClient();

  // Fetch network data with relationship hook
  const { 
    data: networkData, 
    isLoading: networkLoading,
    error: networkError
  } = useRelationshipData('/api/relationships/network', {
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 60 * 1000 // 1 minute
  }) as { data: NetworkData | undefined; isLoading: boolean; error: any };

  // Path discovery mutation
  const pathDiscoveryMutation = useMutation({
    mutationFn: async ({ source, target, maxDegrees }: { 
      source: string; 
      target: string; 
      maxDegrees: number;
    }) => {
      const response = await fetch('/api/relationships/discover-path', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: source, target_id: target, max_degrees: maxDegrees })
      });
      if (!response.ok) throw new Error('Path discovery failed');
      return response.json();
    },
    onSuccess: (data) => {
      setShowPaths(true);
      queryClient.setQueryData(['path-discovery', pathSource, pathTarget], data);
    }
  });

  // Network statistics query
  const { data: networkStats } = useQuery({
    queryKey: ['network-stats'],
    queryFn: async () => {
      const response = await fetch('/api/relationships/network/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    staleTime: 10 * 60 * 1000
  });

  // Canvas network visualization
  useEffect(() => {
    if (!networkData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw network visualization
    drawNetwork(ctx, networkData, {
      selectedNode,
      filterType,
      visualMode,
      showPaths: showPaths && pathDiscoveryMutation.data
    });
  }, [networkData, selectedNode, filterType, visualMode, showPaths, pathDiscoveryMutation.data]);

  const drawNetwork = (
    ctx: CanvasRenderingContext2D, 
    data: NetworkData, 
    options: any
  ) => {
    const { nodes, edges } = data;
    const { width, height } = ctx.canvas;

    // Filter nodes and edges based on criteria
    const filteredNodes = nodes.filter((node: RelationshipNode) => {
      if (options.filterType !== 'all' && node.type !== options.filterType) return false;
      if (searchTerm && !node.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });

    const nodeIds = new Set(filteredNodes.map(n => n.id));
    const filteredEdges = edges.filter(edge => 
      nodeIds.has(edge.source) && nodeIds.has(edge.target)
    );

    // Layout algorithm based on visual mode
    let positions: Map<string, { x: number; y: number }>;
    
    switch (options.visualMode) {
      case 'force':
        positions = calculateForceLayout(filteredNodes, filteredEdges, width, height);
        break;
      case 'hierarchical':
        positions = calculateHierarchicalLayout(filteredNodes, filteredEdges, width, height);
        break;
      case 'circular':
        positions = calculateCircularLayout(filteredNodes, width, height);
        break;
      default:
        positions = new Map();
    }

    // Draw edges first
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    filteredEdges.forEach(edge => {
      const sourcePos = positions.get(edge.source);
      const targetPos = positions.get(edge.target);
      if (!sourcePos || !targetPos) return;

      const alpha = Math.min(edge.strength / 100, 1);
      ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
      ctx.lineWidth = edge.strength / 50;

      ctx.beginPath();
      ctx.moveTo(sourcePos.x, sourcePos.y);
      ctx.lineTo(targetPos.x, targetPos.y);
      ctx.stroke();
    });

    // Draw nodes
    filteredNodes.forEach(node => {
      const pos = positions.get(node.id);
      if (!pos) return;

      const radius = Math.max(4, Math.min(20, node.centrality_score * 30));
      const isSelected = node.id === options.selectedNode;

      // Node color based on type
      let color = '#64748b';
      switch (node.type) {
        case 'sponsor': color = '#3b82f6'; break;
        case 'organization': color = '#10b981'; break;
        case 'person': color = '#8b5cf6'; break;
        case 'grant': color = '#f59e0b'; break;
      }

      // Draw node circle
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, 2 * Math.PI);
      ctx.fill();

      if (isSelected) {
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw node label
      if (radius > 8 || isSelected) {
        ctx.fillStyle = '#1f2937';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.name, pos.x, pos.y + radius + 15);
      }
    });

    // Draw paths if enabled
    if (options.showPaths && pathDiscoveryMutation.data) {
      drawDiscoveredPaths(ctx, pathDiscoveryMutation.data, positions);
    }
  };

  const calculateForceLayout = (
    nodes: RelationshipNode[], 
    edges: RelationshipEdge[], 
    width: number, 
    height: number
  ): Map<string, { x: number; y: number }> => {
    // Simplified force-directed layout
    const positions = new Map<string, { x: number; y: number }>();
    
    // Initialize random positions
    nodes.forEach(node => {
      positions.set(node.id, {
        x: Math.random() * (width - 100) + 50,
        y: Math.random() * (height - 100) + 50
      });
    });

    // Simulate force-directed positioning (simplified)
    for (let iteration = 0; iteration < 50; iteration++) {
      const forces = new Map<string, { fx: number; fy: number }>();
      
      nodes.forEach(node => {
        forces.set(node.id, { fx: 0, fy: 0 });
      });

      // Repulsive forces between all nodes
      nodes.forEach(nodeA => {
        nodes.forEach(nodeB => {
          if (nodeA.id === nodeB.id) return;
          
          const posA = positions.get(nodeA.id)!;
          const posB = positions.get(nodeB.id)!;
          const forceA = forces.get(nodeA.id)!;
          
          const dx = posA.x - posB.x;
          const dy = posA.y - posB.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          
          const repulsion = 1000 / (distance * distance);
          forceA.fx += (dx / distance) * repulsion;
          forceA.fy += (dy / distance) * repulsion;
        });
      });

      // Attractive forces for connected nodes
      edges.forEach(edge => {
        const posSource = positions.get(edge.source);
        const posTarget = positions.get(edge.target);
        const forceSource = forces.get(edge.source);
        const forceTarget = forces.get(edge.target);
        
        if (!posSource || !posTarget || !forceSource || !forceTarget) return;

        const dx = posTarget.x - posSource.x;
        const dy = posTarget.y - posSource.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        
        const attraction = distance * 0.01 * edge.strength;
        forceSource.fx += (dx / distance) * attraction;
        forceSource.fy += (dy / distance) * attraction;
        forceTarget.fx -= (dx / distance) * attraction;
        forceTarget.fy -= (dy / distance) * attraction;
      });

      // Apply forces
      nodes.forEach((node: RelationshipNode) => {
        const pos = positions.get(node.id)!;
        const force = forces.get(node.id)!;
        
        pos.x += force.fx * 0.1;
        pos.y += force.fy * 0.1;
        
        // Keep within bounds
        pos.x = Math.max(20, Math.min(width - 20, pos.x));
        pos.y = Math.max(20, Math.min(height - 20, pos.y));
      });
    }

    return positions;
  };

  const calculateHierarchicalLayout = (
    nodes: RelationshipNode[], 
    edges: RelationshipEdge[], 
    width: number, 
    height: number
  ): Map<string, { x: number; y: number }> => {
    const positions = new Map<string, { x: number; y: number }>();
    
    // Group nodes by tier
    const tiers = new Map<number, RelationshipNode[]>();
    nodes.forEach(node => {
      if (!tiers.has(node.tier)) tiers.set(node.tier, []);
      tiers.get(node.tier)!.push(node);
    });

    const tierCount = tiers.size;
    const tierHeight = height / (tierCount + 1);

    Array.from(tiers.entries()).forEach(([tier, tierNodes], tierIndex) => {
      const y = tierHeight * (tierIndex + 1);
      const nodeWidth = width / (tierNodes.length + 1);
      
      tierNodes.forEach((node, nodeIndex) => {
        const x = nodeWidth * (nodeIndex + 1);
        positions.set(node.id, { x, y });
      });
    });

    return positions;
  };

  const calculateCircularLayout = (
    nodes: RelationshipNode[], 
    width: number, 
    height: number
  ): Map<string, { x: number; y: number }> => {
    const positions = new Map<string, { x: number; y: number }>();
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.4;

    nodes.forEach((node, index) => {
      const angle = (2 * Math.PI * index) / nodes.length;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      positions.set(node.id, { x, y });
    });

    return positions;
  };

  const drawDiscoveredPaths = (
    ctx: CanvasRenderingContext2D,
    pathData: PathDiscoveryResult,
    positions: Map<string, { x: number; y: number }>
  ) => {
    pathData.paths.forEach((path: any, pathIndex: number) => {
      const hue = (pathIndex * 60) % 360;
      ctx.strokeStyle = `hsl(${hue}, 70%, 50%)`;
      ctx.lineWidth = 4;
      ctx.setLineDash([5, 5]);

      for (let i = 0; i < path.nodes.length - 1; i++) {
        const sourcePos = positions.get(path.nodes[i].id);
        const targetPos = positions.get(path.nodes[i + 1].id);
        
        if (sourcePos && targetPos) {
          ctx.beginPath();
          ctx.moveTo(sourcePos.x, sourcePos.y);
          ctx.lineTo(targetPos.x, targetPos.y);
          ctx.stroke();
        }
      }
    });

    ctx.setLineDash([]);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!networkData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked node
    const clickedNode = networkData.nodes.find(node => {
      if (!node.x || !node.y) return false;
      const distance = Math.sqrt((x - node.x) ** 2 + (y - node.y) ** 2);
      const radius = Math.max(4, Math.min(20, node.centrality_score * 30));
      return distance <= radius;
    });

    if (clickedNode) {
      setSelectedNode(clickedNode.id);
    } else {
      setSelectedNode(null);
    }
  };

  const handlePathDiscovery = () => {
    if (pathSource && pathTarget) {
      pathDiscoveryMutation.mutate({
        source: pathSource,
        target: pathTarget,
        maxDegrees: maxDegrees[0]
      });
    }
  };

  if (networkLoading) {
    return (
      <Card className="w-full h-[600px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network size={20} />
            Hybrid Relationship Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading relationship network...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (networkError) {
    return (
      <Card className="w-full h-[600px]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network size={20} />
            Hybrid Relationship Mapping
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center text-red-600">
            <p>Failed to load relationship network</p>
            <Button 
              onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/relationships/network'] })}
              className="mt-4"
            >
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network size={20} />
          Hybrid Relationship Mapping
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="network" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="network">Network View</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="discovery">Path Discovery</TabsTrigger>
          </TabsList>

          <TabsContent value="network" className="space-y-4">
            {/* Controls */}
            <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                <Search size={16} />
                <Input
                  placeholder="Search nodes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-48"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <Filter size={16} />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-1 border rounded"
                >
                  <option value="all">All Types</option>
                  <option value="sponsor">Sponsors</option>
                  <option value="organization">Organizations</option>
                  <option value="person">People</option>
                  <option value="grant">Grants</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <select
                  value={visualMode}
                  onChange={(e) => setVisualMode(e.target.value as any)}
                  className="px-3 py-1 border rounded"
                >
                  <option value="force">Force Layout</option>
                  <option value="hierarchical">Hierarchical</option>
                  <option value="circular">Circular</option>
                </select>
              </div>

              <Button variant="outline" size="sm">
                <Download size={16} className="mr-2" />
                Export
              </Button>
            </div>

            {/* Network Canvas */}
            <div className="relative border border-gray-200 rounded-lg overflow-hidden">
              <canvas
                ref={canvasRef}
                width={800}
                height={500}
                className="w-full h-[500px] cursor-pointer"
                onClick={handleCanvasClick}
              />
              
              {selectedNode && (
                <div className="absolute top-4 right-4 bg-white p-3 rounded-lg shadow-lg border">
                  <h4 className="font-semibold">Node Details</h4>
                  <p className="text-sm text-gray-600">Selected: {selectedNode}</p>
                </div>
              )}
            </div>

            {/* Network Stats */}
            {networkData && (
              <div className="grid grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{networkData.stats.total_nodes}</div>
                  <div className="text-sm text-gray-600">Total Nodes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{networkData.stats.total_edges}</div>
                  <div className="text-sm text-gray-600">Relationships</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{networkData.stats.max_degree}</div>
                  <div className="text-sm text-gray-600">Max Connections</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {(networkData.stats.avg_clustering * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Clustering</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {(networkData.stats.network_density * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Density</div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Key Connectors</CardTitle>
                </CardHeader>
                <CardContent>
                  {networkData?.nodes
                    .sort((a: RelationshipNode, b: RelationshipNode) => b.centrality_score - a.centrality_score)
                    .slice(0, 5)
                    .map((node: RelationshipNode) => (
                      <div key={node.id} className="flex justify-between items-center py-2">
                        <span className="font-medium">{node.name}</span>
                        <Badge variant="secondary">
                          {(node.centrality_score * 100).toFixed(1)}%
                        </Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Influence Leaders</CardTitle>
                </CardHeader>
                <CardContent>
                  {networkData?.nodes
                    .sort((a: RelationshipNode, b: RelationshipNode) => b.influence_score - a.influence_score)
                    .slice(0, 5)
                    .map((node: RelationshipNode) => (
                      <div key={node.id} className="flex justify-between items-center py-2">
                        <span className="font-medium">{node.name}</span>
                        <Badge variant="secondary">
                          {node.influence_score.toFixed(1)}
                        </Badge>
                      </div>
                    ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="discovery" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitBranch size={20} />
                  7-Degree Path Discovery
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Source Node</label>
                    <Input
                      placeholder="Enter source node ID..."
                      value={pathSource}
                      onChange={(e) => setPathSource(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Target Node</label>
                    <Input
                      placeholder="Enter target node ID..."
                      value={pathTarget}
                      onChange={(e) => setPathTarget(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Maximum Degrees: {maxDegrees[0]}
                  </label>
                  <Slider
                    value={maxDegrees}
                    onValueChange={setMaxDegrees}
                    max={7}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                </div>

                <Button 
                  onClick={handlePathDiscovery}
                  disabled={!pathSource || !pathTarget || pathDiscoveryMutation.isPending}
                  className="w-full"
                >
                  {pathDiscoveryMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Discovering Paths...
                    </>
                  ) : (
                    <>
                      <Target size={16} className="mr-2" />
                      Discover Connection Paths
                    </>
                  )}
                </Button>

                {pathDiscoveryMutation.data && (
                  <div className="mt-6 space-y-4">
                    <h4 className="font-semibold">Discovery Results</h4>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-blue-600">
                          {pathDiscoveryMutation.data.analysis.shortest_path_length}
                        </div>
                        <div className="text-sm text-gray-600">Shortest Path</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {pathDiscoveryMutation.data.analysis.alternative_paths}
                        </div>
                        <div className="text-sm text-gray-600">Alternative Paths</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-600">
                          {pathDiscoveryMutation.data.landmarks.length}
                        </div>
                        <div className="text-sm text-gray-600">Landmark Nodes</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h5 className="font-medium">Connection Paths</h5>
                      {pathDiscoveryMutation.data.paths.map((path, index) => (
                        <div key={index} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">Path {index + 1}</span>
                            <div className="flex gap-2">
                              <Badge variant="outline">
                                Strength: {path.strength.toFixed(1)}%
                              </Badge>
                              <Badge variant="outline">
                                Distance: {path.distance}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-sm text-gray-600">
                            {path.nodes.map(node => node.name).join(' → ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}