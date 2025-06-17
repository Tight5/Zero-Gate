import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Tenant {
  id: string;
  name: string;
  domain: string;
  planTier: string;
}

export function useTenant() {
  const [selectedTenant, setSelectedTenant] = useState<string>('a9ce749c-9d1b-4d72-837a-5c7938cb4b36'); // Default tenant UUID

  const { data: tenants = [], isLoading } = useQuery<Tenant[]>({
    queryKey: ["/api/tenants"],
    queryFn: async () => {
      const res = await fetch("/api/tenants", {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`);
      return res.json();
    },
  });

  // Auto-select first tenant if none selected and tenants are loaded
  useEffect(() => {
    if (tenants.length > 0 && !tenants.find(t => t.id === selectedTenant)) {
      setSelectedTenant(tenants[0].id);
    }
  }, [tenants, selectedTenant]);

  return {
    selectedTenant,
    setSelectedTenant,
    tenants,
    isLoading,
    currentTenant: tenants.find(t => t.id === selectedTenant),
  };
}