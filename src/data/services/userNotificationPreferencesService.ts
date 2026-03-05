/**
 * User Notification Preferences Service
 * 
 * Manages user notification preferences stored in relational table.
 * Handles template gating - email preferences can only be enabled if active template exists.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type { NotificationRole } from '../../types/notifications'
import { isEmailAvailable } from './notificationTypesService'
import type { NotificationType } from './notificationTypesService'
import { getNotificationTypesForRole } from './notificationTypesService'

export interface UserNotificationPreference {
  id: string
  user_id: string
  org_id: string | null
  role: NotificationRole
  notification_type_id: string
  in_app_enabled: boolean
  email_enabled: boolean
  push_enabled: boolean
  created_at: string
  updated_at: string
}

export interface UserPreferenceWithType extends UserNotificationPreference {
  notification_type: NotificationType
  email_available: boolean
}

/**
 * Get user preferences for a specific org and role
 */
export async function getUserPreferences(
  userId: string,
  orgId: string,
  role: NotificationRole
): Promise<{ data: UserPreferenceWithType[]; error: Error | null }> {
  try {
    const canonicalRole = role === 'parent' ? 'guardian' : role

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select(`
        *,
        notification_types(*)
      `)
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('role', canonicalRole)

    if (error) {
      debug.error('UserNotificationPreferencesService.getUserPreferences', 'Failed to fetch preferences', {
        error,
        userId,
        orgId,
        role: canonicalRole,
      })
      return { data: [], error: error as Error }
    }

    // Transform to include notification type and email availability
    const transformed = await Promise.all(
      (data || []).map(async (pref: any) => {
        const notificationType = pref.notification_types as NotificationType
        const emailAvailable = await isEmailAvailable(notificationType.id)

        return {
          ...pref,
          notification_type: notificationType,
          email_available: emailAvailable,
        } as UserPreferenceWithType
      })
    )

    return { data: transformed, error: null }
  } catch (err) {
    debug.error('UserNotificationPreferencesService.getUserPreferences', 'Exception fetching preferences', {
      error: err,
      userId,
      orgId,
      role,
    })
    return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get default preferences for a role (from notification_types defaults)
 */
export async function getDefaultPreferences(
  role: NotificationRole
): Promise<{ data: UserPreferenceWithType[]; error: Error | null }> {
  try {
    const { data: notificationTypes, error } = await getNotificationTypesForRole(role)

    if (error) {
      return { data: [], error }
    }

    // Transform notification types to preferences with defaults
    const defaults = await Promise.all(
      notificationTypes.map(async (type) => {
        const emailAvailable = await isEmailAvailable(type.id)

        return {
          id: '', // No ID for defaults
          user_id: '',
          org_id: null,
          role,
          notification_type_id: type.id,
          in_app_enabled: type.default_in_app_enabled,
          email_enabled: type.default_email_enabled && emailAvailable, // Only enable if template exists
          push_enabled: false,
          created_at: '',
          updated_at: '',
          notification_type: type,
          email_available: emailAvailable,
        } as UserPreferenceWithType
      })
    )

    return { data: defaults, error: null }
  } catch (err) {
    debug.error('UserNotificationPreferencesService.getDefaultPreferences', 'Exception getting defaults', {
      error: err,
      role,
    })
    return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Update or create a preference
 */
export async function updatePreference(
  userId: string,
  orgId: string,
  role: NotificationRole,
  notificationTypeId: string,
  inAppEnabled: boolean,
  emailEnabled: boolean,
  pushEnabled: boolean
): Promise<{ data: UserNotificationPreference | null; error: Error | null }> {
  try {
    const canonicalRole = role === 'parent' ? 'guardian' : role

    // Check if email can be enabled (template must be active)
    if (emailEnabled) {
      const emailAvailable = await isEmailAvailable(notificationTypeId)
      if (!emailAvailable) {
        return {
          data: null,
          error: new Error('Email notifications are not available for this notification type (no active template)'),
        }
      }
    }

    // Upsert preference
    const { data, error } = await supabase
      .from('user_notification_preferences')
      .upsert(
        {
          user_id: userId,
          org_id: orgId,
          role: canonicalRole,
          notification_type_id: notificationTypeId,
          in_app_enabled: inAppEnabled,
          email_enabled: emailEnabled,
          push_enabled: pushEnabled,
        },
        {
          onConflict: 'user_id,org_id,role,notification_type_id',
        }
      )
      .select()
      .single()

    if (error) {
      debug.error('UserNotificationPreferencesService.updatePreference', 'Failed to update preference', {
        error,
        userId,
        orgId,
        role: canonicalRole,
        notificationTypeId,
      })
      return { data: null, error: error as Error }
    }

    return { data: data as unknown as UserNotificationPreference, error: null }
  } catch (err) {
    debug.error('UserNotificationPreferencesService.updatePreference', 'Exception updating preference', {
      error: err,
      userId,
      orgId,
      role,
      notificationTypeId,
    })
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Batch update preferences
 */
export async function updatePreferencesBatch(
  userId: string,
  orgId: string,
  role: NotificationRole,
  preferences: Array<{
    notificationTypeId: string
    inAppEnabled: boolean
    emailEnabled: boolean
    pushEnabled: boolean
  }>
): Promise<{ data: UserNotificationPreference[]; error: Error | null }> {
  try {
    const canonicalRole = role === 'parent' ? 'guardian' : role

    // Validate all email preferences can be enabled
    for (const pref of preferences) {
      if (pref.emailEnabled) {
        const emailAvailable = await isEmailAvailable(pref.notificationTypeId)
        if (!emailAvailable) {
          return {
            data: [],
            error: new Error(
              `Email notifications are not available for notification type ${pref.notificationTypeId} (no active template)`
            ),
          }
        }
      }
    }

    // Prepare upsert data
    const upsertData = preferences.map((pref) => ({
      user_id: userId,
      org_id: orgId,
      role: canonicalRole,
      notification_type_id: pref.notificationTypeId,
      in_app_enabled: pref.inAppEnabled,
      email_enabled: pref.emailEnabled,
      push_enabled: pref.pushEnabled,
    }))

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .upsert(upsertData, {
        onConflict: 'user_id,org_id,role,notification_type_id',
      })
      .select()

    if (error) {
      debug.error('UserNotificationPreferencesService.updatePreferencesBatch', 'Failed to update preferences', {
        error,
        userId,
        orgId,
        role: canonicalRole,
      })
      return { data: [], error: error as Error }
    }

    return { data: (data || []) as unknown as UserNotificationPreference[], error: null }
  } catch (err) {
    debug.error('UserNotificationPreferencesService.updatePreferencesBatch', 'Exception updating preferences', {
      error: err,
      userId,
      orgId,
      role,
    })
    return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Check if email can be enabled for a notification type
 */
export async function canEnableEmail(notificationTypeId: string): Promise<boolean> {
  return await isEmailAvailable(notificationTypeId)
}

/**
 * Get preference for a specific notification type
 */
export async function getPreference(
  userId: string,
  orgId: string,
  role: NotificationRole,
  notificationTypeId: string
): Promise<{ data: UserPreferenceWithType | null; error: Error | null }> {
  try {
    const canonicalRole = role === 'parent' ? 'guardian' : role

    const { data, error } = await supabase
      .from('user_notification_preferences')
      .select(`
        *,
        notification_types(*)
      `)
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('role', canonicalRole)
      .eq('notification_type_id', notificationTypeId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found - return default
        const { data: notificationTypes } = await getNotificationTypesForRole(role)
        const type = notificationTypes.find((t) => t.id === notificationTypeId)
        if (!type) {
          return { data: null, error: new Error('Notification type not found') }
        }

        const emailAvailable = await isEmailAvailable(type.id)
        return {
          data: {
            id: '',
            user_id: userId,
            org_id: orgId,
            role: canonicalRole,
            notification_type_id: notificationTypeId,
            in_app_enabled: type.default_in_app_enabled,
            email_enabled: type.default_email_enabled && emailAvailable,
            push_enabled: false,
            created_at: '',
            updated_at: '',
            notification_type: type,
            email_available: emailAvailable,
          },
          error: null,
        }
      }

      debug.error('UserNotificationPreferencesService.getPreference', 'Failed to fetch preference', {
        error,
        userId,
        orgId,
        role: canonicalRole,
        notificationTypeId,
      })
      return { data: null, error: error as Error }
    }

    const notificationType = data.notification_types as unknown as NotificationType
    const emailAvailable = await isEmailAvailable(notificationType.id)

    return {
      data: {
        ...data,
        notification_type: notificationType,
        email_available: emailAvailable,
      } as unknown as UserPreferenceWithType,
      error: null,
    }
  } catch (err) {
    debug.error('UserNotificationPreferencesService.getPreference', 'Exception fetching preference', {
      error: err,
      userId,
      orgId,
      role,
      notificationTypeId,
    })
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Delete a preference (revert to defaults)
 */
export async function deletePreference(
  userId: string,
  orgId: string,
  role: NotificationRole,
  notificationTypeId: string
): Promise<{ success: boolean; error: Error | null }> {
  try {
    const canonicalRole = role === 'parent' ? 'guardian' : role

    const { error } = await supabase
      .from('user_notification_preferences')
      .delete()
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .eq('role', canonicalRole)
      .eq('notification_type_id', notificationTypeId)

    if (error) {
      debug.error('UserNotificationPreferencesService.deletePreference', 'Failed to delete preference', {
        error,
        userId,
        orgId,
        role: canonicalRole,
        notificationTypeId,
      })
      return { success: false, error: error as Error }
    }

    return { success: true, error: null }
  } catch (err) {
    debug.error('UserNotificationPreferencesService.deletePreference', 'Exception deleting preference', {
      error: err,
      userId,
      orgId,
      role,
      notificationTypeId,
    })
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Batch resolve preferences for multiple users and a notification type
 * Returns a map of userId -> { inApp: boolean, email: boolean }
 * Uses relational preferences, falls back to defaults from notification_types
 */
export async function shouldDeliverNotificationBatchRelational(
  userIds: string[],
  orgId: string,
  role: NotificationRole,
  notificationTypeId: string
): Promise<Map<string, { inApp: boolean; email: boolean; push: boolean }>> {
  const result = new Map<string, { inApp: boolean; email: boolean; push: boolean }>()

  if (userIds.length === 0) {
    return result
  }

  try {
    const canonicalRole = role === 'parent' ? 'guardian' : role

    // Get notification type defaults
    const { getNotificationTypeById } = await import('./notificationTypesService')
    const { data: notificationType, error: typeError } = await getNotificationTypeById(notificationTypeId)

    if (typeError || !notificationType) {
      // If type not found, default to disabled
      userIds.forEach((userId) => {
        result.set(userId, { inApp: false, email: false, push: false })
      })
      return result
    }

    // Check if email is available (active template exists)
    const emailAvailable = await isEmailAvailable(notificationTypeId)

    // Get user preferences in batch
    const { data: preferences, error } = await supabase
      .from('user_notification_preferences')
      .select('user_id, in_app_enabled, email_enabled, push_enabled')
      .in('user_id', userIds)
      .eq('org_id', orgId)
      .eq('role', canonicalRole)
      .eq('notification_type_id', notificationTypeId)

    // Create map of user preferences
    const prefMap = new Map<string, { inApp: boolean; email: boolean; push: boolean }>()
    if (!error && preferences) {
      const prefs = preferences as unknown as Array<{
        user_id: string
        in_app_enabled: boolean | null
        email_enabled: boolean | null
        push_enabled: boolean | null
      }>
      for (const pref of prefs) {
        prefMap.set(pref.user_id, {
          inApp: !!pref.in_app_enabled,
          email: !!(pref.email_enabled && emailAvailable), // Only enable email if template is active
          push: !!pref.push_enabled,
        })
      }
    }

    // Set results - use preferences if found, otherwise defaults
    userIds.forEach((userId) => {
      const userPref = prefMap.get(userId)
      if (userPref) {
        result.set(userId, userPref)
      } else {
        // Use defaults from notification type
        result.set(userId, {
          inApp: notificationType.default_in_app_enabled,
          email: notificationType.default_email_enabled && emailAvailable,
          push: false,
        })
      }
    })

    return result
  } catch (err) {
    debug.error('UserNotificationPreferencesService.shouldDeliverNotificationBatchRelational', 'Exception resolving preferences', {
      error: err,
      userIds,
      orgId,
      role,
      notificationTypeId,
    })
    // On error, default to enabled (fail open)
    userIds.forEach((userId) => {
      result.set(userId, { inApp: true, email: false, push: false }) // Email disabled on error
    })
    return result
  }
}
