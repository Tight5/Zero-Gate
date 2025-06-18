import React, { useState } from 'react';
import { useTenant, useAuth } from '../hooks/useContexts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Building, Users, Search, CheckCircle, ArrowRight, Crown, Shield, User, Settings, LogOut } from 'lucide-react';
import { Navigate } from 'react-router-dom';

export default function TenantSelection() {
  const { user, logout } = useAuth();
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

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Crown className="h-3 w-3" />;
      case 'manager':
        return <Shield className="h-3 w-3" />;
      case 'user':
        return <User className="h-3 w-3" />;
      default:
        return <User className="h-3 w-3" />;
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'admin':
        return 'default' as const;
      case 'manager':
        return 'secondary' as const;
      case 'user':
        return 'outline' as const;
      default:
        return 'outline' as const;
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
          <Card className="max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    {user.profileImageUrl && (
                      <AvatarImage src={user.profileImageUrl} alt="Profile" />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-lg">{user.firstName} {user.lastName}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                    <Badge variant="outline" className="mt-1 text-xs">
                      {availableTenants.length} organization{availableTenants.length !== 1 ? 's' : ''} available
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings'}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                  <Button variant="ghost" size="sm" onClick={logout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredTenants.map((tenant) => {
                // Mock user role for each tenant (in real app, this would come from API)
                const userRole = tenant.id === '1' ? 'admin' : tenant.id === '2' ? 'manager' : 'user';
                
                return (
                  <Card
                    key={tenant.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:scale-[1.02] ${
                      selectedTenantId === tenant.id
                        ? 'ring-2 ring-primary border-primary shadow-md'
                        : 'hover:border-primary/30'
                    }`}
                    onClick={() => handleTenantSelect(tenant.id)}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <Building className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-lg font-semibold">{tenant.name}</CardTitle>
                            <CardDescription className="text-sm">{tenant.domain}</CardDescription>
                            
                            {/* Role Badge */}
                            <div className="mt-2">
                              <Badge variant={getRoleBadgeVariant(userRole)} className="text-xs">
                                {getRoleIcon(userRole)}
                                <span className="ml-1 capitalize">{userRole}</span>
                              </Badge>
                            </div>
                          </div>
                        </div>
                        {selectedTenantId === tenant.id && (
                          <CheckCircle className="h-5 w-5 text-primary animate-in zoom-in-50 duration-200" />
                        )}
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0 space-y-4">
                      {/* Organization Stats */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="text-center p-2 bg-accent/50 rounded-lg">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Users</span>
                          </div>
                          <p className="text-sm font-semibold">{tenant.settings.limits.users}</p>
                        </div>
                        <div className="text-center p-2 bg-accent/50 rounded-lg">
                          <div className="flex items-center justify-center gap-1 mb-1">
                            <Building className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Sponsors</span>
                          </div>
                          <p className="text-sm font-semibold">{tenant.settings.limits.sponsors}</p>
                        </div>
                      </div>

                      {/* Features */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Available Features</p>
                        <div className="flex flex-wrap gap-1">
                          {tenant.settings.features.slice(0, 2).map((feature) => (
                            <Badge key={feature} variant="outline" className="text-xs py-0">
                              {feature.replace(/([A-Z])/g, ' $1').trim()}
                            </Badge>
                          ))}
                          {tenant.settings.features.length > 2 && (
                            <Badge variant="secondary" className="text-xs py-0">
                              +{tenant.settings.features.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <Separator />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Click to select</span>
                        {selectedTenantId === tenant.id && (
                          <span className="text-primary font-medium">Selected</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Continue Button */}
        {selectedTenantId && (
          <div className="text-center space-y-3">
            <Button 
              onClick={handleContinue} 
              size="lg" 
              className="min-w-40 h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
            >
              Continue to Dashboard
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <p className="text-xs text-muted-foreground">
              You can switch organizations anytime from Settings
            </p>
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