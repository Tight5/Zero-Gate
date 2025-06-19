import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { apiRequest } from '@/lib/queryClient';
import { Brain, Network, Target, Activity, TrendingUp, AlertTriangle } from 'lucide-react';

interface AnalyticsData {
  networkMetrics?: {
    centrality: Map<string, number>;
    clustering: number;
    density: number;
    pathEfficiency: number;
    keyConnectors: string[];
  };
  grantPredictions?: any[];
  relationshipStrengths?: any[];
  performance?: any;
}

export function AnalyticsDashboard() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: realTimeAnalytics, connected } = useRealTimeData('analytics');

  // Update analytics data when real-time updates arrive
  useEffect(() => {
    if (realTimeAnalytics) {
      setAnalyticsData(prev => ({
        ...prev,
        ...realTimeAnalytics
      }));
    }
  }, [realTimeAnalytics]);

  const runNetworkAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/analytics/network/dev-tenant-1');
      setAnalyticsData(prev => ({
        ...prev,
        networkMetrics: response.metrics
      }));
    } catch (err) {
      setError('Failed to run network analysis');
      console.error('Network analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const runGrantPrediction = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Mock grant data for testing
      const mockGrant = {
        id: '1',
        title: 'Tech Innovation Grant',
        amount: 500000,
        deadline: '2025-08-15',
        status: 'active',
        milestones: [
          { id: '1', title: '90-day milestone', dueDate: '2025-05-17', completed: true },
          { id: '2', title: '60-day milestone', dueDate: '2025-06-16', completed: true },
          { id: '3', title: '30-day milestone', dueDate: '2025-07-16', completed: false }
        ]
      };

      const response = await apiRequest('/api/analytics/grant-prediction', {
        method: 'POST',
        body: JSON.stringify({ grantData: mockGrant }),
        headers: { 'Content-Type': 'application/json' }
      });

      setAnalyticsData(prev => ({
        ...prev,
        grantPredictions: [response]
      }));
    } catch (err) {
      setError('Failed to run grant prediction');
      console.error('Grant prediction error:', err);
    } finally {
      setLoading(false);
    }
  };

  const runRelationshipAnalysis = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Mock relationship data for testing
      const mockRelationship = {
        id: '1',
        source: 'center-hub',
        target: 'tech-partner',
        strength: 0.75,
        type: 'partner',
        interactions: 25,
        lastContact: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await apiRequest('/api/analytics/relationship-strength', {
        method: 'POST',
        body: JSON.stringify({ relationshipData: mockRelationship }),
        headers: { 'Content-Type': 'application/json' }
      });

      setAnalyticsData(prev => ({
        ...prev,
        relationshipStrengths: [response]
      }));
    } catch (err) {
      setError('Failed to run relationship analysis');
      console.error('Relationship analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceMetrics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest('/api/analytics/performance');
      setAnalyticsData(prev => ({
        ...prev,
        performance: response.performance
      }));
    } catch (err) {
      setError('Failed to get performance metrics');
      console.error('Performance metrics error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatMetric = (value: number, suffix = '') => {
    return `${(value * 100).toFixed(1)}%${suffix}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">AI-powered insights and predictive analytics</p>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <Badge variant="outline" className="text-green-600 border-green-600">
              <Activity className="w-3 h-3 mr-1" />
              Live Analytics
            </Badge>
          ) : (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Cached Data
            </Badge>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analytics Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Analytics Engine Controls
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button
              onClick={runNetworkAnalysis}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Network className="w-4 h-4" />
              Network Analysis
            </Button>
            <Button
              onClick={runGrantPrediction}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Target className="w-4 h-4" />
              Grant Prediction
            </Button>
            <Button
              onClick={runRelationshipAnalysis}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <TrendingUp className="w-4 h-4" />
              Relationship Analysis
            </Button>
            <Button
              onClick={getPerformanceMetrics}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Activity className="w-4 h-4" />
              Performance Metrics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analytics Results */}
      <Tabs defaultValue="network" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="network">Network</TabsTrigger>
          <TabsTrigger value="grants">Grants</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="network" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Network Analysis Results</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData.networkMetrics ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {formatMetric(analyticsData.networkMetrics.clustering)}
                    </div>
                    <div className="text-sm text-muted-foreground">Clustering Coefficient</div>
                  </div>
                  <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">
                      {formatMetric(analyticsData.networkMetrics.density)}
                    </div>
                    <div className="text-sm text-muted-foreground">Network Density</div>
                  </div>
                  <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {formatMetric(analyticsData.networkMetrics.pathEfficiency)}
                    </div>
                    <div className="text-sm text-muted-foreground">Path Efficiency</div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Run network analysis to see results
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="grants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Grant Success Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData.grantPredictions ? (
                <div className="space-y-4">
                  {analyticsData.grantPredictions.map((prediction, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Grant Prediction #{index + 1}</h4>
                        <Badge variant={prediction.prediction.score > 75 ? 'default' : 'secondary'}>
                          {prediction.prediction.score}% Success Probability
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Timeline Health:</span>
                          <div className="font-medium">{formatMetric(prediction.prediction.factors.timelineHealth)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Relationship Strength:</span>
                          <div className="font-medium">{formatMetric(prediction.prediction.factors.relationshipStrength)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Historical Success:</span>
                          <div className="font-medium">{formatMetric(prediction.prediction.factors.historicalSuccess)}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Resource Availability:</span>
                          <div className="font-medium">{formatMetric(prediction.prediction.factors.resourceAvailability)}</div>
                        </div>
                      </div>
                      {prediction.prediction.recommendations.length > 0 && (
                        <div className="mt-4">
                          <span className="text-sm font-medium text-muted-foreground">Recommendations:</span>
                          <ul className="mt-2 space-y-1">
                            {prediction.prediction.recommendations.map((rec: string, recIndex: number) => (
                              <li key={recIndex} className="text-sm text-muted-foreground">• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Run grant prediction to see results
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Relationship Strength Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData.relationshipStrengths ? (
                <div className="space-y-4">
                  {analyticsData.relationshipStrengths.map((analysis, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold">Relationship Analysis #{index + 1}</h4>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            Original: {formatMetric(analysis.originalStrength)}
                          </Badge>
                          <Badge variant="default">
                            Calculated: {formatMetric(analysis.calculatedStrength)}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Improvement:</span>
                        <span className={`ml-2 font-medium ${analysis.improvement > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {analysis.improvement > 0 ? '+' : ''}{formatMetric(analysis.improvement)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Run relationship analysis to see results
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Analytics Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              {analyticsData.performance ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-4">
                    <h4 className="font-semibold">Calculation Performance</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Relationship Strength:</span>
                        <span>{analyticsData.performance.calculations.relationship_strength.avg_time}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Network Analysis:</span>
                        <span>{analyticsData.performance.calculations.network_analysis.avg_time}ms</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Grant Prediction:</span>
                        <span>{analyticsData.performance.calculations.grant_prediction.avg_time}ms</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">Success Rates</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Relationship:</span>
                        <span>{formatMetric(analyticsData.performance.calculations.relationship_strength.success_rate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Network:</span>
                        <span>{formatMetric(analyticsData.performance.calculations.network_analysis.success_rate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Grant:</span>
                        <span>{formatMetric(analyticsData.performance.calculations.grant_prediction.success_rate)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-semibold">System Metrics</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Cache Hit Rate:</span>
                        <span>{formatMetric(analyticsData.performance.cache_hits)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Memory Usage:</span>
                        <span>{Math.round(analyticsData.performance.memory_usage.heapUsed / 1024 / 1024)}MB</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Get performance metrics to see results
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnalyticsDashboard;