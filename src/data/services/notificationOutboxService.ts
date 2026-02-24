/**
 * Notification Outbox Service
 * 
 * Manages the unified notifications_outbox queue for all notification delivery.
 * Handles idempotency key generation and outbox entry creation.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA } from '../config'

const db = supabase as any

export type NotificationChannel = 'in_app' | 'email' | 'push'
export type NotificationOutboxStatus = 'queued' | 'sent' | 'failed' | 'skipped'

export interface NotificationOutboxEntry {
  id: string
  notification_type_id: string
  org_id: string
  actor_user_id: string | null
  target_user_id: string
  channel: NotificationChannel
  payload_json: Record<string, unknown>
  template_id: string | null
  status: NotificationOutboxStatus
  error_message: string | null
  idempotency_key: string
  created_at: string
  processed_at: string | null
}

export interface EnqueueNotificationOptions {
  notificationTypeId: string
  orgId: string
  actorUserId?: string | null
  targetUserId: string
  channel: NotificationChannel
  payload: Record<string, unknown>
  templateId?: string | null
  idempotencyKey?: string
  entityId?: string | null
  entityType?: string | null
}

/**
 * Generate idempotency key for a notification
 */
export function generateIdempotencyKey(
  notificationTypeKey: string,
  orgId: string,
  targetUserId: string,
  entityId?: string | null,
  eventVersion?: string
): string {
  const parts = [
    notificationTypeKey,
    orgId,
    targetUserId,
    entityId || 'none',
    eventVersion || new Date().toISOString().split('T')[0],
  ]
  return parts.join(':')
}

/**
 * Enqueue a notification in the outbox
 */
export async function enqueueNotification(
  options: EnqueueNotificationOptions
): Promise<{ data: NotificationOutboxEntry | null; error: Error | null }> {
  // Skip in demo mode - notifications are not sent in demo
  if (USE_FAKE_DATA) {
    debug.data('NotificationOutboxService.enqueueNotification', 'Skipped - demo mode', {
      notificationTypeId: options.notificationTypeId,
      targetUserId: options.targetUserId,
    })
    return { data: null, error: null }
  }

  try {
    const { data: notificationType, error: typeError } = await db
      .from('notification_types')
      .select('key')
      .eq('id', options.notificationTypeId)
      .single()

    if (typeError || !notificationType) {
      debug.error('NotificationOutboxService.enqueueNotification', 'Failed to fetch notification type', {
        error: typeError,
        notificationTypeId: options.notificationTypeId,
      })
      return { data: null, error: typeError as Error || new Error('Notification type not found') }
    }

    const typeKey = (notificationType as { key: string }).key
    const idempotencyKey =
      options.idempotencyKey ||
      generateIdempotencyKey(
        typeKey,
        options.orgId,
        options.targetUserId,
        options.entityId,
        undefined
      )

    const { data, error } = await db
      .from('notifications_outbox')
      .insert({
        notification_type_id: options.notificationTypeId,
        org_id: options.orgId,
        actor_user_id: options.actorUserId || null,
        target_user_id: options.targetUserId,
        channel: options.channel,
        payload_json: options.payload,
        template_id: options.templateId || null,
        status: 'queued',
        idempotency_key: idempotencyKey,
      } as any)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        debug.data('NotificationOutboxService.enqueueNotification', 'Duplicate notification prevented', {
          idempotencyKey,
        })
        const { data: existing } = await db
          .from('notifications_outbox')
          .select('*')
          .eq('idempotency_key', idempotencyKey)
          .single()

        return { data: existing as NotificationOutboxEntry, error: null }
      }

      debug.error('NotificationOutboxService.enqueueNotification', 'Failed to enqueue notification', {
        error,
        options,
      })
      return { data: null, error: error as Error }
    }

    return { data: data as NotificationOutboxEntry, error: null }
  } catch (err) {
    debug.error('NotificationOutboxService.enqueueNotification', 'Exception enqueueing notification', {
      error: err,
      options,
    })
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Update outbox entry status
 */
export async function updateOutboxStatus(
  entryId: string,
  status: NotificationOutboxStatus,
  errorMessage?: string | null
): Promise<{ success: boolean; error: Error | null }> {
  // Skip in demo mode
  if (USE_FAKE_DATA) {
    debug.data('NotificationOutboxService.updateOutboxStatus', 'Skipped - demo mode', {
      entryId,
      status,
    })
    return { success: true, error: null }
  }

  try {
    const updateData: any = {
      status,
      error_message: errorMessage || null,
    }

    if (status !== 'queued') {
      updateData.processed_at = new Date().toISOString()
    }

    const { error } = await db
      .from('notifications_outbox')
      .update(updateData)
      .eq('id', entryId)

    if (error) {
      debug.error('NotificationOutboxService.updateOutboxStatus', 'Failed to update status', {
        error,
        entryId,
        status,
      })
      return { success: false, error: error as Error }
    }

    return { success: true, error: null }
  } catch (err) {
    debug.error('NotificationOutboxService.updateOutboxStatus', 'Exception updating status', {
      error: err,
      entryId,
      status,
    })
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
