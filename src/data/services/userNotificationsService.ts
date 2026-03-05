import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS, DEMO_ORG_A_ID, DEMO_USER_IDS } from '../config'
import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import type { UserContext } from '../fake/userContext'
import type { NotificationRecord, NotificationAction, NotificationPresentation, NotificationRole } from '../../types/notifications'
import { ACTION_ROLE_MAP } from '../../types/notifications'
import {
  fakeNotifications,
  getNotificationsForUser,
  getUnreadNotificationCount,
  type FakeNotification,
} from '../fake/fakeMessages'

export interface NotificationCursor {
  created_at: string
  id: string
}

export interface GetNotificationsOptions {
  limit?: number
  cursor?: NotificationCursor | null
  includeArchived?: boolean
  includeDeleted?: boolean
}

async function simulateDelay(): Promise<void> {
  if (FAKE_DATA_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
  }
}

type DbNotificationRow = Database['public']['Tables']['user_notifications']['Row']
type DbNotificationRowExtended = DbNotificationRow & {
  action?: unknown
  type?: unknown
  presentation_type?: unknown
  role_context?: unknown
  entity_type?: unknown
  entity_id?: string | null
  link_url?: string | null
  metadata?: Record<string, unknown> | null
  archived_at?: string | null
  deleted_at?: string | null
}

type FakeNotificationExtended = FakeNotification & {
  archived_at?: string | null
  deleted_at?: string | null
}

type NotificationReadMeta = {
  action?: string | null
  entity_type?: string | null
  created_at?: string | null
}

const VALID_ACTIONS = new Set<NotificationAction>(Object.keys(ACTION_ROLE_MAP) as NotificationAction[])
const VALID_PRESENTATIONS: NotificationPresentation[] = ['info', 'warning', 'urgent']
const VALID_ROLES: NotificationRole[] = ['guardian', 'parent', 'coach', 'org_admin']

function normalizeAction(action: unknown): NotificationAction {
  if (typeof action === 'string' && VALID_ACTIONS.has(action as NotificationAction)) {
    return action as NotificationAction
  }
  return 'system_generated_notice'
}

function normalizePresentation(value: unknown): NotificationPresentation {
  if (typeof value === 'string' && VALID_PRESENTATIONS.includes(value as NotificationPresentation)) {
    return value as NotificationPresentation
  }
  return 'info'
}

function normalizeRole(value: unknown): NotificationRole {
  if (typeof value === 'string' && VALID_ROLES.includes(value as NotificationRole)) {
    return value === 'parent' ? 'guardian' : (value as NotificationRole)
  }
  return 'guardian'
}

function mapDbNotification(row: DbNotificationRow): NotificationRecord {
  const rowExtended = row as DbNotificationRowExtended
  return {
    id: row.id,
    user_id: row.user_id,
    org_id: row.org_id,
    team_id: row.team_id ?? null,
    action: normalizeAction(rowExtended.action ?? rowExtended.type),
    presentation_type: normalizePresentation(rowExtended.presentation_type ?? 'info'),
    role_context: normalizeRole(rowExtended.role_context),
    entity_type: (rowExtended.entity_type ?? null) as NotificationRecord['entity_type'],
    entity_id: rowExtended.entity_id ?? null,
    title: row.title,
    body: row.body,
    link_url: rowExtended.link_url ?? null,
    metadata: rowExtended.metadata ?? null,
    dedupe_key: row.dedupe_key,
    read_at: row.read_at,
    archived_at: rowExtended.archived_at ?? null,
    deleted_at: rowExtended.deleted_at ?? null,
    created_at: row.created_at,
  }
}

function mapFakeNotification(fake: FakeNotification): NotificationRecord {
  const fakeExtended = fake as FakeNotificationExtended
  return {
    id: fake.id,
    user_id: fake.user_id,
    org_id: fake.org_id,
    team_id: fake.team_id,
    action: fake.action,
    presentation_type: fake.presentation_type,
    role_context: fake.role_context,
    entity_type: fake.entity_type,
    entity_id: fake.entity_id,
    title: fake.title,
    body: fake.body,
    link_url: fake.link_url,
    metadata: fake.metadata,
    dedupe_key: fake.dedupe_key,
    read_at: fake.read_at,
    archived_at: fakeExtended.archived_at ?? null,
    deleted_at: fakeExtended.deleted_at ?? null,
    created_at: fake.created_at,
  }
}

function isNotificationsDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.pathname.startsWith('/portal/notifications')
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Unknown error')
      if (lastError.message.includes('permission') || lastError.message.includes('not found')) {
        throw lastError
      }
      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  throw lastError || new Error('Operation failed after retries')
}

