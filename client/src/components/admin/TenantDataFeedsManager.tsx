import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, Clock, RefreshCw, Settings, Users, BarChart3, Database } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface DataFeed {
  id: string;
  feedType: 'microsoft365' | 'crm' | 'custom';
  sourceConfig: any;
  classificationLevel: 'public' | 'internal' | 'confidential';
  syncFrequency: number;
  lastSync: string | null;
  status: 'active' | 'paused' | 'error';
  recordCount: number;
  healthScore: number;
}

const TenantDataFeedsManager: React.FC = () => {
  const [selectedFeed, setSelectedFeed] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch tenant data feeds
  const { data: dataFeeds = [], isLoading } = useQuery({
    queryKey: ['/api/tenant-data-feeds'],
    enabled: true,
  });

  // Sync data feed mutation
  const syncFeedMutation = useMutation({
    mutationFn: async (feedId: string) => {
      const response = await fetch(`/api/tenant-data-feeds/${feedId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error('Failed to sync data feed');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-data-feeds'] });
      toast({
        title: 'Sync Complete',
        description: `Processed ${data.syncResult.recordsProcessed} records in ${Math.round(data.syncResult.duration / 1000)}s`,
      });
    },
    onError: () => {
      toast({
        title: 'Sync Failed',
        description: 'Unable to sync data feed. Please check configuration.',
        variant: 'destructive',
      });
    },
  });

  // Toggle feed status mutation
  const toggleFeedMutation = useMutation({
    mutationFn: async ({ feedId, status }: { feedId: string; status: 'active' | 'paused' }) => {
      const response = await fetch(`/api/tenant-data-feeds/${feedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update feed status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tenant-data-feeds'] });
    },
  });

  const getStatusIcon = (status: string, healthScore: number) => {
    if (status === 'error') return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (status === 'paused') return <Clock className="h-4 w-4 text-muted-foreground" />;
    if (healthScore >= 75) return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (healthScore >= 50) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <AlertTriangle className="h-4 w-4 text-red-500" />;
  };

  const getClassificationColor = (level: string) => {
    switch (level) {
      case 'public': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'internal': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'confidential': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getFeedTypeIcon = (type: string) => {
    switch (type) {
      case 'microsoft365': return <Users className="h-4 w-4" />;
      case 'crm': return <BarChart3 className="h-4 w-4" />;
      case 'custom': return <Database className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const formatSyncTime = (lastSync: string | null) => {
    if (!lastSync) return 'Never';
    const date = new Date(lastSync);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const formatSyncFrequency = (seconds: number) => {
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted animate-pulse rounded" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Data Feeds</h2>
          <p className="text-muted-foreground">
            Manage dynamic tenant site data integration sources
          </p>
        </div>
        <Button>
          <Settings className="h-4 w-4 mr-2" />
          Configure New Feed
        </Button>
      </div>

      {dataFeeds.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Database className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Data Feeds Configured</h3>
            <p className="text-muted-foreground mb-4">
              Set up your first data feed to begin collecting organizational data
            </p>
            <Button>
              <Settings className="h-4 w-4 mr-2" />
              Add Microsoft 365 Integration
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {dataFeeds.map((feed: DataFeed) => (
            <Card key={feed.id} className="transition-all hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    {getFeedTypeIcon(feed.feedType)}
                    <div>
                      <CardTitle className="text-lg capitalize">
                        {feed.feedType === 'microsoft365' ? 'Microsoft 365' : feed.feedType}
                      </CardTitle>
                      <CardDescription>
                        {feed.recordCount.toLocaleString()} records • Last sync: {formatSyncTime(feed.lastSync)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(feed.status, feed.healthScore)}
                    <Badge className={getClassificationColor(feed.classificationLevel)}>
                      {feed.classificationLevel}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-muted-foreground">Health Score:</span>
                      <span className="font-medium">{feed.healthScore}%</span>
                    </div>
                    <Progress value={feed.healthScore} className="w-48" />
                  </div>
                  <div className="text-right space-y-1">
                    <div className="text-sm text-muted-foreground">
                      Sync every {formatSyncFrequency(feed.syncFrequency)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {feed.recordCount.toLocaleString()} records
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={feed.status === 'active'}
                      onCheckedChange={(checked) => {
                        toggleFeedMutation.mutate({
                          feedId: feed.id,
                          status: checked ? 'active' : 'paused',
                        });
                      }}
                      disabled={toggleFeedMutation.isPending}
                    />
                    <span className="text-sm">
                      {feed.status === 'active' ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => syncFeedMutation.mutate(feed.id)}
                      disabled={syncFeedMutation.isPending || feed.status !== 'active'}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${syncFeedMutation.isPending ? 'animate-spin' : ''}`} />
                      Sync Now
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedFeed(selectedFeed === feed.id ? null : feed.id)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {selectedFeed === feed.id && (
                  <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
                    <h4 className="font-medium">Configuration Details</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Feed Type:</span>
                        <div className="font-medium capitalize">{feed.feedType}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Classification:</span>
                        <div className="font-medium capitalize">{feed.classificationLevel}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sync Frequency:</span>
                        <div className="font-medium">{formatSyncFrequency(feed.syncFrequency)}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <div className="font-medium capitalize">{feed.status}</div>
                      </div>
                    </div>
                    {feed.feedType === 'microsoft365' && (
                      <div className="pt-2 border-t">
                        <span className="text-muted-foreground text-sm">Data Types:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {['Users', 'Groups', 'Emails', 'Calendar'].map((type) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {dataFeeds.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Integration Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{dataFeeds.length}</div>
                <div className="text-sm text-muted-foreground">Active Feeds</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {dataFeeds.reduce((sum: number, feed: DataFeed) => sum + feed.recordCount, 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Total Records</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {Math.round(dataFeeds.reduce((sum: number, feed: DataFeed) => sum + feed.healthScore, 0) / dataFeeds.length)}%
                </div>
                <div className="text-sm text-muted-foreground">Avg Health Score</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TenantDataFeedsManager;