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

const GROUP_CONFIGS: GroupConfig[] = [
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
