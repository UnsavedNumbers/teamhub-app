/**
 * Role names, permission keys, and access control constants
 */

// Role names (matching database values)
export const ROLES = {
  ORG_ADMIN: 'org_admin',
  COACH: 'coach',
  TEAM_MANAGER: 'team_manager',
  ATHLETE: 'athlete',
  PARENT: 'parent',
  FAN: 'fan',
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
  [ROLES.FAN]: 'Fan',
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
