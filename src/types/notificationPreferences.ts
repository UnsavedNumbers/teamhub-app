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
  channels: DeliveryChannel[]
}

export type NotificationPreferencesByRole = Record<NotificationRole, NotificationGroup[]>

export type NotificationPreferencesByOrg = Record<string, Partial<NotificationPreferencesByRole>>
