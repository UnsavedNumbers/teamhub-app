/**
 * Notification Type Mapper
 * 
 * Maps NotificationAction (TypeScript enum) to notification_types.key (database).
 */

import type { NotificationAction } from '../../types/notifications'

/**
 * Map NotificationAction to notification_types.key
 */
export function mapActionToNotificationType(action: NotificationAction): string {
  return action
}

/**
 * Get notification type ID from action
 */
export async function getNotificationTypeIdFromAction(
  action: NotificationAction
): Promise<{ data: string | null; error: Error | null }> {
  const { getNotificationType } = await import('./notificationTypesService')
  const notificationTypeKey = mapActionToNotificationType(action)
  const { data, error } = await getNotificationType(notificationTypeKey)

  if (error || !data) {
    return { data: null, error: error || new Error(`Notification type not found for action: ${action}`) }
  }

  return { data: data.id, error: null }
}
