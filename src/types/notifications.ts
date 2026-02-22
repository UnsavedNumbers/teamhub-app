/**
 * Typed notification primitives for the Youth Sports web app.
 * These align with the notification_action ENUM defined in the database and
 * the role/action mapping documented in notification_action_role_mapping.md.
 */

export type NotificationRole = 'guardian' | 'parent' | 'coach' | 'org_admin' | 'team_manager' | 'athlete' | 'staff' | 'platform_admin'
export type NotificationPresentation = 'info' | 'warning' | 'urgent'
export type NotificationEntityType =
  | 'event'
  | 'travel'
  | 'fee'
  | 'athlete'
  | 'announcement'
  | 'message'
  | 'uniform'
  | 'program'
  | 'team'
  | 'system'

export type NotificationAction =
  // Calendar & Events
  | 'event_created'
  | 'event_updated'
  | 'event_rescheduled'
  | 'event_canceled'
  | 'event_location_updated'
  | 'event_time_changed'
  | 'event_rsvp_required'
  | 'event_rsvp_updated'
  | 'event_attendance_updated'
  | 'event_weather_alert'
  // Travel
  | 'travel_created'
  | 'travel_updated'
  | 'travel_canceled'
  | 'travel_dates_changed'
  | 'travel_location_changed'
  | 'travel_lodging_added'
  | 'travel_transport_added'
  | 'travel_overlap_detected'
  // Payments & Billing
  | 'fee_created'
  | 'fee_assigned'
  | 'fee_updated'
  | 'fee_removed'
  | 'fee_payment_partial'
  | 'fee_payment_completed'
  | 'fee_payment_failed'
  | 'fee_overdue'
  | 'payout_account_connected'
  | 'payout_account_issue'
  | 'payout_processed'
  // Athletes & Guardians
  | 'athlete_created'
  | 'athlete_updated'
  | 'athlete_removed'
  | 'athlete_added_to_team'
  | 'athlete_removed_from_team'
  | 'guardian_attached'
  | 'guardian_detached'
  // Teams, Programs, Levels
  | 'team_created'
  | 'team_updated'
  | 'team_archived'
  | 'program_created'
  | 'program_updated'
  | 'program_removed'
  | 'level_created'
  | 'level_updated'
  | 'level_removed'
  // Uniforms
  | 'uniform_size_requested'
  | 'uniform_size_submitted'
  | 'uniform_order_opened'
  | 'uniform_order_updated'
  | 'uniform_order_closed'
  | 'uniform_missing_info'
  // Announcements
  | 'announcement_created'
  | 'announcement_updated'
  | 'announcement_deleted'
  | 'announcement_urgent'
  // Messaging
  | 'huddle_created'
  | 'message_sent'
  | 'message_edited'
  | 'message_deleted'
  | 'message_pinned'
  | 'message_reported'
  | 'user_mentioned'
  // Invitations & Access
  | 'role_assigned'
  | 'role_removed'
  | 'access_revoked'
  | 'invite_sent'
  | 'invite_accepted'
  | 'invite_expired'
  // System & Platform
  | 'license_activated'
  | 'license_expiring'
  | 'license_expired'
  | 'license_upgraded'
  | 'feature_enabled'
  | 'feature_disabled'
  | 'system_generated_notice'

export interface NotificationRecord {
  id: string
  user_id: string
  org_id: string
  team_id: string | null
  action: NotificationAction
  presentation_type: NotificationPresentation
  role_context: NotificationRole
  entity_type: NotificationEntityType | null
  entity_id: string | null
  title: string
  body: string
  link_url: string | null
  metadata: Record<string, unknown> | null
  dedupe_key: string
  read_at: string | null
  archived_at: string | null
  deleted_at: string | null
  created_at: string
}

export interface NotificationCreateInput {
  userId: string
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
  presentation?: NotificationPresentation
  dedupeKey?: string
}

export interface NotificationCreateResult {
  success: boolean
  error: Error | null
}

