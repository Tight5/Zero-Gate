/**
 * TenantAdminPanel Component
 * Comprehensive tenant administration interface with advanced management capabilities
 * Implements attached asset specifications for multi-tenant administration
 */

import React, { useState } from 'react';
import { useTenantStats, useTenantSettings, useTenantUsers, useTenantIntegrations, useTenantSubscription } from '../../hooks/useTenantData';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { 
  Building2, 
  Users, 
  Settings, 
  Shield, 
  CreditCard, 
  Activity, 
  Zap, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Calendar,
  DollarSign,
  Target,
  TrendingUp
} from 'lucide-react';

interface TenantAdminPanelProps {
  tenantId: string;
}

const TenantAdminPanel: React.FC<TenantAdminPanelProps> = ({ tenantId }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const { data: stats, isLoading: statsLoading } = useTenantStats();
  const { settings, updateSettings, isUpdating } = useTenantSettings();
  const { data: users } = useTenantUsers();
  const { integrations, toggleIntegration, isToggling } = useTenantIntegrations();
  const { data: subscription } = useTenantSubscription();

  const handleFeatureToggle = async (feature: string, enabled: boolean) => {
    if (!settings) return;
    
    const updatedFeatures = enabled
      ? [...(settings.features || []), feature]
      : (settings.features || []).filter(f => f !== feature);
    
    await updateSettings({
      ...settings,
      features: updatedFeatures
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'member': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'inactive': return <XCircle className="h-4 w-4 text-red-600" />;
      case 'pending': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <XCircle className="h-4 w-4 text-gray-400" />;
    }
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading tenant data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold">Tenant Administration</h1>
          <Badge variant="outline" className="text-blue-600 border-blue-600">
            {tenantId}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={subscription?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
            {subscription?.plan} - {subscription?.status}
          </Badge>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="features" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Features
          </TabsTrigger>
          <TabsTrigger value="integrations" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Integrations
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.users?.total || 0}</div>
                <p className="text-xs text-gray-600">
                  {stats?.users?.active || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sponsors</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.sponsors?.total || 0}</div>
                <p className="text-xs text-gray-600">
                  {stats?.sponsors?.active || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Grants</CardTitle>
                <Calendar className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.grants?.total || 0}</div>
                <p className="text-xs text-gray-600">
                  {stats?.grants?.active || 0} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Funding</CardTitle>
                <DollarSign className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.grants?.total_value || 0)}
                </div>
                <p className="text-xs text-gray-600">
                  {Math.round((stats?.grants?.success_rate || 0) * 100)}% success rate
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Usage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Daily Active Users</span>
                    <span className="font-medium">{stats?.activity?.daily_active_users || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Weekly Active Users</span>
                    <span className="font-medium">{stats?.activity?.weekly_active_users || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Monthly Active Users</span>
                    <span className="font-medium">{stats?.activity?.monthly_active_users || 0}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Content Published</span>
                    <span className="font-medium">{stats?.content?.published || 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">User Management</h3>
            <Button>Add User</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-200">
                {users?.data?.users?.map((user: any) => (
                  <div key={user.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {user.name.split(' ').map((n: string) => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(user.status)}
                        <span className="text-sm capitalize">{user.status}</span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(user.last_login).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Feature Management</h3>
            <Button disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Save Changes'}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Platform Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { key: 'relationship_mapping', label: 'Relationship Mapping', description: 'Advanced network analysis and path discovery' },
                  { key: 'grant_management', label: 'Grant Management', description: 'Timeline tracking and milestone management' },
                  { key: 'sponsor_analytics', label: 'Sponsor Analytics', description: 'ESO-specific metrics and tier analysis' },
                  { key: 'content_calendar', label: 'Content Calendar', description: 'Strategic communication planning' },
                  { key: 'microsoft_graph', label: 'Microsoft Graph', description: 'Organizational data integration' },
                  { key: 'advanced_analytics', label: 'Advanced Analytics', description: 'AI-powered insights and predictions' }
                ].map((feature) => (
                  <div key={feature.key} className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{feature.label}</h4>
                      <p className="text-sm text-gray-600 mt-1">{feature.description}</p>
                    </div>
                    <Switch
                      checked={settings?.features?.includes(feature.key) || false}
                      onCheckedChange={(checked) => handleFeatureToggle(feature.key, checked)}
                      disabled={isUpdating}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Integration Management</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {integrations && Object.entries(integrations).map(([key, integration]: [string, any]) => (
              <Card key={key}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="capitalize">{key.replace('_', ' ')}</span>
                    <Switch
                      checked={integration.enabled}
                      onCheckedChange={(checked) => toggleIntegration({ integration: key, enabled: checked })}
                      disabled={isToggling}
                    />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Status:</span>
                      <Badge variant={integration.status === 'connected' ? 'default' : 'secondary'}>
                        {integration.status}
                      </Badge>
                    </div>
                    {integration.last_sync && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Last Sync:</span>
                        <span className="text-sm text-gray-600">
                          {new Date(integration.last_sync).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="billing" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Billing & Subscription</h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Plan:</span>
                    <Badge className="bg-blue-100 text-blue-800">
                      {subscription?.plan}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Status:</span>
                    <Badge className={subscription?.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {subscription?.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Billing Cycle:</span>
                    <span className="capitalize">{subscription?.billing_cycle}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Amount:</span>
                    <span className="font-semibold">
                      {formatCurrency(subscription?.billing?.amount || 0)}/{subscription?.billing_cycle || 'month'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Limits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Users</span>
                      <span className="text-sm">
                        {subscription?.usage?.users || 0} / {subscription?.features?.max_users || 0}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ 
                          width: `${((subscription?.usage?.users || 0) / (subscription?.features?.max_users || 1)) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm">Storage</span>
                      <span className="text-sm">
                        {subscription?.usage?.storage_gb || 0} GB / 100 GB
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-yellow-600 h-2 rounded-full" 
                        style={{ 
                          width: `${((subscription?.usage?.storage_gb || 0) / 100) * 100}%` 
                        }}
                      ></div>
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

export default TenantAdminPanel;