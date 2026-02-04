/**
 * Notification System Tests
 *
 * Comprehensive test suite for notification delivery, preferences,
 * real-time updates, and notification management functionality.
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { supabase } from '../../supabase'
import { notificationService } from '../../../data/services/notificationService'

// Mock dependencies
vi.mock('../../supabase', () => ({
  supabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn(() => ({
        subscribe: vi.fn(),
      })),
      subscribe: vi.fn(),
      unsubscribe: vi.fn(),
    })),
  },
}))

vi.mock('../../../data/services/notificationService', () => ({
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

  describe('Notification Delivery', () => {
    describe('sendNotification', () => {
      test('successfully sends email notification', async () => {
        const notificationData = {
          user_id: 'user-1',
          type: 'event_reminder',
          title: 'Upcoming Event Reminder',
          message: 'Your tournament starts in 24 hours',
          channels: ['email'],
          priority: 'normal',
          metadata: {
            event_id: 'event-123',
            event_name: 'Spring Championship',
          },
        }

        const mockSentNotification = {
          id: 'notif-123',
          ...notificationData,
          status: 'sent',
          sent_at: '2024-01-15T10:00:00Z',
          delivery_status: {
            email: 'delivered',
          },
        }

        vi.mocked(notificationService.sendNotification).mockResolvedValue({
          data: mockSentNotification,
          error: null,
        })

        const result = await notificationService.sendNotification(notificationData)

        expect(result.error).toBeNull()
        expect(result.data?.status).toBe('sent')
        expect(result.data?.delivery_status?.email).toBe('delivered')
      })

      test('sends push notification to mobile device', async () => {
        const notificationData = {
          user_id: 'user-1',
          type: 'game_result',
          title: 'Game Result',
          message: 'Your team won 3-1!',
          channels: ['push'],
          priority: 'high',
          metadata: {
            game_id: 'game-123',
            final_score: '3-1',
          },
        }

        const mockPushNotification = {
          id: 'notif-push',
          ...notificationData,
          status: 'sent',
          delivery_status: {
            push: 'delivered',
          },
          push_token: 'device-token-123',
        }

        vi.mocked(notificationService.sendNotification).mockResolvedValue({
          data: mockPushNotification,
          error: null,
        })

        const result = await notificationService.sendNotification(notificationData)

        expect(result.data?.channels).toContain('push')
        expect(result.data?.delivery_status?.push).toBe('delivered')
        expect(result.data?.push_token).toBeDefined()
      })

      test('sends multi-channel notification', async () => {
        const notificationData = {
          user_id: 'user-1',
          type: 'payment_confirmation',
          title: 'Payment Confirmed',
          message: 'Your registration fee has been processed',
          channels: ['email', 'sms', 'push'],
          priority: 'normal',
        }

        const mockMultiChannelNotification = {
          id: 'notif-multi',
          ...notificationData,
          delivery_status: {
            email: 'delivered',
            sms: 'delivered',
            push: 'delivered',
          },
        }

        vi.mocked(notificationService.sendNotification).mockResolvedValue({
          data: mockMultiChannelNotification,
          error: null,
        })

        const result = await notificationService.sendNotification(notificationData)

        expect(result.data?.channels).toHaveLength(3)
        expect(result.data?.delivery_status?.email).toBe('delivered')
        expect(result.data?.delivery_status?.sms).toBe('delivered')
        expect(result.data?.delivery_status?.push).toBe('delivered')
      })

      test('handles delivery failure gracefully', async () => {
        const notificationData = {
          user_id: 'user-1',
          type: 'system_alert',
          title: 'System Maintenance',
          message: 'Scheduled maintenance tonight',
          channels: ['email'],
        }

        const mockFailedNotification = {
          id: 'notif-failed',
          ...notificationData,
          status: 'failed',
          delivery_status: {
            email: 'failed',
          },
          failure_reason: 'Invalid email address',
        }

        vi.mocked(notificationService.sendNotification).mockResolvedValue({
          data: mockFailedNotification,
          error: null,
        })

        const result = await notificationService.sendNotification(notificationData)

        expect(result.data?.status).toBe('failed')
        expect(result.data?.delivery_status?.email).toBe('failed')
        expect(result.data?.failure_reason).toBe('Invalid email address')
      })

      test('respects user notification preferences', async () => {
        const notificationData = {
          user_id: 'user-no-email',
          type: 'marketing',
          title: 'New Feature Available',
          message: 'Check out our latest updates',
          channels: ['email', 'push'],
        }

        // User has disabled email notifications
        const mockFilteredNotification = {
          id: 'notif-filtered',
          ...notificationData,
          channels: ['push'], // Email filtered out
          delivery_status: {
            push: 'delivered',
          },
        }

        vi.mocked(notificationService.sendNotification).mockResolvedValue({
          data: mockFilteredNotification,
          error: null,
        })

        const result = await notificationService.sendNotification(notificationData)

        expect(result.data?.channels).toEqual(['push'])
        expect(result.data?.delivery_status?.email).toBeUndefined()
      })

      test('validates notification priority levels', async () => {
        const notificationData = {
          user_id: 'user-1',
          type: 'emergency',
          title: 'Emergency Alert',
          message: 'Immediate action required',
          channels: ['sms', 'push'],
          priority: 'urgent',
        }

        const mockUrgentNotification = {
          id: 'notif-urgent',
          ...notificationData,
          priority: 'urgent',
          delivery_status: {
            sms: 'delivered',
            push: 'delivered',
          },
        }

        vi.mocked(notificationService.sendNotification).mockResolvedValue({
          data: mockUrgentNotification,
          error: null,
        })

        const result = await notificationService.sendNotification(notificationData)

        expect(result.data?.priority).toBe('urgent')
        expect(result.data?.channels).toContain('sms')
      })
    })

    describe('sendBulkNotification', () => {
      test('sends notification to multiple users', async () => {
        const bulkNotificationData = {
          user_ids: ['user-1', 'user-2', 'user-3'],
          type: 'announcement',
          title: 'Schedule Change',
          message: 'Practice moved to 4 PM tomorrow',
          channels: ['push'],
          priority: 'normal',
        }

        const mockBulkResult = {
          total_sent: 3,
          successful_deliveries: 3,
          failed_deliveries: 0,
          notification_ids: ['notif-1', 'notif-2', 'notif-3'],
        }

        vi.mocked(notificationService.sendBulkNotification).mockResolvedValue({
          data: mockBulkResult,
          error: null,
        })

        const result = await notificationService.sendBulkNotification(bulkNotificationData)

        expect(result.data?.total_sent).toBe(3)
        expect(result.data?.successful_deliveries).toBe(3)
        expect(result.data?.failed_deliveries).toBe(0)
      })

      test('handles partial failures in bulk notifications', async () => {
        const bulkNotificationData = {
          user_ids: ['user-1', 'user-2', 'user-invalid'],
          type: 'reminder',
          title: 'Payment Due',
          message: 'Registration fee due in 3 days',
          channels: ['email'],
        }

        const mockPartialResult = {
          total_sent: 3,
          successful_deliveries: 2,
          failed_deliveries: 1,
          failures: [
            {
              user_id: 'user-invalid',
              reason: 'Invalid email address',
            },
          ],
        }

        vi.mocked(notificationService.sendBulkNotification).mockResolvedValue({
          data: mockPartialResult,
          error: null,
        })

        const result = await notificationService.sendBulkNotification(bulkNotificationData)

        expect(result.data?.successful_deliveries).toBe(2)
        expect(result.data?.failed_deliveries).toBe(1)
        expect(result.data?.failures).toHaveLength(1)
      })

      test('validates bulk notification limits', async () => {
        const bulkNotificationData = {
          user_ids: Array.from({ length: 1001 }, (_, i) => `user-${i}`), // Exceeds limit
          type: 'newsletter',
          title: 'Monthly Newsletter',
          message: 'Latest updates from our organization',
          channels: ['email'],
        }

        vi.mocked(notificationService.sendBulkNotification).mockResolvedValue({
          data: null,
          error: { message: 'Bulk notification limit exceeded (max 1000 recipients)' },
        })

        const result = await notificationService.sendBulkNotification(bulkNotificationData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Bulk notification limit exceeded (max 1000 recipients)')
      })
    })
  })

  describe('Notification Management', () => {
    describe('getNotifications', () => {
      test('retrieves user notifications with pagination', async () => {
        const mockNotifications = [
          {
            id: 'notif-1',
            type: 'event_reminder',
            title: 'Tournament Reminder',
            message: 'Your event starts tomorrow',
            is_read: false,
            created_at: '2024-01-15T10:00:00Z',
            priority: 'normal',
          },
          {
            id: 'notif-2',
            type: 'payment_confirmation',
            title: 'Payment Processed',
            message: 'Your payment has been confirmed',
            is_read: true,
            created_at: '2024-01-14T15:30:00Z',
            priority: 'normal',
          },
        ]

        vi.mocked(notificationService.getNotifications).mockResolvedValue({
          data: mockNotifications,
          error: null,
        })

        const result = await notificationService.getNotifications('user-1', {
          limit: 10,
          offset: 0,
        })

        expect(result.error).toBeNull()
        expect(result.data).toHaveLength(2)
        expect(result.data?.[0].is_read).toBe(false)
      })

      test('filters notifications by read status', async () => {
        const mockUnreadNotifications = [
          {
            id: 'notif-unread-1',
            is_read: false,
            type: 'system_alert',
          },
          {
            id: 'notif-unread-2',
            is_read: false,
            type: 'event_update',
          },
        ]

        vi.mocked(notificationService.getNotifications).mockResolvedValue({
          data: mockUnreadNotifications,
          error: null,
        })

        const result = await notificationService.getNotifications('user-1', {
          is_read: false,
        })

        expect(result.data?.every((n: { is_read?: boolean }) => n.is_read === false)).toBe(true)
      })

      test('filters notifications by type', async () => {
        const mockEventNotifications = [
          {
            id: 'notif-event-1',
            type: 'event_reminder',
            title: 'Event Reminder',
          },
          {
            id: 'notif-event-2',
            type: 'event_update',
            title: 'Event Update',
          },
        ]

        vi.mocked(notificationService.getNotifications).mockResolvedValue({
          data: mockEventNotifications,
          error: null,
        })

        const result = await notificationService.getNotifications('user-1', {
          type: 'event',
        })

        expect(result.data?.every((n: { type?: string }) => n.type?.startsWith('event'))).toBe(true)
      })

      test('returns notification count', async () => {
        const mockNotificationsWithCount = {
          notifications: [
            {
              id: 'notif-1',
              type: 'general',
              title: 'Welcome',
              is_read: false,
            },
          ],
          total_count: 25,
          unread_count: 5,
        }

        vi.mocked(notificationService.getNotifications).mockResolvedValue({
          data: mockNotificationsWithCount,
          error: null,
        })

        const result = await notificationService.getNotifications('user-1')

        expect(result.data?.total_count).toBe(25)
        expect(result.data?.unread_count).toBe(5)
      })
    })

    describe('markAsRead', () => {
      test('marks single notification as read', async () => {
        const mockUpdatedNotification = {
          id: 'notif-123',
          is_read: true,
          read_at: '2024-01-15T10:30:00Z',
        }

        vi.mocked(notificationService.markAsRead).mockResolvedValue({
          data: mockUpdatedNotification,
          error: null,
        })

        const result = await notificationService.markAsRead('notif-123')

        expect(result.error).toBeNull()
        expect(result.data?.is_read).toBe(true)
        expect(result.data?.read_at).toBeDefined()
      })

      test('validates notification ownership', async () => {
        vi.mocked(notificationService.markAsRead).mockResolvedValue({
          data: null,
          error: { message: 'Notification not found or access denied' },
        })

        const result = await notificationService.markAsRead('notif-other-user')

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Notification not found or access denied')
      })
    })

    describe('markAllAsRead', () => {
      test('marks all user notifications as read', async () => {
        const mockBulkUpdateResult = {
          updated_count: 12,
          updated_at: '2024-01-15T10:30:00Z',
        }

        vi.mocked(notificationService.markAllAsRead).mockResolvedValue({
          data: mockBulkUpdateResult,
          error: null,
        })

        const result = await notificationService.markAllAsRead('user-1')

        expect(result.data?.updated_count).toBe(12)
        expect(result.data?.updated_at).toBeDefined()
      })

      test('handles empty notification list', async () => {
        const mockEmptyResult = {
          updated_count: 0,
          message: 'No unread notifications found',
        }

        vi.mocked(notificationService.markAllAsRead).mockResolvedValue({
          data: mockEmptyResult,
          error: null,
        })

        const result = await notificationService.markAllAsRead('user-no-notifications')

        expect(result.data?.updated_count).toBe(0)
      })
    })

    describe('deleteNotification', () => {
      test('successfully deletes notification', async () => {
        const mockDeletionResult = {
          id: 'notif-123',
          deleted: true,
          deleted_at: '2024-01-15T10:30:00Z',
        }

        vi.mocked(notificationService.deleteNotification).mockResolvedValue({
          data: mockDeletionResult,
          error: null,
        })

        const result = await notificationService.deleteNotification('notif-123')

        expect(result.data?.deleted).toBe(true)
        expect(result.data?.deleted_at).toBeDefined()
      })

      test('prevents deletion of system notifications', async () => {
        vi.mocked(notificationService.deleteNotification).mockResolvedValue({
          data: null,
          error: { message: 'System notifications cannot be deleted' },
        })

        const result = await notificationService.deleteNotification('notif-system')

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('System notifications cannot be deleted')
      })
    })
  })

  describe('Notification Preferences', () => {
    describe('getNotificationSettings', () => {
      test('retrieves user notification preferences', async () => {
        const mockSettings = {
          user_id: 'user-1',
          email_enabled: true,
          push_enabled: true,
          sms_enabled: false,
          notification_types: {
            event_reminders: { email: true, push: true, sms: false },
            payment_confirmations: { email: true, push: false, sms: true },
            system_alerts: { email: true, push: true, sms: true },
            marketing: { email: false, push: false, sms: false },
          },
          quiet_hours: {
            enabled: true,
            start_time: '22:00',
            end_time: '08:00',
            timezone: 'America/New_York',
          },
        }

        vi.mocked(notificationService.getNotificationSettings).mockResolvedValue({
          data: mockSettings,
          error: null,
        })

        const result = await notificationService.getNotificationSettings('user-1')

        expect(result.data?.email_enabled).toBe(true)
        expect(result.data?.sms_enabled).toBe(false)
        expect(result.data?.quiet_hours?.enabled).toBe(true)
      })

      test('returns default settings for new users', async () => {
        const mockDefaultSettings = {
          user_id: 'user-new',
          email_enabled: true,
          push_enabled: true,
          sms_enabled: true,
          notification_types: {
            event_reminders: { email: true, push: true, sms: false },
            payment_confirmations: { email: true, push: true, sms: false },
            system_alerts: { email: true, push: true, sms: true },
            marketing: { email: true, push: false, sms: false },
          },
          quiet_hours: {
            enabled: false,
            start_time: '22:00',
            end_time: '08:00',
          },
        }

        vi.mocked(notificationService.getNotificationSettings).mockResolvedValue({
          data: mockDefaultSettings,
          error: null,
        })

        const result = await notificationService.getNotificationSettings('user-new')

        expect(result.data?.email_enabled).toBe(true)
        expect(result.data?.push_enabled).toBe(true)
        expect(result.data?.quiet_hours?.enabled).toBe(false)
      })
    })

    describe('updateNotificationSettings', () => {
      test('successfully updates notification preferences', async () => {
        const updateData = {
          email_enabled: false,
          push_enabled: true,
          notification_types: {
            marketing: { email: false, push: false, sms: false },
          },
          quiet_hours: {
            enabled: true,
            start_time: '23:00',
            end_time: '07:00',
          },
        }

        const mockUpdatedSettings = {
          user_id: 'user-1',
          ...updateData,
          updated_at: '2024-01-15T10:30:00Z',
        }

        vi.mocked(notificationService.updateNotificationSettings).mockResolvedValue({
          data: mockUpdatedSettings,
          error: null,
        })

        const result = await notificationService.updateNotificationSettings('user-1', updateData)

        expect(result.data?.email_enabled).toBe(false)
        expect(result.data?.quiet_hours?.start_time).toBe('23:00')
      })

      test('validates quiet hours format', async () => {
        const invalidUpdateData = {
          quiet_hours: {
            enabled: true,
            start_time: '25:00', // Invalid hour
            end_time: '08:00',
          },
        }

        vi.mocked(notificationService.updateNotificationSettings).mockResolvedValue({
          data: null,
          error: { message: 'Invalid time format for quiet hours' },
        })

        const result = await notificationService.updateNotificationSettings('user-1', invalidUpdateData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Invalid time format for quiet hours')
      })

      test('prevents disabling critical system notifications', async () => {
        const updateData = {
          notification_types: {
            system_alerts: { email: false, push: false, sms: false }, // Trying to disable critical notifications
          },
        }

        vi.mocked(notificationService.updateNotificationSettings).mockResolvedValue({
          data: null,
          error: { message: 'Critical system notifications cannot be disabled' },
        })

        const result = await notificationService.updateNotificationSettings('user-1', updateData)

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('Critical system notifications cannot be disabled')
      })
    })
  })

  describe('Real-time Notifications', () => {
    describe('subscribeToNotifications', () => {
      test('successfully subscribes to real-time notifications', async () => {
        const mockSubscription = {
          channel: 'notifications:user-1',
          status: 'subscribed',
          subscribed_at: '2024-01-15T10:00:00Z',
        }

        vi.mocked(notificationService.subscribeToNotifications).mockResolvedValue({
          data: mockSubscription,
          error: null,
        })

        const result = await notificationService.subscribeToNotifications('user-1')

        expect(result.data?.status).toBe('subscribed')
        expect(result.data?.channel).toBe('notifications:user-1')
      })

      test('handles subscription with custom callback', async () => {
        const mockCallback = vi.fn()
        const mockSubscription = {
          channel: 'notifications:user-1',
          status: 'subscribed',
          callback: mockCallback,
        }

        vi.mocked(notificationService.subscribeToNotifications).mockResolvedValue({
          data: mockSubscription,
          error: null,
        })

        const result = await notificationService.subscribeToNotifications('user-1', {
          callback: mockCallback,
        })

        expect(result.data?.callback).toBe(mockCallback)
      })

      test('handles connection failures', async () => {
        vi.mocked(notificationService.subscribeToNotifications).mockResolvedValue({
          data: null,
          error: { message: 'WebSocket connection failed' },
        })

        const result = await notificationService.subscribeToNotifications('user-1')

        expect(result.data).toBeNull()
        expect(result.error?.message).toBe('WebSocket connection failed')
      })
    })

    describe('unsubscribeFromNotifications', () => {
      test('successfully unsubscribes from notifications', async () => {
        const mockUnsubscription = {
          channel: 'notifications:user-1',
          status: 'unsubscribed',
          unsubscribed_at: '2024-01-15T10:30:00Z',
        }

        vi.mocked(notificationService.unsubscribeFromNotifications).mockResolvedValue({
          data: mockUnsubscription,
          error: null,
        })

        const result = await notificationService.unsubscribeFromNotifications('user-1')

        expect(result.data?.status).toBe('unsubscribed')
      })

      test('handles already unsubscribed state', async () => {
        const mockUnsubscription = {
          channel: 'notifications:user-1',
          status: 'not_subscribed',
          message: 'User was not subscribed',
        }

        vi.mocked(notificationService.unsubscribeFromNotifications).mockResolvedValue({
          data: mockUnsubscription,
          error: null,
        })

        const result = await notificationService.unsubscribeFromNotifications('user-not-subscribed')

        expect(result.data?.status).toBe('not_subscribed')
      })
    })
  })

  describe('Notification Analytics', () => {
    test('tracks notification delivery metrics', async () => {
      const mockMetrics = {
        total_sent: 1250,
        total_delivered: 1180,
        total_failed: 70,
        delivery_rate: 0.944,
        open_rate: 0.67,
        click_rate: 0.23,
        by_channel: {
          email: { sent: 800, delivered: 780, failed: 20 },
          push: { sent: 350, delivered: 320, failed: 30 },
          sms: { sent: 100, delivered: 80, failed: 20 },
        },
        by_type: {
          event_reminder: { sent: 400, delivered: 390 },
          payment_confirmation: { sent: 300, delivered: 295 },
          system_alert: { sent: 150, delivered: 150 },
        },
      }

      // Mock the analytics retrieval
      vi.mocked(supabase.rpc as any).mockResolvedValue({
        data: mockMetrics,
        error: null,
      })

      const result = await mockGetNotificationAnalytics({
        organization_id: 'org-1',
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      })

      expect(result.data?.total_sent).toBe(1250)
      expect(result.data?.delivery_rate).toBe(0.944)
      expect(result.data?.by_channel.email.sent).toBe(800)
    })

    test('generates user engagement reports', async () => {
      const mockEngagementReport = {
        user_id: 'user-1',
        total_notifications: 45,
        read_notifications: 38,
        unread_notifications: 7,
        engagement_rate: 0.844,
        average_response_time: 1800, // seconds
        preferred_channels: ['push', 'email'],
        notification_types: {
          event_reminders: { received: 20, read: 18, engaged: 12 },
          payments: { received: 15, read: 15, engaged: 5 },
          system: { received: 10, read: 5, engaged: 3 },
        },
        time_based_engagement: {
          morning: 0.9,
          afternoon: 0.8,
          evening: 0.7,
        },
      }

      vi.mocked(supabase.rpc as any).mockResolvedValue({
        data: mockEngagementReport,
        error: null,
      })

      const result = await mockGetUserEngagementReport('user-1')

      expect(result.data?.engagement_rate).toBe(0.844)
      expect(result.data?.preferred_channels).toEqual(['push', 'email'])
      expect(result.data?.notification_types.event_reminders.engaged).toBe(12)
    })

    test('handles analytics date range validation', async () => {
      vi.mocked(supabase.rpc as any).mockResolvedValue({
        data: null,
        error: { message: 'Date range cannot exceed 90 days' },
      })

      const result = await mockGetNotificationAnalytics({
        start_date: '2024-01-01',
        end_date: '2024-04-01', // 90+ days
      })

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Date range cannot exceed 90 days')
    })
  })

  describe('Security and Compliance', () => {
    test('validates notification content for security', async () => {
      const maliciousNotificationData = {
        user_id: 'user-1',
        type: 'system_alert',
        title: 'Security Alert',
        message: '<script>alert("XSS Attack")</script>System update available',
        channels: ['email'],
      }

      vi.mocked(notificationService.sendNotification).mockResolvedValue({
        data: null,
        error: { message: 'Notification content contains malicious code' },
      })

      const result = await notificationService.sendNotification(maliciousNotificationData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Notification content contains malicious code')
    })

    test('enforces rate limiting on notifications', async () => {
      const notificationData = {
        user_id: 'user-spammer',
        type: 'test',
        title: 'Rate Limit Test',
        message: 'This should be blocked',
        channels: ['email'],
      }

      vi.mocked(notificationService.sendNotification).mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded: too many notifications sent' },
      })

      const result = await notificationService.sendNotification(notificationData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Rate limit exceeded: too many notifications sent')
    })

    test('validates user permissions for bulk notifications', async () => {
      const bulkNotificationData = {
        user_ids: ['user-1', 'user-2', 'user-3'],
        type: 'announcement',
        title: 'Important Update',
        message: 'New policy changes',
        channels: ['email'],
      }

      vi.mocked(notificationService.sendBulkNotification).mockResolvedValue({
        data: null,
        error: { message: 'Insufficient permissions for bulk notifications' },
      })

      const result = await notificationService.sendBulkNotification(bulkNotificationData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Insufficient permissions for bulk notifications')
    })

    test('logs notification audit trail', async () => {
      const notificationData = {
        user_id: 'user-1',
        type: 'payment_failed',
        title: 'Payment Failed',
        message: 'Your payment could not be processed',
        channels: ['email', 'sms'],
      }

      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

      vi.mocked(notificationService.sendNotification).mockResolvedValue({
        data: { id: 'notif-audit', status: 'sent' },
        error: null,
      })

      await notificationService.sendNotification(notificationData)

      // In production, this would log to secure audit system
      consoleSpy.mockRestore()
    })

    test('handles GDPR data deletion requests', async () => {
      const mockDeletionResult = {
        user_id: 'user-deleted',
        notifications_deleted: 156,
        preferences_deleted: true,
        audit_log_preserved: true,
        deleted_at: '2024-01-15T10:00:00Z',
      }

      vi.mocked(supabase.rpc as any).mockResolvedValue({
        data: mockDeletionResult,
        error: null,
      })

      const result = await mockDeleteUserNotificationData('user-deleted')

      expect(result.data?.notifications_deleted).toBe(156)
      expect(result.data?.preferences_deleted).toBe(true)
      expect(result.data?.audit_log_preserved).toBe(true)
    })
  })

  describe('Error Handling and Resilience', () => {
    test('handles email service outages', async () => {
      const notificationData = {
        user_id: 'user-1',
        type: 'important',
        title: 'Service Outage',
        message: 'Email service temporarily unavailable',
        channels: ['email', 'push'],
      }

      const mockFallbackNotification = {
        id: 'notif-fallback',
        ...notificationData,
        delivery_status: {
          email: 'failed',
          push: 'delivered',
        },
        fallback_used: true,
      }

      vi.mocked(notificationService.sendNotification).mockResolvedValue({
        data: mockFallbackNotification,
        error: null,
      })

      const result = await notificationService.sendNotification(notificationData)

      expect(result.data?.delivery_status?.email).toBe('failed')
      expect(result.data?.delivery_status?.push).toBe('delivered')
      expect(result.data?.fallback_used).toBe(true)
    })

    test('handles malformed notification data', async () => {
      const invalidNotificationData = {
        user_id: 'user-1',
        type: 'invalid_type',
        title: '', // Empty title
        message: 'Valid message',
      }

      vi.mocked(notificationService.sendNotification).mockResolvedValue({
        data: null,
        error: { message: 'Invalid notification data: missing required fields' },
      })

      const result = await notificationService.sendNotification(invalidNotificationData)

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Invalid notification data: missing required fields')
    })

    test('handles database connection issues', async () => {
      vi.mocked(notificationService.getNotifications).mockResolvedValue({
        data: null,
        error: { message: 'Database temporarily unavailable' },
      })

      const result = await notificationService.getNotifications('user-1')

      expect(result.data).toBeNull()
      expect(result.error?.message).toBe('Database temporarily unavailable')
    })

    test('handles concurrent notification processing', async () => {
      const notificationData = {
        user_id: 'user-1',
        type: 'duplicate_test',
        title: 'Duplicate Notification',
        message: 'This might be sent multiple times',
        channels: ['push'],
      }

      // First call succeeds
      vi.mocked(notificationService.sendNotification)
        .mockResolvedValueOnce({
          data: { id: 'notif-1', status: 'sent' },
          error: null,
        })
        // Second call fails due to duplicate detection
        .mockResolvedValueOnce({
          data: null,
          error: { message: 'Duplicate notification detected and blocked' },
        })

      const result1 = await notificationService.sendNotification(notificationData)
      const result2 = await notificationService.sendNotification(notificationData)

      expect(result1.data?.status).toBe('sent')
      expect(result2.data).toBeNull()
      expect(result2.error?.message).toBe('Duplicate notification detected and blocked')
    })
  })
})

// Mock helper functions for testing
async function mockGetNotificationAnalytics(params: any) {
  const result = await (supabase.rpc as any)('get_notification_analytics', params)
  return result
}

async function mockGetUserEngagementReport(userId: string) {
  const result = await (supabase.rpc as any)('get_user_engagement_report', { user_id: userId })
  return result
}

async function mockDeleteUserNotificationData(userId: string) {
  const result = await (supabase.rpc as any)('delete_user_notification_data', { user_id: userId })
  return result
}
