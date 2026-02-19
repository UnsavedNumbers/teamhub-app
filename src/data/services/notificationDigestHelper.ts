/**
 * Notification Digest Helper
 *
 * Utilities for checking digest settings and quiet hours
 */

import type { NotificationGroup } from '../../types/notificationPreferences'

export interface DigestInfo {
  shouldDigest: boolean
  digestWindow: 'daily' | 'weekly'
  quietHoursEnabled: boolean
  quietHoursStart?: string
  quietHoursEnd?: string
  timezone?: string
}

/**
 * Check if a notification should be digested (batched) based on group settings
 */
export function shouldDigestNotification(
  group: NotificationGroup | undefined,
  action: string
): DigestInfo {
  if (!group) {
    return {
      shouldDigest: false,
      digestWindow: 'daily',
      quietHoursEnabled: false,
    }
  }

  // Check if action is enabled and digest is enabled
  const actionToggle = group.actions.find((a) => a.id === action)
  const actionEnabled = group.allEnabled || actionToggle?.enabled || false

  if (!actionEnabled || !group.digestEnabled) {
    return {
      shouldDigest: false,
      digestWindow: group.digestWindow || 'daily',
      quietHoursEnabled: group.quietHoursEnabled || false,
      quietHoursStart: group.quietHoursStart,
      quietHoursEnd: group.quietHoursEnd,
      timezone: group.timezone,
    }
  }

  return {
    shouldDigest: true,
    digestWindow: group.digestWindow || 'daily',
    quietHoursEnabled: group.quietHoursEnabled || false,
    quietHoursStart: group.quietHoursStart,
    quietHoursEnd: group.quietHoursEnd,
    timezone: group.timezone,
  }
}

/**
 * Check if current time is within quiet hours for a user
 */
export function isInQuietHours(
  quietHoursStart?: string,
  quietHoursEnd?: string,
  timezone?: string
): boolean {
  if (!quietHoursStart || !quietHoursEnd) {
    return false
  }

  try {
    // Parse quiet hours (HH:mm format)
    const [startHour, startMin] = quietHoursStart.split(':').map(Number)
    const [endHour, endMin] = quietHoursEnd.split(':').map(Number)

    // Get current time in user's timezone
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
    const now = new Date()
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
    const parts = formatter.formatToParts(now)
    const currentHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10)
    const currentMin = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10)

    const currentMinutes = currentHour * 60 + currentMin
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin

    // Handle quiet hours that span midnight (e.g., 22:00 to 08:00)
    if (startMinutes > endMinutes) {
      // Quiet hours span midnight
      return currentMinutes >= startMinutes || currentMinutes < endMinutes
    } else {
      // Quiet hours within same day
      return currentMinutes >= startMinutes && currentMinutes < endMinutes
    }
  } catch (err) {
    console.error('Error checking quiet hours:', err)
    return false
  }
}

/**
 * Check if an action is marked as urgent (should bypass digest and quiet hours)
 */
export function isUrgentAction(action: string): boolean {
  const urgentActions = [
    'announcement_urgent',
    'event_weather_alert',
    'fee_overdue',
    'event_canceled',
    'travel_canceled',
  ]
  return urgentActions.includes(action)
}
