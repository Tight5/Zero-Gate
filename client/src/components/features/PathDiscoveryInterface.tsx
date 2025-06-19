/**
 * Advanced Path Discovery Interface
 * Dedicated component for seven-degree path analysis with visualization
 * Based on attached asset 27 specifications
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import ForceGraph2D from 'react-force-graph-2d';
import { 
  Search, 
  Route, 
  GitBranch, 
  Target,
  RefreshCw,
  Download,
  Eye,
  EyeOff,
  Filter,
  BarChart3,
  Network,
  Zap,
  Clock,
  TrendingUp
} from 'lucide-react';

interface PathNode {
  id: string;
  name: string;
  type: string;
  tier: string;
  strength: number;
  connections: number;
  value?: number;
}

interface PathEdge {
  source: string;
  target: string;
  type: string;
  strength: number;
  weight: number;
  status: string;
}

interface PathAnalysisResult {
  path: string[];
  distance: number;
  strength: number;
  intermediaries: string[];
  confidence: number;
  pathType: 'direct' | 'indirect' | 'multi-hop';
  totalValue: number;
  riskScore: number;
  timeEstimate: number; // in days
  keyInfluencers: string[];
}

interface PathDiscoveryProps {
  nodes: PathNode[];
  edges: PathEdge[];
  onPathSelected?: (path: PathAnalysisResult) => void;
}

export const PathDiscoveryInterface: React.FC<PathDiscoveryProps> = ({
  nodes,
  edges,
  onPathSelected
}) => {
  const [searchState, setSearchState] = useState({
    sourceNode: '',
    targetNode: '',
    maxDegrees: 7,
    algorithm: 'bfs' as 'bfs' | 'dfs' | 'dijkstra',
    includeInactive: false,
    minStrength: 0.1,
    searchTerm: ''
  });
  
  const [analysisResults, setAnalysisResults] = useState<PathAnalysisResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedPath, setSelectedPath] = useState<PathAnalysisResult | null>(null);
  const [visualizationMode, setVisualizationMode] = useState<'paths' | 'network' | 'timeline'>('paths');
  
  const graphRef = useRef<any>(null);

  // Advanced pathfinding algorithms
  const findPathsBFS = useCallback((source: string, target: string, maxDegrees: number): PathAnalysisResult[] => {
    const graph = new Map<string, Array<{node: string, edge: PathEdge}>>();
    
    // Build adjacency list
    edges
      .filter(edge => searchState.includeInactive || edge.status === 'active')
      .filter(edge => edge.strength >= searchState.minStrength)
      .forEach(edge => {
        if (!graph.has(edge.source)) graph.set(edge.source, []);
        if (!graph.has(edge.target)) graph.set(edge.target, []);
        
        graph.get(edge.source)!.push({ node: edge.target, edge });
        graph.get(edge.target)!.push({ node: edge.source, edge });
      });

    const paths: PathAnalysisResult[] = [];
    const queue: Array<{
      node: string;
      path: string[];
      pathEdges: PathEdge[];
      distance: number;
      totalStrength: number;
      totalValue: number;
    }> = [{
      node: source,
      path: [source],
      pathEdges: [],
      distance: 0,
      totalStrength: 0,
      totalValue: 0
    }];

    const visited = new Set<string>();
    
    while (queue.length > 0 && paths.length < 50) {
      const current = queue.shift()!;
      
      if (current.distance > maxDegrees) continue;
      
      const stateKey = `${current.node}-${current.distance}`;
      if (visited.has(stateKey)) continue;
      visited.add(stateKey);
      
      if (current.node === target && current.distance > 0) {
        const avgStrength = current.totalStrength / current.distance;
        const confidence = calculateConfidence(current.pathEdges, current.distance);
        const riskScore = calculateRiskScore(current.pathEdges);
        const timeEstimate = estimateTimeToComplete(current.pathEdges);
        const keyInfluencers = identifyKeyInfluencers(current.path);
        
        paths.push({
          path: current.path,
          distance: current.distance,
          strength: avgStrength,
          intermediaries: current.path.slice(1, -1),
          confidence,
          pathType: current.distance === 1 ? 'direct' : current.distance <= 3 ? 'indirect' : 'multi-hop',
          totalValue: current.totalValue,
          riskScore,
          timeEstimate,
          keyInfluencers
        });
        continue;
      }
      
      const neighbors = graph.get(current.node) || [];
      neighbors.forEach(({ node: nextNode, edge }) => {
        if (!current.path.includes(nextNode)) {
          const nodeValue = nodes.find(n => n.id === nextNode)?.value || 0;
          
          queue.push({
            node: nextNode,
            path: [...current.path, nextNode],
            pathEdges: [...current.pathEdges, edge],
            distance: current.distance + 1,
            totalStrength: current.totalStrength + edge.strength,
            totalValue: current.totalValue + nodeValue
          });
        }
      });
    }
    
    return paths.sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return b.confidence - a.confidence;
    });
  }, [edges, nodes, searchState]);

  const calculateConfidence = (pathEdges: PathEdge[], distance: number): number => {
    const avgStrength = pathEdges.reduce((sum, edge) => sum + edge.strength, 0) / pathEdges.length;
    const distancePenalty = 1 - (distance / 7);
    const statusBonus = pathEdges.every(edge => edge.status === 'active') ? 0.1 : 0;
    
    return Math.min(1, avgStrength * distancePenalty + statusBonus);
  };

  const calculateRiskScore = (pathEdges: PathEdge[]): number => {
    const inactiveCount = pathEdges.filter(edge => edge.status !== 'active').length;
    const weakLinks = pathEdges.filter(edge => edge.strength < 0.3).length;
    const totalEdges = pathEdges.length;
    
    return (inactiveCount * 0.3 + weakLinks * 0.2) / totalEdges;
  };

  const estimateTimeToComplete = (pathEdges: PathEdge[]): number => {
    const baseTime = 7; // days per connection
    const complexityMultiplier = pathEdges.length * 0.5;
    const strengthMultiplier = pathEdges.reduce((avg, edge) => avg + (1 - edge.strength), 0) / pathEdges.length;
    
    return Math.round(baseTime * pathEdges.length * (1 + complexityMultiplier + strengthMultiplier));
  };

  const identifyKeyInfluencers = (path: string[]): string[] => {
    return path.slice(1, -1).filter(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      return node && (node.connections > 15 || node.tier === 'A');
    });
  };

  const runPathAnalysis = useCallback(async () => {
    if (!searchState.sourceNode || !searchState.targetNode) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    
    // Simulate analysis progress
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => Math.min(prev + 10, 90));
    }, 100);
    
    setTimeout(() => {
      const results = findPathsBFS(searchState.sourceNode, searchState.targetNode, searchState.maxDegrees);
      setAnalysisResults(results);
      setAnalysisProgress(100);
      clearInterval(progressInterval);
      
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
      }, 500);
    }, 1000);
  }, [searchState, findPathsBFS]);

  const filteredNodes = useMemo(() => {
    if (!searchState.searchTerm) return nodes;
    return nodes.filter(node => 
      node.name.toLowerCase().includes(searchState.searchTerm.toLowerCase()) ||
      node.type.toLowerCase().includes(searchState.searchTerm.toLowerCase())
    );
  }, [nodes, searchState.searchTerm]);

  const pathGraphData = useMemo(() => {
    if (!selectedPath) return { nodes: [], links: [] };
    
    const pathNodes = selectedPath.path.map(nodeId => {
      const node = nodes.find(n => n.id === nodeId);
      return {
        ...node,
        color: selectedPath.path.indexOf(nodeId) === 0 ? '#10B981' : 
               selectedPath.path.indexOf(nodeId) === selectedPath.path.length - 1 ? '#EF4444' : '#3B82F6'
      };
    }).filter(Boolean);
    
    const pathLinks = [];
    for (let i = 0; i < selectedPath.path.length - 1; i++) {
      const edge = edges.find(e => 
        (e.source === selectedPath.path[i] && e.target === selectedPath.path[i + 1]) ||
        (e.source === selectedPath.path[i + 1] && e.target === selectedPath.path[i])
      );
      if (edge) {
        pathLinks.push({
          ...edge,
          color: '#FF6B6B'
        });
      }
    }
    
    return { nodes: pathNodes, links: pathLinks };
  }, [selectedPath, nodes, edges]);

  return (
    <div className="space-y-6">
      {/* Search Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Path Discovery Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label>Source Node</Label>
              <Select 
                value={searchState.sourceNode} 
                onValueChange={(value) => setSearchState(prev => ({ ...prev, sourceNode: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {filteredNodes.map(node => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.name} ({node.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Target Node</Label>
              <Select 
                value={searchState.targetNode} 
                onValueChange={(value) => setSearchState(prev => ({ ...prev, targetNode: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target" />
                </SelectTrigger>
                <SelectContent>
                  {filteredNodes.map(node => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.name} ({node.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Algorithm</Label>
              <Select 
                value={searchState.algorithm} 
                onValueChange={(value) => setSearchState(prev => ({ ...prev, algorithm: value as any }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bfs">Breadth-First Search</SelectItem>
                  <SelectItem value="dfs">Depth-First Search</SelectItem>
                  <SelectItem value="dijkstra">Shortest Path (Dijkstra)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Search Filter</Label>
              <Input
                placeholder="Filter nodes..."
                value={searchState.searchTerm}
                onChange={(e) => setSearchState(prev => ({ ...prev, searchTerm: e.target.value }))}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Max Degrees: {searchState.maxDegrees}</Label>
              <Slider
                value={[searchState.maxDegrees]}
                onValueChange={([value]) => setSearchState(prev => ({ ...prev, maxDegrees: value }))}
                min={1}
                max={7}
                step={1}
                className="mt-2"
              />
            </div>
            
            <div>
              <Label>Min Strength: {(searchState.minStrength * 100).toFixed(0)}%</Label>
              <Slider
                value={[searchState.minStrength]}
                onValueChange={([value]) => setSearchState(prev => ({ ...prev, minStrength: value }))}
                min={0}
                max={1}
                step={0.1}
                className="mt-2"
              />
            </div>
            
            <div className="flex items-center space-x-2 pt-6">
              <input
                type="checkbox"
                id="includeInactive"
                checked={searchState.includeInactive}
                onChange={(e) => setSearchState(prev => ({ ...prev, includeInactive: e.target.checked }))}
              />
              <Label htmlFor="includeInactive">Include inactive connections</Label>
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button 
              onClick={runPathAnalysis}
              disabled={!searchState.sourceNode || !searchState.targetNode || isAnalyzing}
              className="flex-1"
            >
              {isAnalyzing ? (
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
            
            {analysisResults.length > 0 && (
              <Button variant="outline" onClick={() => {}}>
                <Download className="w-4 h-4 mr-2" />
                Export Results
              </Button>
            )}
          </div>
          
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Analysis Progress</span>
                <span>{analysisProgress}%</span>
              </div>
              <Progress value={analysisProgress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Display */}
      {analysisResults.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Path List */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Route className="w-5 h-5" />
                  Discovered Paths ({analysisResults.length})
                </span>
                <Badge variant="outline">
                  {searchState.algorithm.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {analysisResults.map((result, index) => (
                  <Card 
                    key={index}
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedPath === result ? 'bg-blue-50 border-blue-300' : ''
                    }`}
                    onClick={() => {
                      setSelectedPath(result);
                      onPathSelected?.(result);
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">Path {index + 1}</span>
                      <div className="flex gap-1">
                        <Badge variant="outline" className="text-xs">
                          {result.distance}°
                        </Badge>
                        <Badge variant={
                          result.pathType === 'direct' ? 'default' :
                          result.pathType === 'indirect' ? 'secondary' : 'outline'
                        } className="text-xs">
                          {result.pathType}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 mb-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>Confidence: {(result.confidence * 100).toFixed(1)}%</div>
                        <div>Risk: {(result.riskScore * 100).toFixed(1)}%</div>
                        <div>Est. Time: {result.timeEstimate}d</div>
                        <div>Value: ${(result.totalValue / 1000).toFixed(0)}K</div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {result.keyInfluencers.length > 0 && (
                        <div>Key Influencers: {result.keyInfluencers.length}</div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Path Visualization */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Network className="w-5 h-5" />
                  Path Visualization
                </span>
                <Tabs value={visualizationMode} onValueChange={(value) => setVisualizationMode(value as any)}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="paths">Paths</TabsTrigger>
                    <TabsTrigger value="network">Network</TabsTrigger>
                    <TabsTrigger value="timeline">Timeline</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedPath ? (
                <div className="space-y-4">
                  {/* Path Details */}
                  <div className="grid grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedPath.distance}</div>
                      <div className="text-xs text-gray-600">Degrees</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{(selectedPath.confidence * 100).toFixed(0)}%</div>
                      <div className="text-xs text-gray-600">Confidence</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{selectedPath.timeEstimate}d</div>
                      <div className="text-xs text-gray-600">Est. Time</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">${(selectedPath.totalValue / 1000).toFixed(0)}K</div>
                      <div className="text-xs text-gray-600">Total Value</div>
                    </div>
                  </div>
                  
                  {visualizationMode === 'paths' && (
                    <div className="h-64 w-full">
                      <ForceGraph2D
                        ref={graphRef}
                        graphData={pathGraphData}
                        width={undefined}
                        height={256}
                        backgroundColor="#f9fafb"
                        nodeColor={(node: any) => node.color}
                        nodeLabel={(node: any) => node.name}
                        linkColor="#FF6B6B"
                        linkWidth={3}
                        enableNodeDrag={false}
                        enableZoomInteraction={true}
                        cooldownTicks={100}
                      />
                    </div>
                  )}
                  
                  {visualizationMode === 'timeline' && (
                    <div className="space-y-2">
                      <h4 className="font-semibold">Path Steps:</h4>
                      {selectedPath.path.map((nodeId, index) => {
                        const node = nodes.find(n => n.id === nodeId);
                        return (
                          <div key={nodeId} className="flex items-center gap-3 p-2 bg-white border rounded">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-green-500 text-white' :
                              index === selectedPath.path.length - 1 ? 'bg-red-500 text-white' :
                              'bg-blue-500 text-white'
                            }`}>
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium">{node?.name}</div>
                              <div className="text-sm text-gray-600">{node?.type} - Tier {node?.tier}</div>
                            </div>
                            {index < selectedPath.path.length - 1 && (
                              <div className="text-gray-400">→</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Select a path to view detailed analysis
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default PathDiscoveryInterface;