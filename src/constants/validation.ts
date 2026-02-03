/**
 * Validation rules, limits, and regex patterns
 */

// Validation limits
export const VALIDATION = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  EMAIL_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  DESCRIPTION_MAX_LENGTH: 1000,
  BIO_MAX_LENGTH: 500,
  PHONE_MAX_LENGTH: 20,
  JERSEY_NUMBER_MAX: 99,
  YEARS_EXPERIENCE_MAX: 50,
} as const

// Regex patterns
export const REGEX_PATTERNS = {
  EMAIL: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
  PHONE: /^\+?[\d\s\-()]+$/,
  URL: /^https?:\/\/.+/,
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  JERSEY_NUMBER: /^\d{1,2}$/,
  ZIP_US: /^[0-9]{5}(-[0-9]{4})?$/,
} as const

// File size limits (in bytes)
export const FILE_LIMITS = {
  MAX_UPLOAD_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_AVATAR_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  MAX_PHOTO_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  MAX_SPORTS_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  MAX_TRAVEL_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10MB
  MAX_UNIFORM_FILE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
  PHOTO_NORMALIZATION_THRESHOLD_BYTES: 2 * 1024 * 1024, // 2MB
} as const

// File count limits
export const FILE_COUNT_LIMITS = {
  MAX_BULK_UPLOAD_COUNT: 50,
  MAX_GALLERY_PHOTOS: 500,
} as const

// Time limits
export const TIME_LIMITS = {
  MESSAGE_EDIT_MS: 5 * 60 * 1000, // 5 minutes
  GUARDIAN_CLAIM_EXPIRY_DAYS: 30,
  SIGNED_URL_EXPIRY_MINUTES: 10,
} as const

// Pagination limits
export const PAGINATION_LIMITS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MIN_PAGE_SIZE: 1,
} as const
