-- Backfill category for existing email templates based on their type/slug.
-- This migration ensures templates created before category was added get categorized.

UPDATE public.email_templates
SET category = CASE
  -- Authentication & Account
  WHEN type IN ('welcome_org_admin', 'welcome_coach', 'welcome_parent', 'welcome_staff', 'welcome_fan', 'email_verification', 'password_reset', 'password_changed_confirmation', 'email_changed_confirmation', 'account_deactivated', 'account_reactivated') THEN 'Authentication & Account'
  
  -- Invites & Role Assignments
  WHEN type IN ('org_admin_invite', 'coach_invite', 'staff_invite', 'parent_invite', 'role_updated_notification', 'removed_from_org') THEN 'Invites & Role Assignments'
  
  -- Team Management
  WHEN type IN ('added_to_team', 'removed_from_team', 'team_assignment_athlete', 'team_assignment_updated') THEN 'Team Management'
  
  -- Events
  WHEN type IN ('event_created', 'event_published', 'event_reminder_7d', 'event_reminder_24h', 'event_reminder_2h', 'event_updated', 'event_cancelled', 'rsvp_confirmation', 'rsvp_change_confirmation') THEN 'Events'
  
  -- Ticketing & Payments
  WHEN type IN ('ticket_receipt', 'ticket_purchase_confirmation_non_payment', 'payment_failed', 'refund_issued', 'partial_refund_issued', 'chargeback_alert', 'payout_summary', 'season_pass_confirmation', 'invoice_available', 'payment_reminder') THEN 'Ticketing & Payments'
  
  -- Announcements & Communication
  WHEN type IN ('org_announcement', 'team_announcement', 'announcement_edited', 'direct_message_notification', 'comment_reply_notification') THEN 'Announcements & Communication'
  
  -- Athlete & Guardian Management
  WHEN type IN ('guardian_linked_confirmation', 'guardian_removed', 'athlete_profile_updated', 'medical_form_submitted', 'medical_form_expiring_soon', 'document_uploaded_confirmation') THEN 'Athlete & Guardian Management'
  
  -- Media
  WHEN type IN ('new_gallery_published', 'photo_tag_notification', 'video_uploaded_internal') THEN 'Media'
  
  -- Subscriptions & Billing
  WHEN type IN ('org_subscription_started', 'org_subscription_renewed', 'org_subscription_failed', 'org_subscription_canceled', 'trial_ending_soon', 'license_tier_changed', 'billing_info_updated') THEN 'Subscriptions & Billing'
  
  -- System & Security
  WHEN type IN ('suspicious_login_alert', 'new_device_login_alert', 'data_export_ready', 'privacy_policy_update', 'terms_update', 'maintenance_notification', 'incident_notification') THEN 'System & Security'
  
  -- Admin Alerts
  WHEN type IN ('new_org_signup_internal', 'large_purchase_alert', 'multiple_failed_payments_alert', 'guardian_invite_expiring_soon', 'event_overcapacity_warning') THEN 'Admin Alerts'
  
  -- Marketing & Engagement
  WHEN type IN ('season_kickoff_welcome', 'mid_season_check_in', 'end_of_season_summary', 'fan_engagement_highlight', 'donation_campaign_launch') THEN 'Marketing & Engagement'
  
  ELSE NULL
END
WHERE category IS NULL;
