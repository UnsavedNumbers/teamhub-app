/**
 * Role names, permission keys, and access control constants
 */

// Role names (matching database values)
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

// Role display names (for UI)
export const ROLE_DISPLAY_NAMES = {
  [ROLES.ORG_ADMIN]: 'Organization Admin',
  [ROLES.COACH]: 'Coach',
  [ROLES.TEAM_MANAGER]: 'Team Manager',
  [ROLES.ATHLETE]: 'Athlete',
  [ROLES.PARENT]: 'Parent/Guardian',
  [ROLES.STAFF]: 'Staff',
  [ROLES.PLATFORM_ADMIN]: 'Platform Admin',
} as const

// Allowed roles for user creation
export const USER_CREATION_ROLES = ['parent', 'coach', 'admin'] as const

// Allowed roles for admin access
export const ADMIN_ACCESS_ROLES = ['admin', 'org_admin', 'coach'] as const

// Permission keys (for future implementation)
export const PERMISSIONS = {
  // Gallery permissions
  GALLERY_CREATE: 'gallery:create',
  GALLERY_EDIT: 'gallery:edit',
  GALLERY_DELETE: 'gallery:delete',
  GALLERY_MANAGE: 'gallery:manage',
  
  // Photo permissions
  PHOTO_UPLOAD: 'photo:upload',
  PHOTO_DELETE: 'photo:delete',
  PHOTO_MODERATE: 'photo:moderate',
  PHOTO_APPROVE: 'photo:approve',
  PHOTO_REJECT: 'photo:reject',
  
  // Team permissions
  TEAM_MANAGE: 'team:manage',
  TEAM_CREATE: 'team:create',
  TEAM_DELETE: 'team:delete',
  TEAM_EDIT: 'team:edit',
  
  // Athlete permissions
  ATHLETE_MANAGE: 'athlete:manage',
  ATHLETE_CREATE: 'athlete:create',
  ATHLETE_EDIT: 'athlete:edit',
  ATHLETE_DELETE: 'athlete:delete',
  ATHLETE_IMPORT: 'athlete:import',
  
  // Event permissions
  EVENT_MANAGE: 'event:manage',
  EVENT_CREATE: 'event:create',
  EVENT_EDIT: 'event:edit',
  EVENT_DELETE: 'event:delete',
  EVENT_ATTENDANCE: 'event:attendance',
  
  // Payment permissions
  PAYMENT_MANAGE: 'payment:manage',
  PAYMENT_VIEW: 'payment:view',
  PAYMENT_CREATE_FEE: 'payment:create_fee',
  PAYMENT_VIEW_HISTORY: 'payment:view_history',
  
  // Organization permissions
  ORG_MANAGE: 'org:manage',
  ORG_SETTINGS: 'org:settings',
  ORG_USERS: 'org:users',
  ORG_BILLING: 'org:billing',
  ORG_SPORTS: 'org:sports',
  
  // Platform admin permissions
  PLATFORM_MANAGE_ORGS: 'platform:manage_orgs',
  PLATFORM_MANAGE_USERS: 'platform:manage_users',
  PLATFORM_MANAGE_LICENSES: 'platform:manage_licenses',
  PLATFORM_MANAGE_FEATURES: 'platform:manage_features',
  PLATFORM_VIEW_AUDIT: 'platform:view_audit',
  PLATFORM_MANAGE_PHOTOS: 'platform:manage_photos',
  PLATFORM_MANAGE_TICKETING: 'platform:manage_ticketing',
  
  // Staff permissions (per-org configurable)
  STAFF_SCAN_TICKETS: 'can_scan_tickets',
  STAFF_VIEW_ATTENDEES: 'can_view_attendees',
  STAFF_MANAGE_EVENTS: 'can_manage_events',
  STAFF_VIEW_FINANCIALS: 'can_view_financials',
  STAFF_MANAGE_ROSTER: 'can_manage_roster',
  STAFF_SEND_NOTIFICATIONS: 'can_send_notifications',
  STAFF_MANAGE_STAFF: 'can_manage_staff',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

// Message permissions
export const MESSAGE_PERMISSIONS = {
  CAN_DELETE_MESSAGE: 'can_delete_message',
  CAN_EDIT_MESSAGE: 'can_edit_message',
  CAN_PIN_MESSAGE: 'can_pin_message',
  CAN_MUTE_CHANNEL: 'can_mute_channel',
} as const

// Message edit time limit (5 minutes in milliseconds)
export const MESSAGE_EDIT_TIME_LIMIT_MS = 5 * 60 * 1000

// Event visibility levels
export const EVENT_VISIBILITY = {
  PUBLIC: 'public',
  UNLISTED: 'unlisted',
  MEMBERS: 'members',
  TICKET_HOLDERS: 'ticket_holders',
  PRIVATE: 'private',
} as const

export type EventVisibility = typeof EVENT_VISIBILITY[keyof typeof EVENT_VISIBILITY]

// Default staff permissions (can be overridden per org)
export const DEFAULT_STAFF_PERMISSIONS = {
  [PERMISSIONS.STAFF_SCAN_TICKETS]: true,
  [PERMISSIONS.STAFF_VIEW_ATTENDEES]: true,
  [PERMISSIONS.STAFF_MANAGE_EVENTS]: false,
  [PERMISSIONS.STAFF_VIEW_FINANCIALS]: false,
  [PERMISSIONS.STAFF_MANAGE_ROSTER]: false,
  [PERMISSIONS.STAFF_SEND_NOTIFICATIONS]: false,
  [PERMISSIONS.STAFF_MANAGE_STAFF]: false,
} as const
