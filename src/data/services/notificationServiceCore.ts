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
import { isUrgentAction, isInQuietHours } from './notificationDigestHelper'
import { findGroupForAction } from './notificationPreferencesResolver'

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
    // Resolve preferences for all users in batch
    const preferencesMap = await shouldDeliverNotificationBatch(userIds, orgId, roleContext, action)

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

    // Enqueue email jobs (respecting digest and quiet hours)
    if (emailUsers.length > 0) {
      const jobType = mapActionToJobType(action)
      const isUrgent = isUrgentAction(action)
      const groupConfig = findGroupForAction(action)
      
      if (jobType && !USE_FAKE_DATA) {
        // Fetch user emails and preferences
        const { data: users, error: userError } = await supabase
          .from('users')
          .select('id, email, preferences')
          .in('id', emailUsers)

        if (!userError && users) {
          const immediateJobs: Database['public']['Tables']['notification_jobs']['Insert'][] = []
          const digestEntries: Array<{
            user_id: string
            notification_id: string
            group_id: string
            digest_window: 'daily' | 'weekly'
          }> = []

          for (const user of users.filter(u => u.email)) {
            const channels = preferencesMap.get(user.id)
            const digestInfo = channels?.digestInfo

            // Check if urgent - bypass digest and quiet hours
            if (isUrgent) {
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
                retry_count: 0,
                next_retry_at: null,
              } as any)
              continue
            }

            // Check digest settings
            if (digestInfo?.shouldDigest && groupConfig) {
              // Add to digest buffer instead of immediate email
              const notificationIds = userNotificationMap.get(user.id) || []
              if (notificationIds.length > 0) {
                digestEntries.push({
                  user_id: user.id,
                  notification_id: notificationIds[0], // Use first notification ID
                  group_id: groupConfig.id,
                  digest_window: digestInfo.digestWindow,
                })
              }
              continue
            }

            // Check quiet hours
            if (digestInfo?.quietHoursEnabled) {
              const inQuietHours = isInQuietHours(
                digestInfo.quietHoursStart,
                digestInfo.quietHoursEnd,
                digestInfo.timezone
              )

              if (inQuietHours && groupConfig) {
                // Add to digest buffer during quiet hours
                const notificationIds = userNotificationMap.get(user.id) || []
                if (notificationIds.length > 0) {
                  digestEntries.push({
                    user_id: user.id,
                    notification_id: notificationIds[0],
                    group_id: groupConfig.id,
                    digest_window: digestInfo.digestWindow || 'daily',
                  })
                }
                continue
              }
            }

            // Immediate email (no digest, not in quiet hours)
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
            })
          }

          // Insert immediate jobs
          if (immediateJobs.length > 0) {
            const { error: jobError } = await supabaseAny
              .from('notification_jobs')
              .insert(immediateJobs)

            if (jobError) {
              debug.error('NotificationServiceCore.notifyUsers', 'Failed to enqueue email jobs', {
                error: jobError,
              })
            } else {
              emailCount += immediateJobs.length
              debug.flow('NotificationServiceCore.notifyUsers', 'Email jobs enqueued', {
                count: immediateJobs.length,
                action,
                orgId,
              })
            }
          }

          // Add to digest buffer
          if (digestEntries.length > 0) {
            // Group by user/org/group/role/window for upsert
            const digestMap = new Map<string, string[]>()
            for (const entry of digestEntries) {
              const key = `${entry.user_id}:${orgId}:${entry.group_id}:${roleContext}:${entry.digest_window}:${new Date().toISOString().split('T')[0]}`
              if (!digestMap.has(key)) {
                digestMap.set(key, [])
              }
              digestMap.get(key)!.push(entry.notification_id)
            }

            // Upsert digest buffer entries
            for (const [key, notificationIds] of digestMap.entries()) {
              const [userId, , groupId, , digestWindow] = key.split(':')
              const today = new Date().toISOString().split('T')[0]
              
              // Check if entry exists for today
              const { data: existing } = await supabaseAny
                .from('notification_digest_buffer')
                .select('id, notification_ids')
                .eq('user_id', userId)
                .eq('org_id', orgId)
                .eq('group_id', groupId)
                .eq('role_context', roleContext)
                .eq('digest_window', digestWindow)
                .eq('created_at::date', today)
                .is('processed_at', null)
                .single()

              if (existing) {
                // Update existing entry - merge notification IDs
                const mergedIds = Array.from(new Set([...existing.notification_ids, ...notificationIds]))
                await supabaseAny
                  .from('notification_digest_buffer')
                  .update({ notification_ids: mergedIds })
                  .eq('id', existing.id)
                  .then(() => {
                    debug.flow('NotificationServiceCore.notifyUsers', 'Digest buffer updated', {
                      userId,
                      groupId,
                      notificationCount: mergedIds.length,
                    })
                  })
                  .catch((err: any) => {
                    debug.error('NotificationServiceCore.notifyUsers', 'Failed to update digest buffer', {
                      error: err,
                      key,
                    })
                  })
              } else {
                // Insert new entry
                await supabaseAny
                  .from('notification_digest_buffer')
                  .insert({
                    user_id: userId,
                    org_id: orgId,
                    team_id: teamId || null,
                    group_id: groupId,
                    role_context: roleContext,
                    notification_ids: notificationIds,
                    digest_window: digestWindow,
                    created_at: new Date().toISOString(),
                  })
                  .then(() => {
                    debug.flow('NotificationServiceCore.notifyUsers', 'Digest buffer entry created', {
                      userId,
                      groupId,
                      digestWindow,
                      notificationCount: notificationIds.length,
                    })
                  })
                  .catch((err: any) => {
                    debug.error('NotificationServiceCore.notifyUsers', 'Failed to add to digest buffer', {
                      error: err,
                      key,
                    })
                  })
              }
            }
          }
        }
      } else if (jobType) {
        // Fake data mode - just count
        emailCount = emailUsers.length
      }
    }

    // Push - contract only for now
    pushCount = pushUsers.length
    // TODO: Phase 3 - enqueue push jobs when push delivery is implemented

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
