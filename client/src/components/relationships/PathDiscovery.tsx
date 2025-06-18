import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Search, Users, ArrowRight, Zap, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useTenant } from '@/contexts/TenantContext';
import PathVisualization from './PathVisualization';

interface PathData {
  path: string[];
  path_length: number;
  path_quality: 'excellent' | 'good' | 'fair' | 'weak';
  relationship_analysis: {
    average_strength: number;
    minimum_strength: number;
    relationship_types: string[];
  };
}

const PathDiscovery = () => {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [searchInitiated, setSearchInitiated] = useState(false);
  const { currentTenant } = useTenant();
  
  const { 
    data: pathData, 
    isLoading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['/api/relationships/path', sourceId, targetId, currentTenant?.id],
    enabled: searchInitiated && !!sourceId && !!targetId && !!currentTenant,
    retry: false,
  });

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

  const getQualityColor = (quality: string): string => {
    const colors = {
      excellent: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      good: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      fair: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      weak: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[quality as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  };

  return (
    <div className="path-discovery space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Connection Path Discovery
          </CardTitle>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Find connection paths between stakeholders using our seven degrees of separation algorithm.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="source">From Person:</Label>
              <Input
                id="source"
                placeholder="Enter source person ID or email"
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="target">To Person:</Label>
              <Input
                id="target"
                placeholder="Enter target person ID or email"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button 
              onClick={handleSearch}
              disabled={!sourceId || !targetId || sourceId === targetId || isLoading}
              className="flex-1 md:flex-none"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">Search Failed</h3>
                <p className="text-red-700 dark:text-red-300 mb-4">
                  {error instanceof Error ? error.message : 'An error occurred during path discovery'}
                </p>
                {error instanceof Error && error.message.includes('404') ? (
                  <div className="space-y-2 text-sm text-red-600 dark:text-red-400">
                    <p className="font-medium">No connection path found between these people. This could mean:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>They are in separate networks</li>
                      <li>The connection path is longer than 7 degrees</li>
                      <li>Relationship data is incomplete</li>
                    </ul>
                  </div>
                ) : (
                  <Button onClick={handleSearch} variant="outline" size="sm">
                    Try Again
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {pathData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Connection Path Found</CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  {pathData.path_length} {pathData.path_length === 1 ? 'degree' : 'degrees'}
                </Badge>
                <Badge className={getQualityColor(pathData.path_quality)}>
                  {pathData.path_quality} quality
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="path-visualization">
              <PathVisualization pathData={pathData} />
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold">Path Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Strength:</span>
                  <p className="text-lg font-semibold">
                    {(pathData.relationship_analysis.average_strength * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Weakest Link:</span>
                  <p className="text-lg font-semibold">
                    {(pathData.relationship_analysis.minimum_strength * 100).toFixed(1)}%
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Relationship Types:</span>
                  <p className="text-sm">
                    {pathData.relationship_analysis.relationship_types.join(', ')}
                  </p>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Introduction Template
              </h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                <p className="text-sm leading-relaxed">
                  "Hi {pathData.path[1]}, I hope you're doing well. I wanted to reach out because 
                  I'm looking to connect with {pathData.path[pathData.path.length - 1]} regarding 
                  [your specific reason]. Given your {pathData.relationship_analysis.relationship_types[0] || 'professional'} 
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

export default PathDiscovery;