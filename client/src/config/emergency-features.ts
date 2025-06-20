
// Emergency Feature Disabling
export const EMERGENCY_FEATURE_CONFIG = {
  relationship_mapping: false,
  advanced_analytics: false,  
  excel_processing: false,
  real_time_updates: false,
  background_sync: false,
  auto_refresh: false,
  notifications: false,
  websockets: false
};

// Override feature flags during emergency
export const isFeatureEnabled = (feature: string): boolean => {
  if (EMERGENCY_FEATURE_CONFIG.hasOwnProperty(feature)) {
    return EMERGENCY_FEATURE_CONFIG[feature];
  }
  return false; // Default to disabled during emergency
};
