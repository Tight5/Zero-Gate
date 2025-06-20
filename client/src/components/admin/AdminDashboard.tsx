import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, Users, Building, TrendingUp, AlertCircle, CheckCircle, Settings } from 'lucide-react';
import { useTenant } from '@/contexts/TenantContext';

interface TenantOverview {
  id: string;
  name: string;
  description: string;
  status: string;
  userCount: number;
  platformStats: {
    totalUsers: number;
    activeGrants: number;
    totalSponsors: number;
    totalFunding: number;
    lastActivity: string;
  };
  settings: {
    notifications: boolean;
    microsoftIntegration: boolean;
    analyticsEnabled: boolean;
    features: string[];
  };
}

interface PlatformHealth {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  totalGrants: number;
  totalSponsors: number;
  totalFunding: number;
  averageHealth: number;
  systemLoad: number;
  memoryUsage: number;
}

interface AdminOverviewData {
  success: boolean;
  tenants: TenantOverview[];
  platform_health: PlatformHealth;
  admin_capabilities: {
    can_manage_tenants: boolean;
    can_view_analytics: boolean;
    can_configure_integrations: boolean;
    can_access_all_data: boolean;
  };
}

export default function AdminDashboard() {
  const { isAdminMode } = useTenant();
  const [overviewData, setOverviewData] = useState<AdminOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminOverview = async () => {
    try {
      setLoading(true);
      setError(null);

      const headers = {
        'Content-Type': 'application/json',
        'X-User-Email': 'admin@tight5digital.com',
        'X-Admin-Mode': 'true'
      };

      const response = await fetch('/api/tenants/admin/overview', { headers });
      
      if (!response.ok) {
        throw new Error(`Admin overview failed: ${response.status}`);
      }

      const data = await response.json();
      setOverviewData(data);
    } catch (err) {
      console.error('Error fetching admin overview:', err);
      setError(err instanceof Error ? err.message : 'Failed to load admin overview');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchAdminOverview();
    setRefreshing(false);
  };

  useEffect(() => {
    if (isAdminMode) {
      fetchAdminOverview();
    }
  }, [isAdminMode]);

  if (!isAdminMode) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Admin Access Required</h3>
              <p className="text-muted-foreground">
                Switch to admin mode to access tenant management dashboard.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading admin dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !overviewData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Dashboard</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={refreshData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { tenants, platform_health, admin_capabilities } = overviewData;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform-wide tenant management and analytics
          </p>
        </div>
        <Button onClick={refreshData} disabled={refreshing} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Platform Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platform_health.totalTenants}</div>
            <p className="text-xs text-muted-foreground">
              {platform_health.activeTenants} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platform_health.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              Across all tenants
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platform Health</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{platform_health.averageHealth}%</div>
            <Progress value={platform_health.averageHealth} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Funding</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(platform_health.totalFunding / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground">
              {platform_health.totalGrants} active grants
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tenant Management */}
      <Tabs defaultValue="tenants" className="space-y-4">
        <TabsList>
          <TabsTrigger value="tenants">Tenant Overview</TabsTrigger>
          <TabsTrigger value="system">System Metrics</TabsTrigger>
          <TabsTrigger value="capabilities">Admin Capabilities</TabsTrigger>
        </TabsList>

        <TabsContent value="tenants" className="space-y-4">
          <div className="grid gap-4">
            {tenants.map((tenant) => (
              <Card key={tenant.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{tenant.name}</CardTitle>
                      <CardDescription>{tenant.description}</CardDescription>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={tenant.status === 'active' ? 'default' : 'secondary'}>
                        {tenant.status}
                      </Badge>
                      <Button variant="outline" size="sm">
                        <Settings className="h-4 w-4 mr-2" />
                        Manage
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {tenant.platformStats.totalUsers}
                      </div>
                      <div className="text-sm text-muted-foreground">Users</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {tenant.platformStats.activeGrants}
                      </div>
                      <div className="text-sm text-muted-foreground">Grants</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {tenant.platformStats.totalSponsors}
                      </div>
                      <div className="text-sm text-muted-foreground">Sponsors</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        ${(tenant.platformStats.totalFunding / 1000000).toFixed(1)}M
                      </div>
                      <div className="text-sm text-muted-foreground">Funding</div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {tenant.settings.features.map((feature) => (
                      <Badge key={feature} variant="outline">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="system" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>System Load</span>
                    <span>{platform_health.systemLoad}%</span>
                  </div>
                  <Progress value={platform_health.systemLoad} className="mt-1" />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Memory Usage</span>
                    <span>{platform_health.memoryUsage}%</span>
                  </div>
                  <Progress value={platform_health.memoryUsage} className="mt-1" />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Health Score</span>
                    <span>{platform_health.averageHealth}%</span>
                  </div>
                  <Progress value={platform_health.averageHealth} className="mt-1" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{platform_health.totalSponsors}</div>
                    <div className="text-sm text-muted-foreground">Total Sponsors</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{platform_health.totalGrants}</div>
                    <div className="text-sm text-muted-foreground">Active Grants</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="capabilities" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Capabilities</CardTitle>
              <CardDescription>
                Current administrative permissions and access levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(admin_capabilities).map(([capability, enabled]) => (
                  <div key={capability} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">
                        {capability.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </div>
                    </div>
                    <Badge variant={enabled ? 'default' : 'secondary'}>
                      {enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}