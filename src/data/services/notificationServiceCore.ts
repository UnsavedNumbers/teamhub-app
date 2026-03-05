/**
 * Core Notification Service
 *
 * Central API for creating notifications that respects user preferences
 * and handles multi-channel delivery (in-app, email, push).
 */

import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import { debug } from '../../lib/debug'
import type { NotificationAction, NotificationRole, NotificationEntityType } from '../../types/notifications'
import { defaultPresentationForAction } from '../../types/notifications'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { shouldDeliverNotificationBatch } from './notificationPreferencesResolver'
import { mapActionToJobType } from './notificationJobMapper'
import { getNotificationTypeIdFromAction } from './notificationTypeMapper'
import { shouldDeliverNotificationBatchRelational } from './userNotificationPreferencesService'
import { getActiveEmailTemplate } from './notificationTypesService'
import { enqueueNotification, generateIdempotencyKey } from './notificationOutboxService'

const supabaseAny = supabase as any

export interface NotifyUsersOptions {
  userIds: string[]
  orgId: string
  teamId?: string | null
  action: NotificationAction
  roleContext: NotificationRole
  title: string
  body: string
  entityType?: NotificationEntityType | null
  entityId?: string | null
  linkUrl?: string | null
  metadata?: Record<string, unknown> | null
  presentation?: 'info' | 'warning' | 'urgent'
  dedupeKey?: string
}

export interface NotifyUsersResult {
  success: boolean
  inAppCount: number
  emailCount: number
  pushCount: number
  error: Error | null
}

/**
 * Build dedupe key for a notification
 */
function buildDedupeKey(
  userId: string,
  action: NotificationAction,
  entityId: string | null | undefined,
  entityType: NotificationEntityType | null | undefined,
  customKey?: string
): string {
  if (customKey) return customKey
  const entityPart = entityId ?? entityType ?? 'none'
  return `${action}:${userId}:${entityPart}`
}

/**
 * Notify multiple users with a single notification
 * Respects user preferences and only creates notifications for enabled channels
 */
