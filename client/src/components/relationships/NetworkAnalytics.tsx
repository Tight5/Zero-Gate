
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { TrendingUp, Users, Network, Target, Zap, AlertTriangle } from 'lucide-react';

const NetworkAnalytics: React.FC = () => {
  const networkMetrics = {
    totalNodes: 247,
    totalConnections: 1438,
    networkDensity: 0.047,
    averagePathLength: 3.2,
    clusteringCoefficient: 0.42,
    centralityScores: {
      betweenness: 0.15,
      closeness: 0.28,
      eigenvector: 0.33
    }
  };

  const keyInfluencers = [
    { name: 'Dr. Sarah Johnson', role: 'Program Director', influence: 95, connections: 45 },
    { name: 'Michael Chen', role: 'Board Member', influence: 88, connections: 38 },
    { name: 'Lisa Rodriguez', role: 'Grant Manager', influence: 82, connections: 34 },
    { name: 'David Kim', role: 'Research Lead', influence: 76, connections: 29 }
  ];

  const networkHealth = [
    { metric: 'Connectivity', score: 87, status: 'good' },
    { metric: 'Diversity', score: 73, status: 'moderate' },
    { metric: 'Resilience', score: 91, status: 'excellent' },
    { metric: 'Growth Rate', score: 64, status: 'moderate' }
  ];

  return (
    <div className="network-analytics space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users size={16} />
              Total Network Size
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{networkMetrics.totalNodes}</div>
            <p className="text-xs text-muted-foreground">Active stakeholders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Network size={16} />
              Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{networkMetrics.totalConnections}</div>
            <p className="text-xs text-muted-foreground">Relationship links</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target size={16} />
              Avg Path Length
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{networkMetrics.averagePathLength}</div>
            <p className="text-xs text-muted-foreground">Degrees of separation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap size={16} />
              Network Density
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(networkMetrics.networkDensity * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Connection ratio</p>
          </CardContent>
        </Card>
      </div>

      {/* Key Influencers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp size={20} />
            Key Network Influencers
          </CardTitle>
          <CardDescription>
            Stakeholders with highest network influence scores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {keyInfluencers.map((influencer, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{influencer.name}</div>
                    <div className="text-sm text-muted-foreground">{influencer.role}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-sm font-medium">{influencer.connections} connections</div>
                    <Progress value={influencer.influence} className="w-20 h-2 mt-1" />
                  </div>
                  <Badge variant={influencer.influence > 90 ? 'default' : 'secondary'}>
                    {influencer.influence}%
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Network Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle size={20} />
            Network Health Assessment
          </CardTitle>
          <CardDescription>
            Overall network performance and stability metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            {networkHealth.map((health, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{health.metric}</span>
                  <Badge variant={
                    health.status === 'excellent' ? 'default' :
                    health.status === 'good' ? 'secondary' : 'outline'
                  }>
                    {health.status}
                  </Badge>
                </div>
                <Progress value={health.score} className="h-2" />
                <div className="text-sm text-muted-foreground mt-1">
                  {health.score}% optimal
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Centrality Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Network Centrality Analysis</CardTitle>
          <CardDescription>
            Mathematical measures of node importance in the network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Betweenness Centrality</span>
              <div className="flex items-center gap-2">
                <Progress value={networkMetrics.centralityScores.betweenness * 100} className="w-24 h-2" />
                <span className="text-sm font-mono">{networkMetrics.centralityScores.betweenness.toFixed(3)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Closeness Centrality</span>
              <div className="flex items-center gap-2">
                <Progress value={networkMetrics.centralityScores.closeness * 100} className="w-24 h-2" />
                <span className="text-sm font-mono">{networkMetrics.centralityScores.closeness.toFixed(3)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span>Eigenvector Centrality</span>
              <div className="flex items-center gap-2">
                <Progress value={networkMetrics.centralityScores.eigenvector * 100} className="w-24 h-2" />
                <span className="text-sm font-mono">{networkMetrics.centralityScores.eigenvector.toFixed(3)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NetworkAnalytics;
