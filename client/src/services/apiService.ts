import { useTenant } from '../contexts/TenantContext';

interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
}

class ApiService {
  private baseURL: string;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_BASE_URL || '/api';
  }

  private getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };

    // Get authentication token
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Get tenant context from localStorage
    const currentTenantId = localStorage.getItem('currentTenantId');
    const selectedTenant = localStorage.getItem('selectedTenant');
    const isAdminMode = localStorage.getItem('isAdminMode') === 'true';
    const userEmail = localStorage.getItem('userEmail');

    // Add tenant context headers
    if (currentTenantId) {
      headers['X-Tenant-ID'] = currentTenantId;
    } else if (selectedTenant) {
      headers['X-Tenant-ID'] = selectedTenant;
    }

    // Add admin mode header
    if (isAdminMode) {
      headers['X-Admin-Mode'] = 'true';
    }

    // Add user email for admin verification
    if (userEmail) {
      headers['X-User-Email'] = userEmail;
    }

    return headers;
  }

  private buildURL(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  async request<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const { method = 'GET', headers: customHeaders = {}, body, params } = options;
    
    const url = this.buildURL(endpoint, params);
    const headers = this.getHeaders(customHeaders);

    const requestConfig: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      requestConfig.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, requestConfig);
      
      // Handle admin mode context changes from server
      const serverAdminMode = response.headers.get('X-Admin-Mode');
      const serverTenantId = response.headers.get('X-Current-Tenant');
      
      if (serverAdminMode !== null) {
        localStorage.setItem('isAdminMode', serverAdminMode);
      }
      
      if (serverTenantId && serverTenantId !== 'none') {
        localStorage.setItem('currentTenantId', serverTenantId);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          message: `HTTP ${response.status}: ${response.statusText}` 
        }));
        
        // Handle specific error cases
        if (response.status === 403 && errorData.message?.includes('admin mode')) {
          // Clear admin mode if server rejects it
          localStorage.setItem('isAdminMode', 'false');
        }
        
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Convenience methods for different HTTP verbs
  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Admin-specific methods
  async adminRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const isAdminMode = localStorage.getItem('isAdminMode') === 'true';
    
    if (!isAdminMode) {
      throw new Error('Admin mode required for this operation');
    }
    
    return this.request<T>(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        'X-Admin-Mode': 'true',
      },
    });
  }

  // Tenant-specific methods
  async tenantRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
    const currentTenantId = localStorage.getItem('currentTenantId');
    const isAdminMode = localStorage.getItem('isAdminMode') === 'true';
    
    if (isAdminMode) {
      throw new Error('Tenant mode required for this operation. Please exit admin mode.');
    }
    
    if (!currentTenantId) {
      throw new Error('Tenant context required. Please select a tenant.');
    }
    
    return this.request<T>(endpoint, options);
  }

  // Authentication methods
  async login(credentials: { email: string; password: string }): Promise<any> {
    return this.post('/auth/login', credentials);
  }

  async logout(): Promise<void> {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    
    if (token) {
      try {
        await this.post('/auth/logout');
      } catch (error) {
        console.warn('Logout request failed:', error);
      }
    }
    
    // Clear all auth-related localStorage items
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentTenantId');
    localStorage.removeItem('selectedTenant');
    localStorage.removeItem('isAdminMode');
    localStorage.removeItem('userEmail');
  }

  // Tenant management methods
  async switchTenant(tenantId: string): Promise<any> {
    return this.post('/auth/switch-tenant', { tenantId });
  }

  async getUserTenants(): Promise<any> {
    return this.get('/auth/user/tenants');
  }

  async getAllTenants(): Promise<any> {
    return this.adminRequest('/admin/tenants');
  }

  // Admin mode management
  async enterAdminMode(): Promise<any> {
    const userEmail = localStorage.getItem('userEmail');
    
    if (userEmail !== 'admin@tight5digital.com') {
      throw new Error('Only admin users can enter admin mode');
    }
    
    localStorage.setItem('isAdminMode', 'true');
    return this.get('/auth/user/tenants'); // Refresh tenant list with admin context
  }

  async exitAdminMode(): Promise<any> {
    localStorage.setItem('isAdminMode', 'false');
    return this.get('/auth/user/tenants'); // Refresh tenant list with normal context
  }
}

// Create and export singleton instance
export const apiService = new ApiService();

// React hook for using API service with tenant context
export const useApiService = () => {
  const { currentTenant, isAdminMode, isAdmin } = useTenant();
  
  return {
    apiService,
    currentTenant,
    isAdminMode,
    isAdmin,
    // Helper methods that use current context
    tenantRequest: <T>(endpoint: string, options?: ApiRequestOptions) => {
      if (isAdminMode) {
        throw new Error('Cannot make tenant requests in admin mode');
      }
      return apiService.tenantRequest<T>(endpoint, options);
    },
    adminRequest: <T>(endpoint: string, options?: ApiRequestOptions) => {
      if (!isAdmin || !isAdminMode) {
        throw new Error('Admin mode required');
      }
      return apiService.adminRequest<T>(endpoint, options);
    },
  };
};

export default apiService;