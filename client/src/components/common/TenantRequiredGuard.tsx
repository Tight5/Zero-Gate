/**
 * Tenant Required Guard Component
 * Implements File 24 specification requirements with shadcn/ui compatibility
 * Cross-referenced with attached asset File 24: Common Components - Tenant Required Guard
 */

import React from 'react';
import { useLocation } from 'wouter';
import { useTenant } from '@/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Building2 } from 'lucide-react';

interface TenantRequiredGuardProps {
  children: React.ReactNode;
}

const TenantRequiredGuard: React.FC<TenantRequiredGuardProps> = ({ children }) => {
  const { currentTenant, loading, availableTenants } = useTenant();
  const [, setLocation] = useLocation();

  // Loading state - matches File 24 specification
  if (loading) {
    return (
      <div className="loading-container flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading organization information...</p>
        </div>
      </div>
    );
  }

  // No tenant selected but tenants available - navigate to tenant selection
  if (!currentTenant && availableTenants.length > 0) {
    setLocation('/tenant-selection');
    return (
      <div className="loading-container flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Redirecting to organization selection...</p>
        </div>
      </div>
    );
  }

  // No tenant access - matches File 24 specification
  if (!currentTenant && availableTenants.length === 0) {
    return (
      <div className="no-tenant-container flex items-center justify-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">No Access</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You don't have access to any organizations. Please contact your administrator for access.
            </p>
            
            <Alert>
              <Building2 className="h-4 w-4" />
              <AlertDescription>
                Organization access is required to use the Zero Gate ESO Platform. 
                Your administrator can grant access to your organization's workspace.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={() => setLocation('/tenant-selection')}
              variant="outline"
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tenant available - render children
  return <>{children}</>;
};

export default TenantRequiredGuard;