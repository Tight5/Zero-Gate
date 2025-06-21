/**
 * Orchestration Memory Management Dashboard
 * Addresses critical memory threshold failures and feature degradation per attached asset requirements
 * Provides real-time monitoring and manual controls for orchestration agent memory management
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw, 
  Settings, 
  TrendingDown, 
  TrendingUp,
  Zap,
  Shield,
  Clock
} from 'lucide-react';

interface OrchestrationStatus {
  agent_status: string;
  memory_status: {
    current_usage: number;
    warning_threshold: number;
    critical_threshold: number;
    emergency_threshold: number;
    degraded_features: string[];
    last_check: string;
    monitoring_enabled: boolean;
  };
  active_workflows: number;
  queue_size: number;
  enabled_features: string[];
}

const OrchestrationMemoryDashboard: React.FC = () => {
  const [status, setStatus] = useState<OrchestrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/orchestration/status');
      const result = await response.json();
      
      if (result.success) {
        setStatus(result.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch orchestration status:', error);
    } finally {
      setLoading(false);
    }
  };

  const triggerMemoryOptimization = async (force: boolean = false) => {
    setOptimizing(true);
    try {
      const response = await fetch('/api/orchestration/memory/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force })
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchStatus();
      } else {
        console.error('Memory optimization failed:', result.error);
      }
    } catch (error) {
      console.error('Error during memory optimization:', error);
    } finally {
      setOptimizing(false);
    }
  };

  const recoverFeatures = async () => {
    setRecovering(true);
    try {
      const response = await fetch('/api/orchestration/features/recover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      const result = await response.json();
      
      if (result.success) {
        await fetchStatus();
      } else {
        console.error('Feature recovery failed:', result.error);
      }
    } catch (error) {
      console.error('Error during feature recovery:', error);
    } finally {
      setRecovering(false);
    }
  };

  const getMemoryStatusIcon = (usage: number, thresholds: any) => {
    if (usage >= thresholds.emergency_threshold) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (usage >= thresholds.critical_threshold) return <AlertTriangle className="h-4 w-4 text-red-500" />;
    if (usage >= thresholds.warning_threshold) return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    return <CheckCircle className="h-4 w-4 text-green-500" />;
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary mb-4" />
          <p>Loading orchestration memory status...</p>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-8 w-8 mx-auto text-destructive mb-4" />
          <p>Failed to load orchestration status</p>
          <Button onClick={fetchStatus} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const memoryUsagePercent = status.memory_status.current_usage * 100;
  const isMemoryCritical = status.memory_status.current_usage >= status.memory_status.critical_threshold;

  return (
    <div className="space-y-6">
      {/* Critical Memory Alert */}
      {isMemoryCritical && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Critical Memory Threshold Exceeded!</strong> Memory usage at {memoryUsagePercent.toFixed(1)}% 
            requires immediate feature degradation per attached asset requirements.
          </AlertDescription>
        </Alert>
      )}

      {/* Memory Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Memory Usage</p>
                <p className="text-2xl font-bold">{memoryUsagePercent.toFixed(1)}%</p>
              </div>
              {getMemoryStatusIcon(status.memory_status.current_usage, status.memory_status)}
            </div>
            <Progress value={memoryUsagePercent} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agent Status</p>
                <p className="text-2xl font-bold capitalize">{status.agent_status}</p>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Degraded Features</p>
                <p className="text-2xl font-bold text-red-600">{status.memory_status.degraded_features.length}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Features</p>
                <p className="text-2xl font-bold text-green-600">{status.enabled_features.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="monitoring" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monitoring">Memory Monitoring</TabsTrigger>
          <TabsTrigger value="features">Feature Management</TabsTrigger>
          <TabsTrigger value="controls">Emergency Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Memory Threshold Monitoring</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Warning Threshold</p>
                    <p className="text-lg font-bold text-yellow-600">
                      {(status.memory_status.warning_threshold * 100).toFixed(0)}%
                    </p>
                    <Badge variant={status.memory_status.current_usage >= status.memory_status.warning_threshold ? 'destructive' : 'outline'}>
                      {status.memory_status.current_usage >= status.memory_status.warning_threshold ? 'EXCEEDED' : 'OK'}
                    </Badge>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Critical Threshold</p>
                    <p className="text-lg font-bold text-red-600">
                      {(status.memory_status.critical_threshold * 100).toFixed(0)}%
                    </p>
                    <Badge variant={status.memory_status.current_usage >= status.memory_status.critical_threshold ? 'destructive' : 'outline'}>
                      {status.memory_status.current_usage >= status.memory_status.critical_threshold ? 'EXCEEDED' : 'OK'}
                    </Badge>
                  </div>

                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Emergency Threshold</p>
                    <p className="text-lg font-bold text-red-800">
                      {(status.memory_status.emergency_threshold * 100).toFixed(0)}%
                    </p>
                    <Badge variant={status.memory_status.current_usage >= status.memory_status.emergency_threshold ? 'destructive' : 'outline'}>
                      {status.memory_status.current_usage >= status.memory_status.emergency_threshold ? 'EXCEEDED' : 'OK'}
                    </Badge>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>Last Check: {formatTimestamp(status.memory_status.last_check)}</p>
                  <p>Monitoring: {status.memory_status.monitoring_enabled ? 'Enabled' : 'Disabled'}</p>
                  <p>Dashboard Updated: {lastUpdate.toLocaleTimeString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span>Enabled Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {status.enabled_features.length > 0 ? (
                    status.enabled_features.map((feature) => (
                      <Badge key={feature} variant="default" className="mr-2 mb-2">
                        {feature.replace('_', ' ').toUpperCase()}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No features currently enabled</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Degraded Features</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {status.memory_status.degraded_features.length > 0 ? (
                    status.memory_status.degraded_features.map((feature) => (
                      <Badge key={feature} variant="destructive" className="mr-2 mb-2">
                        {feature.replace('_', ' ').toUpperCase()}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-muted-foreground">No features currently degraded</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Feature Recovery</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {status.memory_status.degraded_features.length > 0 ? (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Features can be recovered when memory usage drops below {(status.memory_status.warning_threshold * 100).toFixed(0)}%.
                      Current usage: {memoryUsagePercent.toFixed(1)}%
                    </p>
                    <Button 
                      onClick={recoverFeatures}
                      disabled={recovering || status.memory_status.current_usage >= status.memory_status.warning_threshold}
                      className="w-full"
                    >
                      {recovering ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Recovering Features...
                        </>
                      ) : (
                        <>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Recover Features
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <p className="text-green-600">All features are currently enabled and operational.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="controls" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Zap className="h-5 w-5" />
                <span>Emergency Memory Controls</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    These controls address the critical orchestration agent failures identified in attached assets.
                    Use emergency optimization when automatic feature degradation fails to trigger at 90% memory threshold.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button 
                    onClick={() => triggerMemoryOptimization(false)}
                    disabled={optimizing}
                    variant="outline"
                    className="h-20 flex flex-col"
                  >
                    {optimizing ? (
                      <RefreshCw className="h-6 w-6 animate-spin mb-2" />
                    ) : (
                      <Activity className="h-6 w-6 mb-2" />
                    )}
                    <span>Standard Optimization</span>
                    <span className="text-xs text-muted-foreground">
                      Triggers if above critical threshold
                    </span>
                  </Button>

                  <Button 
                    onClick={() => triggerMemoryOptimization(true)}
                    disabled={optimizing}
                    variant="destructive"
                    className="h-20 flex flex-col"
                  >
                    {optimizing ? (
                      <RefreshCw className="h-6 w-6 animate-spin mb-2" />
                    ) : (
                      <AlertTriangle className="h-6 w-6 mb-2" />
                    )}
                    <span>Force Optimization</span>
                    <span className="text-xs">
                      Emergency degradation override
                    </span>
                  </Button>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p><strong>Standard Optimization:</strong> Applies degradation if memory usage exceeds 90% threshold</p>
                  <p><strong>Force Optimization:</strong> Immediately degrades non-essential features regardless of memory level</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p><strong>Active Workflows:</strong> {status.active_workflows}</p>
                  <p><strong>Queue Size:</strong> {status.queue_size}</p>
                </div>
                <div>
                  <p><strong>Agent Status:</strong> {status.agent_status}</p>
                  <p><strong>Monitoring:</strong> {status.memory_status.monitoring_enabled ? 'Active' : 'Inactive'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OrchestrationMemoryDashboard;