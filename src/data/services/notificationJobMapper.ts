/**
 * Notification Job Mapper
 *
 * Maps NotificationAction to notification_job_type for email delivery.
 * Some actions may not have direct email job types and will use generic types.
 */

import type { NotificationAction } from '../../types/notifications'

// Use the database enum type directly (no payment_reminder - use event_reminder instead)
export type NotificationJobType =
  | 'new_event'
  | 'new_message'
  | 'payment_receipt'
  | 'event_reminder'
  | 'registration_confirmation'
  | 'team_invite'
  | 'password_reset'
  | 'welcome_email'
  | 'guardian_invite'
  | 'guardian_attachment_request_submitted'
  | 'guardian_attachment_request_reviewed'

/**
 * Map NotificationAction to notification_job_type
 * Returns null if the action should not trigger email (or uses a different mechanism)
 */
export function mapActionToJobType(action: NotificationAction): NotificationJobType | null {
  switch (action) {
    // Events
    case 'event_created':
    case 'event_updated':
    case 'event_rescheduled':
      return 'new_event'
    case 'event_canceled':
      return 'new_event' // Use same type, worker can differentiate by action in payload
    case 'event_rsvp_required':
    case 'event_weather_alert':
      return 'event_reminder'
    
    // Travel
    case 'travel_created':
    case 'travel_updated':
    case 'travel_canceled':
    case 'travel_dates_changed':
    case 'travel_location_changed':
    case 'travel_lodging_added':
    case 'travel_transport_added':
      return 'new_event' // Treat travel as event-like
    
    // Payments
    case 'fee_assigned':
    case 'fee_overdue':
      return 'event_reminder' // Use event_reminder for payment reminders (closest match)
    case 'fee_payment_completed':
      return 'payment_receipt'
    case 'fee_payment_failed':
      return 'event_reminder' // Use event_reminder for payment failures

    // Tryouts
    case 'tryout_registration_confirmed':
      return 'registration_confirmation'
    case 'tryout_payment_received':
      return 'payment_receipt'
    case 'tryout_waitlisted':
    case 'tryout_promoted_from_waitlist':
    case 'tryout_reminder_x_days':
    case 'tryout_reminder_day_before':
    case 'tryout_day_of_reminder':
    case 'tryout_evaluation_due':
      return 'event_reminder'
    case 'tryout_results_published':
    case 'tryout_evaluator_assigned':
      return 'new_message'
    
    // Athletes
    case 'athlete_added_to_team':
    case 'athlete_removed_from_team':
    case 'guardian_attached':
      return 'registration_confirmation'
    
    // Announcements
    case 'announcement_created':
    case 'announcement_urgent':
      return 'new_message'
    
    // Messages
    case 'message_sent':
    case 'user_mentioned':
    case 'message_pinned':
      return 'new_message'
    
    // Invites
    case 'invite_sent':
      return 'team_invite'
    case 'invite_accepted':
      return 'registration_confirmation'
    
    // System - typically no email
    case 'system_generated_notice':
    case 'license_expiring':
    case 'license_expired':
    case 'license_activated':
    case 'license_upgraded':
    case 'feature_enabled':
    case 'feature_disabled':
      return null // System notices typically in-app only
    
    // Other actions - default to new_message or null
    default:
      return 'new_message' // Generic fallback
  }
}
