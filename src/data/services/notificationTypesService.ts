/**
 * Notification Types Service
 * 
 * Manages notification types registry and provides utilities for checking
 * active templates and eligible roles.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type { NotificationRole } from '../../types/notifications'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'

const db = supabase as any

export interface NotificationType {
  id: string
  key: string
  display_name: string
  description: string | null
  eligible_roles: string[]
  default_in_app_enabled: boolean
  default_email_enabled: boolean
  supports_in_app: boolean
  supports_email: boolean
  category: string
  created_at: string
  updated_at: string
}

export interface NotificationTypeWithTemplate extends NotificationType {
  active_template_id: string | null
  active_template_name: string | null
}

/**
 * Get notification type by key
 */
export async function getNotificationType(
  key: string
): Promise<{ data: NotificationType | null; error: Error | null }> {
  try {
    const { data, error } = await db
      .from('notification_types')
      .select('*')
      .eq('key', key)
      .single()

    if (error) {
      debug.error('NotificationTypesService.getNotificationType', 'Failed to fetch notification type', {
        error,
        key,
      })
      return { data: null, error: error as Error }
    }

    return { data: data as NotificationType, error: null }
  } catch (err) {
    debug.error('NotificationTypesService.getNotificationType', 'Exception fetching notification type', {
      error: err,
      key,
    })
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get notification type by ID
 */
export async function getNotificationTypeById(
  id: string
): Promise<{ data: NotificationType | null; error: Error | null }> {
  try {
    const { data, error } = await db
      .from('notification_types')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      debug.error('NotificationTypesService.getNotificationTypeById', 'Failed to fetch notification type', {
        error,
        id,
      })
      return { data: null, error: error as Error }
    }

    return { data: data as NotificationType, error: null }
  } catch (err) {
    debug.error('NotificationTypesService.getNotificationTypeById', 'Exception fetching notification type', {
      error: err,
      id,
    })
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get all notification types eligible for a role
 */
export async function getNotificationTypesForRole(
  role: NotificationRole
): Promise<{ data: NotificationType[]; error: Error | null }> {
  try {
    const canonicalRole = role === 'parent' ? 'guardian' : role

    const { data, error } = await db
      .from('notification_types')
      .select('*')
      .contains('eligible_roles', [canonicalRole])
      .order('category', { ascending: true })
      .order('display_name', { ascending: true })

    if (error) {
      debug.error('NotificationTypesService.getNotificationTypesForRole', 'Failed to fetch notification types', {
        error,
        role: canonicalRole,
      })
      return { data: [], error: error as Error }
    }

    return { data: (data || []) as NotificationType[], error: null }
  } catch (err) {
    debug.error('NotificationTypesService.getNotificationTypesForRole', 'Exception fetching notification types', {
      error: err,
      role,
    })
    return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get notification types with active template information
 */
export async function getNotificationTypesWithTemplates(
  role?: NotificationRole
): Promise<{ data: NotificationTypeWithTemplate[]; error: Error | null }> {
  try {
    let query = db
      .from('notification_types')
      .select(`
        *,
        email_templates!inner(id, name, is_active)
      `)
      .eq('email_templates.is_active', true)

    if (role) {
      const canonicalRole = role === 'parent' ? 'guardian' : role
      query = query.contains('eligible_roles', [canonicalRole])
    }

    const { data, error } = await query.order('category', { ascending: true }).order('display_name', { ascending: true })

    if (error) {
      debug.error('NotificationTypesService.getNotificationTypesWithTemplates', 'Failed to fetch notification types', {
        error,
        role,
      })
      return { data: [], error: error as Error }
    }

    // Transform to include active template info
    const transformed = (data || []).map((item: any) => {
      const templates = item.email_templates || []
      const activeTemplate = templates.find((t: any) => t.is_active === true)

      return {
        ...item,
        active_template_id: activeTemplate?.id || null,
        active_template_name: activeTemplate?.name || null,
      } as NotificationTypeWithTemplate
    })

    return { data: transformed, error: null }
  } catch (err) {
    debug.error('NotificationTypesService.getNotificationTypesWithTemplates', 'Exception fetching notification types', {
      error: err,
      role,
    })
    return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Get active email template for a notification type
 */
export async function getActiveEmailTemplate(
  notificationTypeId: string
): Promise<{ data: Database['public']['Tables']['email_templates']['Row'] | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('notification_type_id', notificationTypeId)
      .eq('is_active', true)
      .single()

    if (error) {
      // Not found is not an error - template may not exist
      if (error.code === 'PGRST116') {
        return { data: null, error: null }
      }
      debug.error('NotificationTypesService.getActiveEmailTemplate', 'Failed to fetch active template', {
        error,
        notificationTypeId,
      })
      return { data: null, error: error as Error }
    }

    return { data: data as Database['public']['Tables']['email_templates']['Row'], error: null }
  } catch (err) {
    debug.error('NotificationTypesService.getActiveEmailTemplate', 'Exception fetching active template', {
      error: err,
      notificationTypeId,
    })
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

/**
 * Check if email is available for a notification type (has active template)
 */
export async function isEmailAvailable(
  notificationTypeId: string
): Promise<boolean> {
  const { data, error } = await getActiveEmailTemplate(notificationTypeId)
  return !error && data !== null
}

/**
 * Get all notification types grouped by category
 */
export async function getNotificationTypesByCategory(
  role?: NotificationRole
): Promise<{ data: Record<string, NotificationType[]>; error: Error | null }> {
  const { data, error } = role
    ? await getNotificationTypesForRole(role)
    : await getNotificationTypes({})

  if (error) {
    return { data: {}, error }
  }

  const grouped: Record<string, NotificationType[]> = {}
  for (const type of data) {
    if (!grouped[type.category]) {
      grouped[type.category] = []
    }
    grouped[type.category].push(type)
  }

  return { data: grouped, error: null }
}

/**
 * Get all notification types (with optional filters)
 */
export async function getNotificationTypes(
  filters?: {
    category?: string
    supportsEmail?: boolean
  }
): Promise<{ data: NotificationType[]; error: Error | null }> {
  try {
    let query = db.from('notification_types').select('*')

    if (filters?.category) {
      query = query.eq('category', filters.category)
    }

    if (filters?.supportsEmail !== undefined) {
      query = query.eq('supports_email', filters.supportsEmail)
    }

    const { data, error } = await query.order('category', { ascending: true }).order('display_name', { ascending: true })

    if (error) {
      debug.error('NotificationTypesService.getNotificationTypes', 'Failed to fetch notification types', {
        error,
        filters,
      })
      return { data: [], error: error as Error }
    }

    return { data: (data || []) as NotificationType[], error: null }
  } catch (err) {
    debug.error('NotificationTypesService.getNotificationTypes', 'Exception fetching notification types', {
      error: err,
      filters,
    })
    return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
