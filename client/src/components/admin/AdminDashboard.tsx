import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useTenant } from '@/contexts/TenantContext';
import { 
  Users, Building2, Database, Globe, Settings, Shield, 
  TrendingUp, AlertCircle, CheckCircle, RefreshCw,
  BarChart3, PieChart, Activity, Server
} from 'lucide-react';

interface AdminMetrics {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  systemHealth: {
    status: 'healthy' | 'degraded' | 'critical';
    uptime: string;
    apiResponseTime: number;
    dataQuality: number;
  };
  microsoftIntegration: {
    totalOrganizations: number;
    syncedUsers: number;
    syncedGroups: number;
    lastSync: string;
    healthStatus: string;
  };
  tenantOverview: Array<{
    id: string;
    name: string;
    userCount: number;
    status: 'active' | 'suspended' | 'pending';
    lastActivity: string;
    subscriptionTier: string;
  }>;
  platformStats: {
    totalSponsors: number;
    totalGrants: number;
    totalFunding: string;
    avgSuccessRate: number;
  };
}

const AdminDashboard: React.FC = () => {
  const { isAdminMode, isAdmin } = useTenant();
  
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-dashboard-metrics'],
    queryFn: async () => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Admin-Mode': 'true',
      };
      
      const response = await fetch('/api/tenants/admin/metrics', { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch admin metrics');
      }
      return response.json();
    },
    refetchInterval: 300000,
    staleTime: 240000,
    enabled: isAdminMode && isAdmin,
  });

  const metrics = response?.success ? response.data : null;

  if (!isAdminMode || !isAdmin) {
    return (
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Admin mode required to access this dashboard. Please switch to admin mode.
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load admin dashboard data. Please check your connection and try again.
          <Button variant="outline" size="sm" onClick={() => refetch()} className="ml-2">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Admin Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="destructive">Admin Mode</Badge>
            <Badge variant="outline">Platform Overview</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={metrics?.systemHealth.status === 'healthy' ? 'default' : 'destructive'}>
            {isLoading ? 'Loading...' : metrics?.systemHealth.status || 'Unknown'}
          </Badge>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="integration">Microsoft 365</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Total Tenants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : metrics?.totalTenants || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.activeTenants || 0} active
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Platform Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : metrics?.totalUsers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Across all tenants
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total Funding
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : metrics?.platformStats.totalFunding || '$0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Platform-wide
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : `${metrics?.platformStats.avgSuccessRate || 0}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Average across tenants
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  System Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Data Quality</span>
                      <span className="text-sm text-muted-foreground">
                        {metrics?.systemHealth.dataQuality || 0}%
                      </span>
                    </div>
                    <Progress value={metrics?.systemHealth.dataQuality || 0} className="h-2" />
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">API Response Time</span>
                    <Badge variant="secondary">
                      {metrics?.systemHealth.apiResponseTime || 0}ms
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">System Uptime</span>
                    <Badge variant="default">
                      {metrics?.systemHealth.uptime || '0h'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5" />
                  Microsoft 365 Integration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Organizations</span>
                    <Badge variant="default">
                      {metrics?.microsoftIntegration.totalOrganizations || 0}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Synced Users</span>
                    <Badge variant="secondary">
                      {metrics?.microsoftIntegration.syncedUsers || 0}
                    </Badge>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Integration Health</span>
                    <Badge variant={metrics?.microsoftIntegration.healthStatus === 'healthy' ? 'default' : 'destructive'}>
                      {metrics?.microsoftIntegration.healthStatus || 'Unknown'}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-muted-foreground">
                    Last sync: {metrics?.microsoftIntegration.lastSync || 'Never'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tenants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tenant Management</CardTitle>
              <CardDescription>
                Overview of all tenants in the platform with their status and activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics?.tenantOverview?.map((tenant: any) => (
                  <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-medium">{tenant.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {tenant.userCount} users • {tenant.subscriptionTier}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        tenant.status === 'active' ? 'default' : 
                        tenant.status === 'pending' ? 'secondary' : 'destructive'
                      }>
                        {tenant.status}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {tenant.lastActivity}
                      </div>
                    </div>
                  </div>
                )) || (
                  <div className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Loading tenant data...' : 'No tenant data available'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integration" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Organizations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : metrics?.microsoftIntegration.totalOrganizations || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Connected organizations
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Synced Users</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : metrics?.microsoftIntegration.syncedUsers || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  From Microsoft 365
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Groups & Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : metrics?.microsoftIntegration.syncedGroups || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Organizational groups
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">
                  <Badge variant={metrics?.microsoftIntegration.healthStatus === 'healthy' ? 'default' : 'destructive'}>
                    {isLoading ? 'Loading...' : metrics?.microsoftIntegration.healthStatus || 'Unknown'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last: {metrics?.microsoftIntegration.lastSync || 'Never'}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  System Health Monitoring
                </CardTitle>
                <CardDescription>
                  Real-time monitoring of platform infrastructure and services
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Overall System Health</span>
                      <Badge variant={
                        metrics?.systemHealth.status === 'healthy' ? 'default' : 
                        metrics?.systemHealth.status === 'degraded' ? 'secondary' : 'destructive'
                      }>
                        {metrics?.systemHealth.status || 'Unknown'}
                      </Badge>
                    </div>
                    <Progress 
                      value={
                        metrics?.systemHealth.status === 'healthy' ? 100 : 
                        metrics?.systemHealth.status === 'degraded' ? 60 : 20
                      } 
                      className="h-2" 
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <h4 className="font-medium">Performance Metrics</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm">API Response Time</span>
                          <span className="text-sm font-mono">
                            {metrics?.systemHealth.apiResponseTime || 0}ms
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Data Quality Score</span>
                          <span className="text-sm font-mono">
                            {metrics?.systemHealth.dataQuality || 0}%
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">System Uptime</span>
                          <span className="text-sm font-mono">
                            {metrics?.systemHealth.uptime || '0h'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Service Status</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Authentication</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Database</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Microsoft 365</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm">API Gateway</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Platform Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Sponsors</span>
                    <span className="font-mono text-lg">
                      {metrics?.platformStats.totalSponsors || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Grants</span>
                    <span className="font-mono text-lg">
                      {metrics?.platformStats.totalGrants || 0}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Success Rate</span>
                    <span className="font-mono text-lg">
                      {metrics?.platformStats.avgSuccessRate || 0}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Data Pipeline Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="text-sm">
                      <div className="font-medium">Microsoft 365 Pipeline</div>
                      <div className="text-muted-foreground">Operational</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="text-sm">
                      <div className="font-medium">Database Sync</div>
                      <div className="text-muted-foreground">Active</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="text-sm">
                      <div className="font-medium">Analytics Processing</div>
                      <div className="text-muted-foreground">Running</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;