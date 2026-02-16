/**
 * Notification Service
 *
 * Facade for notification operations that delegates to messagesService
 * and preferencesService. Provides a single entry point for notification
 * read/write operations and settings management.
 */

import type { UserContext } from '../fake/userContext'
import {
  getNotifications as getNotificationsFromMessages,
  markNotificationRead as markNotificationReadFromMessages,
  markAllNotificationsRead as markAllNotificationsReadFromMessages,
  getUnreadCount as getUnreadCountFromMessages,
} from './messagesService'
import {
  getUserPreferences,
  updateUserPreferences,
} from './preferencesService'
import type { NotificationRecord } from '../../types/notifications'
import type { NotificationPreferencesByOrg } from '../../types/notificationPreferences'

type ServiceResult<T = unknown> = Promise<{ data: T | null; error: Error | null }>

export const notificationService = {
  /**
   * Get notifications for a user
   */
  getNotifications: async (
    context: UserContext,
    limit?: number
  ): ServiceResult<NotificationRecord[]> => {
    return getNotificationsFromMessages(context, limit)
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (
    context: UserContext,
    notificationId: string
  ): ServiceResult => {
    const result = await markNotificationReadFromMessages(context, notificationId)
    return { data: result.success ? true : null, error: result.error }
  },

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead: async (context: UserContext): ServiceResult => {
    const result = await markAllNotificationsReadFromMessages(context)
    return { data: result.success ? true : null, error: result.error }
  },

  /**
   * Delete a notification (not currently implemented in messagesService)
   */
  deleteNotification: async (): ServiceResult => {
    return { data: null, error: new Error('Delete notification not yet implemented') }
  },

  /**
   * Get notification settings (preferences) for a user
   */
  getNotificationSettings: async (userId: string): ServiceResult<NotificationPreferencesByOrg | undefined> => {
    const { data: prefs } = await getUserPreferences(userId)
    return { data: prefs?.notifications_v2, error: null }
  },

  /**
   * Update notification settings (preferences) for a user
   */
  updateNotificationSettings: async (
    userId: string,
    settings: NotificationPreferencesByOrg
  ): ServiceResult => {
    const { error } = await updateUserPreferences(userId, { notifications_v2: settings })
    return { data: error ? null : true, error }
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (context: UserContext): ServiceResult<number> => {
    return getUnreadCountFromMessages(context)
  },

  /**
   * Send a notification (use notifyUsers from notificationServiceCore instead)
   * @deprecated Use notificationServiceCore.notifyUsers
   */
  sendNotification: async (): ServiceResult => {
    return { data: null, error: new Error('Use notificationServiceCore.notifyUsers instead') }
  },

  /**
   * Send bulk notification (use notifyUsers from notificationServiceCore instead)
   * @deprecated Use notificationServiceCore.notifyUsers
   */
  sendBulkNotification: async (): ServiceResult => {
    return { data: null, error: new Error('Use notificationServiceCore.notifyUsers instead') }
  },

  /**
   * Subscribe to notifications (push subscriptions - not yet implemented)
   */
  subscribeToNotifications: async (): ServiceResult => {
    return { data: null, error: new Error('Push subscriptions not yet implemented') }
  },

  /**
   * Unsubscribe from notifications (push subscriptions - not yet implemented)
   */
  unsubscribeFromNotifications: async (): ServiceResult => {
    return { data: null, error: new Error('Push subscriptions not yet implemented') }
  },
}
