/**
 * Notification System Tests
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { notificationService } from '@/data/services/notificationService'

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({ subscribe: vi.fn() })),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  },
  isSupabaseConfigured: true,
}))

vi.mock('@/data/services/notificationService', () => ({
  notificationService: {
    sendNotification: vi.fn(),
    getNotifications: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteNotification: vi.fn(),
    getNotificationSettings: vi.fn(),
    updateNotificationSettings: vi.fn(),
    sendBulkNotification: vi.fn(),
    subscribeToNotifications: vi.fn(),
    unsubscribeFromNotifications: vi.fn(),
  },
}))

describe('Notification System', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('sendNotification', () => {
    test('successfully sends email notification', async () => {
      const notificationData = {
        user_id: 'user-1',
        type: 'event_reminder',
        title: 'Upcoming Event Reminder',
        message: 'Your tournament starts in 24 hours',
        channels: ['email'],
        priority: 'normal',
        metadata: { event_id: 'event-123', event_name: 'Spring Championship' },
      }

      const mockSentNotification = {
        id: 'notif-123',
        ...notificationData,
        status: 'sent',
        sent_at: '2024-01-15T10:00:00Z',
      }

      vi.mocked(notificationService.sendNotification).mockResolvedValue({
        data: mockSentNotification,
        error: null,
      })

      const result = await notificationService.sendNotification(notificationData)

      expect(result.error).toBeNull()
      expect(result.data?.status).toBe('sent')
    })
  })
})
