import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

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
  isAdminMode: boolean;
  isAdmin: boolean;
  selectedTenant: string | null;
  switchTenant: (tenantId: string) => Promise<void>;
  updateTenantSettings: (settings: any) => void;
  toggleAdminMode: () => Promise<void>;
  enterAdminMode: () => Promise<void>;
  exitAdminMode: () => Promise<void>;
  getAllTenants: () => Promise<Tenant[]>;
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

// Export types for external use
export type { Tenant, TenantContextType };

export const TenantProvider: React.FC<TenantProviderProps> = React.memo(({ children }) => {
  const { user } = useAuth();
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [availableTenants, setAvailableTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  // Admin email configuration
  const ADMIN_EMAIL = 'admin@tight5digital.com';
  const TENANT_EMAIL = 'clint.phillips@thecenter.nasdaq.org';

  // Check if current user is admin
  const isAdmin = useMemo(() => {
    return user?.email === ADMIN_EMAIL;
  }, [user?.email]);

  // Initialize admin mode from localStorage
  useEffect(() => {
    const savedAdminMode = localStorage.getItem('isAdminMode') === 'true';
    const savedTenantId = localStorage.getItem('selectedTenant');
    
    if (isAdmin && savedAdminMode) {
      setIsAdminMode(true);
    }
    
    if (savedTenantId) {
      setSelectedTenant(savedTenantId);
    }
    
    loadTenants();
  }, [isAdmin]);

  const loadTenants = useCallback(async () => {
    try {
      setLoading(true);
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add admin mode header if in admin mode
      if (isAdminMode && isAdmin) {
        headers['X-Admin-Mode'] = 'true';
      }

      const response = await fetch('/api/auth/user/tenants', { headers });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableTenants(data.tenants || []);
        
        // In admin mode, don't automatically set current tenant
        if (isAdminMode && isAdmin) {
          // Admin can see all tenants but doesn't have a "current" tenant
          setCurrentTenant(null);
          return;
        }
        
        // Set current tenant from localStorage or first available
        const savedTenantId = localStorage.getItem('currentTenantId');
        const tenants = data.tenants || [];
        
        if (savedTenantId && tenants.length > 0) {
          const tenant = tenants.find((t: Tenant) => t.id === savedTenantId);
          if (tenant && tenant.status === 'active') {
            setCurrentTenant(tenant);
          } else if (tenants.length > 0) {
            setCurrentTenant(tenants[0]);
            localStorage.setItem('currentTenantId', tenants[0].id);
          }
        } else if (tenants.length > 0) {
          setCurrentTenant(tenants[0]);
          localStorage.setItem('currentTenantId', tenants[0].id);
        }
      } else {
        console.error('Failed to load tenants:', response.status, response.statusText);
        setError('Failed to load tenants');
      }
    } catch (err) {
      console.error('Error loading tenants:', err);
      setError('Failed to load tenants');
    } finally {
      setLoading(false);
    }
  }, [isAdminMode, isAdmin]);

  const switchTenant = useCallback(async (tenantId: string) => {
    try {
      setLoading(true);
      setError(null);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add admin mode header if applicable
      if (isAdminMode && isAdmin) {
        headers['X-Admin-Mode'] = 'true';
      }

      const response = await fetch('/api/auth/switch-tenant', {
        method: 'POST',
        headers,
        body: JSON.stringify({ tenantId }),
      });

      if (response.ok) {
        const tenant = availableTenants.find(t => t.id === tenantId);
        if (tenant) {
          setCurrentTenant(tenant);
          setSelectedTenant(tenantId);
          localStorage.setItem('currentTenantId', tenantId);
          localStorage.setItem('selectedTenant', tenantId);
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
  }, [availableTenants, isAdminMode, isAdmin]);

  const updateTenantSettings = useCallback((settings: any) => {
    if (currentTenant) {
      setCurrentTenant({
        ...currentTenant,
        settings: { ...currentTenant.settings, ...settings }
      });
    }
  }, [currentTenant]);

  // Admin mode management functions
  const toggleAdminMode = useCallback(async () => {
    if (!isAdmin) {
      throw new Error('Only admin users can toggle admin mode');
    }

    try {
      setLoading(true);
      const newAdminMode = !isAdminMode;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-User-Email': localStorage.getItem('userEmail') || 'admin@tight5digital.com',
      };

      if (newAdminMode) {
        // Entering admin mode
        headers['X-Admin-Mode'] = 'true';
        
        const response = await fetch('/api/auth/enter-admin-mode', {
          method: 'POST',
          headers,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to enter admin mode');
        }
        
        setIsAdminMode(true);
        localStorage.setItem('isAdminMode', 'true');
        
        // Store current tenant before entering admin mode
        if (currentTenant) {
          localStorage.setItem('selectedTenant', currentTenant.id);
        }
        
        // Clear current tenant in admin mode
        setCurrentTenant(null);
        localStorage.removeItem('currentTenantId');
      } else {
        // Exiting admin mode
        headers['X-Admin-Mode'] = 'false';
        
        const response = await fetch('/api/auth/exit-admin-mode', {
          method: 'POST',
          headers,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to exit admin mode');
        }
        
        setIsAdminMode(false);
        localStorage.setItem('isAdminMode', 'false');
        
        // Restore previous tenant or set first available
        const savedTenantId = localStorage.getItem('selectedTenant');
        if (savedTenantId && availableTenants.length > 0) {
          const tenant = availableTenants.find(t => t.id === savedTenantId);
          if (tenant) {
            setCurrentTenant(tenant);
            localStorage.setItem('currentTenantId', savedTenantId);
          }
        } else if (availableTenants.length > 0) {
          setCurrentTenant(availableTenants[0]);
          localStorage.setItem('currentTenantId', availableTenants[0].id);
        }
      }
      
      // Reload tenants with new context
      await loadTenants();
    } catch (err) {
      console.error('Error toggling admin mode:', err);
      setError('Failed to toggle admin mode');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isAdmin, isAdminMode, availableTenants, loadTenants, currentTenant]);

  const enterAdminMode = useCallback(async () => {
    if (!isAdmin) {
      throw new Error('Only admin users can enter admin mode');
    }
    
    if (!isAdminMode) {
      await toggleAdminMode();
    }
  }, [isAdmin, isAdminMode, toggleAdminMode]);

  const exitAdminMode = useCallback(async () => {
    if (isAdminMode) {
      await toggleAdminMode();
    }
  }, [isAdminMode, toggleAdminMode]);

  // Get all tenants (admin function)
  const getAllTenants = useCallback(async (): Promise<Tenant[]> => {
    if (!isAdmin) {
      throw new Error('Only admin users can access all tenants');
    }

    try {
      const response = await fetch('/api/admin/tenants', {
        headers: {
          'Content-Type': 'application/json',
          'X-Admin-Mode': 'true',
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.tenants || [];
      } else {
        throw new Error('Failed to fetch all tenants');
      }
    } catch (err) {
      console.error('Error fetching all tenants:', err);
      throw err;
    }
  }, [isAdmin]);

  const value: TenantContextType = {
    currentTenant,
    availableTenants,
    loading,
    error,
    isAdminMode,
    isAdmin,
    selectedTenant,
    switchTenant,
    updateTenantSettings,
    toggleAdminMode,
    enterAdminMode,
    exitAdminMode,
    getAllTenants,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
});