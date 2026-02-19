/**
 * Notification Preferences Resolver
 *
 * Resolves user notification preferences from notifications_v2 to determine
 * which delivery channels (in_app, email, push) should be used for a given
 * notification action based on user role and organization context.
 */

import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import { debug } from '../../lib/debug'
import type { NotificationAction, NotificationRole } from '../../types/notifications'
import { isRoleAllowedForAction } from '../../types/notifications'
import type { NotificationGroup, NotificationPreferencesByOrg } from '../../types/notificationPreferences'
import { canonicalRole, GROUP_CONFIGS } from '../../utils/notificationPreferencesConfig'
import { shouldDigestNotification } from './notificationDigestHelper'

export interface DeliveryChannels {
  inApp: boolean
  email: boolean
  push: boolean
  digestInfo?: {
    shouldDigest: boolean
    digestWindow: 'daily' | 'weekly'
    quietHoursEnabled: boolean
    quietHoursStart?: string
    quietHoursEnd?: string
    timezone?: string
  }
}

/**
 * Find which notification group contains the given action
 */
export function findGroupForAction(action: NotificationAction): { id: string; actions: NotificationAction[] } | null {
  for (const group of GROUP_CONFIGS) {
    if (group.actions.includes(action)) {
      return group
    }
  }
  return null
}

/**
 * Check if action is enabled in the given notification group
 */
function isActionEnabledInGroup(group: NotificationGroup, action: NotificationAction): boolean {
  const actionToggle = group.actions.find((a) => a.id === action)
  if (!actionToggle) return false

  // If allEnabled is true, individual action toggles are ignored (all enabled)
  if (group.allEnabled) return true

  // Otherwise, check the specific action toggle
  return actionToggle.enabled
}

/**
 * Resolve notification preferences for a single user/org/role/action
 * Returns which delivery channels should be used
 */
export async function shouldDeliverNotification(
  userId: string,
  orgId: string,
  role: NotificationRole,
  action: NotificationAction
): Promise<DeliveryChannels> {
  debug.flow('NotificationPreferencesResolver.shouldDeliverNotification', 'Resolving preferences', {
    userId,
    orgId,
    role,
    action,
  })

  // First check: is this action allowed for this role?
  const canonical = canonicalRole(role)
  if (!isRoleAllowedForAction(action, canonical)) {
    debug.data('NotificationPreferencesResolver.shouldDeliverNotification', 'Action not allowed for role', {
      action,
      role: canonical,
    })
    return { inApp: false, email: false, push: false }
  }

  // Find which group this action belongs to
  const groupConfig = findGroupForAction(action)
  if (!groupConfig) {
    // Action not in any group config - default to enabled for in_app and email
    debug.data('NotificationPreferencesResolver.shouldDeliverNotification', 'Action not in group config, defaulting', {
      action,
    })
    return { inApp: true, email: true, push: false }
  }

  try {
    // Load user preferences
    let userPrefs: NotificationPreferencesByOrg | undefined

    if (USE_FAKE_DATA) {
      // In fake data mode, default to enabled
      userPrefs = undefined
    } else {
      const { data: user, error } = await supabase.from('users').select('preferences').eq('id', userId).single()

      if (error || !user) {
        debug.error('NotificationPreferencesResolver.shouldDeliverNotification', 'Failed to load user', { error, userId })
        // Fallback: default to enabled
        return { inApp: true, email: true, push: false }
      }

      const prefs = user.preferences as any
      userPrefs = prefs?.notifications_v2
    }

    // Get preferences for this org and role
    const orgPrefs = userPrefs?.[orgId]
    const rolePrefs = orgPrefs?.[canonical]

    // If no preferences exist, default to enabled (backward compatibility)
    if (!rolePrefs || rolePrefs.length === 0) {
      debug.data('NotificationPreferencesResolver.shouldDeliverNotification', 'No preferences found, defaulting', {
        userId,
        orgId,
        role: canonical,
      })
      return { inApp: true, email: true, push: false }
    }

    // Find the group in user's preferences
    const userGroup = rolePrefs.find((g) => g.id === groupConfig.id)
    if (!userGroup) {
      // Group not found in preferences - default to enabled
      debug.data('NotificationPreferencesResolver.shouldDeliverNotification', 'Group not found in preferences, defaulting', {
        groupId: groupConfig.id,
      })
      return { inApp: true, email: true, push: false }
    }

    // Check if action is enabled in this group
    const actionEnabled = isActionEnabledInGroup(userGroup, action)
    if (!actionEnabled) {
      debug.data('NotificationPreferencesResolver.shouldDeliverNotification', 'Action disabled in preferences', {
        action,
        groupId: groupConfig.id,
      })
      return { inApp: false, email: false, push: false }
    }

    // Action is enabled - check which channels are enabled
    const channels = userGroup.channels || []
    const digestInfo = shouldDigestNotification(userGroup, action)
    
    const result: DeliveryChannels = {
      inApp: channels.includes('in_app'),
      email: channels.includes('email'),
      push: channels.includes('push'),
      digestInfo,
    }

    debug.data('NotificationPreferencesResolver.shouldDeliverNotification', 'Resolved channels', {
      action,
      result,
    })

    return result
  } catch (err) {
    debug.error('NotificationPreferencesResolver.shouldDeliverNotification', 'Error resolving preferences', {
      error: err,
      userId,
      orgId,
      role,
      action,
    })
    // On error, default to enabled (fail open)
    return { inApp: true, email: true, push: false }
  }
}