export async function getNotifications(
  context: UserContext,
  options: GetNotificationsOptions | number = {}
): Promise<{ data: NotificationRecord[]; error: Error | null; nextCursor: NotificationCursor | null }> {
  const opts: GetNotificationsOptions = typeof options === 'number' ? { limit: options } : options

  const limit = opts.limit ?? 50
  const cursor = opts.cursor ?? null
  const includeArchived = opts.includeArchived ?? false
  const includeDeleted = opts.includeDeleted ?? false

  debug.data('UserNotificationsService.getNotifications', 'Request', { userId: context.userId, limit, cursor, includeArchived, includeDeleted })
  debug.perf.start('userNotificationsService.getNotifications')

  try {
    if (USE_FAKE_DATA) {
      await simulateDelay()
      let notifications: FakeNotification[]
      let resolutionSource: 'org_admin' | 'direct_user_id' | 'email_map' | 'role_fallback' | 'empty' = 'empty'

      if (context.roles.includes('org_admin')) {
        const adminAmyId = DEMO_USER_IDS['admin-only@example.com']
        const parentAdminId = DEMO_USER_IDS['parent-admin@example.com']
        notifications = fakeNotifications.filter(
          (n) => n.org_id === DEMO_ORG_A_ID &&
          (n.user_id === adminAmyId || n.user_id === parentAdminId || n.user_id === context.userId) &&
          n.role_context === 'org_admin'
        )
        resolutionSource = 'org_admin'
      } else {
        notifications = getNotificationsForUser(context.userId)
        if (notifications.length > 0) {
          resolutionSource = 'direct_user_id'
        }

        if (notifications.length === 0 && context.email) {
          const demoUserId = DEMO_USER_IDS[context.email.toLowerCase().trim()]
          if (demoUserId) {
            notifications = getNotificationsForUser(demoUserId)
            if (notifications.length > 0) {
              resolutionSource = 'email_map'
            }
          }
        }

        if (notifications.length === 0) {
          const roleContexts = new Set<NotificationRole>()
          if (context.roles.includes('parent') || context.roles.includes('guardian')) roleContexts.add('guardian')
          if (context.roles.includes('athlete')) roleContexts.add('athlete')
          if (context.roles.includes('coach')) roleContexts.add('coach')
          if (context.roles.includes('staff')) roleContexts.add('staff')
          if (context.roles.includes('fan')) roleContexts.add('fan')

          if (roleContexts.size > 0) {
            const orgId = context.orgId || DEMO_ORG_A_ID
            notifications = fakeNotifications.filter(
              (n) => n.org_id === orgId && roleContexts.has(n.role_context)
            )
            if (notifications.length > 0) {
              resolutionSource = 'role_fallback'
            }
          }
        }
      }

      if (isNotificationsDebugEnabled()) {
        console.info('[Notifications Debug] fake resolution', {
          userId: context.userId,
          email: context.email,
          orgId: context.orgId,
          roles: context.roles,
          source: resolutionSource,
          count: notifications.length,
        })
      }

      let filtered = notifications
      if (cursor) {
        filtered = notifications.filter(n => {
          const nDate = new Date(n.created_at).getTime()
          const cDate = new Date(cursor.created_at).getTime()
          if (nDate < cDate) return true
          if (nDate === cDate && n.id < cursor.id) return true
          return false
        })
      }

      if (!includeArchived) {
        filtered = filtered.filter(n => !(n as FakeNotificationExtended).archived_at)
      }
      if (!includeDeleted) {
        filtered = filtered.filter(n => !(n as FakeNotificationExtended).deleted_at)
      }

      const data = filtered.map(mapFakeNotification).slice(0, limit)
      const nextCursor = data.length === limit && filtered.length > limit
        ? { created_at: data[data.length - 1].created_at, id: data[data.length - 1].id }
        : null

      debug.perf.end('userNotificationsService.getNotifications')
      debug.data('UserNotificationsService.getNotifications', 'Response (fake)', { userId: context.userId, notificationCount: data.length, nextCursor })
      return { data, error: null, nextCursor }
    }

    let query = supabase
      .from('user_notifications')
      .select('*')
      .eq('user_id', context.userId)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })

    if (!includeDeleted) {
      query = query.is('deleted_at', null)
    }

    if (cursor) {
      const createdAt = encodeURIComponent(cursor.created_at)
      const cursorId = encodeURIComponent(cursor.id)
      query = query.or(`created_at.lt.${createdAt},and(created_at.eq.${createdAt},id.lt.${cursorId})`)
    }

    query = query.limit(limit + 1)

    const { data, error } = await query

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('[getNotifications] user_notifications table not found, returning empty array')
        return { data: [], error: null, nextCursor: null }
      }
      throw error
    }

    const records = (data ?? []).map(mapDbNotification)
    const filtered = includeArchived ? records : records.filter(r => !r.archived_at)

    const hasMore = filtered.length > limit
    const result = hasMore ? filtered.slice(0, limit) : filtered
    const nextCursor = hasMore && result.length > 0
      ? { created_at: result[result.length - 1].created_at, id: result[result.length - 1].id }
      : null

    debug.perf.end('userNotificationsService.getNotifications')
    debug.data('UserNotificationsService.getNotifications', 'Response', { userId: context.userId, notificationCount: result.length, nextCursor })
    return { data: result, error: null, nextCursor }
  } catch (err) {
    debug.perf.end('userNotificationsService.getNotifications')
    if (err && typeof err === 'object' && 'code' in err && err.code === 'PGRST116') {
      debug.data('UserNotificationsService.getNotifications', 'Response (table not found)', { userId: context.userId })
      console.warn('[getNotifications] user_notifications table not found, returning empty array')
      return { data: [], error: null, nextCursor: null }
    }
    debug.error('UserNotificationsService.getNotifications', 'Failed to get notifications', { error: err, userId: context.userId })
    return { data: [], error: err instanceof Error ? err : new Error('Unknown error'), nextCursor: null }
  }
}

