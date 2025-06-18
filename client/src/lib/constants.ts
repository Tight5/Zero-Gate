/**
 * Application constants with strict type safety
 * Centralized configuration for the Zero Gate ESO Platform
 */

import env from '../config/env';

// Application metadata
export const APP_METADATA = {
  name: env.appTitle,
  version: env.appVersion,
  description: 'Comprehensive multi-tenant Executive Service Organization management platform',
  author: 'Zero Gate Technologies',
  repository: 'https://github.com/zerogate/eso-platform',
} as const;

// API configuration
export const API_CONFIG = {
  baseUrl: env.apiUrl,
  timeout: env.apiTimeout,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

// File upload constraints
export const FILE_CONSTRAINTS = {
  maxSize: env.maxFileSize,
  supportedTypes: env.supportedFileTypes,
  maxFiles: 10,
} as const;

// Pagination defaults
export const PAGINATION = {
  defaultPageSize: 20,
  maxPageSize: 100,
  pageSizeOptions: [10, 20, 50, 100],
} as const;

// Feature flags
export const FEATURES = {
  analytics: env.analyticsEnabled,
  debug: env.debugEnabled,
  tenantIsolation: env.tenantIsolationEnabled,
  resourceMonitoring: env.resourceMonitoringEnabled,
} as const;

// Resource monitoring thresholds
export const RESOURCE_THRESHOLDS = {
  optimal: 70,
  warning: 85,
  critical: 95,
  emergency: 98,
} as const;

// Refresh intervals (in milliseconds) - optimized for memory conservation
export const REFRESH_INTERVALS = {
  metrics: 15000, // 15 seconds (reduced from 5s)
  dashboard: 60000, // 60 seconds (reduced from 30s)
  notifications: 120000, // 2 minutes (reduced from 1m)
  health: 20000, // 20 seconds (reduced from 10s)
} as const;

// Route paths
export const ROUTES = {
  public: {
    home: '/',
    login: '/api/login',
    logout: '/api/logout',
  },
  protected: {
    dashboard: '/dashboard',
    sponsors: '/sponsors',
    grants: '/grants',
    relationships: '/relationships',
    contentCalendar: '/content-calendar',
    settings: '/settings',
    tenantSelection: '/tenant-selection',
  },
  api: {
    auth: '/api/auth',
    tenants: '/api/tenants',
    dashboard: '/api/dashboard',
    sponsors: '/api/sponsors',
    grants: '/api/grants',
    relationships: '/api/relationships',
    workflows: '/api/workflows',
    processing: '/api/processing',
    integration: '/api/integration',
  },
} as const;

// Theme configuration
export const THEME_CONFIG = {
  defaultTheme: 'system' as const,
  storageKey: 'theme',
  transitions: {
    duration: '0.2s',
    easing: 'ease',
  },
} as const;

// Notification types and configuration
export const NOTIFICATIONS = {
  types: {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
  },
  duration: {
    success: 4000,
    error: 6000,
    warning: 5000,
    info: 4000,
  },
  maxVisible: 3,
} as const;

// Form validation patterns
export const VALIDATION_PATTERNS = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^\+?[\d\s\-\(\)]+$/,
  url: /^https?:\/\/.+/,
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
} as const;

// Status definitions
export const STATUS_LEVELS = {
  optimal: {
    label: 'Optimal',
    color: 'green',
    description: 'System running normally',
  },
  warning: {
    label: 'Warning',
    color: 'yellow',
    description: 'Moderate resource usage detected',
  },
  critical: {
    label: 'Critical',
    color: 'red',
    description: 'High resource usage may impact performance',
  },
  emergency: {
    label: 'Emergency',
    color: 'red',
    description: 'Critical system resources detected',
  },
} as const;

// Grant timeline milestones
export const GRANT_MILESTONES = {
  application: {
    days: [90, 60, 30, 14, 7, 1],
    labels: ['Initial Review', 'Documentation', 'Final Preparation', 'Last Review', 'Final Check', 'Submission'],
  },
  review: {
    days: [30, 14, 7, 1],
    labels: ['Initial Review', 'Follow-up', 'Final Review', 'Decision'],
  },
} as const;

// Sponsor tiers and classifications
export const SPONSOR_TIERS = {
  platinum: {
    label: 'Platinum',
    minAmount: 100000,
    color: 'purple',
    benefits: ['Priority Support', 'Exclusive Events', 'Direct Access'],
  },
  gold: {
    label: 'Gold',
    minAmount: 50000,
    color: 'yellow',
    benefits: ['Enhanced Support', 'Special Events', 'Regular Updates'],
  },
  silver: {
    label: 'Silver',
    minAmount: 25000,
    color: 'gray',
    benefits: ['Standard Support', 'Quarterly Updates'],
  },
  bronze: {
    label: 'Bronze',
    minAmount: 10000,
    color: 'orange',
    benefits: ['Basic Support', 'Annual Updates'],
  },
  supporter: {
    label: 'Supporter',
    minAmount: 1000,
    color: 'blue',
    benefits: ['Newsletter', 'Community Access'],
  },
} as const;

// Relationship types and strengths
export const RELATIONSHIP_TYPES = {
  direct: { label: 'Direct', weight: 1.0, color: 'green' },
  indirect: { label: 'Indirect', weight: 0.7, color: 'blue' },
  professional: { label: 'Professional', weight: 0.8, color: 'purple' },
  personal: { label: 'Personal', weight: 0.9, color: 'pink' },
  organizational: { label: 'Organizational', weight: 0.6, color: 'orange' },
} as const;

// Content calendar categories
export const CONTENT_CATEGORIES = {
  announcement: { label: 'Announcement', color: 'blue' },
  event: { label: 'Event', color: 'green' },
  milestone: { label: 'Milestone', color: 'purple' },
  deadline: { label: 'Deadline', color: 'red' },
  followUp: { label: 'Follow-up', color: 'orange' },
  meeting: { label: 'Meeting', color: 'yellow' },
} as const;

// Export type definitions for type safety
export type StatusLevel = keyof typeof STATUS_LEVELS;
export type SponsorTier = keyof typeof SPONSOR_TIERS;
export type RelationshipType = keyof typeof RELATIONSHIP_TYPES;
export type ContentCategory = keyof typeof CONTENT_CATEGORIES;
export type NotificationType = keyof typeof NOTIFICATIONS.types;