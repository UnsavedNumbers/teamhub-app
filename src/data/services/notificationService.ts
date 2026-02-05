/**
 * Notification Service (placeholder)
 *
 * Stub implementation used for test imports. Replace with real logic as needed.
 */

type ServiceResult<T = unknown> = Promise<{ data: T | null; error: Error | null }>

export const notificationService = {
  sendNotification: async (): ServiceResult => ({ data: null, error: null }),
  getNotifications: async (): ServiceResult => ({ data: null, error: null }),
  markAsRead: async (): ServiceResult => ({ data: null, error: null }),
  markAllAsRead: async (): ServiceResult => ({ data: null, error: null }),
  deleteNotification: async (): ServiceResult => ({ data: null, error: null }),
  getNotificationSettings: async (): ServiceResult => ({ data: null, error: null }),
  updateNotificationSettings: async (): ServiceResult => ({ data: null, error: null }),
  sendBulkNotification: async (): ServiceResult => ({ data: null, error: null }),
  subscribeToNotifications: async (): ServiceResult => ({ data: null, error: null }),
  unsubscribeFromNotifications: async (): ServiceResult => ({ data: null, error: null }),
}
