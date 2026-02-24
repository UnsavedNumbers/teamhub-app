import type { NotificationAction, NotificationRole } from '../types/notifications'
import { isRoleAllowedForAction } from '../types/notifications'
import type {
  DeliveryChannel,
  NotificationGroup,
  NotificationPreferencesByOrg,
} from '../types/notificationPreferences'

type Translator = (key: string) => string

type GroupConfig = {
  id: NotificationGroup['id']
  labelKey: string
  actions: NotificationAction[]
}

const DEFAULT_CHANNELS: DeliveryChannel[] = ['in_app', 'email']

export const GROUP_CONFIGS: GroupConfig[] = [
  {
    id: 'events',
    labelKey: 'portal.settings.notifications.groups.events',
    actions: ['event_created', 'event_updated', 'event_canceled', 'event_rsvp_required', 'event_weather_alert'],
  },
  {
    id: 'travel',
    labelKey: 'portal.settings.notifications.groups.travel',
    actions: [
      'travel_created',
      'travel_updated',
      'travel_canceled',
      'travel_dates_changed',
      'travel_lodging_added',
      'travel_transport_added',
    ],
  },
  {
    id: 'payments',
    labelKey: 'portal.settings.notifications.groups.payments',
    actions: ['fee_assigned', 'fee_payment_completed', 'fee_overdue', 'payout_processed'],
  },
  {
    id: 'athletes',
    labelKey: 'portal.settings.notifications.groups.athletes',
    actions: ['athlete_added_to_team', 'athlete_removed_from_team', 'guardian_attached'],
  },
  {
    id: 'uniforms',
    labelKey: 'portal.settings.notifications.groups.uniforms',
    actions: ['uniform_order_opened', 'uniform_size_requested', 'uniform_missing_info'],
  },
  {
    id: 'announcements',
    labelKey: 'portal.settings.notifications.groups.announcements',
    actions: ['announcement_created', 'announcement_urgent'],
  },
  {
    id: 'messages',
    labelKey: 'portal.settings.notifications.groups.messages',
    actions: ['message_sent', 'user_mentioned', 'message_pinned'],
  },
  {
    id: 'system',
    labelKey: 'portal.settings.notifications.groups.system',
    actions: ['system_generated_notice', 'license_expiring', 'feature_enabled'],
  },
]

const VALID_CHANNELS: DeliveryChannel[] = ['in_app', 'email', 'push']

/**
 * Canonicalize notification role.
 * Only 'parent' needs normalization to 'guardian'.
 * All other roles (including new roles: team_manager, athlete, staff, platform_admin) pass through unchanged.
 */
export function canonicalRole(role: NotificationRole): NotificationRole {
  return role === 'parent' ? 'guardian' : role
}

export function buildDefaultNotificationGroups(role: NotificationRole, t: Translator): NotificationGroup[] {
  const canonical = canonicalRole(role)

  return GROUP_CONFIGS.map((group) => {
    const actions = group.actions.filter((action) => isRoleAllowedForAction(action, canonical))
    if (actions.length === 0) {
      return null
    }
    return {
      id: group.id,
      label: t(group.labelKey),
      actions: actions.map((id) => ({ id, enabled: true })),
      allEnabled: true,
      digestEnabled: false,
      digestWindow: 'daily',
      quietHoursEnabled: false,
      channels: [...DEFAULT_CHANNELS],
    } satisfies NotificationGroup
  }).filter(Boolean) as NotificationGroup[]
}

export function mergeNotificationPreferences(
  saved: NotificationGroup[] | undefined,
  role: NotificationRole,
  t: Translator
): NotificationGroup[] {
  const defaults = buildDefaultNotificationGroups(role, t)
  if (!saved || saved.length === 0) return defaults

  return defaults.map((def) => {
    const existing = saved.find((g) => g.id === def.id)
    if (!existing) return def

    const actions = def.actions.map((defAction) => {
      const match = existing.actions.find((a) => a.id === defAction.id)
      return match ? { ...defAction, enabled: !!match.enabled } : defAction
    })

    const channels = (existing.channels || []).filter((ch): ch is DeliveryChannel =>
      VALID_CHANNELS.includes(ch as DeliveryChannel)
    )

    return {
      ...def,
      allEnabled: existing.allEnabled ?? def.allEnabled,
      digestEnabled: existing.digestEnabled ?? def.digestEnabled,
      digestWindow: existing.digestWindow ?? def.digestWindow,
      quietHoursEnabled: existing.quietHoursEnabled ?? def.quietHoursEnabled,
      quietHoursStart: existing.quietHoursStart ?? def.quietHoursStart,
      quietHoursEnd: existing.quietHoursEnd ?? def.quietHoursEnd,
      timezone: existing.timezone ?? def.timezone,
      channels: channels.length > 0 ? channels : def.channels,
      actions,
    }
  })
}

