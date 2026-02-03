/**
 * Database field names, table names, and entity types
 */

// Table names
export const TABLE_NAMES = {
  USERS: 'users',
  ORGANIZATIONS: 'organizations',
  ORGANIZATION_MEMBERS: 'organization_members',
  TEAMS: 'teams',
  ATHLETES: 'athletes',
  EVENTS: 'events',
  GALLERIES: 'galleries',
  PHOTOS: 'photos',
  FEES: 'fees',
  FEE_ASSIGNMENTS: 'fee_assignments',
  PAYMENTS: 'payments',
  BILLING_EVENTS: 'billing_events',
  SEASONS: 'seasons',
  PROGRAMS: 'programs',
  LEVELS: 'levels',
  TRAVEL_PLANS: 'travel_plans',
  TRYOUTS: 'tryouts',
  UNIFORMS: 'uniforms',
  UNIFORM_ORDERS: 'uniform_orders',
  ANNOUNCEMENTS: 'announcements',
  MESSAGES: 'messages',
  FAMILIES: 'families',
  CHILDREN: 'children',
  FEATURE_FLAGS: 'feature_flags',
  FEATURE_FLAG_PLATFORM_DEFAULTS: 'feature_flag_platform_defaults',
  FEATURE_FLAG_ORG_OVERRIDES: 'feature_flag_org_overrides',
  FEATURE_FLAG_USER_OVERRIDES: 'feature_flag_user_overrides',
  FAN_ORG_FOLLOWS: 'fan_org_follows',
  FAN_EVENT_BOOKMARKS: 'fan_event_bookmarks',
  PURCHASES: 'purchases',
  TICKET_RESERVATIONS: 'ticket_reservations',
  FAN_CALENDAR_CACHE: 'fan_calendar_cache',
  ORG_USER_AUDIT_LOG: 'org_user_audit_log',
} as const

// Entity types
export const ENTITY_TYPES = {
  ATHLETE: 'athlete',
  TEAM: 'team',
  EVENT: 'event',
  TRAVEL_PLAN: 'travel_plan',
  SEASON: 'season',
  PROGRAM: 'program',
  ORGANIZATION: 'organization',
  GALLERY: 'gallery',
  PHOTO: 'photo',
  FEE: 'fee',
  PAYMENT: 'payment',
  TRYOUT: 'tryout',
  UNIFORM: 'uniform',
} as const

export type EntityType = typeof ENTITY_TYPES[keyof typeof ENTITY_TYPES]

// Role names
// NOTE: FAN is NOT a role - it's a baseline capability for all authenticated users
export const ROLES = {
  ORG_ADMIN: 'org_admin',
  COACH: 'coach',
  TEAM_MANAGER: 'team_manager',
  ATHLETE: 'athlete',
  PARENT: 'parent',
  STAFF: 'staff',
  PLATFORM_ADMIN: 'platform_admin',
} as const

export type Role = typeof ROLES[keyof typeof ROLES]

// License plans
export const LICENSE_PLANS = {
  STARTER: 'starter',
  PRO: 'pro',
  ENTERPRISE: 'enterprise',
} as const

export type LicensePlan = typeof LICENSE_PLANS[keyof typeof LICENSE_PLANS]

// Fee types
export const FEE_TYPES = {
  REGISTRATION: 'registration',
  UNIFORM: 'uniform',
  TOURNAMENT: 'tournament',
  TRAVEL: 'travel',
  FUNDRAISER: 'fundraiser',
  MISC: 'misc',
} as const

export type FeeType = typeof FEE_TYPES[keyof typeof FEE_TYPES]

// Fee scopes
export const FEE_SCOPES = {
  TEAM: 'team',
  INDIVIDUAL: 'individual',
  SELECTED_PLAYERS: 'selected_players',
} as const

export type FeeScope = typeof FEE_SCOPES[keyof typeof FEE_SCOPES]

// Event types
export const EVENT_TYPES = {
  GAME: 'game',
  PRACTICE: 'practice',
  TOURNAMENT: 'tournament',
  MEETING: 'meeting',
  OTHER: 'other',
} as const

export type EventType = typeof EVENT_TYPES[keyof typeof EVENT_TYPES]

// Event visibility levels
export const EVENT_VISIBILITY = {
  PUBLIC: 'public',
  UNLISTED: 'unlisted',
  MEMBERS: 'members',
  TICKET_HOLDERS: 'ticket_holders',
  PRIVATE: 'private',
} as const

export type EventVisibility = typeof EVENT_VISIBILITY[keyof typeof EVENT_VISIBILITY]
