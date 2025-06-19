import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Building2, ChevronRight, Users, Crown, Shield, Star, User, Eye, LogOut, AlertCircle, Loader2, CheckCircle, Clock, Lock } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';

interface Tenant {
  id: string;
  name: string;
  description?: string;
  role: 'owner' | 'admin' | 'manager' | 'user' | 'viewer';
  userCount?: number;
  status: 'active' | 'pending' | 'suspended' | 'inactive';
  logo?: string;
  domain?: string;
  lastActivity?: string;
  features?: string[];
}

export default function TenantSelection() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [switchingTenant, setSwitchingTenant] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not authenticated
  if (!isLoading && !isAuthenticated && location !== '/login') {
    setLocation('/login');
    return null;
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserTenants();
    }
  }, [isAuthenticated]);

  const fetchUserTenants = async () => {
    try {
      setLoadingTenants(true);
      const response = await fetch('/api/auth/user/tenants', {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
      } else {
        // Mock tenant data for development
        setTenants([
          {
            id: '1',
            name: 'NASDAQ Entrepreneur Center',
            description: 'Leading technology entrepreneurship hub in San Francisco',
            role: 'admin',
            userCount: 245,
            status: 'active',
            domain: 'nasdaq-ec.org',
            lastActivity: '2 hours ago',
            features: ['Analytics', 'Microsoft 365', 'Advanced Reporting']
          },
          {
            id: '2', 
            name: 'Bay Area Innovation Network',
            description: 'Regional innovation ecosystem support organization',
            role: 'manager',
            userCount: 128,
            status: 'active',
            domain: 'bain.network',
            lastActivity: '1 day ago',
            features: ['Basic Analytics', 'Grant Management']
          },
          {
            id: '3',
            name: 'SF Tech Foundry',
            description: 'Early-stage startup incubator and accelerator',
            role: 'user',
            userCount: 87,
            status: 'pending',
            domain: 'sftechfoundry.com',
            lastActivity: '3 days ago',
            features: ['Basic Features']
          }
        ]);
      }
    } catch (err) {
      setError('Failed to load organizations. Please try again.');
      console.error('Error fetching tenants:', err);
    } finally {
      setLoadingTenants(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="h-4 w-4" />;
      case 'admin':
        return <Shield className="h-4 w-4" />;
      case 'manager':
        return <Star className="h-4 w-4" />;
      case 'user':
        return <User className="h-4 w-4" />;
      case 'viewer':
        return <Eye className="h-4 w-4" />;
      default:
        return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'admin':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'manager':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'user':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      case 'viewer':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'suspended':
        return <Lock className="h-4 w-4 text-red-600" />;
      case 'inactive':
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'suspended':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const handleTenantSelect = async (tenantId: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant || tenant.status !== 'active') return;

    setSwitchingTenant(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/switch-tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId }),
      });

      if (response.ok) {
        // Successful tenant switch - redirect to main app
        window.location.href = '/';
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to switch organization. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Tenant switch error:', err);
    } finally {
      setSwitchingTenant(false);
    }
  };

  const handleLogout = () => {
    window.location.href = '/api/logout';
  };

  if (isLoading || loadingTenants) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Zero Gate ESO Platform</h1>
              <p className="text-muted-foreground">Select your organization</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl} />
                <AvatarFallback>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Organizations Grid */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">Your Organizations</h2>
            
            {tenants.length === 0 ? (
              <Card className="p-8 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Organizations Found</h3>
                <p className="text-muted-foreground mb-4">
                  You don't have access to any organizations yet.
                </p>
                <Button variant="outline" onClick={handleLogout}>
                  Sign in with different account
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {tenants.map((tenant) => (
                  <Card
                    key={tenant.id}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                      selectedTenant === tenant.id
                        ? 'ring-2 ring-primary shadow-lg'
                        : 'hover:ring-1 hover:ring-primary/50'
                    } ${
                      tenant.status !== 'active' 
                        ? 'opacity-60 cursor-not-allowed' 
                        : ''
                    }`}
                    onClick={() => tenant.status === 'active' && !switchingTenant && setSelectedTenant(tenant.id)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={tenant.logo} />
                            <AvatarFallback className="bg-primary/10">
                              <Building2 className="h-6 w-6 text-primary" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-lg leading-tight truncate">
                              {tenant.name}
                            </CardTitle>
                            <CardDescription className="text-sm line-clamp-2">
                              {tenant.description}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(tenant.status)}
                          <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${
                            selectedTenant === tenant.id ? 'rotate-90' : ''
                          }`} />
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="secondary"
                          className={`${getRoleColor(tenant.role)} flex items-center gap-1`}
                        >
                          {getRoleIcon(tenant.role)}
                          {tenant.role}
                        </Badge>
                        
                        <Badge
                          variant="outline"
                          className={`${getStatusColor(tenant.status)} flex items-center gap-1`}
                        >
                          {getStatusIcon(tenant.status)}
                          {tenant.status}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4" />
                          <span>{tenant.userCount} members</span>
                        </div>
                        {tenant.lastActivity && (
                          <span>Active {tenant.lastActivity}</span>
                        )}
                      </div>

                      {tenant.domain && (
                        <div className="text-xs text-muted-foreground">
                          {tenant.domain}
                        </div>
                      )}

                      {tenant.features && tenant.features.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tenant.features.slice(0, 2).map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {feature}
                            </Badge>
                          ))}
                          {tenant.features.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{tenant.features.length - 2}
                            </Badge>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Section */}
        {selectedTenant && (
          <div className="mt-8">
            <Separator className="mb-6" />
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-medium">
                  Continue to {tenants.find(t => t.id === selectedTenant)?.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Access your organization's ESO platform features
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => handleTenantSelect(selectedTenant)}
                disabled={switchingTenant}
                className="px-8"
              >
                {switchingTenant ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Switching...
                  </>
                ) : (
                  <>
                    Continue
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Help Section */}
        <div className="mt-12">
          <Card className="bg-accent/50">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="font-medium">Need Help?</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  If you don't see your organization or need access to additional features, 
                  contact your organization administrator.
                </p>
                <div className="flex justify-center space-x-4">
                  <Button variant="outline" size="sm">
                    Contact Support
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Sign in with different account
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}