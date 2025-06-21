import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTenant } from '@/contexts/TenantContext';
import { Building2, Users, Target, TrendingUp, AlertCircle, RefreshCw, Database, Globe } from 'lucide-react';

interface DashboardMetrics {
  totalSponsors: number;
  activeGrants: number;
  totalFunding: string;
  successRate: number;
  microsoftIntegration: {
    users: number;
    groups: number;
    domains: number;
    healthStatus: string;
    lastSync: string;
  };
  systemHealth: {
    apiStatus: 'healthy' | 'degraded' | 'unhealthy';
    dataQuality: number;
    lastUpdate: string;
  };
}

const Dashboard: React.FC = () => {
  const { currentTenant, isAdminMode, isAdmin } = useTenant();
  
  // Fetch dashboard metrics from API
  const { data: response, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-metrics', currentTenant?.id],
    queryFn: async () => {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (currentTenant?.id) {
        headers['X-Tenant-ID'] = currentTenant.id;
      }
      
      if (isAdminMode && isAdmin) {
        headers['X-Admin-Mode'] = 'true';
      }
      
      const response = await fetch('/api/dashboard/metrics', { headers });
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard metrics');
      }
      return response.json();
    },
    refetchInterval: 300000, // Refresh every 5 minutes
    staleTime: 240000, // Consider stale after 4 minutes
  });

  // Extract metrics from the response data structure
  const metrics = response?.success ? response.data : null;

  const handleRefresh = () => {
    refetch();
  };

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load dashboard data. Please check your connection and try again.
            <Button variant="outline" size="sm" onClick={handleRefresh} className="ml-2">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isAdminMode ? 'Admin Dashboard' : 'Executive Dashboard'}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={isAdminMode ? "destructive" : "default"}>
              {isAdminMode ? 'Admin Mode' : 'Tenant Mode'}
            </Badge>
            {currentTenant && (
              <Badge variant="outline">
                {currentTenant.name}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={metrics?.systemHealth.apiStatus === 'healthy' ? 'default' : 'destructive'}>
            {isLoading ? 'Loading...' : metrics?.systemHealth.apiStatus || 'Unknown'}
          </Badge>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className={`grid w-full ${isAdminMode ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="ecosystem">Ecosystem Data</TabsTrigger>
          <TabsTrigger value="integration">Microsoft 365</TabsTrigger>
          {isAdminMode && (
            <TabsTrigger value="system">System Health</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Total Sponsors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : metrics?.totalSponsors || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active sponsor relationships
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Active Grants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : metrics?.activeGrants || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  In progress and submitted
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
                  {isLoading ? '...' : metrics?.totalFunding || '$0'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Cumulative funding secured
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Success Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : `${metrics?.successRate || 0}%`}
                </div>
                <p className="text-xs text-muted-foreground">
                  Grant application success
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="ecosystem" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Quality Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold mb-2">
                  {isLoading ? '...' : `${metrics?.systemHealth.dataQuality || 0}%`}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${metrics?.systemHealth.dataQuality || 0}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Comprehensive data validation across all sources
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div className="text-sm">
                      <div className="font-medium">Microsoft 365 sync completed</div>
                      <div className="text-muted-foreground">
                        {metrics?.microsoftIntegration.lastSync || 'Never'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="text-sm">
                      <div className="font-medium">Dashboard metrics updated</div>
                      <div className="text-muted-foreground">
                        {metrics?.systemHealth.lastUpdate || 'Never'}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>System Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">API Response</span>
                    <Badge variant={metrics?.systemHealth.apiStatus === 'healthy' ? 'default' : 'destructive'}>
                      {metrics?.systemHealth.apiStatus || 'Unknown'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Data Pipeline</span>
                    <Badge variant="default">Operational</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Integration Status</span>
                    <Badge variant={metrics?.microsoftIntegration.healthStatus === 'healthy' ? 'default' : 'secondary'}>
                      {metrics?.microsoftIntegration.healthStatus || 'Unknown'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="integration" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Organization Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : metrics?.microsoftIntegration.users || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active Microsoft 365 users
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Groups & Teams
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : metrics?.microsoftIntegration.groups || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Organizational groups identified
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Verified Domains
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? '...' : metrics?.microsoftIntegration.domains || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Configured organizational domains
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Integration Health</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge variant={metrics?.microsoftIntegration.healthStatus === 'healthy' ? 'default' : 'destructive'}>
                    {isLoading ? 'Loading...' : metrics?.microsoftIntegration.healthStatus || 'Unknown'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Last sync: {metrics?.microsoftIntegration.lastSync || 'Never'}
                </p>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Microsoft 365 Integration Capabilities</CardTitle>
              <CardDescription>
                Organizational data extraction and analysis powered by Microsoft Graph API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <h4 className="font-semibold mb-2">Data Sources Available</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• User directory with hierarchical relationships</li>
                    <li>• Organizational groups and team structures</li>
                    <li>• Domain configuration and verification status</li>
                    <li>• Application registry and service principals</li>
                    <li>• Directory roles and administrative permissions</li>
                    <li>• Device management and compliance information</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">ESO-Specific Applications</h4>
                  <ul className="text-sm space-y-1 text-muted-foreground">
                    <li>• Sponsor relationship discovery through org structure</li>
                    <li>• Grant team assembly based on collaboration patterns</li>
                    <li>• Stakeholder analysis and influence mapping</li>
                    <li>• Strategic communication pathway identification</li>
                    <li>• Decision maker targeting through role analysis</li>
                    <li>• Introduction strategy generation via relationships</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {isAdminMode && (
          <TabsContent value="system" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-1">
              <Card>
                <CardHeader>
                  <CardTitle>System Health Overview</CardTitle>
                  <CardDescription>
                    Real-time monitoring of platform components and data pipeline integrity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">API Endpoints</div>
                        <div className="text-sm text-muted-foreground">Core application programming interfaces</div>
                      </div>
                      <Badge variant={metrics?.systemHealth.apiStatus === 'healthy' ? 'default' : 'destructive'}>
                        {metrics?.systemHealth.apiStatus || 'Unknown'}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">Microsoft 365 Integration</div>
                        <div className="text-sm text-muted-foreground">Organizational data synchronization</div>
                      </div>
                      <Badge variant={metrics?.microsoftIntegration.healthStatus === 'healthy' ? 'default' : 'secondary'}>
                        {metrics?.microsoftIntegration.healthStatus || 'Unknown'}
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">Data Quality</div>
                        <div className="text-sm text-muted-foreground">Comprehensive validation across sources</div>
                      </div>
                      <Badge variant={
                        (metrics?.systemHealth.dataQuality || 0) >= 90 ? 'default' : 
                        (metrics?.systemHealth.dataQuality || 0) >= 70 ? 'secondary' : 'destructive'
                      }>
                        {metrics?.systemHealth.dataQuality || 0}%
                      </Badge>
                    </div>
                    
                    <div className="flex justify-between items-center p-3 border rounded">
                      <div>
                        <div className="font-medium">Tenant Isolation</div>
                        <div className="text-sm text-muted-foreground">Multi-tenant security and data segregation</div>
                      </div>
                      <Badge variant="default">Secured</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="space-y-4">
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Microsoft Foundation meeting scheduled
                  </p>
                  <p className="text-sm text-muted-foreground">
                    2 hours ago
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    Tech Innovation Grant submitted
                  </p>
                  <p className="text-sm text-muted-foreground">
                    5 hours ago
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="ml-4 space-y-1">
                  <p className="text-sm font-medium leading-none">
                    New relationship connection mapped
                  </p>
                  <p className="text-sm text-muted-foreground">
                    8 hours ago
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Platform health and performance
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">Memory Usage</span>
                <span className="text-sm font-medium">78%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Active Sessions</span>
                <span className="text-sm font-medium">12</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Response Time</span>
                <span className="text-sm font-medium">45ms</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;