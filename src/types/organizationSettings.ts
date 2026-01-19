/**
 * Organization Settings Types & Schemas
 *
 * Type definitions and Zod validation schemas for organization-wide settings.
 * All settings include updated_at for optimistic locking.
 */

import { z } from 'zod'

// ============================================================================
// General Settings
// ============================================================================

export const generalSettingsSchema = z.object({
  org_id: z.string().uuid(),
  organization_name: z.string().min(1, 'Organization name is required'),
  timezone: z.string().min(1, 'Timezone is required'),
  default_language: z.string().nullable().optional(),
  status: z.enum(['active', 'inactive']),
  updated_at: z.string(),
})

export type GeneralSettings = z.infer<typeof generalSettingsSchema>

export const DEFAULT_GENERAL_SETTINGS: Omit<GeneralSettings, 'org_id' | 'updated_at'> = {
  organization_name: '',
  timezone: 'America/New_York',
  default_language: null,
  status: 'active',
}

// ============================================================================
// Defaults Settings
// ============================================================================

export const defaultsSettingsSchema = z.object({
  org_id: z.string().uuid(),
  default_season_id: z.string().uuid().nullable().optional(),
  default_sport_id: z.string().uuid().nullable().optional(),
  default_program_id: z.string().uuid().nullable().optional(),
  default_level_id: z.string().uuid().nullable().optional(),
  default_event_types: z.array(z.string()).optional(),
  updated_at: z.string(),
})

export type DefaultsSettings = z.infer<typeof defaultsSettingsSchema>

export const DEFAULT_DEFAULTS_SETTINGS: Omit<DefaultsSettings, 'org_id' | 'updated_at'> = {
  default_season_id: null,
  default_sport_id: null,
  default_program_id: null,
  default_level_id: null,
  default_event_types: ['practice', 'game', 'meeting'],
}

// ============================================================================
// Attendance Settings
// ============================================================================

export const parentVisibilitySchema = z.object({
  can_view_own_child: z.boolean(),
  can_view_team_attendance: z.boolean(),
  can_submit_attendance: z.boolean(),
})

export const attendanceSettingsSchema = z.object({
  org_id: z.string().uuid(),
  required_for_practice: z.boolean(),
  required_for_game: z.boolean(),
  required_for_meeting: z.boolean(),
  submission_deadline_hours: z.number().int().min(0).max(168),
  lock_after_days: z.number().int().nullable().optional(),
  allow_admin_override: z.boolean(),
  enable_coach_reminders: z.boolean(),
  parent_visibility: parentVisibilitySchema.optional(),
  updated_at: z.string(),
})

export type AttendanceSettings = z.infer<typeof attendanceSettingsSchema>
export type ParentVisibility = z.infer<typeof parentVisibilitySchema>

export const DEFAULT_ATTENDANCE_SETTINGS: Omit<AttendanceSettings, 'org_id' | 'updated_at'> = {
  required_for_practice: false,
  required_for_game: true,
  required_for_meeting: false,
  submission_deadline_hours: 24,
  lock_after_days: null,
  allow_admin_override: true,
  enable_coach_reminders: false,
  parent_visibility: {
    can_view_own_child: true,
    can_view_team_attendance: false,
    can_submit_attendance: false,
  },
}

// ============================================================================
// Registration Settings
// ============================================================================

export const registrationSettingsSchema = z.object({
  org_id: z.string().uuid(),
  required_fields: z.array(z.string()).optional(),
  allow_players_without_guardians: z.boolean(),
  allow_guardian_self_invite: z.boolean(),
  medical_form_required: z.boolean(),
  updated_at: z.string(),
})

export type RegistrationSettings = z.infer<typeof registrationSettingsSchema>

export const DEFAULT_REGISTRATION_SETTINGS: Omit<RegistrationSettings, 'org_id' | 'updated_at'> = {
  required_fields: ['first_name', 'last_name', 'date_of_birth', 'email'],
  allow_players_without_guardians: false,
  allow_guardian_self_invite: true,
  medical_form_required: false,
}

// ============================================================================
// Visibility Settings
// ============================================================================

export const rolePermissionsSchema = z.record(
  z.string(),
  z.object({
    can_view_roster: z.boolean(),
    can_view_schedule: z.boolean(),
    can_view_attendance: z.boolean(),
    can_view_payments: z.boolean(),
    can_view_messages: z.boolean(),
    can_edit: z.boolean(),
  })
)

export const visibilitySettingsSchema = z.object({
  org_id: z.string().uuid(),
  role_permissions: rolePermissionsSchema.optional(),
  updated_at: z.string(),
})

