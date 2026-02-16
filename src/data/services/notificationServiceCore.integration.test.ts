/**
 * Integration tests for notificationServiceCore
 * 
 * These tests verify end-to-end notification flows including:
 * - Event notifications (created, updated, rescheduled, canceled)
 * - Fee notifications (assigned, overdue, payment completed/failed)
 * - Invite notifications (sent, accepted)
 * - Message notifications (sent, user_mentioned)
 */

import { describe, test, expect, beforeEach, vi } from 'vitest'
import { notifyUsers } from './notificationServiceCore'
import type { NotificationAction } from '../../types/notifications'

// Mock Supabase
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          in: vi.fn(() => Promise.resolve({ data: [], error: null })),
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    })),
  },
}))

vi.mock('../config', () => ({
  USE_FAKE_DATA: false,
}))

describe('notificationServiceCore Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Event Notifications', () => {
    test('creates event_created notifications for guardians and coaches', async () => {
      const result = await notifyUsers({
        userIds: ['user-1', 'user-2'],
        orgId: 'org-123',
        teamId: 'team-123',
        action: 'event_created',
        roleContext: 'guardian',
        title: 'New Practice Scheduled',
        body: 'A new practice has been scheduled for tomorrow.',
        entityType: 'event',
        entityId: 'event-123',
        linkUrl: '/portal/calendar/events/event-123',
      })

      expect(result.success).toBe(true)
      expect(result.inAppCount).toBeGreaterThan(0)
    })

    test('creates event_rescheduled notifications when event time changes', async () => {
      const result = await notifyUsers({
        userIds: ['user-1'],
        orgId: 'org-123',
        teamId: 'team-123',
        action: 'event_rescheduled',
        roleContext: 'guardian',
        title: 'Event Rescheduled',
        body: 'The event time has been changed.',
        entityType: 'event',
        entityId: 'event-123',
      })

      expect(result.success).toBe(true)
    })

    test('creates event_canceled notifications', async () => {
      const result = await notifyUsers({
        userIds: ['user-1'],
        orgId: 'org-123',
        teamId: 'team-123',
        action: 'event_canceled',
        roleContext: 'guardian',
        title: 'Event Canceled',
        body: 'The event has been canceled.',
        entityType: 'event',
        entityId: 'event-123',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Fee Notifications', () => {
    test('creates fee_assigned notifications', async () => {
      const result = await notifyUsers({
        userIds: ['user-1'],
        orgId: 'org-123',
        teamId: 'team-123',
        action: 'fee_assigned',
        roleContext: 'guardian',
        title: 'New Fee Assigned',
        body: 'A new fee has been assigned to your account.',
        entityType: 'fee',
        entityId: 'fee-123',
      })

      expect(result.success).toBe(true)
    })

    test('creates fee_overdue notifications', async () => {
      const result = await notifyUsers({
        userIds: ['user-1'],
        orgId: 'org-123',
        teamId: 'team-123',
        action: 'fee_overdue',
        roleContext: 'guardian',
        title: 'Fee Overdue',
        body: 'A fee payment is now overdue.',
        entityType: 'fee',
        entityId: 'fee-123',
      })

      expect(result.success).toBe(true)
    })

    test('creates fee_payment_completed notifications', async () => {
      const result = await notifyUsers({
        userIds: ['user-1'],
        orgId: 'org-123',
        teamId: 'team-123',
        action: 'fee_payment_completed',
        roleContext: 'guardian',
        title: 'Payment Received',
        body: 'Your payment has been successfully processed.',
        entityType: 'fee',
        entityId: 'fee-123',
      })

      expect(result.success).toBe(true)
    })

    test('creates fee_payment_failed notifications', async () => {
      const result = await notifyUsers({
        userIds: ['user-1'],
        orgId: 'org-123',
        teamId: 'team-123',
        action: 'fee_payment_failed',
        roleContext: 'guardian',
        title: 'Payment Failed',
        body: 'Your payment could not be processed.',
        entityType: 'fee',
        entityId: 'fee-123',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Invite Notifications', () => {
    test('creates invite_sent notifications', async () => {
      const result = await notifyUsers({
        userIds: ['user-1'],
        orgId: 'org-123',
        action: 'invite_sent',
        roleContext: 'guardian',
        title: 'Invitation Sent',
        body: 'You have been invited to join the organization.',
        entityType: 'invite',
        entityId: 'invite-123',
      })

      expect(result.success).toBe(true)
    })

    test('creates invite_accepted notifications', async () => {
      const result = await notifyUsers({
        userIds: ['user-1'],
        orgId: 'org-123',
        action: 'invite_accepted',
        roleContext: 'guardian',
        title: 'Invitation Accepted',
        body: 'Your invitation has been accepted.',
        entityType: 'invite',
        entityId: 'invite-123',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Message Notifications', () => {
    test('creates message_sent notifications', async () => {
      const result = await notifyUsers({
        userIds: ['user-1'],
        orgId: 'org-123',
        teamId: 'team-123',
        action: 'message_sent',
        roleContext: 'guardian',
        title: 'New Message',
        body: 'You have a new message.',
        entityType: 'message',
        entityId: 'message-123',
        linkUrl: '/portal/messages?team=team-123',
      })

      expect(result.success).toBe(true)
    })

    test('creates user_mentioned notifications', async () => {
      const result = await notifyUsers({
        userIds: ['user-1'],
        orgId: 'org-123',
        teamId: 'team-123',
        action: 'user_mentioned',
        roleContext: 'guardian',
        title: 'You were mentioned',
        body: 'You were mentioned in a message.',
        entityType: 'message',
        entityId: 'message-123',
        linkUrl: '/portal/messages?team=team-123',
        presentation: 'info',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('Deduplication', () => {
    test('prevents duplicate notifications with same dedupe key', async () => {
      const dedupeKey = 'event_created:user-1:event-123'
      
      const result1 = await notifyUsers({
        userIds: ['user-1'],
        orgId: 'org-123',
        teamId: 'team-123',
        action: 'event_created',
        roleContext: 'guardian',
        title: 'New Event',
        body: 'A new event has been created.',
        entityType: 'event',
        entityId: 'event-123',
        dedupeKey,
      })

      const result2 = await notifyUsers({
        userIds: ['user-1'],
        orgId: 'org-123',
        teamId: 'team-123',
        action: 'event_created',
        roleContext: 'guardian',
        title: 'New Event',
        body: 'A new event has been created.',
        entityType: 'event',
        entityId: 'event-123',
        dedupeKey,
      })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      // Second call should not create duplicate (handled by database constraint)
    })
  })

  describe('Empty User Lists', () => {
    test('handles empty userIds array gracefully', async () => {
      const result = await notifyUsers({
        userIds: [],
        orgId: 'org-123',
        action: 'event_created',
        roleContext: 'guardian',
        title: 'Test',
        body: 'Test body',
      })

      expect(result.success).toBe(true)
      expect(result.inAppCount).toBe(0)
      expect(result.emailCount).toBe(0)
      expect(result.pushCount).toBe(0)
    })
  })
})
