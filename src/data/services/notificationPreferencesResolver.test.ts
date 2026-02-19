/**
 * Unit tests for notificationPreferencesResolver
 */

import { describe, test, expect, beforeEach } from 'vitest'
import {
  shouldDeliverNotification,
  shouldDeliverNotificationBatch,
  type DeliveryChannels,
} from './notificationPreferencesResolver'
import type { NotificationAction, NotificationRole } from '../../types/notifications'

describe('notificationPreferencesResolver', () => {
  const mockOrgId = 'org-123'
  const mockUserId = 'user-123'
  const mockTeamId = 'team-123'

  describe('shouldDeliverNotification', () => {
    test('returns in-app only when email and push are disabled', () => {
      const preferences = {
        notifications_v2: {
          [mockOrgId]: {
            guardian: {
              events: { inApp: true, email: false, push: false },
            },
          },
        },
      }

      const result = shouldDeliverNotification({
        userId: mockUserId,
        orgId: mockOrgId,
        teamId: mockTeamId,
        action: 'event_created' as NotificationAction,
        role: 'guardian' as NotificationRole,
        preferences: preferences as any,
      })

      expect(result.inApp).toBe(true)
      expect(result.email).toBe(false)
      expect(result.push).toBe(false)
      expect(result.digestInfo).toBeUndefined()
    })

    test('returns email enabled when preference is true', () => {
      const preferences = {
        notifications_v2: {
          [mockOrgId]: {
            guardian: {
              events: { inApp: true, email: true, push: false },
            },
          },
        },
      }

      const result = shouldDeliverNotification({
        userId: mockUserId,
        orgId: mockOrgId,
        teamId: mockTeamId,
        action: 'event_created' as NotificationAction,
        role: 'guardian' as NotificationRole,
        preferences: preferences as any,
      })

      expect(result.email).toBe(true)
    })

    test('returns digest info when digest is enabled', () => {
      const preferences = {
        notifications_v2: {
          [mockOrgId]: {
            guardian: {
              events: {
                inApp: true,
                email: true,
                push: false,
                digestEnabled: true,
                digestWindow: 'daily',
              },
            },
          },
        },
      }

      const result = shouldDeliverNotification({
        userId: mockUserId,
        orgId: mockOrgId,
        teamId: mockTeamId,
        action: 'event_created' as NotificationAction,
        role: 'guardian' as NotificationRole,
        preferences: preferences as any,
      })

      expect(result.digestInfo).toBeDefined()
      expect(result.digestInfo?.shouldDigest).toBe(true)
      expect(result.digestInfo?.digestWindow).toBe('daily')
    })

    test('returns quiet hours info when enabled', () => {
      const preferences = {
        notifications_v2: {
          [mockOrgId]: {
            guardian: {
              events: {
                inApp: true,
                email: true,
                push: false,
                quietHoursEnabled: true,
                quietHoursStart: '22:00',
                quietHoursEnd: '08:00',
                timezone: 'America/New_York',
              },
            },
          },
        },
      }

      const result = shouldDeliverNotification({
        userId: mockUserId,
        orgId: mockOrgId,
        teamId: mockTeamId,
        action: 'event_created' as NotificationAction,
        role: 'guardian' as NotificationRole,
        preferences: preferences as any,
      })

      expect(result.digestInfo?.quietHoursEnabled).toBe(true)
      expect(result.digestInfo?.quietHoursStart).toBe('22:00')
      expect(result.digestInfo?.quietHoursEnd).toBe('08:00')
      expect(result.digestInfo?.timezone).toBe('America/New_York')
    })

    test('falls back to default preferences when org preferences missing', () => {
      const preferences = {
        notifications_v2: {},
      }

      const result = shouldDeliverNotification({
        userId: mockUserId,
        orgId: mockOrgId,
        teamId: mockTeamId,
        action: 'event_created' as NotificationAction,
        role: 'guardian' as NotificationRole,
        preferences: preferences as any,
      })

      // Should use defaults (in-app enabled, email disabled)
      expect(result.inApp).toBe(true)
      expect(result.email).toBe(false)
    })

    test('falls back to default preferences when role preferences missing', () => {
      const preferences = {
        notifications_v2: {
          [mockOrgId]: {},
        },
      }

      const result = shouldDeliverNotification({
        userId: mockUserId,
        orgId: mockOrgId,
        teamId: mockTeamId,
        action: 'event_created' as NotificationAction,
        role: 'guardian' as NotificationRole,
        preferences: preferences as any,
      })

      expect(result.inApp).toBe(true)
      expect(result.email).toBe(false)
    })

    test('maps action to correct group (event_created -> events)', () => {
      const preferences = {
        notifications_v2: {
          [mockOrgId]: {
            guardian: {
              events: { inApp: true, email: true },
            },
          },
        },
      }

      const result = shouldDeliverNotification({
        userId: mockUserId,
        orgId: mockOrgId,
        teamId: mockTeamId,
        action: 'event_created' as NotificationAction,
        role: 'guardian' as NotificationRole,
        preferences: preferences as any,
      })

      expect(result.email).toBe(true)
    })

    test('maps fee_assigned to payments group', () => {
      const preferences = {
        notifications_v2: {
          [mockOrgId]: {
            guardian: {
              payments: { inApp: true, email: true },
            },
          },
        },
      }

      const result = shouldDeliverNotification({
        userId: mockUserId,
        orgId: mockOrgId,
        teamId: mockTeamId,
        action: 'fee_assigned' as NotificationAction,
        role: 'guardian' as NotificationRole,
        preferences: preferences as any,
      })

      expect(result.email).toBe(true)
    })
  })

  describe('shouldDeliverNotificationBatch', () => {
    test('returns delivery channels for multiple users', () => {
      const preferences = {
        notifications_v2: {
          [mockOrgId]: {
            guardian: {
              events: { inApp: true, email: true },
            },
            coach: {
              events: { inApp: true, email: false },
            },
          },
        },
      }

      const result = shouldDeliverNotificationBatch({
        userIds: [mockUserId, 'user-456'],
        orgId: mockOrgId,
        teamId: mockTeamId,
        action: 'event_created' as NotificationAction,
        roles: ['guardian', 'coach'] as NotificationRole[],
        preferences: preferences as any,
      })

      expect(result).toHaveLength(2)
      expect(result[0].inApp).toBe(true)
      expect(result[0].email).toBe(true)
      expect(result[1].inApp).toBe(true)
      expect(result[1].email).toBe(false)
    })

    test('handles missing user preferences gracefully', () => {
      const preferences = {
        notifications_v2: {},
      }

      const result = shouldDeliverNotificationBatch({
        userIds: [mockUserId],
        orgId: mockOrgId,
        teamId: mockTeamId,
        action: 'event_created' as NotificationAction,
        roles: ['guardian'] as NotificationRole[],
        preferences: preferences as any,
      })

      expect(result).toHaveLength(1)
      expect(result[0].inApp).toBe(true) // Default
      expect(result[0].email).toBe(false) // Default
    })
  })
})
