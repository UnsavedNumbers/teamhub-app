import type { NotificationAction, NotificationRole } from './notifications'

export type DeliveryChannel = 'in_app' | 'email' | 'push'

export type NotificationGroupId =
  | 'events'
  | 'travel'
  | 'payments'
  | 'athletes'
  | 'uniforms'
  | 'announcements'
  | 'messages'
  | 'system'

export interface NotificationActionToggle {
  id: NotificationAction
  enabled: boolean
}

export interface NotificationGroup {
  id: NotificationGroupId
  label: string
  actions: NotificationActionToggle[]
  allEnabled: boolean
  digestEnabled: boolean
  digestWindow?: 'daily' | 'weekly' // Default: 'daily'
  quietHoursEnabled?: boolean
  quietHoursStart?: string // HH:mm format (e.g., "22:00")
  quietHoursEnd?: string // HH:mm format (e.g., "08:00")
  timezone?: string // IANA timezone (e.g., "America/New_York"), defaults to user's profile timezone or org timezone
  channels: DeliveryChannel[]
}

export type NotificationPreferencesByRole = Record<NotificationRole, NotificationGroup[]>

export type NotificationPreferencesByOrg = Record<string, Partial<NotificationPreferencesByRole>>