export function setPreferencesForContext(
  existing: NotificationPreferencesByOrg | undefined,
  orgId: string,
  role: NotificationRole,
  groups: NotificationGroup[]
): NotificationPreferencesByOrg {
  const canonical = canonicalRole(role)
  return {
    ...(existing ?? {}),
    [orgId]: {
      ...(existing?.[orgId] ?? {}),
      [canonical]: groups,
    },
  }
}

/**
 * Convert relational preferences to NotificationGroup format
 * This function loads preferences from the relational user_notification_preferences table
 * and converts them to the NotificationGroup format used by the UI
 */
export async function loadNotificationGroupsFromRelational(
  userId: string,
  orgId: string,
  role: NotificationRole,
  t: Translator
): Promise<NotificationGroup[]> {
  const { getUserPreferences } = await import('../data/services/userNotificationPreferencesService')
  const { getNotificationTypeIdFromAction } = await import('../data/services/notificationTypeMapper')
  const { isEmailAvailable } = await import('../data/services/notificationTypesService')
  
  const canonical = canonicalRole(role)
  const defaults = buildDefaultNotificationGroups(canonical, t)
  
  // Load user preferences from relational table
  const { data: userPrefs } = await getUserPreferences(userId, orgId, canonical)
  
  // Convert relational preferences to NotificationGroup format
  const groups = await Promise.all(
    defaults.map(async (group) => {
      const actions = await Promise.all(
        group.actions.map(async (action) => {
          const { data: typeId, error: typeError } = await getNotificationTypeIdFromAction(action.id)
          if (typeError || !typeId) {
            // If notification type not found, default to enabled without email
            return { ...action, enabled: true, emailAvailable: false, emailEnabled: false } as any
          }
          
          const pref = userPrefs?.find(p => p.notification_type_id === typeId)
          const emailAvailable = await isEmailAvailable(typeId)
          
          return {
            ...action,
            enabled: pref ? pref.in_app_enabled : true,
            emailAvailable, // Store for use in UI gating
            emailEnabled: pref ? (pref.email_enabled && emailAvailable) : false,
          } as any // Extend action with email info
        })
      )
      
      // Determine group-level settings
      const allEnabled = actions.every(a => a.enabled)
      const hasEmailAvailable = actions.some((a: any) => a.emailAvailable)
      // Build channels list - include email only if available for at least one action
      // Keep email in channels if any action has email available (for UI display)
      const channels: DeliveryChannel[] = ['in_app']
      if (hasEmailAvailable) {
        channels.push('email')
      }
      
      return {
        ...group,
        actions,
        allEnabled,
        channels, // Always include email if available, regardless of enabled state
        digestEnabled: false, // TODO: implement digest preferences
        digestWindow: 'daily',
        quietHoursEnabled: false, // TODO: implement quiet hours preferences
      } satisfies NotificationGroup
    })
  )
  
  return groups
}

/**
 * Convert NotificationGroups back to relational preferences format
 * Used when saving preferences
 */
export async function convertNotificationGroupsToRelational(
  groups: NotificationGroup[],
  _role: NotificationRole
): Promise<Array<{
  notificationTypeId: string
  inAppEnabled: boolean
  emailEnabled: boolean
}>> {
  const { getNotificationTypeIdFromAction } = await import('../data/services/notificationTypeMapper')
  const { isEmailAvailable } = await import('../data/services/notificationTypesService')
  
  const preferences: Array<{
    notificationTypeId: string
    inAppEnabled: boolean
    emailEnabled: boolean
  }> = []
  
  for (const group of groups) {
    for (const action of group.actions) {
      const { data: typeId, error: typeError } = await getNotificationTypeIdFromAction(action.id)
      if (typeError || !typeId) continue
      
      const emailAvailable = await isEmailAvailable(typeId)
      // Email is enabled if: channel includes 'email', email is available, and action is enabled
      const emailEnabled = group.channels.includes('email') && emailAvailable && action.enabled
      
      preferences.push({
        notificationTypeId: typeId,
        inAppEnabled: action.enabled,
        emailEnabled,
      })
    }
  }
  
  return preferences
}
