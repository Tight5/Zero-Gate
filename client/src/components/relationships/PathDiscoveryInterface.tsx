import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Search, Users, ArrowRight, Zap, Loader2, AlertCircle } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

interface PathData {
  path: string[];
  path_length: number;
  path_quality: 'excellent' | 'good' | 'fair' | 'weak';
  confidence_score: number;
  relationship_analysis: {
    average_strength: number;
    minimum_strength: number;
    relationship_types: string[];
  };
}

interface PathVisualizationProps {
  pathData: PathData;
}

const PathVisualization: React.FC<PathVisualizationProps> = ({ pathData }) => {
  return (
    <div className="path-visualization flex items-center justify-center py-6">
      <div className="flex items-center space-x-4">
        {pathData.path.map((person, index) => (
          <React.Fragment key={index}>
            <div className="flex flex-col items-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-sm font-medium text-center max-w-20 truncate">
                {person}
              </div>
            </div>
            {index < pathData.path.length - 1 && (
              <ArrowRight className="w-5 h-5 text-gray-400" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const PathDiscoveryInterface: React.FC = () => {
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [searchInitiated, setSearchInitiated] = useState(false);

  const { 
    data: pathData, 
    isLoading, 
    error,
    refetch 
  } = useQuery<PathData>({
    queryKey: ['/api/relationships/path', sourceId, targetId],
    enabled: searchInitiated && sourceId.length > 0 && targetId.length > 0,
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

  const getQualityColor = (quality: string) => {
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
          <CardTitle className="flex items-center space-x-2">
            <Users className="w-5 h-5" />
            <span>Connection Path Discovery</span>
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Find connection paths between stakeholders using our seven degrees of separation algorithm.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

          <div className="flex space-x-2">
            <Button 
              onClick={handleSearch}
              disabled={!sourceId || !targetId || sourceId === targetId || isLoading}
              className="flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Find Path</span>
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
        <Alert variant="destructive">
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            <div className="space-y-2">
              <p className="font-semibold">Search Failed</p>
              <p>{(error as any)?.message || 'An error occurred while searching for the path'}</p>
              {(error as any)?.status === 404 ? (
                <div className="mt-4 space-y-2">
                  <p className="text-sm">No connection path found between these people. This could mean:</p>
                  <ul className="text-sm list-disc list-inside space-y-1 ml-4">
                    <li>They are in separate networks</li>
                    <li>The connection path is longer than 7 degrees</li>
                    <li>Relationship data is incomplete</li>
                  </ul>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleSearch} 
                  className="mt-2"
                >
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
              <div className="flex space-x-2">
                <Badge variant="outline">
                  {pathData.path_length} {pathData.path_length === 1 ? 'degree' : 'degrees'}
                </Badge>
                <Badge className={getQualityColor(pathData.path_quality)}>
                  {pathData.path_quality} quality
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <PathVisualization pathData={pathData} />

              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Path Analysis</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Average Strength:</span>
                    <div className="text-lg font-semibold">
                      {(pathData.relationship_analysis.average_strength * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Weakest Link:</span>
                    <div className="text-lg font-semibold">
                      {(pathData.relationship_analysis.minimum_strength * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm text-muted-foreground">Confidence Score:</span>
                    <div className="text-lg font-semibold">
                      {(pathData.confidence_score * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Relationship Types:</span>
                  <div className="flex flex-wrap gap-1">
                    {pathData.relationship_analysis.relationship_types.map((type, index) => (
                      <Badge key={index} variant="secondary">
                        {type}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold flex items-center space-x-2">
                  <Zap className="w-4 h-4" />
                  <span>Introduction Template</span>
                </h4>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm leading-relaxed">
                    "Hi {pathData.path[1]}, I hope you're doing well. I wanted to reach out because 
                    I'm looking to connect with {pathData.path[pathData.path.length - 1]} regarding 
                    [your specific reason]. Given your {pathData.relationship_analysis.relationship_types[0]} 
                    relationship, I thought you might be able to facilitate an introduction. 
                    Would you be comfortable making this connection?"
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PathDiscoveryInterface;