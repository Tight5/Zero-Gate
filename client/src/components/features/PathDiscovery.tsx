/**
 * Path Discovery Component
 * Based on attached asset File 27 specification with advanced algorithm implementation
 * Provides intelligent relationship path analysis with landmark-based routing
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { 
  Route, 
  Navigation, 
  Target, 
  Zap,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  GitBranch,
  Layers,
  Search
} from 'lucide-react';
import { useRelationshipData } from '../../hooks/useRelationshipData';

interface PathNode {
  id: string;
  name: string;
  type: 'sponsor' | 'organization' | 'person' | 'grant';
  tier: number;
  centrality_score: number;
  influence_score: number;
  is_landmark: boolean;
  connection_strength: number;
}

interface DiscoveredPath {
  id: string;
  nodes: PathNode[];
  total_strength: number;
  path_length: number;
  confidence_score: number;
  estimated_time: number;
  path_type: 'direct' | 'landmark' | 'multi_hop' | 'bridge';
  bottlenecks: PathNode[];
  alternative_routes: number;
  risk_factors: Array<{
    type: 'weak_link' | 'single_point_failure' | 'outdated_connection';
    node_id: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
}

interface PathDiscoveryRequest {
  source_id: string;
  target_id: string;
  max_degrees: number;
  algorithm: 'dijkstra' | 'a_star' | 'landmark_routing' | 'all_paths';
  include_weak_connections: boolean;
  require_verified_only: boolean;
  optimization_goal: 'shortest' | 'strongest' | 'fastest' | 'most_reliable';
}

interface PathAnalysis {
  total_paths_found: number;
  shortest_path_length: number;
  strongest_path_strength: number;
  average_confidence: number;
  recommended_path_id: string;
  landmark_nodes: PathNode[];
  bridge_nodes: PathNode[];
  network_analysis: {
    clustering_coefficient: number;
    betweenness_centrality: number;
    path_redundancy: number;
    vulnerability_score: number;
  };
}

export default function PathDiscovery() {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [maxDegrees, setMaxDegrees] = useState([5]);
  const [algorithm, setAlgorithm] = useState<PathDiscoveryRequest['algorithm']>('landmark_routing');
  const [includeWeak, setIncludeWeak] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [optimizationGoal, setOptimizationGoal] = useState<PathDiscoveryRequest['optimization_goal']>('strongest');
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [discoveryHistory, setDiscoveryHistory] = useState<PathDiscoveryRequest[]>([]);

  const queryClient = useQueryClient();

  // Path discovery mutation with comprehensive analysis
  const pathDiscoveryMutation = useMutation({
    mutationFn: async (request: PathDiscoveryRequest): Promise<{
      paths: DiscoveredPath[];
      analysis: PathAnalysis;
    }> => {
      const response = await fetch('/api/relationships/path-discovery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });
      if (!response.ok) {
        throw new Error('Path discovery failed');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Add to discovery history
      setDiscoveryHistory(prev => [variables, ...prev.slice(0, 9)]);
      
      // Auto-select recommended path
      if (data.analysis.recommended_path_id) {
        setSelectedPath(data.analysis.recommended_path_id);
      }

      // Cache results
      queryClient.setQueryData(
        ['path-discovery', variables.source_id, variables.target_id, variables.algorithm], 
        data
      );
    },
    onError: (error) => {
      console.error('Path discovery error:', error);
    }
  });

  // Available nodes for selection
  const { data: availableNodes, isLoading: nodesLoading } = useQuery({
    queryKey: ['available-nodes'],
    queryFn: async () => {
      const response = await fetch('/api/relationships/nodes');
      if (!response.ok) throw new Error('Failed to fetch nodes');
      return response.json();
    },
    staleTime: 5 * 60 * 1000
  });

  // Node search functionality
  const [nodeSearch, setNodeSearch] = useState('');
  const [searchResults, setSearchResults] = useState<PathNode[]>([]);

  useEffect(() => {
    if (nodeSearch && availableNodes) {
      const filtered = availableNodes.filter((node: PathNode) =>
        node.name.toLowerCase().includes(nodeSearch.toLowerCase()) ||
        node.id.toLowerCase().includes(nodeSearch.toLowerCase())
      ).slice(0, 10);
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [nodeSearch, availableNodes]);

  const handleDiscoverPaths = useCallback(() => {
    if (!sourceId || !targetId) {
      return;
    }

    const request: PathDiscoveryRequest = {
      source_id: sourceId,
      target_id: targetId,
      max_degrees: maxDegrees[0],
      algorithm,
      include_weak_connections: includeWeak,
      require_verified_only: verifiedOnly,
      optimization_goal: optimizationGoal
    };

    pathDiscoveryMutation.mutate(request);
  }, [sourceId, targetId, maxDegrees, algorithm, includeWeak, verifiedOnly, optimizationGoal]);

  const renderPathVisualization = (path: DiscoveredPath) => {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Path Visualization</h4>
          <div className="flex gap-2">
            <Badge variant={path.confidence_score > 80 ? 'default' : 'secondary'}>
              {path.confidence_score.toFixed(1)}% Confidence
            </Badge>
            <Badge variant="outline">
              {path.path_type.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
        </div>

        <div className="relative">
          {/* Path visualization */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-4">
            {path.nodes.map((node, index) => (
              <React.Fragment key={node.id}>
                <div className="flex flex-col items-center min-w-[100px]">
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm
                    ${node.type === 'sponsor' ? 'bg-blue-600' : 
                      node.type === 'organization' ? 'bg-green-600' :
                      node.type === 'person' ? 'bg-purple-600' : 'bg-orange-600'}
                    ${node.is_landmark ? 'ring-4 ring-yellow-400' : ''}
                  `}>
                    {node.name.substring(0, 2).toUpperCase()}
                  </div>
                  <span className="text-xs text-center mt-1 font-medium">
                    {node.name}
                  </span>
                  <span className="text-xs text-gray-500">
                    {node.type}
                  </span>
                  {node.is_landmark && (
                    <Badge className="mt-1 text-xs">
                      Landmark
                    </Badge>
                  )}
                </div>
                
                {index < path.nodes.length - 1 && (
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-0.5 bg-gray-300 relative">
                      <div 
                        className="h-full bg-blue-600 transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, node.connection_strength)}%` 
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 mt-1">
                      {node.connection_strength.toFixed(0)}%
                    </span>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Path metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-lg font-bold text-blue-600">{path.path_length}</div>
            <div className="text-xs text-gray-600">Degrees</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              {path.total_strength.toFixed(1)}%
            </div>
            <div className="text-xs text-gray-600">Strength</div>
          </div>
          <div>
            <div className="text-lg font-bold text-purple-600">
              {path.estimated_time}h
            </div>
            <div className="text-xs text-gray-600">Est. Time</div>
          </div>
          <div>
            <div className="text-lg font-bold text-orange-600">
              {path.alternative_routes}
            </div>
            <div className="text-xs text-gray-600">Alternatives</div>
          </div>
        </div>

        {/* Risk factors */}
        {path.risk_factors.length > 0 && (
          <div className="mt-4">
            <h5 className="font-medium mb-2 flex items-center gap-2">
              <AlertCircle size={16} />
              Risk Assessment
            </h5>
            <div className="space-y-2">
              {path.risk_factors.map((risk, index) => (
                <div key={index} className={`
                  p-2 rounded border-l-4 text-sm
                  ${risk.severity === 'high' ? 'border-red-500 bg-red-50' :
                    risk.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-gray-500 bg-gray-50'}
                `}>
                  <div className="font-medium">
                    {risk.type.replace('_', ' ').toUpperCase()}
                  </div>
                  <div className="text-gray-600">{risk.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Route size={20} />
            Advanced Path Discovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="discovery" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="discovery">Path Discovery</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
            </TabsList>

            <TabsContent value="discovery" className="space-y-6">
              {/* Node Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Source Node</label>
                    <div className="relative">
                      <Input
                        placeholder="Search and select source node..."
                        value={sourceId}
                        onChange={(e) => {
                          setSourceId(e.target.value);
                          setNodeSearch(e.target.value);
                        }}
                      />
                      {searchResults.length > 0 && sourceId === nodeSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {searchResults.map((node) => (
                            <button
                              key={node.id}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                              onClick={() => {
                                setSourceId(node.id);
                                setNodeSearch('');
                                setSearchResults([]);
                              }}
                            >
                              <div className={`
                                w-3 h-3 rounded-full
                                ${node.type === 'sponsor' ? 'bg-blue-600' : 
                                  node.type === 'organization' ? 'bg-green-600' :
                                  node.type === 'person' ? 'bg-purple-600' : 'bg-orange-600'}
                              `} />
                              <span className="font-medium">{node.name}</span>
                              <span className="text-sm text-gray-500">({node.type})</span>
                              {node.is_landmark && (
                                <Badge size="sm">Landmark</Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Target Node</label>
                    <div className="relative">
                      <Input
                        placeholder="Search and select target node..."
                        value={targetId}
                        onChange={(e) => {
                          setTargetId(e.target.value);
                          setNodeSearch(e.target.value);
                        }}
                      />
                      {searchResults.length > 0 && targetId === nodeSearch && (
                        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
                          {searchResults.map((node) => (
                            <button
                              key={node.id}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                              onClick={() => {
                                setTargetId(node.id);
                                setNodeSearch('');
                                setSearchResults([]);
                              }}
                            >
                              <div className={`
                                w-3 h-3 rounded-full
                                ${node.type === 'sponsor' ? 'bg-blue-600' : 
                                  node.type === 'organization' ? 'bg-green-600' :
                                  node.type === 'person' ? 'bg-purple-600' : 'bg-orange-600'}
                              `} />
                              <span className="font-medium">{node.name}</span>
                              <span className="text-sm text-gray-500">({node.type})</span>
                              {node.is_landmark && (
                                <Badge size="sm">Landmark</Badge>
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
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

                  <div>
                    <label className="block text-sm font-medium mb-2">Algorithm</label>
                    <select
                      value={algorithm}
                      onChange={(e) => setAlgorithm(e.target.value as PathDiscoveryRequest['algorithm'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="landmark_routing">Landmark Routing</option>
                      <option value="dijkstra">Dijkstra (Shortest)</option>
                      <option value="a_star">A* (Heuristic)</option>
                      <option value="all_paths">All Paths</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Optimization Goal</label>
                    <select
                      value={optimizationGoal}
                      onChange={(e) => setOptimizationGoal(e.target.value as PathDiscoveryRequest['optimization_goal'])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="strongest">Strongest Connections</option>
                      <option value="shortest">Shortest Path</option>
                      <option value="fastest">Fastest Route</option>
                      <option value="most_reliable">Most Reliable</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeWeak}
                    onChange={(e) => setIncludeWeak(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Include weak connections</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">Verified connections only</span>
                </label>
              </div>

              {/* Discovery Button */}
              <Button 
                onClick={handleDiscoverPaths}
                disabled={!sourceId || !targetId || pathDiscoveryMutation.isPending}
                className="w-full"
                size="lg"
              >
                {pathDiscoveryMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing Paths...
                  </>
                ) : (
                  <>
                    <Navigation size={16} className="mr-2" />
                    Discover Connection Paths
                  </>
                )}
              </Button>

              {/* Recent Discoveries */}
              {discoveryHistory.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Recent Discoveries</h4>
                  <div className="space-y-2">
                    {discoveryHistory.slice(0, 3).map((request, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          setSourceId(request.source_id);
                          setTargetId(request.target_id);
                          setMaxDegrees([request.max_degrees]);
                          setAlgorithm(request.algorithm);
                        }}
                        className="w-full p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50"
                      >
                        <div className="font-medium text-sm">
                          {request.source_id} → {request.target_id}
                        </div>
                        <div className="text-xs text-gray-500">
                          {request.algorithm} • {request.max_degrees} degrees • {request.optimization_goal}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="results" className="space-y-6">
              {pathDiscoveryMutation.data ? (
                <div className="space-y-6">
                  {/* Results Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {pathDiscoveryMutation.data.analysis.total_paths_found}
                      </div>
                      <div className="text-sm text-gray-600">Paths Found</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-600">
                        {pathDiscoveryMutation.data.analysis.shortest_path_length}
                      </div>
                      <div className="text-sm text-gray-600">Shortest Length</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-purple-600">
                        {pathDiscoveryMutation.data.analysis.strongest_path_strength.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Strongest Path</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-orange-600">
                        {pathDiscoveryMutation.data.analysis.average_confidence.toFixed(1)}%
                      </div>
                      <div className="text-sm text-gray-600">Avg Confidence</div>
                    </div>
                  </div>

                  {/* Path List */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Discovered Paths</h4>
                    {pathDiscoveryMutation.data.paths.map((path) => (
                      <Card 
                        key={path.id} 
                        className={`cursor-pointer transition-all ${
                          selectedPath === path.id ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
                        }`}
                        onClick={() => setSelectedPath(selectedPath === path.id ? null : path.id)}
                      >
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant={path.id === pathDiscoveryMutation.data.analysis.recommended_path_id ? 'default' : 'secondary'}>
                                {path.id === pathDiscoveryMutation.data.analysis.recommended_path_id ? 'Recommended' : 'Alternative'}
                              </Badge>
                              <Badge variant="outline">{path.path_type.replace('_', ' ')}</Badge>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold">{path.confidence_score.toFixed(1)}%</div>
                              <div className="text-xs text-gray-500">Confidence</div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-4 text-center mb-3">
                            <div>
                              <div className="font-semibold">{path.path_length}</div>
                              <div className="text-xs text-gray-600">Degrees</div>
                            </div>
                            <div>
                              <div className="font-semibold">{path.total_strength.toFixed(1)}%</div>
                              <div className="text-xs text-gray-600">Strength</div>
                            </div>
                            <div>
                              <div className="font-semibold">{path.estimated_time}h</div>
                              <div className="text-xs text-gray-600">Est. Time</div>
                            </div>
                          </div>

                          <div className="text-sm text-gray-600">
                            {path.nodes.map(node => node.name).join(' → ')}
                          </div>

                          {selectedPath === path.id && (
                            <div className="mt-4 pt-4 border-t">
                              {renderPathVisualization(path)}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Route size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No path discovery results yet.</p>
                  <p className="text-sm text-gray-500">Configure your search parameters and discover connection paths.</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="analysis" className="space-y-6">
              {pathDiscoveryMutation.data ? (
                <div className="space-y-6">
                  {/* Network Analysis */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Layers size={20} />
                        Network Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">
                            {(pathDiscoveryMutation.data.analysis.network_analysis.clustering_coefficient * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600">Clustering</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {pathDiscoveryMutation.data.analysis.network_analysis.betweenness_centrality.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-600">Centrality</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {pathDiscoveryMutation.data.analysis.network_analysis.path_redundancy.toFixed(1)}
                          </div>
                          <div className="text-sm text-gray-600">Redundancy</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {(pathDiscoveryMutation.data.analysis.network_analysis.vulnerability_score * 100).toFixed(1)}%
                          </div>
                          <div className="text-sm text-gray-600">Vulnerability</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Key Nodes */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Landmark Nodes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {pathDiscoveryMutation.data.analysis.landmark_nodes.map((node) => (
                            <div key={node.id} className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">{node.name}</div>
                                <div className="text-sm text-gray-600">{node.type}</div>
                              </div>
                              <Badge variant="secondary">
                                {(node.centrality_score * 100).toFixed(1)}%
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Bridge Nodes</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          {pathDiscoveryMutation.data.analysis.bridge_nodes.map((node) => (
                            <div key={node.id} className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">{node.name}</div>
                                <div className="text-sm text-gray-600">{node.type}</div>
                              </div>
                              <Badge variant="secondary">
                                {node.influence_score.toFixed(1)}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp size={48} className="mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600">No analysis data available.</p>
                  <p className="text-sm text-gray-500">Complete a path discovery to view network analysis.</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}