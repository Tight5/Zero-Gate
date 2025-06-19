import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Building2 } from 'lucide-react';

const TenantSelector: React.FC = () => {
  // For now, show current tenant - will be enhanced with real tenant switching
  return (
    <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
      <Building2 size={16} className="text-muted-foreground" />
      <span className="text-sm font-medium">Current Tenant</span>
    </div>
  );
};

export default TenantSelector;