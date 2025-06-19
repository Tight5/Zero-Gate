/**
 * Custom hooks for accessing global contexts with strict type safety
 * Provides centralized access to all application contexts
 */

// Re-export all context hooks for convenient access
export { useAuth } from '../contexts/AuthContext';
export { useTenant } from '../contexts/TenantContext';
export { useTheme } from '../contexts/ThemeContext';
export { useResource, useFeatureCheck } from '../contexts/ResourceContext';

// Combined hooks for common use cases
import { useAuth } from '../contexts/AuthContext';
import { useTenant } from '../contexts/TenantContext';
import { useResource } from '../contexts/ResourceContext';
import { useTheme } from '../contexts/ThemeContext';

/**
 * Combined hook for authentication and tenant status
 * Useful for components that need both authentication and tenant information
 */
export function useAuthTenant() {
  const auth = useAuth();
  const tenant = useTenant();
  
  return {
    ...auth,
    ...tenant,
    isFullyLoaded: !auth.isLoading && !tenant.loading,
    canAccess: auth.isAuthenticated && !!tenant.currentTenant,
  };
}

/**
 * Combined hook for system status and feature availability
 * Useful for components that need to check both resource status and feature availability
 */
export function useSystemStatus() {
  const resource = useResource();
  const { isFeatureEnabled } = resource;
  
  // Determine resource level based on memory/CPU usage
  const getResourceLevel = () => {
    if (resource.memoryUsage > 90 || resource.cpuUsage > 90) return 'critical';
    if (resource.memoryUsage > 80 || resource.cpuUsage > 80) return 'warning';
    return 'optimal';
  };
  
  return {
    ...resource,
    resourceLevel: getResourceLevel(),
    isSystemHealthy: ['optimal', 'warning'].includes(getResourceLevel()),
    isSystemCritical: ['critical', 'emergency'].includes(getResourceLevel()),
    canPerformHeavyOperations: isFeatureEnabled('processing') && isFeatureEnabled('bulkOperations'),
    canUseIntegrations: isFeatureEnabled('integration'),
    hasRealTimeFeatures: isFeatureEnabled('realTimeUpdates'),
  };
}

/**
 * Combined hook for theme and accessibility preferences
 * Useful for components that need to adapt to theme and accessibility settings
 */
export function useAppearance() {
  const { theme, actualTheme, setTheme, toggleTheme } = useTheme();
  
  return {
    theme,
    actualTheme,
    setTheme,
    toggleTheme,
    isDark: actualTheme === 'dark',
    isLight: actualTheme === 'light',
    isSystemTheme: theme === 'system',
    getThemeClasses: () => ({
      'dark': actualTheme === 'dark',
      'light': actualTheme === 'light',
    }),
  };
}

/**
 * Master hook that provides access to all application state
 * Use sparingly - prefer specific hooks for better performance
 */
export function useAppState() {
  const auth = useAuth();
  const tenant = useTenant();
  const resource = useResource();
  const theme = useTheme();
  
  const isLoading = auth.isLoading || tenant.loading;
  const isReady = auth.isAuthenticated && !!tenant.currentTenant && !isLoading;
  
  return {
    auth,
    tenant,
    resource,
    theme,
    isLoading,
    isReady,
    currentUser: auth.user,
    currentTenant: tenant.currentTenant,
  };
}

/**
 * Hook for conditional rendering based on feature availability
 * Provides JSX helpers for feature-gated content
 */
export function useFeatureGating() {
  const { isFeatureEnabled } = useResource();
  
  return {
    isFeatureEnabled,
    
    // JSX helpers
    withProcessing: (children: React.ReactNode) => 
      isFeatureEnabled('processing') ? children : null,
      
    withIntegration: (children: React.ReactNode) => 
      isFeatureEnabled('integration') ? children : null,
      
    withAnalytics: (children: React.ReactNode) => 
      isFeatureEnabled('analytics') ? children : null,
      
    withRealTime: (children: React.ReactNode) => 
      isFeatureEnabled('realTimeUpdates') ? children : null,
      
    withBulkOps: (children: React.ReactNode) => 
      isFeatureEnabled('bulkOperations') ? children : null,
  };
}

/**
 * Hook for tenant-aware API requests
 * Provides headers and utilities for multi-tenant API calls
 */
export function useTenantAPI() {
  const { currentTenant } = useTenant();
  const { user } = useAuth();
  
  const getTenantHeaders = () => ({
    'X-Tenant-ID': currentTenant?.id || '',
    'X-User-ID': user?.id || '',
  });
  
  const buildTenantUrl = (endpoint: string) => {
    const tenantId = currentTenant?.id;
    if (!tenantId) return endpoint;
    
    // Add tenant context to API URLs if not already present
    if (endpoint.includes('tenants/')) return endpoint;
    return endpoint.replace('/api/', `/api/tenants/${tenantId}/`);
  };
  
  return {
    tenantId: currentTenant?.id || null,
    userId: user?.id || null,
    getTenantHeaders,
    buildTenantUrl,
    canMakeRequest: !!currentTenant && !!user,
  };
}

// Type exports for external use
export type {
  User,
  AuthContextType,
} from '../contexts/AuthContext';

export type {
  Theme,
  ThemeContextType,
} from '../contexts/ThemeContext';