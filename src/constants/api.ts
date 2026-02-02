/**
 * API-related constants
 */

// Environment variable names (for reference - actual values come from import.meta.env)
export const ENV_VAR_NAMES = {
  SUPABASE_URL: 'VITE_SUPABASE_URL',
  SUPABASE_ANON_KEY: 'VITE_SUPABASE_ANON_KEY',
  STREAM_API_KEY: 'VITE_STREAM_API_KEY',
  RESEND_API_KEY: 'VITE_RESEND_API_KEY',
  GOOGLE_PLACES_API_KEY: 'VITE_GOOGLE_PLACES_API_KEY',
  GOOGLE_MAPS_API_URL: 'VITE_GOOGLE_MAPS_API_URL',
  PLATFORM_URL: 'VITE_PLATFORM_URL',
  EMAIL_FROM_ADDRESS: 'VITE_EMAIL_FROM_ADDRESS',
  STRIPE_DASHBOARD_URL: 'VITE_STRIPE_DASHBOARD_URL',
  DEV_SERVER_HOST: 'VITE_DEV_SERVER_HOST',
  DEV_SERVER_PORT: 'VITE_DEV_SERVER_PORT',
  FEES_TEST_SUCCESS_URL: 'VITE_FEES_TEST_SUCCESS_URL',
  FEES_TEST_CANCEL_URL: 'VITE_FEES_TEST_CANCEL_URL',
} as const

// API timeouts and retry configuration
export const API_TIMEOUT_MS = 30000
export const API_RETRY_ATTEMPTS = 3
export const API_RETRY_DELAY_MS = 1000

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const

// External service URLs
export const EXTERNAL_URLS = {
  GOOGLE_MAPS: 'https://maps.googleapis.com/maps/api/js',
  GOOGLE_MAPS_SEARCH: 'https://www.google.com/maps/search/',
  GOOGLE_FONTS: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Oswald:wght@500;600;700&family=Roboto+Mono:wght@400;500&display=swap',
  STRIPE_DASHBOARD: 'https://dashboard.stripe.com/connect/accounts',
  PLATFORM: 'https://platform.youthsports.team',
} as const

// API key validation
export const GOOGLE_API_KEY_MIN_LENGTH = 20

// Supabase Edge Functions
export const SUPABASE_FUNCTIONS = {
  BILLING_CREATE_CHECKOUT_SESSION: 'billing-create-checkout-session',
  BILLING_CUSTOMER_PORTAL: 'billing-customer-portal',
  PARENT_CREATE_CHECKOUT_SESSION: 'parent-create-checkout-session',
  ADMIN_CREATE_USER: 'admin-create-user',
  ADMIN_CREATE_FEE: 'admin-create-fee',
} as const

// Query configuration
export const QUERY_CONFIG = {
  STALE_TIME_MS: 5 * 60 * 1000, // 5 minutes
  RETRY_COUNT: 1,
  REFETCH_ON_WINDOW_FOCUS: false,
} as const

// Cache TTLs
export const CACHE_TTL = {
  FEATURE_GATE_MS: 30000, // 30 seconds
  ORG_RESOLUTION_MS: 5 * 60 * 1000, // 5 minutes
  FIELD_DEFINITIONS_MS: 60 * 60 * 1000, // 1 hour
  VENUE_INSIGHTS_MS: 5 * 60 * 1000, // 5 minutes
  NEARBY_AMENITIES_MS: 5 * 60 * 1000, // 5 minutes
} as const

// Google Maps retry configuration
export const GOOGLE_MAPS_RETRY = {
  MAX_ATTEMPTS: 50,
  MAX_ATTEMPTS_LONG: 100,
  CHECK_INTERVAL_MS: 100,
} as const
