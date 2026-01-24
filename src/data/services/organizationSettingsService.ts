/**
 * Organization Settings Service
 *
 * Provides CRUD operations for organization-wide settings.
 * Implements optimistic locking, default value handling, and impact checking.
 */

import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import type { UserContext } from '../fake/userContext'
import type { SupabaseExtended } from '../../lib/supabase.extended.types'
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
import {
  getOrganizationSettings as getFakeOrganizationSettings,
  updateGeneralSettings as updateFakeGeneralSettings,
  updateDefaultsSettings as updateFakeDefaultsSettings,
  updateAttendanceSettings as updateFakeAttendanceSettings,
  updateRegistrationSettings as updateFakeRegistrationSettings,
  updateVisibilitySettings as updateFakeVisibilitySettings,
  updateNotificationSettings as updateFakeNotificationSettings,
  updateAdvancedSettings as updateFakeAdvancedSettings,
  checkImpactedRecords as checkFakeImpactedRecords,
} from '../fake/organizationSettingsFakeService'

type OrgSettingsContext = UserContext
type PublicTableName = keyof SupabaseExtended['public']['Tables']
const fromTable = <T extends PublicTableName>(table: T) => supabase.from(table)

type OrganizationSettingsRow = SupabaseExtended['public']['Tables']['organization_settings']['Row']
type DefaultsSettingsRow = SupabaseExtended['public']['Tables']['organization_defaults']['Row']
type AttendanceSettingsRow = SupabaseExtended['public']['Tables']['organization_attendance_settings']['Row']
type RegistrationSettingsRow = SupabaseExtended['public']['Tables']['organization_registration_settings']['Row']
type VisibilitySettingsRow = SupabaseExtended['public']['Tables']['organization_visibility_settings']['Row']
type NotificationSettingsRow = SupabaseExtended['public']['Tables']['organization_notification_settings']['Row']
type AdvancedSettingsRow = SupabaseExtended['public']['Tables']['organization_advanced_settings']['Row']

// ============================================================================
// Get Operations
// ============================================================================

/**
 * Get all settings for an organization
 * Returns default values if records don't exist (Issue 9)
 */
export async function getOrganizationSettings(
  context: OrgSettingsContext
): Promise<{ data: OrganizationSettings | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    return getFakeOrganizationSettings(context)
  }
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

// ============================================================================
// Theme Settings (always real database CRUD)
// ============================================================================

export interface OrganizationThemeSettings {
  org_id: string
  theme_id: string | null
  updated_at: string | null
}

