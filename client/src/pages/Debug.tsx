import React, { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Server, Database, Users, AlertTriangle, CheckCircle, Activity, Cpu, HardDrive, Clock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';

const Debug = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [memoryHistory, setMemoryHistory] = useState<number[]>([]);
  const [realTimeMetrics, setRealTimeMetrics] = useState<any>(null);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { selectedTenant } = useTenant();

  const { data: healthData, refetch: refetchHealth } = useQuery({
    queryKey: ['/health', refreshKey],
    retry: false,
  });

  const { data: metricsData, refetch: refetchMetrics } = useQuery({
    queryKey: ['/api/dashboard/metrics', refreshKey],
    retry: false,
  });

  const { data: kpisData, refetch: refetchKpis } = useQuery({
    queryKey: ['/api/dashboard/kpis', refreshKey],
    retry: false,
  });

  // Real-time metrics polling
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/dashboard/metrics');
        if (response.ok) {
          const data = await response.json();
          setRealTimeMetrics(data);
          
          // Track memory history for trend analysis
          if (data.memoryUsage) {
            setMemoryHistory(prev => {
              const newHistory = [...prev, data.memoryUsage];
              return newHistory.slice(-20); // Keep last 20 data points
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch real-time metrics:', error);
      }
    }, 2000); // Update every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
    refetchHealth();
    refetchMetrics();
    refetchKpis();
  };

  const triggerGarbageCollection = async () => {
    try {
      const response = await fetch('/api/system/gc', { method: 'POST' });
      if (response.ok) {
        handleRefreshAll();
      }
    } catch (error) {
      console.error('Failed to trigger garbage collection:', error);
    }
  };

  const getMemoryTrend = () => {
    if (memoryHistory.length < 2) return 'stable';
    const recent = memoryHistory.slice(-5);
    const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const current = recent[recent.length - 1];
    
    if (current > avg + 5) return 'increasing';
    if (current < avg - 5) return 'decreasing';
    return 'stable';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'critical':
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Debug</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive system status and diagnostics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={triggerGarbageCollection} variant="outline" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Force GC
          </Button>
          <Button onClick={handleRefreshAll} className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Refresh All
          </Button>
        </div>
      </div>

      {/* Critical Memory Alert */}
      {realTimeMetrics?.memoryUsage > 90 && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 dark:text-red-200">
            <strong>Critical Memory Usage: {realTimeMetrics.memoryUsage}%</strong>
            <br />
            Memory trend: {getMemoryTrend()} | Consider force garbage collection or system restart
          </AlertDescription>
        </Alert>
      )}

      {/* Real-time System Metrics */}
      {realTimeMetrics && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Real-time System Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Cpu className="w-4 h-4" />
                    CPU Usage
                  </p>
                  <span className="text-lg font-semibold">{realTimeMetrics.cpuUsage}%</span>
                </div>
                <Progress value={realTimeMetrics.cpuUsage} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    Memory Usage
                  </p>
                  <span className={`text-lg font-semibold ${realTimeMetrics.memoryUsage > 85 ? 'text-red-600' : realTimeMetrics.memoryUsage > 70 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {realTimeMetrics.memoryUsage}%
                  </span>
                </div>
                <Progress 
                  value={realTimeMetrics.memoryUsage} 
                  className="h-2"
                  // @ts-ignore
                  style={{ '--progress-background': realTimeMetrics.memoryUsage > 85 ? '#dc2626' : realTimeMetrics.memoryUsage > 70 ? '#d97706' : '#059669' }}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                    <HardDrive className="w-4 h-4" />
                    Disk Usage
                  </p>
                  <span className="text-lg font-semibold">{realTimeMetrics.diskUsage}%</span>
                </div>
                <Progress value={realTimeMetrics.diskUsage} className="h-2" />
              </div>
            </div>
            
            {/* Memory Trend Visualization */}
            {memoryHistory.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Memory Trend (Last 20 readings)</p>
                <div className="flex items-end gap-1 h-16">
                  {memoryHistory.map((usage, index) => (
                    <div
                      key={index}
                      className={`flex-1 rounded-sm ${usage > 85 ? 'bg-red-500' : usage > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                      style={{ height: `${(usage / 100) * 100}%` }}
                      title={`${usage}%`}
                    />
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Authentication Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
              <Badge className={isAuthenticated ? getStatusColor('ok') : getStatusColor('error')}>
                {authLoading ? 'Loading' : isAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">User ID</p>
              <p className="text-sm">{user?.id || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</p>
              <p className="text-sm">{user?.email || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenant Status */}
      <Card>
        <CardHeader>
          <CardTitle>Tenant Context</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Current Tenant</p>
              <p className="text-sm">{selectedTenant?.name || 'None selected'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tenant ID</p>
              <p className="text-sm">{selectedTenant?.id || 'N/A'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {healthData ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Status</p>
                <Badge className={getStatusColor(healthData.status)}>
                  {healthData.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Uptime</p>
                <p className="text-sm">{healthData.uptime}s</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Memory</p>
                <p className="text-sm">{healthData.memory?.percentage}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Version</p>
                <p className="text-sm">{healthData.version}</p>
              </div>
            </div>
          ) : (
            <p className="text-red-600 dark:text-red-400">Health data unavailable</p>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {metricsData ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">CPU Usage</p>
                <p className="text-lg font-semibold">{metricsData.cpuUsage}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Memory Usage</p>
                <p className="text-lg font-semibold">{metricsData.memoryUsage}%</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Disk Usage</p>
                <p className="text-lg font-semibold">{metricsData.diskUsage}%</p>
              </div>
            </div>
          ) : (
            <p className="text-red-600 dark:text-red-400">Metrics unavailable - authentication required</p>
          )}
        </CardContent>
      </Card>

      {/* System Diagnostics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            System Diagnostics
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                System Uptime
              </p>
              <p className="text-lg font-semibold">{healthData?.uptime ? Math.floor(healthData.uptime / 60) : 'N/A'} min</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Node Version</p>
              <p className="text-sm">{typeof process !== 'undefined' ? process.version : 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Environment</p>
              <p className="text-sm">{process?.env?.NODE_ENV || 'development'}</p>
            </div>
          </div>
          
          {/* Memory Analysis */}
          {realTimeMetrics && (
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="font-medium mb-2">Memory Analysis</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Current Usage</p>
                  <p className={`font-semibold ${realTimeMetrics.memoryUsage > 90 ? 'text-red-600' : realTimeMetrics.memoryUsage > 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                    {realTimeMetrics.memoryUsage}%
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400">Trend</p>
                  <p className={`font-semibold ${getMemoryTrend() === 'increasing' ? 'text-red-600' : getMemoryTrend() === 'decreasing' ? 'text-green-600' : 'text-gray-600'}`}>
                    {getMemoryTrend()}
                  </p>
                </div>
              </div>
              
              {realTimeMetrics.memoryUsage > 85 && (
                <div className="mt-3 p-2 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    <strong>High Memory Usage Detected</strong><br />
                    Recommendations: Force garbage collection, restart application, or check for memory leaks
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Application KPIs */}
      <Card>
        <CardHeader>
          <CardTitle>Application Data</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {kpisData ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Sponsors</p>
                <p className="text-2xl font-bold">{kpisData.sponsors}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Grants</p>
                <p className="text-2xl font-bold">{kpisData.grants}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Relationships</p>
                <p className="text-2xl font-bold">{kpisData.relationships}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Calendar Items</p>
                <p className="text-2xl font-bold">{kpisData.contentCalendar}</p>
              </div>
            </div>
          ) : (
            <p className="text-red-600 dark:text-red-400">KPI data unavailable - authentication required</p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>System Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Authentication</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/api/login'}>
                  Login
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.location.href = '/api/logout'}>
                  Logout
                </Button>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">System Management</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={triggerGarbageCollection}>
                  Force GC
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
                <Button variant="outline" size="sm" onClick={handleRefreshAll}>
                  Refresh Data
                </Button>
              </div>
            </div>
          </div>
          
          {/* System Status Summary */}
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <h4 className="font-medium mb-2">System Status Summary</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600 dark:text-gray-400">Authentication</p>
                <p className={`font-semibold ${isAuthenticated ? 'text-green-600' : 'text-red-600'}`}>
                  {isAuthenticated ? 'Connected' : 'Disconnected'}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Memory Status</p>
                <p className={`font-semibold ${realTimeMetrics?.memoryUsage > 90 ? 'text-red-600' : realTimeMetrics?.memoryUsage > 80 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {realTimeMetrics?.memoryUsage ? `${realTimeMetrics.memoryUsage}%` : 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-gray-600 dark:text-gray-400">Overall Health</p>
                <p className={`font-semibold ${healthData?.status === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
                  {healthData?.status || 'Unknown'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Debug;