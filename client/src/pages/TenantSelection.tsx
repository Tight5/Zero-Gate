
import { useTenant } from '@/components/common/TenantProvider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Navigate } from 'react-router-dom';

export function TenantSelection() {
  const { tenants, setCurrentTenant, currentTenant, loading } = useTenant();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (currentTenant) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Select Your Organization</CardTitle>
          <p className="text-muted-foreground">
            Choose the organization you want to work with
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {tenants.map((tenant) => (
              <Card
                key={tenant.id}
                className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setCurrentTenant(tenant)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{tenant.name}</h3>
                    <p className="text-sm text-muted-foreground">{tenant.slug}</p>
                  </div>
                  <Button variant="outline">Select</Button>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
