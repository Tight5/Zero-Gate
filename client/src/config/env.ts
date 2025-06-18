/**
 * Environment configuration with strict type safety
 * Validates and provides typed access to environment variables
 */

interface AppConfig {
  app: {
    title: string;
    version: string;
    environment: 'development' | 'production' | 'staging';
  };
  api: {
    url: string;
    timeout: number;
  };
  features: {
    analytics: boolean;
    debug: boolean;
    tenantIsolation: boolean;
    resourceMonitoring: boolean;
  };
  limits: {
    maxFileSize: number;
    supportedFileTypes: string[];
    autoRefreshInterval: number;
  };
}

class EnvironmentConfig {
  private config: AppConfig;

  constructor() {
    this.config = this.validateAndBuildConfig();
  }

  private validateAndBuildConfig(): AppConfig {
    const env = import.meta.env;

    // Validate environment type
    const environment = env.VITE_ENVIRONMENT || 'development';
    if (!['development', 'production', 'staging'].includes(environment)) {
      console.warn(`Invalid environment: ${environment}. Defaulting to 'development'`);
    }

    return {
      app: {
        title: env.VITE_APP_TITLE || 'Zero Gate ESO Platform',
        version: env.VITE_APP_VERSION || '1.0.0',
        environment: environment as 'development' | 'production' | 'staging'
      },
      api: {
        url: env.VITE_API_URL || '/api',
        timeout: 30000 // 30 seconds
      },
      features: {
        analytics: this.parseBoolean(env.VITE_ENABLE_ANALYTICS, false),
        debug: this.parseBoolean(env.VITE_ENABLE_DEBUG, environment === 'development'),
        tenantIsolation: this.parseBoolean(env.VITE_TENANT_ISOLATION, true),
        resourceMonitoring: this.parseBoolean(env.VITE_RESOURCE_MONITORING, true)
      },
      limits: {
        maxFileSize: this.parseNumber(env.VITE_MAX_FILE_SIZE, 10 * 1024 * 1024), // 10MB default
        supportedFileTypes: this.parseArray(env.VITE_SUPPORTED_FILE_TYPES, [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv'
        ]),
        autoRefreshInterval: this.parseNumber(env.VITE_AUTO_REFRESH_INTERVAL, 5000) // 5 seconds default
      }
    };
  }

  private parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true';
  }

  private parseNumber(value: string | undefined, defaultValue: number): number {
    if (value === undefined) return defaultValue;
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? defaultValue : parsed;
  }

  private parseArray(value: string | undefined, defaultValue: string[]): string[] {
    if (value === undefined) return defaultValue;
    try {
      return JSON.parse(value);
    } catch {
      return value.split(',').map(item => item.trim());
    }
  }

  // Typed getters
  get appTitle(): string {
    return this.config.app.title;
  }

  get appVersion(): string {
    return this.config.app.version;
  }

  get environment(): 'development' | 'production' | 'staging' {
    return this.config.app.environment;
  }

  get apiUrl(): string {
    return this.config.api.url;
  }

  get apiTimeout(): number {
    return this.config.api.timeout;
  }

  get isDevelopment(): boolean {
    return this.config.app.environment === 'development';
  }

  get isProduction(): boolean {
    return this.config.app.environment === 'production';
  }

  get isStaging(): boolean {
    return this.config.app.environment === 'staging';
  }

  // Feature flags
  get analyticsEnabled(): boolean {
    return this.config.features.analytics;
  }

  get debugEnabled(): boolean {
    return this.config.features.debug;
  }

  get tenantIsolationEnabled(): boolean {
    return this.config.features.tenantIsolation;
  }

  get resourceMonitoringEnabled(): boolean {
    return this.config.features.resourceMonitoring;
  }

  // Limits
  get maxFileSize(): number {
    return this.config.limits.maxFileSize;
  }

  get supportedFileTypes(): string[] {
    return this.config.limits.supportedFileTypes;
  }

  get autoRefreshInterval(): number {
    return this.config.limits.autoRefreshInterval;
  }

  // Utility methods
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    return this.config.features[feature];
  }

  getFullConfig(): AppConfig {
    return { ...this.config };
  }

  // Debugging helper
  logConfig(): void {
    if (this.debugEnabled) {
      console.group('🔧 Environment Configuration');
      console.log('Environment:', this.environment);
      console.log('API URL:', this.apiUrl);
      console.log('Features:', this.config.features);
      console.log('Limits:', this.config.limits);
      console.groupEnd();
    }
  }
}

// Create singleton instance
export const env = new EnvironmentConfig();

// Log configuration in development
if (env.isDevelopment) {
  env.logConfig();
}

// Export types
export type { AppConfig };
export default env;