/**
 * Tenant Selection Page
 * Implements File 34 specification requirements for tenant selection flow
 * Cross-referenced with attached asset File 34: Tenant Selection Page
 */

import React, { useState } from 'react';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Building2, Users, Settings, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { useLocation } from 'wouter';

interface TenantCardProps {
  tenant: any;
  onSelect: (tenant: any) => void;
  isSelected: boolean;
}

const TenantCard: React.FC<TenantCardProps> = ({ tenant, onSelect, isSelected }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'suspended':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Building2 className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      active: 'default',
      pending: 'secondary',
      suspended: 'destructive',
      inactive: 'outline'
    };
    return variants[status] || 'outline';
  };

  const getRoleBadge = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      owner: 'default',
      admin: 'secondary',
      manager: 'outline',
      user: 'outline',
      viewer: 'outline'
    };
    return variants[role] || 'outline';
  };

  return (
    <Card 
      className={`cursor-pointer transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-primary border-primary' : ''
      } ${tenant.status !== 'active' ? 'opacity-60' : ''}`}
      onClick={() => tenant.status === 'active' && onSelect(tenant)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon(tenant.status)}
            <div>
              <CardTitle className="text-lg">{tenant.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{tenant.description}</p>
            </div>
          </div>
          <div className="flex flex-col space-y-1">
            <Badge variant={getStatusBadge(tenant.status)}>
              {tenant.status}
            </Badge>
            <Badge variant={getRoleBadge(tenant.role)}>
              {tenant.role}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{tenant.userCount} users</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Active {tenant.lastActivity}</span>
          </div>
        </div>
        
        {tenant.domain && (
          <div className="mt-2 text-xs text-muted-foreground">
            {tenant.domain}
          </div>
        )}

        {tenant.features && tenant.features.length > 0 && (
          <div className="mt-3">
            <div className="flex flex-wrap gap-1">
              {tenant.features.slice(0, 3).map((feature: string) => (
                <Badge key={feature} variant="outline" className="text-xs">
                  {feature}
                </Badge>
              ))}
              {tenant.features.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{tenant.features.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TenantSelection: React.FC = () => {
  const { availableTenants, switchTenant, loading } = useTenant();
  const [selectedTenant, setSelectedTenant] = useState<any>(null);
  const [, setLocation] = useLocation();

  const handleTenantSelect = (tenant: any) => {
    setSelectedTenant(tenant);
  };

  const handleContinue = async () => {
    if (selectedTenant) {
      await switchTenant(selectedTenant.id);
      setLocation('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Building2 className="h-8 w-8 mx-auto animate-pulse text-primary" />
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <Building2 className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h1 className="text-3xl font-bold">Select Organization</h1>
          <p className="text-muted-foreground mt-2">
            Choose an organization to access the Zero Gate ESO Platform
          </p>
        </div>

        {availableTenants.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="text-center">No Organizations Available</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You don't have access to any organizations. Please contact your administrator.
                </AlertDescription>
              </Alert>
              <Button onClick={() => setLocation('/login')} variant="outline">
                Back to Login
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {availableTenants.map((tenant) => (
                <TenantCard
                  key={tenant.id}
                  tenant={tenant}
                  onSelect={handleTenantSelect}
                  isSelected={selectedTenant?.id === tenant.id}
                />
              ))}
            </div>

            <div className="flex justify-center space-x-4">
              <Button
                onClick={() => setLocation('/login')}
                variant="outline"
              >
                Back to Login
              </Button>
              <Button
                onClick={handleContinue}
                disabled={!selectedTenant || selectedTenant.status !== 'active'}
              >
                Continue to {selectedTenant?.name || 'Organization'}
              </Button>
            </div>

            {selectedTenant && (
              <Card className="mt-6 max-w-md mx-auto">
                <CardHeader>
                  <CardTitle className="text-lg">Selected Organization</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">Name:</span>
                      <span>{selectedTenant.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Role:</span>
                      <Badge variant={selectedTenant.role === 'owner' ? 'default' : 'secondary'}>
                        {selectedTenant.role}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-medium">Users:</span>
                      <span>{selectedTenant.userCount}</span>
                    </div>
                    {selectedTenant.features && (
                      <div>
                        <span className="font-medium">Features:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedTenant.features.map((feature: string) => (
                            <Badge key={feature} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TenantSelection;