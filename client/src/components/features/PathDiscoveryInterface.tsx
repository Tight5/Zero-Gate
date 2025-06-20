/**
 * Path Discovery Interface Component
 * Seven-degree path analysis with visualization per File 27 specifications
 * Converted from @replit/ui to shadcn/ui maintaining exact functionality
 */

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useRelationshipPath } from '@/hooks/useRelationshipData';
import { Search, Users, ArrowRight, Zap, Loader2, AlertCircle } from 'lucide-react';

interface PathData {
  path: string[];
  path_length: number;
  path_quality: 'excellent' | 'good' | 'fair' | 'weak';
  confidence_score: number;
  relationship_analysis: {
    average_strength: number;
    minimum_strength: number;
    relationship_types: string[];
    path_strength: number;
    weakest_link: number;
    total_strength: number;
  };
  algorithm_used: string;
  computation_time_ms: number;
  introduction_strategy?: {
    recommended_approach: string;
    key_talking_points: string[];
    estimated_success_probability: number;
  };
}

interface PathVisualizationProps {
  pathData: PathData;
}

// Path Visualization Component
const PathVisualization: React.FC<PathVisualizationProps> = ({ pathData }) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Path Visualization</h4>
        <div className="flex gap-2">
          <Badge variant={pathData.confidence_score > 80 ? 'default' : 'secondary'}>
            {pathData.confidence_score.toFixed(1)}% Confidence
          </Badge>
          <Badge variant="outline">
            {pathData.path_quality.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="relative">
        {/* Path visualization */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-4">
          {pathData.path.map((person, index) => (
            <React.Fragment key={person}>
              <div className="flex flex-col items-center min-w-[100px]">
                <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm">
                  {person.substring(0, 2).toUpperCase()}
                </div>
                <span className="text-xs text-center mt-1 font-medium">
                  {person}
                </span>
              </div>
              
              {index < pathData.path.length - 1 && (
                <div className="flex flex-col items-center">
                  <ArrowRight className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Path metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
        <div>
          <div className="text-lg font-bold text-blue-600">{pathData.path_length}</div>
          <div className="text-xs text-gray-600">Degrees</div>
        </div>
        <div>
          <div className="text-lg font-bold text-green-600">
            {(pathData.relationship_analysis.average_strength * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-gray-600">Avg Strength</div>
        </div>
        <div>
          <div className="text-lg font-bold text-purple-600">
            {pathData.computation_time_ms}ms
          </div>
          <div className="text-xs text-gray-600">Compute Time</div>
        </div>
        <div>
          <div className="text-lg font-bold text-orange-600">
            {pathData.relationship_analysis.relationship_types.length}
          </div>
          <div className="text-xs text-gray-600">Rel Types</div>
        </div>
      </div>
    </div>
  );
};

// Main Path Discovery Component
const PathDiscoveryInterface: React.FC = () => {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [searchInitiated, setSearchInitiated] = useState(false);
  
  const { 
    data: pathData, 
    isLoading, 
    error,
    refetch 
  } = useRelationshipPath(
    sourceId, 
    targetId, 
    { enabled: searchInitiated && sourceId && targetId }
  );

  const handleSearch = () => {
    if (sourceId && targetId && sourceId !== targetId) {
      setSearchInitiated(true);
      refetch();
    }
  };

  const resetSearch = () => {
    setSourceId('');
    setTargetId('');
    setSearchInitiated(false);
  };

  const getQualityColor = (quality: string) => {
    const colors = {
      excellent: 'default',
      good: 'secondary',
      fair: 'outline',
      weak: 'destructive'
    };
    return colors[quality as keyof typeof colors] || 'outline';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Connection Path Discovery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-6">
            Find connection paths between stakeholders using our seven degrees of separation algorithm.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="source" className="block text-sm font-medium mb-2">From Person:</label>
                <Input
                  id="source"
                  placeholder="Enter source person ID or email"
                  value={sourceId}
                  onChange={(e) => setSourceId(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div>
                <label htmlFor="target" className="block text-sm font-medium mb-2">To Person:</label>
                <Input
                  id="target"
                  placeholder="Enter target person ID or email"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button 
                onClick={handleSearch}
                disabled={!sourceId || !targetId || sourceId === targetId || isLoading}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Find Path
                  </>
                )}
              </Button>

              <Button 
                variant="outline"
                onClick={resetSearch}
                disabled={isLoading}
              >
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <h3 className="font-semibold">Search Failed</h3>
              <p>{error.message}</p>
              {error.status === 404 ? (
                <div className="mt-2">
                  <p>No connection path found between these people. This could mean:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>They are in separate networks</li>
                    <li>The connection path is longer than 7 degrees</li>
                    <li>Relationship data is incomplete</li>
                  </ul>
                </div>
              ) : (
                <Button onClick={handleSearch} variant="outline" size="sm" className="mt-2">
                  Try Again
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {pathData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Connection Path Found</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {pathData.path_length} {pathData.path_length === 1 ? 'degree' : 'degrees'}
                </Badge>
                <Badge variant={getQualityColor(pathData.path_quality)}>
                  {pathData.path_quality} quality
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <PathVisualization pathData={pathData} />

            <div>
              <h4 className="font-semibold mb-3">Path Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Average Strength:</span>
                  <div className="text-lg font-bold">
                    {(pathData.relationship_analysis.average_strength * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Weakest Link:</span>
                  <div className="text-lg font-bold">
                    {(pathData.relationship_analysis.minimum_strength * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">Relationship Types:</span>
                  <div className="text-sm font-medium">
                    {pathData.relationship_analysis.relationship_types.join(', ')}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Introduction Template
              </h4>
              <div className="p-4 bg-blue-50 rounded border border-blue-200">
                <p className="text-sm">
                  "Hi {pathData.path[1]}, I hope you're doing well. I wanted to reach out because 
                  I'm looking to connect with {pathData.path[pathData.path.length - 1]} regarding 
                  [your specific reason]. Given your {pathData.relationship_analysis.relationship_types[0]} 
                  relationship, I thought you might be able to facilitate an introduction. 
                  Would you be comfortable making this connection?"
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PathDiscoveryInterface;