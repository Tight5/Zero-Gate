/**
 * API Service
 * Centralized HTTP client for frontend API communications
 * Supports the Microsoft Graph Service and other platform services
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor() {
    this.baseUrl = '';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(
    method: string,
    url: string,
    data?: any,
    headers?: Record<string, string>
  ): Promise<ApiResponse<T>> {
    try {
      const requestHeaders = { ...this.defaultHeaders, ...headers };
      const requestUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;

      const config: RequestInit = {
        method,
        headers: requestHeaders,
        credentials: 'include',
      };

      if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
        config.body = JSON.stringify(data);
      }

      const response = await fetch(requestUrl, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const responseData = await response.json();
      
      return {
        success: true,
        data: responseData,
      };
    } catch (error: any) {
      console.error(`API request failed [${method} ${url}]:`, error);
      
      return {
        success: false,
        error: error.message || 'An unknown error occurred',
        message: error.message || 'Request failed',
      };
    }
  }

  async get<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('GET', url, undefined, headers);
  }

  async post<T>(url: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('POST', url, data, headers);
  }

  async put<T>(url: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PUT', url, data, headers);
  }

  async patch<T>(url: string, data?: any, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('PATCH', url, data, headers);
  }

  async delete<T>(url: string, headers?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>('DELETE', url, undefined, headers);
  }

  // Utility methods
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  // Authentication helpers
  setAuthToken(token: string): void {
    this.setDefaultHeader('Authorization', `Bearer ${token}`);
  }

  clearAuthToken(): void {
    this.removeDefaultHeader('Authorization');
  }

  // Tenant context
  setTenant(tenantId: string): void {
    this.setDefaultHeader('X-Tenant-ID', tenantId);
  }

  clearTenant(): void {
    this.removeDefaultHeader('X-Tenant-ID');
  }
}

export const apiService = new ApiService();
export default apiService;