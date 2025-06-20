import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Users, TrendingUp, MessageSquare, Target, AlertCircle, CheckCircle, Clock, Brain } from "lucide-react";

interface StakeholderPrincipal {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  influenceScore: number;
  communicationFrequency: number;
  decisionMakingLevel: 'C-level' | 'VP' | 'Director' | 'Manager' | 'Individual';
  engagementStrategy?: {
    primaryChannel: string;
    frequency: string;
    approach: string;
    priority: string;
  };
  topicRelevance?: Array<{
    topic: string;
    relevance: number;
    actionable: boolean;
  }>;
}

interface EmergingTopic {
  topic: string;
  relevanceScore: number;
  frequency: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  keyPhrases: string[];
  lastMentioned: string;
  stakeholderRelevance?: Array<{
    name: string;
    relevance: number;
    department: string;
  }>;
  contentSuggestions?: string[];
  engagementOpportunities?: Array<{
    type: string;
    description: string;
    timeline: string;
  }>;
}

interface DiscoveryData {
  sponsorId: string;
  discoveryStatus: string;
  stakeholderPrincipals: StakeholderPrincipal[];
  emergingTopics: EmergingTopic[];
  communicationPatterns: any;
  relationshipStrength: number;
  organizationStructure: any;
  lastAnalysisDate: string;
  insights: {
    keyDecisionMakers: number;
    departmentDiversity: number;
    communicationActivity: number;
    emergingTopicsCount: number;
    relationshipStrength: number;
    lastUpdated: string;
  };
}

interface SponsorDiscoveryDashboardProps {
  sponsorId: string;
  onClose: () => void;
}

