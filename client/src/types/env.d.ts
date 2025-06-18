/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_TITLE: string;
  readonly VITE_APP_VERSION: string;
  readonly VITE_API_URL: string;
  readonly VITE_ENVIRONMENT: 'development' | 'production' | 'staging';
  readonly VITE_ENABLE_ANALYTICS: string;
  readonly VITE_ENABLE_DEBUG: string;
  readonly VITE_FEATURE_FLAGS: string;
  readonly VITE_MAX_FILE_SIZE: string;
  readonly VITE_SUPPORTED_FILE_TYPES: string;
  readonly VITE_TENANT_ISOLATION: string;
  readonly VITE_RESOURCE_MONITORING: string;
  readonly VITE_AUTO_REFRESH_INTERVAL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global environment configuration
declare global {
  interface Window {
    __APP_CONFIG__: {
      apiUrl: string;
      environment: string;
      version: string;
      features: Record<string, boolean>;
    };
  }
}

export {};