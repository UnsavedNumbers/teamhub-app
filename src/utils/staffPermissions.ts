import type { StaffPermissions } from '@/types/staffAndFan'
import type { TranslationKey } from '@/i18n'

export type StaffPermissionKey = keyof StaffPermissions

export const STAFF_PERMISSION_LABEL_KEYS: Record<StaffPermissionKey, TranslationKey> = {
  can_scan_tickets: 'admin.staff.permissionLabels.can_scan_tickets',
  can_view_attendees: 'admin.staff.permissionLabels.can_view_attendees',
  can_manage_events: 'admin.staff.permissionLabels.can_manage_events',
  can_view_financials: 'admin.staff.permissionLabels.can_view_financials',
  can_manage_roster: 'admin.staff.permissionLabels.can_manage_roster',
  can_send_notifications: 'admin.staff.permissionLabels.can_send_notifications',
  can_manage_staff: 'admin.staff.permissionLabels.can_manage_staff',
} as const

export const STAFF_PERMISSION_KEYS = Object.keys(
  STAFF_PERMISSION_LABEL_KEYS
) as StaffPermissionKey[]
