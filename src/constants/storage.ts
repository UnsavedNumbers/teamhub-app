/**
 * Storage keys for localStorage, sessionStorage, and other storage mechanisms
 */

// Authentication storage
export const STORAGE_KEYS = {
  // Auth session
  AUTH_SESSION: 'youthsports-auth',
  AUTH_TOKEN: 'youthsports-auth-token',
  AUTH_REFRESH_TOKEN: 'youthsports-refresh-token',
  
  // Organization context
  SETUP_ORGANIZATION: 'youthsports_setup_organization',
  SELECTED_ORG_ID: 'youthsports-selected-org-id',
  
  // User preferences
  THEME_PREFERENCE: 'youthsports-theme-preference',
  LANGUAGE_PREFERENCE: 'youthsports-language',
  SIDEBAR_COLLAPSED: 'youthsports-sidebar-collapsed',
  
  // Feature flags cache
  FEATURE_FLAGS_CACHE: 'youthsports-feature-flags-cache',
  FEATURE_FLAGS_CACHE_TIMESTAMP: 'youthsports-feature-flags-cache-timestamp',
  
  // Navigation
  LAST_ROUTE: 'youthsports-last-route',
  BACK_ROUTE_STACK: 'youthsports-back-route-stack',
  
  // Form data
  DRAFT_FORM_DATA: 'youthsports-draft-form-data',
  FORM_AUTOSAVE: 'youthsports-form-autosave',
  
  // Cache
  ORG_RESOLUTION_CACHE: 'youthsports-org-resolution-cache',
  SPORT_FIELD_DEFINITIONS_CACHE: 'youthsports-sport-field-definitions-cache',
  
  // Demo mode
  FAKE_DATA_MODE: 'youthsports-fake-data-mode',
} as const

// Storage expiry times (in milliseconds)
export const STORAGE_EXPIRY = {
  AUTH_SESSION: 7 * 24 * 60 * 60 * 1000, // 7 days
  FEATURE_FLAGS_CACHE: 5 * 60 * 1000, // 5 minutes
  ORG_RESOLUTION_CACHE: 5 * 60 * 1000, // 5 minutes
  SPORT_FIELD_DEFINITIONS_CACHE: 60 * 60 * 1000, // 1 hour
  FORM_AUTOSAVE: 30 * 60 * 1000, // 30 minutes
} as const

// Storage size limits (in bytes)
export const STORAGE_LIMITS = {
  LOCAL_STORAGE_MAX: 5 * 1024 * 1024, // 5MB
  SESSION_STORAGE_MAX: 5 * 1024 * 1024, // 5MB
} as const

// Storage strategies
export const STORAGE_STRATEGIES = {
  SESSION: 'sessionStorage',
  LOCAL: 'localStorage',
  MEMORY: 'memory',
} as const

// Cache keys with versioning (to invalidate on app updates)
export const CACHE_VERSION = '1.0.0'

export const VERSIONED_CACHE_KEYS = {
  FEATURE_FLAGS: `youthsports-feature-flags-cache-v${CACHE_VERSION}`,
  ORG_RESOLUTION: `youthsports-org-resolution-cache-v${CACHE_VERSION}`,
  SPORT_FIELD_DEFINITIONS: `youthsports-sport-field-definitions-cache-v${CACHE_VERSION}`,
} as const