/**
 * Batch resolve preferences for multiple users
 * More efficient than calling shouldDeliverNotification multiple times
 */
export async function shouldDeliverNotificationBatch(
  userIds: string[],
  orgId: string,
  role: NotificationRole,
  action: NotificationAction
): Promise<Map<string, DeliveryChannels>> {
  const result = new Map<string, DeliveryChannels>()

  if (USE_FAKE_DATA || userIds.length === 0) {
    // In fake data mode or empty list, default all to enabled
    userIds.forEach((userId) => {
      result.set(userId, { inApp: true, email: true, push: false })
    })
    return result
  }

  // Check role/action compatibility first
  const canonical = canonicalRole(role)
  if (!isRoleAllowedForAction(action, canonical)) {
    userIds.forEach((userId) => {
      result.set(userId, { inApp: false, email: false, push: false })
    })
    return result
  }

  // Find group config
  const groupConfig = findGroupForAction(action)
  if (!groupConfig) {
    // Default to enabled
    userIds.forEach((userId) => {
      result.set(userId, { inApp: true, email: true, push: false })
    })
    return result
  }

  try {
    // Batch load user preferences
    const { data: users, error } = await supabase
      .from('users')
      .select('id, preferences')
      .in('id', userIds)

    if (error || !users) {
      debug.error('NotificationPreferencesResolver.shouldDeliverNotificationBatch', 'Failed to load users', {
        error,
        userIds,
      })
      // Default all to enabled
      userIds.forEach((userId) => {
        result.set(userId, { inApp: true, email: true, push: false })
      })
      return result
    }

    // Process each user
    for (const user of users) {
      const prefs = user.preferences as any
      const userPrefs: NotificationPreferencesByOrg | undefined = prefs?.notifications_v2
      const orgPrefs = userPrefs?.[orgId]
      const rolePrefs = orgPrefs?.[canonical]

      if (!rolePrefs || rolePrefs.length === 0) {
        // No preferences - default to enabled
        result.set(user.id, { inApp: true, email: true, push: false })
        continue
      }

      const userGroup = rolePrefs.find((g) => g.id === groupConfig.id)
      if (!userGroup) {
        // Group not found - default to enabled
        result.set(user.id, { inApp: true, email: true, push: false })
        continue
      }

      const actionEnabled = isActionEnabledInGroup(userGroup, action)
      if (!actionEnabled) {
        result.set(user.id, { inApp: false, email: false, push: false })
        continue
      }

      const channels = userGroup.channels || []
      const digestInfo = shouldDigestNotification(userGroup, action)
      result.set(user.id, {
        inApp: channels.includes('in_app'),
        email: channels.includes('email'),
        push: channels.includes('push'),
        digestInfo,
      })
    }

    // Set defaults for any users not found in DB
    userIds.forEach((userId) => {
      if (!result.has(userId)) {
        result.set(userId, { inApp: true, email: true, push: false })
      }
    })

    return result
  } catch (err) {
    debug.error('NotificationPreferencesResolver.shouldDeliverNotificationBatch', 'Error batch resolving', {
      error: err,
      userIds,
      orgId,
      role,
      action,
    })
    // Default all to enabled
    userIds.forEach((userId) => {
      result.set(userId, { inApp: true, email: true, push: false })
    })
    return result
  }
}
