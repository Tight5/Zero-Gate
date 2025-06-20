import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarInitials } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, Users, TrendingUp, Mail, Building, Award, AlertCircle } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface Stakeholder {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  orgLevel: number;
  communicationFrequency: number;
  lastInteraction: string;
  influenceScore: number;
  relationshipStrength: 'weak' | 'moderate' | 'strong';
  sourceFeed: string;
}

interface Topic {
  id: string;
  topicName: string;
  relevanceScore: number;
  frequency: number;
  firstMentioned: string;
  lastMentioned: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  keywords: string[];
  sourceEmails: number;
}

interface SponsorStakeholderMapProps {
  sponsorId: string;
  sponsorName: string;
}

const SponsorStakeholderMap: React.FC<SponsorStakeholderMapProps> = ({ 
  sponsorId, 
  sponsorName 
}) => {
  const [activeTab, setActiveTab] = useState('stakeholders');
  const queryClient = useQueryClient();

  // Fetch stakeholders
  const { data: stakeholders = [], isLoading: loadingStakeholders } = useQuery({
    queryKey: [`/api/sponsors/${sponsorId}/stakeholders`],
    enabled: !!sponsorId,
  });

  // Fetch topics
  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: [`/api/sponsors/${sponsorId}/topics`],
    enabled: !!sponsorId,
  });

  // Fetch analytics
  const { data: analytics, isLoading: loadingAnalytics } = useQuery({
    queryKey: [`/api/sponsors/${sponsorId}/analytics`],
    enabled: !!sponsorId,
  });

  // Sync stakeholders mutation
  const syncStakeholdersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/sponsors/${sponsorId}/sync-stakeholders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stakeholders: [] // Will be populated by Microsoft 365 integration
        }),
      });
      if (!response.ok) throw new Error('Failed to sync stakeholders');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [`/api/sponsors/${sponsorId}/stakeholders`] });
      queryClient.invalidateQueries({ queryKey: [`/api/sponsors/${sponsorId}/analytics`] });
      toast({
        title: 'Stakeholders Synced',
        description: `Updated ${data.syncedCount} stakeholder records from Microsoft 365`,
      });
    },
    onError: () => {
      toast({
        title: 'Sync Failed',
        description: 'Unable to sync stakeholders. Check Microsoft 365 integration.',
        variant: 'destructive',
      });
    },
  });

  const getInfluenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400';
    if (score >= 0.6) return 'text-blue-600 dark:text-blue-400';
    if (score >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getRelationshipBadge = (strength: string) => {
    const colors = {
      strong: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      moderate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      weak: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[strength as keyof typeof colors] || colors.weak;
  };

  const getSentimentBadge = (sentiment: string) => {
    const colors = {
      positive: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      neutral: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      negative: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    };
    return colors[sentiment as keyof typeof colors] || colors.neutral;
  };

  const formatLastInteraction = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (loadingStakeholders && loadingTopics && loadingAnalytics) {
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
          <h2 className="text-2xl font-bold">Stakeholder Mapping</h2>
          <p className="text-muted-foreground">
            {sponsorName} • Microsoft 365 Integration
          </p>
        </div>
        <Button
          onClick={() => syncStakeholdersMutation.mutate()}
          disabled={syncStakeholdersMutation.isPending}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncStakeholdersMutation.isPending ? 'animate-spin' : ''}`} />
          Sync from Microsoft 365
        </Button>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-600" />
                <div>
                  <div className="text-2xl font-bold">{analytics.stakeholderMetrics?.totalStakeholders || 0}</div>
                  <div className="text-xs text-muted-foreground">Total Stakeholders</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <div>
                  <div className="text-2xl font-bold">
                    {Math.round((analytics.stakeholderMetrics?.averageInfluence || 0) * 100)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Avg Influence</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Award className="h-4 w-4 text-purple-600" />
                <div>
                  <div className="text-2xl font-bold">{analytics.stakeholderMetrics?.strongRelationships || 0}</div>
                  <div className="text-xs text-muted-foreground">Strong Relationships</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold">{analytics.stakeholderMetrics?.recentInteractions || 0}</div>
                  <div className="text-xs text-muted-foreground">Recent Interactions</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stakeholders">
            Stakeholders ({stakeholders.length})
          </TabsTrigger>
          <TabsTrigger value="topics">
            Emerging Topics ({topics.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stakeholders" className="space-y-4">
          {stakeholders.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Stakeholders Found</h3>
                <p className="text-muted-foreground mb-4">
                  Sync with Microsoft 365 to discover organizational stakeholders
                </p>
                <Button onClick={() => syncStakeholdersMutation.mutate()}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {stakeholders.map((stakeholder: Stakeholder) => (
                <Card key={stakeholder.id} className="transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {stakeholder.name?.split(' ').map(n => n[0]).join('') || 
                             stakeholder.email.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-semibold">{stakeholder.name || stakeholder.email}</h4>
                          <p className="text-sm text-muted-foreground">{stakeholder.role}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{stakeholder.department}</span>
                            <span className="text-xs text-muted-foreground">• Level {stakeholder.orgLevel}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        <Badge className={getRelationshipBadge(stakeholder.relationshipStrength)}>
                          {stakeholder.relationshipStrength}
                        </Badge>
                        <div className="text-right">
                          <div className={`text-sm font-medium ${getInfluenceColor(stakeholder.influenceScore)}`}>
                            {Math.round(stakeholder.influenceScore * 100)}% influence
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {stakeholder.communicationFrequency} interactions
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t flex items-center justify-between">
                      <div className="text-xs text-muted-foreground">
                        Last interaction: {formatLastInteraction(stakeholder.lastInteraction)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Source: {stakeholder.sourceFeed}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          {topics.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Topics Discovered</h3>
                <p className="text-muted-foreground mb-4">
                  Email communication analysis will reveal emerging topics and trends
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {topics.map((topic: Topic) => (
                <Card key={topic.id} className="transition-all hover:shadow-md">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold">{topic.topicName}</h4>
                        <div className="flex items-center space-x-4 mt-2">
                          <div className="flex items-center space-x-1">
                            <span className="text-sm text-muted-foreground">Relevance:</span>
                            <Progress value={topic.relevanceScore * 100} className="w-20" />
                            <span className="text-sm font-medium">{Math.round(topic.relevanceScore * 100)}%</span>
                          </div>
                          <Badge className={getSentimentBadge(topic.sentiment)}>
                            {topic.sentiment}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {topic.keywords.slice(0, 5).map((keyword, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <div className="text-sm font-medium">{topic.frequency} mentions</div>
                        <div className="text-xs text-muted-foreground">{topic.sourceEmails} emails</div>
                        <div className="text-xs text-muted-foreground">
                          {formatLastInteraction(topic.lastMentioned)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SponsorStakeholderMap;