export async function getUnreadCount(
  context: UserContext
): Promise<{ data: number; error: Error | null }> {
  debug.data('UserNotificationsService.getUnreadCount', 'Request', { userId: context.userId })
  debug.perf.start('userNotificationsService.getUnreadCount')

  try {
    if (USE_FAKE_DATA) {
      const count = getUnreadNotificationCount(context.userId)
      debug.perf.end('userNotificationsService.getUnreadCount')
      debug.data('UserNotificationsService.getUnreadCount', 'Response (fake)', { userId: context.userId, count })
      return { data: count, error: null }
    }

    const { count, error } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', context.userId)
      .is('read_at', null)

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('relation') || error.message?.includes('does not exist')) {
        console.warn('[getUnreadCount] user_notifications table not found, returning 0')
        return { data: 0, error: null }
      }
      throw error
    }

    debug.perf.end('userNotificationsService.getUnreadCount')
    debug.data('UserNotificationsService.getUnreadCount', 'Response', { userId: context.userId, count: count || 0 })
    return { data: count || 0, error: null }
  } catch (err) {
    debug.perf.end('userNotificationsService.getUnreadCount')
    if (err && typeof err === 'object' && 'code' in err && err.code === 'PGRST116') {
      debug.data('UserNotificationsService.getUnreadCount', 'Response (table not found)', { userId: context.userId })
      console.warn('[getUnreadCount] user_notifications table not found, returning 0')
      return { data: 0, error: null }
    }
    debug.error('UserNotificationsService.getUnreadCount', 'Failed to get unread count', { error: err, userId: context.userId })
    return { data: 0, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function markNotificationRead(
  context: UserContext,
  notificationId: string
): Promise<{ success: boolean; error: Error | null }> {
  debug.flow('UserNotificationsService.markNotificationRead', 'Marking notification as read', { notificationId, userId: context.userId })
  debug.perf.start('userNotificationsService.markNotificationRead')

  try {
    if (USE_FAKE_DATA) {
      debug.perf.end('userNotificationsService.markNotificationRead')
      debug.flow('UserNotificationsService.markNotificationRead', 'Notification marked as read (fake)', { notificationId })
      return { success: true, error: null }
    }

    const result = await retryOperation(async () => {
      type NotificationUpdate = Database['public']['Tables']['user_notifications']['Update']
      const updateData = { read_at: new Date().toISOString() } satisfies NotificationUpdate
      const { error } = await supabase
        .from('user_notifications')
        .update(updateData)
        .eq('id', notificationId)
        .eq('user_id', context.userId)
        .is('deleted_at', null)

      if (error) throw error
      return true
    })

    const { data: notification } = await supabase
      .from('user_notifications')
      .select('action, entity_type, entity_id, created_at')
      .eq('id', notificationId)
      .single()
    const readMeta = (notification ?? null) as NotificationReadMeta | null

    debug.perf.end('userNotificationsService.markNotificationRead')
    debug.flow('UserNotificationsService.markNotificationRead', 'Notification marked as read successfully', {
      notificationId,
      action: readMeta?.action,
      entityType: readMeta?.entity_type,
      timeToRead: readMeta?.created_at
        ? Math.round((Date.now() - new Date(readMeta.created_at).getTime()) / 1000)
        : null,
    })
    return { success: result, error: null }
  } catch (err) {
    debug.perf.end('userNotificationsService.markNotificationRead')
    debug.error('UserNotificationsService.markNotificationRead', 'Failed to mark notification as read', { error: err, notificationId })
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function markAllNotificationsRead(
  context: UserContext
): Promise<{ success: boolean; error: Error | null }> {
  debug.flow('UserNotificationsService.markAllNotificationsRead', 'Marking all notifications as read', { userId: context.userId })
  debug.perf.start('userNotificationsService.markAllNotificationsRead')

  try {
    if (USE_FAKE_DATA) {
      debug.perf.end('userNotificationsService.markAllNotificationsRead')
      debug.flow('UserNotificationsService.markAllNotificationsRead', 'All notifications marked as read (fake)', { userId: context.userId })
      return { success: true, error: null }
    }

    const result = await retryOperation(async () => {
      type NotificationUpdate = Database['public']['Tables']['user_notifications']['Update']
      const updateData = { read_at: new Date().toISOString() } satisfies NotificationUpdate
      const { error } = await supabase
        .from('user_notifications')
        .update(updateData)
        .eq('user_id', context.userId)
        .is('read_at', null)
        .is('deleted_at', null)

      if (error) throw error
      return true
    })

    const { count } = await supabase
      .from('user_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', context.userId)
      .not('read_at', 'is', null)
      .is('deleted_at', null)

    debug.perf.end('userNotificationsService.markAllNotificationsRead')
    debug.flow('UserNotificationsService.markAllNotificationsRead', 'All notifications marked as read successfully', {
      userId: context.userId,
      totalReadCount: count || 0,
    })
    return { success: result, error: null }
  } catch (err) {
    debug.perf.end('userNotificationsService.markAllNotificationsRead')
    debug.error('UserNotificationsService.markAllNotificationsRead', 'Failed to mark all notifications as read', { error: err, userId: context.userId })
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function archiveNotification(
  context: UserContext,
  notificationId: string
): Promise<{ success: boolean; error: Error | null }> {
  debug.flow('UserNotificationsService.archiveNotification', 'Archiving notification', { notificationId, userId: context.userId })
  debug.perf.start('userNotificationsService.archiveNotification')

  try {
    if (USE_FAKE_DATA) {
      debug.perf.end('userNotificationsService.archiveNotification')
      debug.flow('UserNotificationsService.archiveNotification', 'Notification archived (fake)', { notificationId })
      return { success: true, error: null }
    }

    const result = await retryOperation(async () => {
      type NotificationUpdate = Database['public']['Tables']['user_notifications']['Update']
      const updateData = { archived_at: new Date().toISOString() } satisfies NotificationUpdate
      const { error } = await supabase
        .from('user_notifications')
        .update(updateData)
        .eq('id', notificationId)
        .eq('user_id', context.userId)
        .is('deleted_at', null)

      if (error) throw error
      return true
    })

    debug.perf.end('userNotificationsService.archiveNotification')
    debug.flow('UserNotificationsService.archiveNotification', 'Notification archived successfully', { notificationId })
    return { success: result, error: null }
  } catch (err) {
    debug.perf.end('userNotificationsService.archiveNotification')
    debug.error('UserNotificationsService.archiveNotification', 'Failed to archive notification', { error: err, notificationId })
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function deleteNotification(
  context: UserContext,
  notificationId: string
): Promise<{ success: boolean; error: Error | null }> {
  debug.flow('UserNotificationsService.deleteNotification', 'Soft deleting notification', { notificationId, userId: context.userId })
  debug.perf.start('userNotificationsService.deleteNotification')

  try {
    if (USE_FAKE_DATA) {
      debug.perf.end('userNotificationsService.deleteNotification')
      debug.flow('UserNotificationsService.deleteNotification', 'Notification deleted (fake)', { notificationId })
      return { success: true, error: null }
    }

    const result = await retryOperation(async () => {
      type NotificationUpdate = Database['public']['Tables']['user_notifications']['Update']
      const updateData = { deleted_at: new Date().toISOString() } satisfies NotificationUpdate
      const { error } = await supabase
        .from('user_notifications')
        .update(updateData)
        .eq('id', notificationId)
        .eq('user_id', context.userId)
        .is('deleted_at', null)

      if (error) throw error
      return true
    })

    debug.perf.end('userNotificationsService.deleteNotification')
    debug.flow('UserNotificationsService.deleteNotification', 'Notification deleted successfully', { notificationId })
    return { success: result, error: null }
  } catch (err) {
    debug.perf.end('userNotificationsService.deleteNotification')
    debug.error('UserNotificationsService.deleteNotification', 'Failed to delete notification', { error: err, notificationId })
    return { success: false, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
