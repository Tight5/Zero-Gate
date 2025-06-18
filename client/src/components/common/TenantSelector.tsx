import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTenant } from '@/contexts/TenantContext';

const TenantSelector = () => {
  const { currentTenant, availableTenants, switchTenant, isMultiTenant } = useTenant();

  if (!isMultiTenant || availableTenants.length <= 1) {
    return null;
  }

  const handleTenantChange = (tenantId: string) => {
    if (tenantId !== currentTenant?.id) {
      switchTenant(tenantId);
    }
  };

  return (
    <div className="tenant-selector">
      <Select
        value={currentTenant?.id || ''}
        onValueChange={handleTenantChange}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Select Organization" />
        </SelectTrigger>
        <SelectContent>
          {availableTenants.map((tenant) => (
            <SelectItem key={tenant.id} value={tenant.id}>
              {tenant.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default TenantSelector;