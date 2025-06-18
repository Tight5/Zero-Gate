import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Server, Database, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/contexts/TenantContext';
import { useResource } from '@/contexts/ResourceContext';

const Debug = () => {
  const [refreshKey, setRefreshKey] = useState(0);
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const { currentTenant, availableTenants } = useTenant();
  const { resourceStatus, isFeatureEnabled } = useResource();

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

  const handleRefreshAll = () => {
    setRefreshKey(prev => prev + 1);
    refetchHealth();
    refetchMetrics();
    refetchKpis();
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
        <Button onClick={handleRefreshAll} className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh All
        </Button>
      </div>

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
              <p className="text-sm">{currentTenant?.name || 'None selected'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Tenants</p>
              <p className="text-sm">{availableTenants.length} tenants</p>
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

      {/* Resource Status */}
      <Card>
        <CardHeader>
          <CardTitle>Resource Management</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Status</p>
              <Badge className={getStatusColor(resourceStatus?.status || 'unknown')}>
                {resourceStatus?.status || 'Unknown'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Features Enabled</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {['relationship_mapping', 'processing_agent', 'integration_agent'].map(feature => (
                  <Badge 
                    key={feature} 
                    variant="outline" 
                    className={isFeatureEnabled(feature) ? 'border-green-500' : 'border-red-500'}
                  >
                    {feature.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
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
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => window.location.href = '/api/login'}>
              Login
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/api/logout'}>
              Logout
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Debug;