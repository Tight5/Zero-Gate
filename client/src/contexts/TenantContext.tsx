import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

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
  settings?: any;
}

interface TenantContextType {
  currentTenant: Tenant | null;
  availableTenants: Tenant[];
  loading: boolean;
  error: string | null;
  switchTenant: (tenantId: string) => Promise<void>;
  updateTenantSettings: (settings: any) => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};

interface TenantProviderProps {
  children: ReactNode;
}

export const TenantProvider: React.FC<TenantProviderProps> = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auth/user/tenants');
      
      if (response.ok) {
        const data = await response.json();
        setAvailableTenants(data.tenants || []);
        
        // Set current tenant from localStorage or first available
        const savedTenantId = localStorage.getItem('currentTenantId');
        if (savedTenantId) {
          const tenant = data.tenants?.find((t: Tenant) => t.id === savedTenantId);
          if (tenant && tenant.status === 'active') {
            setCurrentTenant(tenant);
          }
        }
      } else {
        // Development fallback with mock data
        const mockTenants: Tenant[] = [
          {
            id: '1',
            name: 'NASDAQ Entrepreneur Center',
            description: 'Leading technology entrepreneurship hub',
            role: 'admin',
            userCount: 245,
            status: 'active',
            domain: 'nasdaq-ec.org',
            lastActivity: '2 hours ago',
            features: ['Analytics', 'Microsoft 365', 'Advanced Reporting']
          }
        ];
        setAvailableTenants(mockTenants);
        setCurrentTenant(mockTenants[0]);
      }
    } catch (err) {
      setError('Failed to load tenants');
      console.error('Error loading tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchTenant = async (tenantId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/switch-tenant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId }),
      });

      if (response.ok) {
        const tenant = availableTenants.find(t => t.id === tenantId);
        if (tenant) {
          setCurrentTenant(tenant);
          localStorage.setItem('currentTenantId', tenantId);
        }
      } else {
        throw new Error('Failed to switch tenant');
      }
    } catch (err) {
      setError('Failed to switch tenant');
      console.error('Error switching tenant:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateTenantSettings = (settings: any) => {
    if (currentTenant) {
      setCurrentTenant({
        ...currentTenant,
        settings: { ...currentTenant.settings, ...settings }
      });
    }
  };

  const value: TenantContextType = {
    currentTenant,
    availableTenants,
    loading,
    error,
    switchTenant,
    updateTenantSettings,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
};

export default TenantProvider;