export type VisibilitySettings = z.infer<typeof visibilitySettingsSchema>
export type RolePermissions = z.infer<typeof rolePermissionsSchema>

export const DEFAULT_VISIBILITY_SETTINGS: Omit<VisibilitySettings, 'org_id' | 'updated_at'> = {
  role_permissions: {
    admin: {
      can_view_roster: true,
      can_view_schedule: true,
      can_view_attendance: true,
      can_view_payments: true,
      can_view_messages: true,
      can_edit: true,
    },
    coach: {
      can_view_roster: true,
      can_view_schedule: true,
      can_view_attendance: true,
      can_view_payments: false,
      can_view_messages: true,
      can_edit: false,
    },
    parent: {
      can_view_roster: false,
      can_view_schedule: true,
      can_view_attendance: true,
      can_view_payments: true,
      can_view_messages: true,
      can_edit: false,
    },
  },
}

// ============================================================================
// Notification Settings
// ============================================================================

export const notificationSettingsSchema = z.object({
  org_id: z.string().uuid(),
  default_channels: z.array(z.enum(['email', 'sms', 'push', 'in_app'])).optional(),
  attendance_reminders_enabled: z.boolean(),
  schedule_change_alerts_enabled: z.boolean(),
  payment_reminder_behavior: z.enum(['immediate', 'daily_digest']),
  updated_at: z.string(),
})

export type NotificationSettings = z.infer<typeof notificationSettingsSchema>

export const DEFAULT_NOTIFICATION_SETTINGS: Omit<NotificationSettings, 'org_id' | 'updated_at'> = {
  default_channels: ['email', 'in_app'],
  attendance_reminders_enabled: true,
  schedule_change_alerts_enabled: true,
  payment_reminder_behavior: 'immediate',
}

// ============================================================================
// Advanced Settings
// ============================================================================

export const advancedSettingsSchema = z.object({
  org_id: z.string().uuid(),
  data_retention_days: z.number().int().nullable().optional(),
  enable_api_access: z.boolean(),
  api_rate_limit: z.number().int().nullable().optional(),
  allow_data_export: z.boolean(),
  updated_at: z.string(),
})

export type AdvancedSettings = z.infer<typeof advancedSettingsSchema>

export const DEFAULT_ADVANCED_SETTINGS: Omit<AdvancedSettings, 'org_id' | 'updated_at'> = {
  data_retention_days: null,
  enable_api_access: false,
  api_rate_limit: 1000,
  allow_data_export: true,
}

// ============================================================================
// Aggregate Type
// ============================================================================

export interface OrganizationSettings {
  general: GeneralSettings
  defaults: DefaultsSettings
  attendance: AttendanceSettings
  registration: RegistrationSettings
  visibility: VisibilitySettings
  notifications: NotificationSettings
  advanced: AdvancedSettings
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get default settings for a new organization
 */
export function getDefaultSettings(orgId: string, organizationName: string): OrganizationSettings {
  const now = new Date().toISOString()
  
  return {
    general: {
      org_id: orgId,
      organization_name: organizationName,
      ...DEFAULT_GENERAL_SETTINGS,
      updated_at: now,
    },
    defaults: {
      org_id: orgId,
      ...DEFAULT_DEFAULTS_SETTINGS,
      updated_at: now,
    },
    attendance: {
      org_id: orgId,
      ...DEFAULT_ATTENDANCE_SETTINGS,
      updated_at: now,
    },
    registration: {
      org_id: orgId,
      ...DEFAULT_REGISTRATION_SETTINGS,
      updated_at: now,
    },
    visibility: {
      org_id: orgId,
      ...DEFAULT_VISIBILITY_SETTINGS,
      updated_at: now,
    },
    notifications: {
      org_id: orgId,
      ...DEFAULT_NOTIFICATION_SETTINGS,
      updated_at: now,
    },
    advanced: {
      org_id: orgId,
      ...DEFAULT_ADVANCED_SETTINGS,
      updated_at: now,
    },
  }
}

/**
 * Settings that require impact checking before changes
 */
export const HIGH_IMPACT_SETTINGS = {
  registration: ['required_fields', 'allow_players_without_guardians'],
  attendance: ['required_for_practice', 'required_for_game', 'lock_after_days'],
  general: ['status'],
} as const

/**
 * Check if a setting change requires impact assessment
 */
export function requiresImpactCheck(
  section: keyof typeof HIGH_IMPACT_SETTINGS,
  field: string
): boolean {
  return HIGH_IMPACT_SETTINGS[section]?.includes(field as any) ?? false
}
