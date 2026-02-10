/**
 * Feature flags, entity types, status enums, and visibility options
 */

// Visibility options
export const VISIBILITY_OPTIONS = {
  PUBLIC: 'public',
  TEAM: 'team',
  PRIVATE: 'private',
} as const

export type Visibility = typeof VISIBILITY_OPTIONS[keyof typeof VISIBILITY_OPTIONS]

// Status enums
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  ARCHIVED: 'archived',
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  SCHEDULED: 'scheduled',
  IN_PROGRESS: 'in_progress',
} as const

export type Status = typeof STATUS[keyof typeof STATUS]

// Sort options
export const SORT_OPTIONS = {
  NEWEST: 'newest',
  OLDEST: 'oldest',
  ALPHABETICAL: 'alphabetical',
  MOST_PHOTOS: 'most_photos',
  RECENTLY_UPDATED: 'recently_updated',
} as const

export type SortOption = typeof SORT_OPTIONS[keyof typeof SORT_OPTIONS]

// Gallery enabled entities
export const GALLERY_ENABLED_ENTITIES = [
  'athlete',
  'team', 
  'event',
  'travel_plan',
  'program',
  'organization',
  'season',
] as const

export type GalleryEnabledEntity = typeof GALLERY_ENABLED_ENTITIES[number]

// Feature categories (from license tiers)
export const FEATURE_CATEGORIES = [
  'Scheduling & Calendar',
  'Teams & Rosters',
  'Messaging & Communication',
  'Payments',
  'Registration & Forms',
  'Tryouts',
  'Travel',
  'Uniforms & Gear',
  'Photo Galleries',
  'Video Library',
  'Reporting & Analytics',
  'Admin & Permissions',
  'Integrations',
  'Security & Compliance',
  'Support Tools',
] as const

export type FeatureCategory = typeof FEATURE_CATEGORIES[number]

// Feature types (from license tiers)
export const FEATURE_TYPES = [
  'module',
  'permission',
  'limit',
  'visibility',
  'integration',
] as const

export type FeatureType = typeof FEATURE_TYPES[number]

// Payment statuses
export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded',
  PARTIALLY_REFUNDED: 'partially_refunded',
} as const

export type PaymentStatus = typeof PAYMENT_STATUS[keyof typeof PAYMENT_STATUS]

// Fee statuses
export const FEE_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
} as const

export type FeeStatus = typeof FEE_STATUS[keyof typeof FEE_STATUS]

// Tryout statuses
export const TRYOUT_STATUS = {
  UPCOMING: 'upcoming',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export type TryoutStatus = typeof TRYOUT_STATUS[keyof typeof TRYOUT_STATUS]

// Travel plan statuses
export const TRAVEL_STATUS = {
  PLANNING: 'planning',
  CONFIRMED: 'confirmed',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const

export type TravelStatus = typeof TRAVEL_STATUS[keyof typeof TRAVEL_STATUS]

// Uniform statuses
export const UNIFORM_STATUS = {
  DRAFT: 'draft',
  OPEN_FOR_ORDERING: 'open_for_ordering',
  ORDERING_CLOSED: 'ordering_closed',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
} as const

export type UniformStatus = typeof UNIFORM_STATUS[keyof typeof UNIFORM_STATUS]

// Notification types
export const NOTIFICATION_TYPES = [
  'new_event',
  'new_message',
  'payment_receipt',
  'payment_reminder',
  'event_reminder',
  'registration_confirmation',
  'team_invite',
  'password_reset',
  'welcome_email',
  'photo_approved',
  'photo_rejected',
] as const

export type NotificationType = typeof NOTIFICATION_TYPES[number]

// Event log event types
export const EVENT_LOG_TYPES = [
  'USER_SIGNED_UP',
  'USER_LOGGED_IN',
  'USER_LOGGED_OUT',
  'PASSWORD_RESET_REQUESTED',
  'PASSWORD_RESET_COMPLETED',
  'EMAIL_VERIFIED',
  'EMAIL_VERIFICATION_SENT',
  'ACCOUNT_DISABLED',
  'ACCOUNT_ENABLED',
  'ORGANIZATION_CREATED',
  'ORGANIZATION_UPDATED',
  'TEAM_CREATED',
  'TEAM_UPDATED',
  'ATHLETE_ADDED',
  'ATHLETE_UPDATED',
  'PHOTO_UPLOADED',
  'PHOTO_APPROVED',
  'PHOTO_REJECTED',
  'PAYMENT_RECEIVED',
  'FEE_CREATED',
  'TRYOUT_CREATED',
  'TRAVEL_PLAN_CREATED',
  'MESSAGE_SENT',
  'ANNOUNCEMENT_CREATED',
] as const

export type EventLogType = typeof EVENT_LOG_TYPES[number]