export function SponsorDiscoveryDashboard({ sponsorId, onClose }: SponsorDiscoveryDashboardProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [discoveryStatus, setDiscoveryStatus] = useState<'idle' | 'discovering' | 'completed' | 'error'>('idle');
  const [taskId, setTaskId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  // Fetch discovery data
  const { data: discoveryData, isLoading: isLoadingDiscovery, error: discoveryError } = useQuery<DiscoveryData>({
    queryKey: ['sponsor-discovery', sponsorId],
    queryFn: async () => {
      const response = await fetch(`/api/sponsor-discovery/organization/${sponsorId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': localStorage.getItem('currentTenantId') || ''
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('No discovery data found');
        }
        throw new Error('Failed to fetch discovery data');
      }
      return response.json();
    },
    retry: false
  });

  // Fetch stakeholder data
  const { data: stakeholderData, isLoading: isLoadingStakeholders } = useQuery({
    queryKey: ['sponsor-stakeholders', sponsorId],
    queryFn: async () => {
      const response = await fetch(`/api/sponsor-discovery/stakeholders/${sponsorId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': localStorage.getItem('currentTenantId') || ''
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stakeholder data');
      return response.json();
    },
    enabled: !!discoveryData
  });

  // Fetch topics data
  const { data: topicsData, isLoading: isLoadingTopics } = useQuery({
    queryKey: ['sponsor-topics', sponsorId],
    queryFn: async () => {
      const response = await fetch(`/api/sponsor-discovery/topics/${sponsorId}`, {
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': localStorage.getItem('currentTenantId') || ''
        }
      });
      if (!response.ok) throw new Error('Failed to fetch topics data');
      return response.json();
    },
    enabled: !!discoveryData
  });

  // Initiate discovery mutation
  const discoveryMutation = useMutation({
    mutationFn: async ({ accessToken, sponsorDomain }: { accessToken: string; sponsorDomain: string }) => {
      const response = await fetch(`/api/sponsor-discovery/discover/${sponsorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': localStorage.getItem('currentTenantId') || ''
        },
        body: JSON.stringify({ accessToken, sponsorDomain })
      });
      if (!response.ok) throw new Error('Failed to initiate discovery');
      return response.json();
    },
    onSuccess: (data) => {
      setTaskId(data.taskId);
      setDiscoveryStatus('discovering');
      // Start polling for status
      pollDiscoveryStatus(data.taskId);
    },
    onError: () => {
      setDiscoveryStatus('error');
    }
  });

  // Re-analysis mutation
  const reanalysisMutation = useMutation({
    mutationFn: async (accessToken: string) => {
      const response = await fetch(`/api/sponsor-discovery/reanalyze/${sponsorId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Tenant-ID': localStorage.getItem('currentTenantId') || ''
        },
        body: JSON.stringify({ accessToken })
      });
      if (!response.ok) throw new Error('Failed to initiate re-analysis');
      return response.json();
    },
    onSuccess: () => {
      setDiscoveryStatus('discovering');
      // Invalidate and refetch data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['sponsor-discovery', sponsorId] });
        queryClient.invalidateQueries({ queryKey: ['sponsor-stakeholders', sponsorId] });
        queryClient.invalidateQueries({ queryKey: ['sponsor-topics', sponsorId] });
        setDiscoveryStatus('completed');
      }, 3000);
    }
  });

  const pollDiscoveryStatus = async (taskId: string) => {
    const maxPolls = 30; // 5 minutes max
    let polls = 0;
    
    const poll = async () => {
      if (polls >= maxPolls) {
        setDiscoveryStatus('error');
        return;
      }
      
      try {
        const response = await fetch(`/api/sponsor-discovery/status/${taskId}`, {
          headers: {
            'X-Tenant-ID': localStorage.getItem('currentTenantId') || ''
          }
        });
        const status = await response.json();
        
        if (status.status === 'completed') {
          setDiscoveryStatus('completed');
          queryClient.invalidateQueries({ queryKey: ['sponsor-discovery', sponsorId] });
          queryClient.invalidateQueries({ queryKey: ['sponsor-stakeholders', sponsorId] });
          queryClient.invalidateQueries({ queryKey: ['sponsor-topics', sponsorId] });
          return;
        } else if (status.status === 'failed') {
          setDiscoveryStatus('error');
          return;
        }
        
        polls++;
        setTimeout(poll, 10000); // Poll every 10 seconds
      } catch (error) {
        console.error('Polling error:', error);
        setDiscoveryStatus('error');
      }
    };
    
    poll();
  };

  const handleStartDiscovery = () => {
    const accessToken = prompt('Please enter your Microsoft 365 access token:');
    const sponsorDomain = prompt('Please enter the sponsor organization domain (e.g., contoso.com):');
    
    if (accessToken && sponsorDomain) {
      discoveryMutation.mutate({ accessToken, sponsorDomain });
    }
  };

  const handleReanalysis = () => {
    const accessToken = prompt('Please enter your Microsoft 365 access token for re-analysis:');
    
    if (accessToken) {
      reanalysisMutation.mutate(accessToken);
    }
  };

  const getInfluenceColor = (score: number) => {
    if (score >= 0.7) return 'bg-red-500';
    if (score >= 0.4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (discoveryError && discoveryError.message === 'No discovery data found') {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Microsoft 365 Agent Discovery
          </CardTitle>
          <CardDescription>
            Intelligent sponsor organization analysis using Microsoft Graph API
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No Discovery Data Available</h3>
          <p className="text-gray-600 mb-6">
            Start the intelligent discovery process to extract organizational insights, 
            stakeholder mapping, and emerging topics from Microsoft 365 data.
          </p>
          <Button 
            onClick={handleStartDiscovery} 
            disabled={discoveryStatus === 'discovering'}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {discoveryStatus === 'discovering' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing Organization...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Start Smart Discovery
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isLoadingDiscovery) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin mr-2" />
          <span>Loading discovery data...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Microsoft 365 Agent Discovery
              </CardTitle>
              <CardDescription>
                Intelligent organizational analysis for {sponsorId}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReanalysis} disabled={reanalysisMutation.isPending}>
                {reanalysisMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Brain className="h-4 w-4 mr-2" />
                )}
                Re-analyze
              </Button>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </CardHeader>
        
        {discoveryData && (
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{discoveryData.insights.keyDecisionMakers}</div>
                <div className="text-sm text-gray-600">Key Decision Makers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{discoveryData.insights.departmentDiversity}</div>
                <div className="text-sm text-gray-600">Departments</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{discoveryData.insights.emergingTopicsCount}</div>
                <div className="text-sm text-gray-600">Emerging Topics</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {Math.round(discoveryData.insights.relationshipStrength * 100)}%
                </div>
                <div className="text-sm text-gray-600">Relationship Strength</div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stakeholders">Stakeholders</TabsTrigger>
          <TabsTrigger value="topics">Emerging Topics</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Discovery Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Analysis Status:</span>
                    <Badge variant={discoveryData?.discoveryStatus === 'completed' ? 'default' : 'secondary'}>
                      {discoveryData?.discoveryStatus}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Updated:</span>
                    <span className="text-sm text-gray-600">
                      {discoveryData?.lastAnalysisDate ? 
                        new Date(discoveryData.lastAnalysisDate).toLocaleDateString() : 
                        'Never'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Relationship Strength:</span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(discoveryData?.relationshipStrength || 0) * 100} 
                        className="w-24" 
                      />
                      <span className="text-sm">
                        {Math.round((discoveryData?.relationshipStrength || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Communication Patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>Total Users:</span>
                    <span className="font-medium">
                      {discoveryData?.communicationPatterns?.totalUsers || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Communication Density:</span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(discoveryData?.communicationPatterns?.communicationDensity || 0) * 100} 
                        className="w-24" 
                      />
                      <span className="text-sm">
                        {Math.round((discoveryData?.communicationPatterns?.communicationDensity || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Collaboration Score:</span>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={(discoveryData?.communicationPatterns?.collaborationScore || 0) * 100} 
                        className="w-24" 
                      />
                      <span className="text-sm">
                        {Math.round((discoveryData?.communicationPatterns?.collaborationScore || 0) * 100)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stakeholders" className="space-y-4">
          {isLoadingStakeholders ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading stakeholders...</span>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {stakeholderData?.stakeholders?.map((stakeholder: StakeholderPrincipal) => (
                <Card key={stakeholder.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Avatar>
                        <AvatarFallback>
                          {stakeholder.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{stakeholder.name}</h3>
                          <Badge variant="outline">{stakeholder.decisionMakingLevel}</Badge>
                          <div className={`w-3 h-3 rounded-full ${getInfluenceColor(stakeholder.influenceScore)}`} />
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {stakeholder.title} • {stakeholder.department}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Influence:</span>
                            <div className="font-medium">{Math.round(stakeholder.influenceScore * 100)}%</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Communication:</span>
                            <div className="font-medium">{stakeholder.communicationFrequency}/day</div>
                          </div>
                          <div>
                            <span className="text-gray-500">Priority:</span>
                            <div className="font-medium capitalize">
                              {stakeholder.engagementStrategy?.priority || 'Medium'}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500">Channel:</span>
                            <div className="font-medium capitalize">
                              {stakeholder.engagementStrategy?.primaryChannel || 'Email'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          {isLoadingTopics ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span>Loading topics...</span>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {topicsData?.topics?.map((topic: EmergingTopic, index: number) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium mb-1">{topic.topic}</h3>
                        <div className="flex items-center gap-2">
                          <Badge className={getSentimentColor(topic.sentiment)}>
                            {topic.sentiment}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            Relevance: {Math.round(topic.relevanceScore * 100)}%
                          </span>
                          <span className="text-sm text-gray-600">
                            Frequency: {topic.frequency}
                          </span>
                        </div>
                      </div>
                      <Clock className="h-4 w-4 text-gray-400" />
                    </div>
                    
                    {topic.contentSuggestions && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium mb-1">Content Suggestions:</h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {topic.contentSuggestions.map((suggestion, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <Target className="h-3 w-3 mt-0.5 text-blue-500" />
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {topic.stakeholderRelevance && (
                      <div>
                        <h4 className="text-sm font-medium mb-1">Key Stakeholders:</h4>
                        <div className="flex flex-wrap gap-2">
                          {topic.stakeholderRelevance.map((stakeholder, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {stakeholder.name} ({stakeholder.department})
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Strategic Insights & Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-medium mb-2">Engagement Strategy</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800">Primary Approach</h4>
                    <p className="text-blue-700">
                      Focus on {discoveryData?.insights.keyDecisionMakers} key decision makers 
                      across {discoveryData?.insights.departmentDiversity} departments
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <h4 className="font-medium text-green-800">Communication Strategy</h4>
                    <p className="text-green-700">
                      Leverage {Math.round((discoveryData?.insights.communicationActivity || 0) * 100)}% 
                      communication density for relationship building
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="font-medium mb-2">Next Steps</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <span>Schedule introductory meetings with high-influence stakeholders</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                    <span>Develop content addressing emerging topics of interest</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                    <span>Create targeted communication plans by department</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}