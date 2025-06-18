import React, { useState } from 'react';
import { useTenant, useAuth } from '../hooks/useContexts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, Users, Search, CheckCircle, ArrowRight } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function TenantSelection() {
  const { user } = useAuth();
  const { availableTenants, currentTenant, switchTenant, isLoading } = useTenant();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(currentTenant?.id || null);

  // If user already has a tenant selected and this isn't a manual selection, redirect to dashboard
  if (currentTenant && !searchTerm && availableTenants.length > 0) {
    return <Navigate to="/dashboard" replace />;
  }

  const filteredTenants = availableTenants.filter(tenant =>
    tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
  };

  const handleContinue = () => {
    if (selectedTenantId) {
      switchTenant(selectedTenantId);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Loading organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <Building className="h-12 w-12 text-primary mx-auto" />
          <h1 className="text-3xl font-bold">Select Your Organization</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Choose the organization you'd like to work with. You can switch between organizations at any time.
          </p>
        </div>

        {/* User Info */}
        {user && (
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                {user.profileImageUrl && (
                  <img
                    src={user.profileImageUrl}
                    alt="Profile"
                    className="h-10 w-10 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-medium">{user.firstName} {user.lastName}</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search */}
        {availableTenants.length > 3 && (
          <div className="max-w-md mx-auto">
            <Label htmlFor="search" className="sr-only">Search organizations</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search organizations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        )}

        {/* Organizations List */}
        <div className="space-y-4 max-w-3xl mx-auto">
          {filteredTenants.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Organizations Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "No organizations match your search criteria."
                    : "You don't have access to any organizations yet."
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredTenants.map((tenant) => (
                <Card
                  key={tenant.id}
                  className={`cursor-pointer transition-all hover:shadow-md ${
                    selectedTenantId === tenant.id
                      ? 'ring-2 ring-primary border-primary'
                      : 'hover:border-primary/50'
                  }`}
                  onClick={() => handleTenantSelect(tenant.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{tenant.name}</CardTitle>
                          <CardDescription>{tenant.domain}</CardDescription>
                        </div>
                      </div>
                      {selectedTenantId === tenant.id && (
                        <CheckCircle className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Features */}
                      <div>
                        <p className="text-sm font-medium mb-2">Available Features</p>
                        <div className="flex flex-wrap gap-1">
                          {tenant.settings.features.slice(0, 3).map((feature) => (
                            <Badge key={feature} variant="secondary" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {tenant.settings.features.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{tenant.settings.features.length - 3} more
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Limits */}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{tenant.settings.limits.users} users</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Building className="h-4 w-4" />
                          <span>{tenant.settings.limits.sponsors} sponsors</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Continue Button */}
        {selectedTenantId && (
          <div className="text-center">
            <Button onClick={handleContinue} size="lg" className="min-w-32">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Help Text */}
        <div className="text-center max-w-md mx-auto">
          <p className="text-sm text-muted-foreground">
            Need access to a different organization? Contact your administrator or{' '}
            <Button variant="link" className="p-0 h-auto text-sm" onClick={() => window.location.href = '/api/logout'}>
              sign in with a different account
            </Button>
            .
          </p>
        </div>
      </div>
    </div>
  );
}