export async function getOrganizationThemeSettings(
  context: OrgSettingsContext
): Promise<{ data: OrganizationThemeSettings | null; error: Error | null }> {
  try {
    const { data, error } = await fromTable('organization_settings')
      .select('org_id, theme_id, updated_at')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      return {
        data: {
          org_id: context.orgId,
          theme_id: null,
          updated_at: null,
        },
        error: null,
      }
    }

    return {
      data: {
        org_id: data.org_id,
        theme_id: data.theme_id ?? null,
        updated_at: data.updated_at ?? null,
      },
      error: null,
    }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting theme settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateOrganizationThemeSettings(
  context: OrgSettingsContext,
  themeId: string | null,
  currentUpdatedAt?: string | null
): Promise<{ error: Error | null }> {
  // In fake data mode, just return success (theme is applied via CSS variables in memory)
  if (USE_FAKE_DATA) {
    console.log('[organizationSettingsService] Fake data mode - theme update simulated:', themeId)
    return { error: null }
  }

  try {
    const validated = generalSettingsSchema
      .pick({ theme_id: true })
      .partial()
      .parse({ theme_id: themeId })

    // First, check if row exists
    const { data: existing, error: checkError } = await fromTable('organization_settings')
      .select('org_id, updated_at')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (checkError) {
      throw checkError
    }

    // If row doesn't exist, create it with the theme_id
    if (!existing) {
      // Get organization name for the required field
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', context.orgId)
        .single()

      const { error: insertError } = await fromTable('organization_settings')
        .insert({
          org_id: context.orgId,
          organization_name: orgData?.name || 'Organization',
          timezone: 'America/New_York',
          status: 'active',
          theme_id: validated.theme_id ?? null,
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        throw insertError
      }

      return { error: null }
    }

    // Check optimistic locking if currentUpdatedAt is provided
    // But if currentUpdatedAt is null/undefined and existing.updated_at exists, 
    // that's okay - the row was just created
    if (currentUpdatedAt !== undefined && currentUpdatedAt !== null) {
      if (existing.updated_at !== currentUpdatedAt) {
        return {
          error: new Error('Settings were modified by another user. Please refresh and try again.'),
        }
      }
    }

    // Update existing row
    let query = fromTable('organization_settings')
      .update({
        theme_id: validated.theme_id ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq('org_id', context.orgId)

    // Add optimistic locking check if provided
    if (currentUpdatedAt) {
      query = query.eq('updated_at', currentUpdatedAt)
    }

    const { error } = await query

    if (error) {
      // Check for RLS errors - might happen if permissions changed
      if (error.code === '42501' || error.message.includes('row-level security')) {
        return {
          error: new Error(
            'Permission denied. Please ensure you have permission to update organization settings.'
          ),
        }
      }

      // Check for optimistic locking failure
      if (error.message.includes('updated_at')) {
        return {
          error: new Error('Settings were modified by another user. Please refresh and try again.'),
        }
      }

      throw error
    }

    return { error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error updating theme settings:', err)
    
    // Handle specific error cases
    if (err instanceof Error) {
      // If it's already our custom error, return it
      if (err.message.includes('Settings were modified') ||
          err.message.includes('Permission denied')) {
        return { error: err }
      }

      // Check for RLS errors
      if (err.message.includes('row-level security') || 
          (err as any).code === '42501') {
        return {
          error: new Error(
            'Permission denied. Please ensure you have permission to update organization settings.'
          ),
        }
      }
    }

    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getGeneralSettings(
  context: OrgSettingsContext
): Promise<{ data: GeneralSettings | null; error: Error | null }> {
  try {
    const { data, error } = await fromTable('organization_settings')
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
    const row = data as OrganizationSettingsRow

    const settings: GeneralSettings = {
      org_id: row.org_id,
      organization_name: row.organization_name,
      timezone: row.timezone,
      default_language: row.default_language,
      theme_id: row.theme_id || null,
      status: (row.status === 'active' || row.status === 'inactive') ? row.status : 'active',
      updated_at: row.updated_at || new Date().toISOString(),
    }

    return { data: settings, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting general settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getDefaultsSettings(
  context: OrgSettingsContext
): Promise<{ data: DefaultsSettings | null; error: Error | null }> {
  try {
    const { data, error } = await fromTable('organization_defaults')
      .select('*')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const defaults = getDefaultSettings(context.orgId, '')
      return { data: defaults.defaults, error: null }
    }

    const row = data as DefaultsSettingsRow

    const settings: DefaultsSettings = {
      org_id: row.org_id,
      default_season_id: row.default_season_id,
      default_sport_id: row.default_sport_id,
      default_program_id: row.default_program_id,
      default_level_id: row.default_level_id,
      default_event_types: Array.isArray(row.default_event_types) ? row.default_event_types as string[] : undefined,
      updated_at: row.updated_at || new Date().toISOString(),
    }

    return { data: settings, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting defaults settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getAttendanceSettings(
  context: OrgSettingsContext
): Promise<{ data: AttendanceSettings | null; error: Error | null }> {
  try {
    const { data, error } = await fromTable('organization_attendance_settings')
      .select('*')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const defaults = getDefaultSettings(context.orgId, '')
      return { data: defaults.attendance, error: null }
    }

    const row = data as AttendanceSettingsRow

    const settings: AttendanceSettings = {
      org_id: row.org_id,
      required_for_practice: row.required_for_practice,
      required_for_game: row.required_for_game,
      required_for_meeting: row.required_for_meeting,
      submission_deadline_hours: row.submission_deadline_hours,
      lock_after_days: row.lock_after_days,
      allow_admin_override: row.allow_admin_override,
      enable_coach_reminders: row.enable_coach_reminders,
      parent_visibility: row.parent_visibility as AttendanceSettings['parent_visibility'],
      updated_at: row.updated_at || new Date().toISOString(),
    }

    return { data: settings, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting attendance settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getRegistrationSettings(
  context: OrgSettingsContext
): Promise<{ data: RegistrationSettings | null; error: Error | null }> {
  try {
    const { data, error } = await fromTable('organization_registration_settings')
      .select('*')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const defaults = getDefaultSettings(context.orgId, '')
      return { data: defaults.registration, error: null }
    }

    const row = data as RegistrationSettingsRow

    const settings: RegistrationSettings = {
      org_id: row.org_id,
      required_fields: Array.isArray(row.required_fields)
        ? row.required_fields.filter((f): f is string => typeof f === 'string')
        : undefined,
      allow_players_without_guardians: row.allow_players_without_guardians,
      allow_guardian_self_invite: row.allow_guardian_self_invite,
      medical_form_required: row.medical_form_required,
      updated_at: row.updated_at || new Date().toISOString(),
    }

    return { data: settings, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting registration settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getVisibilitySettings(
  context: OrgSettingsContext
): Promise<{ data: VisibilitySettings | null; error: Error | null }> {
  try {
    const { data, error } = await fromTable('organization_visibility_settings')
      .select('*')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const defaults = getDefaultSettings(context.orgId, '')
      return { data: defaults.visibility, error: null }
    }

    const row = data as VisibilitySettingsRow

    const settings: VisibilitySettings = {
      org_id: row.org_id,
      role_permissions: row.role_permissions as VisibilitySettings['role_permissions'],
      updated_at: row.updated_at || new Date().toISOString(),
    }

    return { data: settings, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting visibility settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getNotificationSettings(
  context: OrgSettingsContext
): Promise<{ data: NotificationSettings | null; error: Error | null }> {
  try {
    const { data, error } = await fromTable('organization_notification_settings')
      .select('*')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const defaults = getDefaultSettings(context.orgId, '')
      return { data: defaults.notifications, error: null }
    }

    const row = data as NotificationSettingsRow

    const settings: NotificationSettings = {
      org_id: row.org_id,
      default_channels: Array.isArray(row.default_channels) ? row.default_channels as string[] : (row.default_channels ? null : undefined),
      attendance_reminders_enabled: row.attendance_reminders_enabled,
      schedule_change_alerts_enabled: row.schedule_change_alerts_enabled,
      payment_reminder_behavior: (row.payment_reminder_behavior === 'immediate' || row.payment_reminder_behavior === 'daily_digest') ? row.payment_reminder_behavior : 'immediate',
      updated_at: row.updated_at || new Date().toISOString(),
    }

    return { data: settings, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error getting notification settings:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

async function getAdvancedSettings(
  context: OrgSettingsContext
): Promise<{ data: AdvancedSettings | null; error: Error | null }> {
  try {
    const { data, error } = await fromTable('organization_advanced_settings')
      .select('*')
      .eq('org_id', context.orgId)
      .maybeSingle()

    if (error) throw error

    if (!data) {
      const defaults = getDefaultSettings(context.orgId, '')
      return { data: defaults.advanced, error: null }
    }

    const row = data as AdvancedSettingsRow

    const settings: AdvancedSettings = {
      org_id: row.org_id,
      data_retention_days: row.data_retention_days,
      enable_api_access: row.enable_api_access,
      api_rate_limit: row.api_rate_limit,
      allow_data_export: row.allow_data_export,
      updated_at: row.updated_at || new Date().toISOString(),
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
  context: OrgSettingsContext,
  settings: Partial<GeneralSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) return updateFakeGeneralSettings(context, settings, currentUpdatedAt)

  try {
    const validated = generalSettingsSchema.partial().parse(settings)

    const { error } = await fromTable('organization_settings')
      .update({
        ...validated,
        updated_at: new Date().toISOString(),
      })
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
    console.error('[organizationSettingsService] Error updating general settings:', err)
    return { error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function updateDefaultsSettings(
  context: OrgSettingsContext,
  settings: Partial<DefaultsSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) {
    return updateFakeDefaultsSettings(context, settings, currentUpdatedAt)
  }
  try {
    const validated = defaultsSettingsSchema.partial().parse(settings)

    const { error } = await fromTable('organization_defaults')
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
  context: OrgSettingsContext,
  settings: Partial<AttendanceSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) {
    return updateFakeAttendanceSettings(context, settings, currentUpdatedAt)
  }
  try {
    const validated = attendanceSettingsSchema.partial().parse(settings)

    const { error } = await fromTable('organization_attendance_settings')
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
  context: OrgSettingsContext,
  settings: Partial<RegistrationSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) {
    return updateFakeRegistrationSettings(context, settings, currentUpdatedAt)
  }
  try {
    const validated = registrationSettingsSchema.partial().parse(settings)

    const { error } = await fromTable('organization_registration_settings')
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
  context: OrgSettingsContext,
  settings: Partial<VisibilitySettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) {
    return updateFakeVisibilitySettings(context, settings, currentUpdatedAt)
  }
  try {
    const validated = visibilitySettingsSchema.partial().parse(settings)

    const { error } = await fromTable('organization_visibility_settings')
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
  context: OrgSettingsContext,
  settings: Partial<NotificationSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) {
    return updateFakeNotificationSettings(context, settings, currentUpdatedAt)
  }
  try {
    const validated = notificationSettingsSchema.partial().parse(settings)

    const { error } = await fromTable('organization_notification_settings')
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
  context: OrgSettingsContext,
  settings: Partial<AdvancedSettings>,
  currentUpdatedAt: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) {
    return updateFakeAdvancedSettings(context, settings, currentUpdatedAt)
  }
  try {
    const validated = advancedSettingsSchema.partial().parse(settings)

    const { error } = await fromTable('organization_advanced_settings')
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
  context: OrgSettingsContext,
  settingType: 'registration' | 'attendance' | 'general',
  field: string
): Promise<{ count: number; error: Error | null }> {
  if (USE_FAKE_DATA) {
    return checkFakeImpactedRecords(context, settingType, field)
  }
  try {
    let count = 0

    if (settingType === 'registration' && field === 'required_fields') {
      // Check how many existing players might be affected
      const { count: playerCount, error } = await fromTable('athletes')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', context.orgId)

      if (error) throw error
      count = playerCount || 0
    } else if (settingType === 'attendance' && field.startsWith('required_for_')) {
      // Check how many events might be affected
      const { count: eventCount, error } = await fromTable('events')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', context.orgId)

      if (error) throw error
      count = eventCount || 0
    } else if (settingType === 'general' && field === 'status') {
      // Check all teams in org
      const { count: teamCount, error } = await fromTable('teams')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', context.orgId)

      if (error) throw error
      count = teamCount || 0
    }

    return { count, error: null }
  } catch (err) {
    console.error('[organizationSettingsService] Error checking impacted records:', err)
    return { count: 0, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
