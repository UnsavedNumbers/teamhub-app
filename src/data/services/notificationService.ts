/**
 * Notification Service
 *
 * Facade for notification operations that delegates to userNotificationsService
 * and preferencesService. Provides a single entry point for notification
 * read/write operations and settings management.
 */

import type { UserContext } from '../fake/userContext'
import {
  getNotifications as getNotificationsFromUserNotifications,
  markNotificationRead as markNotificationReadFromUserNotifications,
  markAllNotificationsRead as markAllNotificationsReadFromUserNotifications,
  getUnreadCount as getUnreadCountFromUserNotifications,
  archiveNotification as archiveNotificationFromUserNotifications,
  deleteNotification as deleteNotificationFromUserNotifications,
  type GetNotificationsOptions,
  type NotificationCursor,
} from './userNotificationsService'
import {
  getUserPreferences,
  updateUserPreferences,
} from './preferencesService'
import type { NotificationRecord } from '../../types/notifications'
import type { NotificationPreferencesByOrg } from '../../types/notificationPreferences'

type ServiceResult<T = unknown> = Promise<{ data: T | null; error: Error | null }>

export const notificationService = {
  /**
   * Get notifications for a user with cursor-based pagination
   */
  getNotifications: async (
    context: UserContext,
    options?: GetNotificationsOptions | number
  ): Promise<{ data: NotificationRecord[]; error: Error | null; nextCursor: NotificationCursor | null }> => {
    return getNotificationsFromUserNotifications(context, options)
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (
    context: UserContext,
    notificationId: string
  ): ServiceResult => {
    const result = await markNotificationReadFromUserNotifications(context, notificationId)
    return { data: result.success ? true : null, error: result.error }
  },

  /**
   * Mark all notifications as read for a user
   */
  markAllAsRead: async (context: UserContext): ServiceResult => {
    const result = await markAllNotificationsReadFromUserNotifications(context)
    return { data: result.success ? true : null, error: result.error }
  },

  /**
   * Archive a notification
   */
  archiveNotification: async (
    context: UserContext,
    notificationId: string
  ): ServiceResult => {
    const result = await archiveNotificationFromUserNotifications(context, notificationId)
    return { data: result.success ? true : null, error: result.error }
  },

  /**
   * Soft delete a notification
   */
  deleteNotification: async (
    context: UserContext,
    notificationId: string
  ): ServiceResult => {
    const result = await deleteNotificationFromUserNotifications(context, notificationId)
    return { data: result.success ? true : null, error: result.error }
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
    return getUnreadCountFromUserNotifications(context)
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