export async function notifyUsers(options: NotifyUsersOptions): Promise<NotifyUsersResult> {
  const {
    userIds,
    orgId,
    teamId,
    action,
    roleContext,
    title,
    body,
    entityType,
    entityId,
    linkUrl,
    metadata,
    presentation,
    dedupeKey,
  } = options

  debug.flow('NotificationServiceCore.notifyUsers', 'Notifying users', {
    userIdCount: userIds.length,
    orgId,
    teamId,
    action,
    roleContext,
    entityType,
    entityId,
  })
  debug.perf.start('notificationServiceCore.notifyUsers')

  if (userIds.length === 0) {
    debug.perf.end('notificationServiceCore.notifyUsers')
    return { success: true, inAppCount: 0, emailCount: 0, pushCount: 0, error: null }
  }

  try {
    // Resolve notification type ID from action
    const { data: notificationTypeId, error: typeError } = await getNotificationTypeIdFromAction(action)
    
    let preferencesMap: Map<string, { inApp: boolean; email: boolean; push?: boolean }>
    
    if (typeError || !notificationTypeId) {
      // Fallback to old JSONB preference system for backward compatibility
      debug.data('NotificationServiceCore.notifyUsers', 'Using legacy preference system', { action, error: typeError })
      const oldPreferencesMap = await shouldDeliverNotificationBatch(userIds, orgId, roleContext, action)
      preferencesMap = new Map()
      oldPreferencesMap.forEach((channels, userId) => {
        preferencesMap.set(userId, {
          inApp: channels.inApp,
          email: channels.email,
          push: channels.push,
        })
      })
    } else {
      // Use new relational preference system
      const relationalMap = await shouldDeliverNotificationBatchRelational(
        userIds,
        orgId,
        roleContext,
        notificationTypeId
      )
      preferencesMap = new Map()
      relationalMap.forEach((channels, userId) => {
        preferencesMap.set(userId, {
          inApp: channels.inApp,
          email: channels.email,
          push: channels.push,
        })
      })
    }

    // Separate users by channel
    const inAppUsers: string[] = []
    const emailUsers: string[] = []
    const pushUsers: string[] = []

    preferencesMap.forEach((channels, userId) => {
      if (channels.inApp) inAppUsers.push(userId)
      if (channels.email) emailUsers.push(userId)
      if (channels.push) pushUsers.push(userId)
    })

    let inAppCount = 0
    let emailCount = 0
    let pushCount = 0
    
    // Map of user_id -> notification IDs for digest buffer (populated after insert)
    const userNotificationMap = new Map<string, string[]>()

    // Create in-app notifications
    if (inAppUsers.length > 0) {
      const presentationType = presentation ?? defaultPresentationForAction(action)
      const normalizedRole = roleContext === 'parent' ? 'guardian' : roleContext

      if (USE_FAKE_DATA) {
        // In fake data mode, just count
        inAppCount = inAppUsers.length
      } else {
        const notificationsToInsert = inAppUsers.map((userId) => {
          const dedupe = buildDedupeKey(userId, action, entityId, entityType, dedupeKey)
          return {
            user_id: userId,
            org_id: orgId,
            team_id: teamId ?? null,
            action: action,
            role_context: normalizedRole,
            presentation_type: presentationType,
            entity_type: (entityType ?? null) as NotificationEntityType | null,
            entity_id: entityId ?? null,
            link_url: linkUrl ?? null,
            metadata: (metadata ?? null) as any,
            payload: (metadata ?? null) as any,
            title: title,
            body: body,
            dedupe_key: dedupe,
            type: action, // legacy column
          } satisfies Database['public']['Tables']['user_notifications']['Insert']
        })

        const { data: insertedNotifications, error: insertError } = await supabase
          .from('user_notifications')
          .insert(notificationsToInsert)
          .select('id, user_id')

        if (insertError) {
          debug.error('NotificationServiceCore.notifyUsers', 'Failed to insert in-app notifications', {
            error: insertError,
          })
          throw insertError
        }

        inAppCount = insertedNotifications?.length || notificationsToInsert.length
        
        // Populate map of user_id -> notification IDs for digest buffer
        if (insertedNotifications) {
          for (const notif of insertedNotifications) {
            if (!userNotificationMap.has(notif.user_id)) {
              userNotificationMap.set(notif.user_id, [])
            }
            userNotificationMap.get(notif.user_id)!.push(notif.id)
          }
        }
      }
    }

    // Enqueue email notifications (using new outbox system)
    if (emailUsers.length > 0 && !USE_FAKE_DATA) {
      if (notificationTypeId) {
        // Use new outbox system
        const { data: activeTemplate } = await getActiveEmailTemplate(notificationTypeId)
        
        if (activeTemplate) {
          // Fetch user emails
          const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, email')
            .in('id', emailUsers)

          if (!userError && users) {
            // Get notification type key for idempotency key generation
            const { data: notificationType, error: typeKeyError } = await supabaseAny
              .from('notification_types')
              .select('key')
              .eq('id', notificationTypeId)
              .single()

            if (!typeKeyError && notificationType) {
              const typeKey = (notificationType as { key: string }).key
              const outboxEntries = []

              for (const user of users.filter(u => u.email)) {
                const idempotencyKey = generateIdempotencyKey(
                  typeKey,
                  orgId,
                  user.id,
                  entityId || null,
                  undefined
                )

                const { data: entry, error: enqueueError } = await enqueueNotification({
                  notificationTypeId,
                  orgId,
                  actorUserId: null,
                  targetUserId: user.id,
                  channel: 'email',
                  payload: {
                    action,
                    title,
                    body,
                    link_url: linkUrl,
                    entity_type: entityType,
                    entity_id: entityId,
                    email: user.email,
                    ...metadata,
                  },
                  templateId: activeTemplate.id,
                  idempotencyKey,
                  entityId: entityId || null,
                  entityType: entityType || null,
                })

                if (!enqueueError && entry) {
                  outboxEntries.push(entry)
                }
              }

              emailCount = outboxEntries.length
              debug.flow('NotificationServiceCore.notifyUsers', 'Email notifications enqueued to outbox', {
                count: outboxEntries.length,
                action,
                orgId,
              })
            } else {
              debug.error('NotificationServiceCore.notifyUsers', 'Failed to fetch notification type key', {
                error: typeKeyError,
                notificationTypeId,
              })
            }
          } else {
            debug.error('NotificationServiceCore.notifyUsers', 'Failed to fetch user emails', {
              error: userError,
            })
          }
        } else {
          // No active template - skip email delivery
          debug.data('NotificationServiceCore.notifyUsers', 'Skipping email - no active template', {
            notificationTypeId,
            action,
          })
        }
      } else {
        // Fallback to old notification_jobs system for backward compatibility
        const jobType = mapActionToJobType(action)
        if (jobType) {
          const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, email')
            .in('id', emailUsers)

          if (!userError && users) {
            const immediateJobs: Database['public']['Tables']['notification_jobs']['Insert'][] = []

            for (const user of users.filter(u => u.email)) {
              immediateJobs.push({
                org_id: orgId,
                user_id: user.id,
                email: user.email!,
                type: jobType,
                payload: {
                  action,
                  title,
                  body,
                  link_url: linkUrl,
                  entity_type: entityType,
                  entity_id: entityId,
                  ...metadata,
                } as any,
                status: 'queued' as const,
              } as any)
            }

            if (immediateJobs.length > 0) {
              const { error: jobError } = await supabaseAny
                .from('notification_jobs')
                .insert(immediateJobs)

              if (!jobError) {
                emailCount = immediateJobs.length
              }
            }
          }
        } else {
          // Fake data mode - just count
          emailCount = emailUsers.length
        }
      }
    } else if (emailUsers.length > 0 && USE_FAKE_DATA) {
      // Fake data mode - just count
      emailCount = emailUsers.length
    }

    // Enqueue push notifications (unified outbox channel)
    if (pushUsers.length > 0 && !USE_FAKE_DATA && notificationTypeId) {
      // Get notification type key for idempotency generation
      const { data: notificationType, error: typeKeyError } = await supabaseAny
        .from('notification_types')
        .select('key')
        .eq('id', notificationTypeId)
        .single()

      if (!typeKeyError && notificationType) {
        const typeKey = (notificationType as { key: string }).key
        const pushEntries = []

        for (const userId of pushUsers) {
          const idempotencyKey = `${generateIdempotencyKey(
            typeKey,
            orgId,
            userId,
            entityId || null,
            undefined
          )}:push`

          const { data: entry, error: enqueueError } = await enqueueNotification({
            notificationTypeId,
            orgId,
            actorUserId: null,
            targetUserId: userId,
            channel: 'push',
            payload: {
              action,
              title,
              body,
              link_url: linkUrl,
              entity_type: entityType,
              entity_id: entityId,
              ...metadata,
            },
            idempotencyKey,
            entityId: entityId || null,
            entityType: entityType || null,
          })

          if (!enqueueError && entry) {
            pushEntries.push(entry)
          }
        }

        pushCount = pushEntries.length
      } else {
        debug.error('NotificationServiceCore.notifyUsers', 'Failed to fetch notification type key for push', {
          error: typeKeyError,
          notificationTypeId,
        })
      }
    } else if (pushUsers.length > 0 && USE_FAKE_DATA) {
      pushCount = pushUsers.length
    }

    debug.perf.end('notificationServiceCore.notifyUsers')
    debug.flow('NotificationServiceCore.notifyUsers', 'Notifications created', {
      inAppCount,
      emailCount,
      pushCount,
    })

    return {
      success: true,
      inAppCount,
      emailCount,
      pushCount,
      error: null,
    }
  } catch (err) {
    debug.perf.end('notificationServiceCore.notifyUsers')
    debug.error('NotificationServiceCore.notifyUsers', 'Failed to notify users', {
      error: err,
      userIds,
      orgId,
      action,
    })

    return {
      success: false,
      inAppCount: 0,
      emailCount: 0,
      pushCount: 0,
      error: err instanceof Error ? err : new Error('Unknown error notifying users'),
    }
  }
}
