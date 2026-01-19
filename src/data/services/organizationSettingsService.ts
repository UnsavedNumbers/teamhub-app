/**
 * Organization Settings Service
 *
 * Provides CRUD operations for organization-wide settings.
 * Implements optimistic locking, default value handling, and impact checking.
 */

import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import type { UserContext } from '../fake/userContext'
import type {
  OrganizationSettings,
  GeneralSettings,
  DefaultsSettings,
  AttendanceSettings,
  RegistrationSettings,
  VisibilitySettings,
  NotificationSettings,
  AdvancedSettings,
} from '../../types/organizationSettings'
import {
  getDefaultSettings,
  generalSettingsSchema,
  defaultsSettingsSchema,
  attendanceSettingsSchema,
  registrationSettingsSchema,
  visibilitySettingsSchema,
  notificationSettingsSchema,
  advancedSettingsSchema,
} from '../../types/organizationSettings'

// ============================================================================
// Get Operations
// ============================================================================

/**
 * Get all settings for an organization
 * Returns default values if records don't exist (Issue 9)
 */
export async function getOrganizationSettings(
  context: UserContext
): Promise<{ data: OrganizationSettings | null; error: Error | null }> {
  try {
    // Fetch all settings tables in parallel
    const [general, defaults, attendance, registration, visibility, notifications, advanced] =
      await Promise.all([
        getGeneralSettings(context),
        getDefaultsSettings(context),
        getAttendanceSettings(context),
        getRegistrationSettings(context),
        getVisibilitySettings(context),
        getNotificationSettings(context),
        getAdvancedSettings(context),
      ])

    // Check for errors
    const errors = [
      general.error,
      defaults.error,
      attendance.error,
      registration.error,
      visibility.error,
      notifications.error,
      advanced.error,
    ].filter(Boolean)

    if (errors.length > 0) {
      console.error('[organizationSettingsService] Errors loading settings:', errors)
      return { data: null, error: errors[0] as Error }
    }

    // Return aggregate
    return {
      data: {
        general: general.data!,
        defaults: defaults.data!,
        attendance: attendance.data!,
        registration: registration.data!,
        visibility: visibility.data!,
        notifications: notifications.data!,
        advanced: advanced.data!,
      },
      error: null,
    }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting organization settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getGeneralSettings(
  context: UserContext
): Promise<{ data: GeneralSettings | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organization_settings' as any)
      .select('*')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    // Return defaults if not found (Issue 9)
    if (!data) {
      const orgName = context.organizationName || 'My Organization'
      const defaults = getDefaultSettings(context.orgId, orgName)
      return { data: defaults.general, error: null }
    }

    // Map database columns to type
    const settings: GeneralSettings = {
      org_id: data.org_id,
      organization_name: data.organization_name,
      timezone: data.timezone,
      default_language: data.default_language,
      theme_id: data.theme_id || null,
      status: data.status,
      updated_at: data.updated_at,
    }

    return { data: settings, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting general settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getDefaultsSettings(
  context: UserContext
): Promise<{ data: DefaultsSettings | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organization_defaults' as any)
      .select('*')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const defaults = getDefaultSettings(context.orgId, '')
      return { data: defaults.defaults, error: null }
    }

    const settings: DefaultsSettings = {
      org_id: data.org_id,
      default_season_id: data.default_season_id,
      default_sport_id: data.default_sport_id,
      default_program_id: data.default_program_id,
      default_level_id: data.default_level_id,
      default_event_types: data.default_event_types,
      updated_at: data.updated_at,
    }

    return { data: settings, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting defaults settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getAttendanceSettings(
  context: UserContext
): Promise<{ data: AttendanceSettings | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organization_attendance_settings' as any)
      .select('*')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const defaults = getDefaultSettings(context.orgId, '')
      return { data: defaults.attendance, error: null }
    }

    const settings: AttendanceSettings = {
      org_id: data.org_id,
      required_for_practice: data.required_for_practice,
      required_for_game: data.required_for_game,
      required_for_meeting: data.required_for_meeting,
      submission_deadline_hours: data.submission_deadline_hours,
      lock_after_days: data.lock_after_days,
      allow_admin_override: data.allow_admin_override,
      enable_coach_reminders: data.enable_coach_reminders,
      parent_visibility: data.parent_visibility,
      updated_at: data.updated_at,
    }

    return { data: settings, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting attendance settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getRegistrationSettings(
  context: UserContext
): Promise<{ data: RegistrationSettings | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organization_registration_settings' as any)
      .select('*')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const defaults = getDefaultSettings(context.orgId, '')
      return { data: defaults.registration, error: null }
    }

    const settings: RegistrationSettings = {
      org_id: data.org_id,
      required_fields: data.required_fields,
      allow_players_without_guardians: data.allow_players_without_guardians,
      allow_guardian_self_invite: data.allow_guardian_self_invite,
      medical_form_required: data.medical_form_required,
      updated_at: data.updated_at,
    }

    return { data: settings, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting registration settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getVisibilitySettings(
  context: UserContext
): Promise<{ data: VisibilitySettings | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organization_visibility_settings' as any)
      .select('*')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const defaults = getDefaultSettings(context.orgId, '')
      return { data: defaults.visibility, error: null }
    }

    const settings: VisibilitySettings = {
      org_id: data.org_id,
      role_permissions: data.role_permissions,
      updated_at: data.updated_at,
    }

    return { data: settings, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting visibility settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getNotificationSettings(
  context: UserContext
): Promise<{ data: NotificationSettings | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organization_notification_settings' as any)
      .select('*')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const defaults = getDefaultSettings(context.orgId, '')
      return { data: defaults.notifications, error: null }
    }

    const settings: NotificationSettings = {
      org_id: data.org_id,
      default_channels: data.default_channels,
      attendance_reminders_enabled: data.attendance_reminders_enabled,
      schedule_change_alerts_enabled: data.schedule_change_alerts_enabled,
      payment_reminder_behavior: data.payment_reminder_behavior,
      updated_at: data.updated_at,
    }

    return { data: settings, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting notification settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getAdvancedSettings(
  context: UserContext
): Promise<{ data: AdvancedSettings | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organization_advanced_settings' as any)
      .select('*')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const defaults = getDefaultSettings(context.orgId, '')
      return { data: defaults.advanced, error: null }
    }

    const settings: AdvancedSettings = {
      org_id: data.org_id,
      data_retention_days: data.data_retention_days,
      enable_api_access: data.enable_api_access,
      api_rate_limit: data.api_rate_limit,
      allow_data_export: data.allow_data_export,
      updated_at: data.updated_at,
    }

    return { data: settings, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting advanced settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

// ============================================================================
// Update Operations (with optimistic locking - Issue 7)
// ============================================================================

export async function updateGeneralSettings(
  context: UserContext,
  settings: Partial<GeneralSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) return { error: null }
  try {
    // Validate with Zod
    const validated = generalSettingsSchema.partial().parse(settings)

    const { error } = await supabase
      .from('organization_settings' as any)
      .upsert(
        {
          org_id: context.orgId,
          ...validated,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'org_id',
        }
      )
      .eq('org_id', context.orgId)
      .eq('updated_at', currentUpdatedAt)

    if (error) {
      // Check for optimistic locking failure
      if (error.message.includes('updated_at')) {
        throw new Error('Settings were modified by another user. Please refresh and try again.')
      }
      throw error
    }

    return { error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error updating general settings:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateDefaultsSettings(
  context: UserContext,
  settings: Partial<DefaultsSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) return { error: null }
  try {
    const validated = defaultsSettingsSchema.partial().parse(settings)

    const { error } = await supabase
      .from('organization_defaults' as any)
      .upsert(
        {
          org_id: context.orgId,
          ...validated,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'org_id',
        }
      )
      .eq('org_id', context.orgId)
      .eq('updated_at', currentUpdatedAt)

    if (error) {
      if (error.message.includes('updated_at')) {
        throw new Error('Settings were modified by another user. Please refresh and try again.')
      }
      throw error
    }

    return { error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error updating defaults settings:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateAttendanceSettings(
  context: UserContext,
  settings: Partial<AttendanceSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) return { error: null }
  try {
    const validated = attendanceSettingsSchema.partial().parse(settings)

    const { error } = await supabase
      .from('organization_attendance_settings' as any)
      .upsert(
        {
          org_id: context.orgId,
          ...validated,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'org_id',
        }
      )
      .eq('org_id', context.orgId)
      .eq('updated_at', currentUpdatedAt)

    if (error) {
      if (error.message.includes('updated_at')) {
        throw new Error('Settings were modified by another user. Please refresh and try again.')
      }
      throw error
    }

    return { error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error updating attendance settings:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateRegistrationSettings(
  context: UserContext,
  settings: Partial<RegistrationSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) return { error: null }
  try {
    const validated = registrationSettingsSchema.partial().parse(settings)

    const { error } = await supabase
      .from('organization_registration_settings' as any)
      .upsert(
        {
          org_id: context.orgId,
          ...validated,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'org_id',
        }
      )
      .eq('org_id', context.orgId)
      .eq('updated_at', currentUpdatedAt)

    if (error) {
      if (error.message.includes('updated_at')) {
        throw new Error('Settings were modified by another user. Please refresh and try again.')
      }
      throw error
    }

    return { error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error updating registration settings:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateVisibilitySettings(
  context: UserContext,
  settings: Partial<VisibilitySettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) return { error: null }
  try {
    const validated = visibilitySettingsSchema.partial().parse(settings)

    const { error } = await supabase
      .from('organization_visibility_settings' as any)
      .upsert(
        {
          org_id: context.orgId,
          ...validated,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'org_id',
        }
      )
      .eq('org_id', context.orgId)
      .eq('updated_at', currentUpdatedAt)

    if (error) {
      if (error.message.includes('updated_at')) {
        throw new Error('Settings were modified by another user. Please refresh and try again.')
      }
      throw error
    }

    return { error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error updating visibility settings:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateNotificationSettings(
  context: UserContext,
  settings: Partial<NotificationSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) return { error: null }
  try {
    const validated = notificationSettingsSchema.partial().parse(settings)

    const { error } = await supabase
      .from('organization_notification_settings' as any)
      .upsert(
        {
          org_id: context.orgId,
          ...validated,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'org_id',
        }
      )
      .eq('org_id', context.orgId)
      .eq('updated_at', currentUpdatedAt)

    if (error) {
      if (error.message.includes('updated_at')) {
        throw new Error('Settings were modified by another user. Please refresh and try again.')
      }
      throw error
    }

    return { error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error updating notification settings:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateAdvancedSettings(
  context: UserContext,
  settings: Partial<AdvancedSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) return { error: null }
  try {
    const validated = advancedSettingsSchema.partial().parse(settings)

    const { error } = await supabase
      .from('organization_advanced_settings' as any)
      .upsert(
        {
          org_id: context.orgId,
          ...validated,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'org_id',
        }
      )
      .eq('org_id', context.orgId)
      .eq('updated_at', currentUpdatedAt)

    if (error) {
      if (error.message.includes('updated_at')) {
        throw new Error('Settings were modified by another user. Please refresh and try again.')
      }
      throw error
    }

    return { error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error updating advanced settings:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

// ============================================================================
// Impact Checking (Issue 6)
// ============================================================================

/**
 * Check how many records would be impacted by a setting change
 */
export async function checkImpactedRecords(
  context: UserContext,
  settingType: 'registration' | 'attendance' | 'general',
  field: string
): Promise<{ count: number; error: Error | null }> {
  try {
    let count = 0

    if (settingType === 'registration' && field === 'required_fields') {
      // Check how many existing players might be affected
      const { count: playerCount, error } = await supabase
        .from('children')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', context.orgId)

      if (error) throw error
      count = playerCount || 0
    } else if (settingType === 'attendance' && field.startsWith('required_for_')) {
      // Check how many events might be affected
      const { count: eventCount, error } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', context.orgId)

      if (error) throw error
      count = eventCount || 0
    } else if (settingType === 'general' && field === 'status') {
      // Check all teams in org
      const { count: teamCount, error } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', context.orgId)

      if (error) throw error
      count = teamCount || 0
    }

    return { count, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error checking impacted records:', err)
    return { count: 0, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
