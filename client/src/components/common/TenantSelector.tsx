
import { useTenant } from './TenantProvider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function TenantSelector() {
  const { currentTenant, setCurrentTenant, tenants, loading } = useTenant();

  if (loading || tenants.length <= 1) {
    return null;
  }

  return (
    <Select
      value={currentTenant?.id}
      onValueChange={(value) => {
        const tenant = tenants.find(t => t.id === value);
        if (tenant) {
          setCurrentTenant(tenant);
        }
      }}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Select tenant" />
      </SelectTrigger>
      <SelectContent>
        {tenants.map((tenant) => (
          <SelectItem key={tenant.id} value={tenant.id}>
            {tenant.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
