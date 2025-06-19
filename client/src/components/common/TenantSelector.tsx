import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTenant } from '@/contexts/TenantContext';

const TenantSelector: React.FC = () => {
  const { currentTenant, availableTenants, switchTenant } = useTenant();

  const handleTenantChange = async (tenantId: string) => {
    try {
      await switchTenant(tenantId);
    } catch (error) {
      console.error('Failed to switch tenant:', error);
    }
  };

  if (availableTenants.length <= 1) {
    return null;
  }

  return (
    <Select
      value={currentTenant?.id || ''}
      onValueChange={handleTenantChange}
    >
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="Select tenant..." />
      </SelectTrigger>
      <SelectContent>
        {availableTenants.map((tenant) => (
          <SelectItem key={tenant.id} value={tenant.id}>
            {tenant.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default TenantSelector;