// Role allowances (derived from notification_action_role_mapping.md)
export const ACTION_ROLE_MAP: Record<NotificationAction, NotificationRole[]> = {
  // Calendar & Events
  event_created: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  event_updated: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  event_rescheduled: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  event_canceled: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  event_location_updated: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  event_time_changed: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  event_rsvp_required: ['guardian', 'org_admin', 'athlete'],
  event_rsvp_updated: ['coach', 'org_admin', 'team_manager'],
  event_attendance_updated: ['coach', 'org_admin', 'team_manager'],
  event_weather_alert: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  // Travel
  travel_created: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  travel_updated: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  travel_canceled: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  travel_dates_changed: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  travel_location_changed: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  travel_lodging_added: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  travel_transport_added: ['coach', 'org_admin', 'team_manager', 'staff'],
  travel_overlap_detected: ['coach', 'org_admin', 'team_manager', 'staff'],
  // Payments & Billing
  fee_created: ['org_admin'],
  fee_assigned: ['guardian', 'org_admin'],
  fee_updated: ['org_admin'],
  fee_removed: ['org_admin'],
  fee_payment_partial: ['guardian', 'org_admin'],
  fee_payment_completed: ['guardian', 'org_admin'],
  fee_payment_failed: ['org_admin'],
  fee_overdue: ['guardian', 'org_admin'],
  payout_account_connected: ['org_admin'],
  payout_account_issue: ['org_admin'],
  payout_processed: ['org_admin'],
  // Athletes & Guardians
  athlete_created: ['org_admin'],
  athlete_updated: ['org_admin'],
  athlete_removed: ['org_admin'],
  athlete_added_to_team: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'],
  athlete_removed_from_team: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'],
  guardian_attached: ['guardian', 'org_admin'],
  guardian_detached: ['guardian', 'org_admin'],
  // Teams, Programs, Levels
  team_created: ['org_admin'],
  team_updated: ['org_admin'],
  team_archived: ['org_admin'],
  program_created: ['org_admin'],
  program_updated: ['org_admin'],
  program_removed: ['org_admin'],
  level_created: ['org_admin'],
  level_updated: ['org_admin'],
  level_removed: ['org_admin'],
  // Uniforms
  uniform_size_requested: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'],
  uniform_size_submitted: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'],
  uniform_order_opened: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'],
  uniform_order_updated: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'],
  uniform_order_closed: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'],
  uniform_missing_info: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete'],
  // Announcements
  announcement_created: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  announcement_updated: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  announcement_deleted: ['org_admin'],
  announcement_urgent: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  // Messaging
  huddle_created: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  message_sent: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  message_edited: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  message_deleted: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  message_pinned: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  message_reported: ['org_admin', 'platform_admin'],
  user_mentioned: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  // Invitations & Access
  role_assigned: ['org_admin'],
  role_removed: ['org_admin'],
  access_revoked: ['org_admin'],
  invite_sent: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  invite_accepted: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  invite_expired: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff'],
  // System & Platform
  license_activated: ['org_admin', 'platform_admin'],
  license_expiring: ['org_admin', 'platform_admin'],
  license_expired: ['org_admin', 'platform_admin'],
  license_upgraded: ['org_admin', 'platform_admin'],
  feature_enabled: ['org_admin', 'platform_admin'],
  feature_disabled: ['org_admin', 'platform_admin'],
  system_generated_notice: ['guardian', 'coach', 'org_admin', 'team_manager', 'athlete', 'staff', 'platform_admin'],
}

export function isRoleAllowedForAction(action: NotificationAction, role: NotificationRole): boolean {
  const canonical = role === 'parent' ? 'guardian' : role
  const allowed = ACTION_ROLE_MAP[action]
  if (!allowed) return false
  return allowed.includes(canonical)
}

export function defaultPresentationForAction(action: NotificationAction): NotificationPresentation {
  if (action === 'announcement_urgent' || action === 'event_weather_alert' || action === 'travel_canceled') {
    return 'urgent'
  }
  if (action === 'fee_overdue' || action === 'event_canceled') return 'warning'
  return 'info'
}
