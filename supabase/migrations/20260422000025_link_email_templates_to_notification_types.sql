-- Link email_templates to notification_types
-- Adds notification_type_id FK and backfills existing templates with comprehensive mapping

-- Add notification_type_id column if it doesn't exist
ALTER TABLE public.email_templates
  ADD COLUMN IF NOT EXISTS notification_type_id UUID REFERENCES public.notification_types(id) ON DELETE SET NULL;

-- Create index for lookups
CREATE INDEX IF NOT EXISTS idx_email_templates_notification_type_id 
  ON public.email_templates(notification_type_id);

-- Comprehensive mapping function: notification_job_type -> notification_type_key
-- Maps all email template types to their corresponding notification types
CREATE OR REPLACE FUNCTION map_job_type_to_notification_type(job_type TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE job_type
    -- 1. Auth & Account
    WHEN 'welcome_org_admin' THEN 'invite_accepted'  -- Welcome after accepting org admin invite
    WHEN 'welcome_coach' THEN 'invite_accepted'  -- Welcome after accepting coach invite
    WHEN 'welcome_parent' THEN 'invite_accepted'  -- Welcome after accepting parent invite
    WHEN 'welcome_staff' THEN 'invite_accepted'  -- Welcome after accepting staff invite
    WHEN 'welcome_fan' THEN 'invite_accepted'  -- Welcome after accepting fan invite
    WHEN 'email_verification' THEN NULL  -- System-level, no notification type
    WHEN 'password_reset' THEN NULL  -- System-level, no notification type
    WHEN 'password_changed_confirmation' THEN NULL  -- System-level, no notification type
    WHEN 'email_changed_confirmation' THEN NULL  -- System-level, no notification type
    WHEN 'account_deactivated' THEN NULL  -- System-level, no notification type
    WHEN 'account_reactivated' THEN NULL  -- System-level, no notification type
    
    -- 2. Invites & Role Assignments
    WHEN 'org_admin_invite' THEN 'invite_sent'
    WHEN 'coach_invite' THEN 'invite_sent'
    WHEN 'staff_invite' THEN 'invite_sent'
    WHEN 'parent_invite' THEN 'invite_sent'
    WHEN 'role_updated_notification' THEN 'role_assigned'
    WHEN 'removed_from_org' THEN 'access_revoked'
    
    -- 3. Team Management
    WHEN 'added_to_team' THEN 'athlete_added_to_team'  -- User added to team (maps to athlete_added_to_team)
    WHEN 'removed_from_team' THEN 'athlete_removed_from_team'  -- User removed from team
    WHEN 'team_assignment_athlete' THEN 'athlete_added_to_team'  -- Athlete assigned to team
    WHEN 'team_assignment_updated' THEN 'athlete_added_to_team'  -- Team assignment updated
    
    -- 4. Events
    WHEN 'event_created' THEN 'event_created'
    WHEN 'event_published' THEN 'event_created'  -- Event published maps to event_created
    WHEN 'event_reminder_7d' THEN 'event_rsvp_required'  -- 7-day reminder
    WHEN 'event_reminder_24h' THEN 'event_rsvp_required'  -- 24-hour reminder
    WHEN 'event_reminder_2h' THEN 'event_rsvp_required'  -- 2-hour reminder
    WHEN 'event_updated' THEN 'event_updated'
    WHEN 'event_cancelled' THEN 'event_canceled'  -- Note: cancelled vs canceled spelling
    WHEN 'rsvp_confirmation' THEN 'event_rsvp_updated'  -- RSVP confirmation
    WHEN 'rsvp_change_confirmation' THEN 'event_rsvp_updated'  -- RSVP change confirmation
    
    -- 5. Ticketing & Payments
    WHEN 'ticket_receipt' THEN NULL  -- Ticketing-specific, no direct notification type yet
    WHEN 'ticket_purchase_confirmation_non_payment' THEN NULL  -- No direct notification type
    WHEN 'payment_failed' THEN 'fee_payment_failed'
    WHEN 'refund_issued' THEN NULL  -- No direct notification type for refunds
    WHEN 'partial_refund_issued' THEN NULL  -- No direct notification type
    WHEN 'chargeback_alert' THEN NULL  -- Admin-only, no notification type
    WHEN 'payout_summary' THEN 'payout_processed'
    WHEN 'season_pass_confirmation' THEN NULL  -- No direct notification type
    WHEN 'invoice_available' THEN NULL  -- No direct notification type
    WHEN 'payment_reminder' THEN 'fee_overdue'  -- Payment reminder maps to fee_overdue
    
    -- 6. Announcements & Communication
    WHEN 'org_announcement' THEN 'announcement_created'  -- Org-wide announcement
    WHEN 'team_announcement' THEN 'announcement_created'  -- Team announcement
    WHEN 'announcement_edited' THEN 'announcement_updated'  -- Announcement edited
    WHEN 'direct_message_notification' THEN 'message_sent'  -- Direct message
    WHEN 'comment_reply_notification' THEN 'user_mentioned'  -- Comment reply (user mentioned)
    
    -- 7. Athlete & Guardian Management
    WHEN 'guardian_linked_confirmation' THEN 'guardian_attached'  -- Guardian linked
    WHEN 'guardian_removed' THEN 'guardian_detached'  -- Guardian removed
    WHEN 'athlete_profile_updated' THEN 'athlete_updated'  -- Athlete profile updated
    WHEN 'medical_form_submitted' THEN NULL  -- Internal notice, no notification type
    WHEN 'medical_form_expiring_soon' THEN NULL  -- No direct notification type
    WHEN 'document_uploaded_confirmation' THEN NULL  -- No direct notification type
    
    -- 8. Media
    WHEN 'new_gallery_published' THEN NULL  -- No direct notification type
    WHEN 'photo_tag_notification' THEN NULL  -- No direct notification type
    WHEN 'video_uploaded_internal' THEN NULL  -- Internal notice, no notification type
    
    -- 9. Subscriptions & Billing (org-level)
    WHEN 'org_subscription_started' THEN NULL  -- No direct notification type
    WHEN 'org_subscription_renewed' THEN NULL  -- No direct notification type
    WHEN 'org_subscription_failed' THEN NULL  -- No direct notification type
    WHEN 'org_subscription_canceled' THEN NULL  -- No direct notification type
    WHEN 'trial_ending_soon' THEN NULL  -- No direct notification type (license_expiring exists but different)
    WHEN 'license_tier_changed' THEN 'license_upgraded'  -- License tier changed
    WHEN 'billing_info_updated' THEN NULL  -- No direct notification type
    
    -- 10. System & Security
    WHEN 'suspicious_login_alert' THEN NULL  -- System-level, no notification type
    WHEN 'new_device_login_alert' THEN NULL  -- System-level, no notification type
    WHEN 'data_export_ready' THEN NULL  -- System-level, no notification type
    WHEN 'privacy_policy_update' THEN NULL  -- System-level, no notification type
    WHEN 'terms_update' THEN NULL  -- System-level, no notification type
    WHEN 'maintenance_notification' THEN NULL  -- System-level, no notification type
    WHEN 'incident_notification' THEN NULL  -- System-level, no notification type
    
    -- 11. Admin Alerts (internal)
    WHEN 'new_org_signup_internal' THEN NULL  -- Internal admin alert, no notification type
    WHEN 'large_purchase_alert' THEN NULL  -- Internal admin alert, no notification type
    WHEN 'multiple_failed_payments_alert' THEN NULL  -- Internal admin alert, no notification type
    WHEN 'guardian_invite_expiring_soon' THEN 'invite_expired'  -- Guardian invite expiring
    WHEN 'event_overcapacity_warning' THEN NULL  -- Internal admin alert, no notification type
    
    -- 12. Optional Marketing / Engagement
    WHEN 'season_kickoff_welcome' THEN NULL  -- Marketing, no notification type
    WHEN 'mid_season_check_in' THEN NULL  -- Marketing, no notification type
    WHEN 'end_of_season_summary' THEN NULL  -- Marketing, no notification type
    WHEN 'fan_engagement_highlight' THEN NULL  -- Marketing, no notification type
    WHEN 'donation_campaign_launch' THEN NULL  -- Marketing, no notification type
    
    -- Legacy/old notification_job_type values (for backward compatibility)
    WHEN 'new_event' THEN 'event_created'  -- Legacy mapping
    WHEN 'new_message' THEN 'announcement_created'  -- Legacy mapping
    WHEN 'payment_receipt' THEN 'fee_payment_completed'  -- Legacy mapping
    WHEN 'event_reminder' THEN 'event_rsvp_required'  -- Legacy mapping
    WHEN 'registration_confirmation' THEN 'athlete_added_to_team'  -- Legacy mapping
    WHEN 'team_invite' THEN 'invite_sent'  -- Legacy mapping
    WHEN 'guardian_invite' THEN 'invite_sent'  -- Legacy mapping
    WHEN 'guardian_attachment_request_submitted' THEN NULL  -- No direct mapping
    WHEN 'guardian_attachment_request_reviewed' THEN NULL  -- No direct mapping
    WHEN 'uniform_notification' THEN 'uniform_order_opened'  -- Legacy mapping
    WHEN 'travel_notification' THEN 'travel_created'  -- Legacy mapping
    WHEN 'photo_moderation' THEN NULL  -- Admin-only
    WHEN 'rsvp_notification' THEN 'event_rsvp_required'  -- Legacy mapping
    WHEN 'welcome_email' THEN 'invite_accepted'  -- Legacy generic welcome
    
    ELSE NULL
  END;
END;
$$ LANGUAGE plpgsql;

-- Backfill notification_type_id for existing templates
UPDATE public.email_templates et
SET notification_type_id = nt.id
FROM public.notification_types nt
WHERE et.notification_type_id IS NULL
  AND nt.key = map_job_type_to_notification_type(et.type::TEXT)
  AND map_job_type_to_notification_type(et.type::TEXT) IS NOT NULL;

-- Drop helper function
DROP FUNCTION IF EXISTS map_job_type_to_notification_type(TEXT);

-- Fix duplicate active templates: Keep only the most recently updated template active per notification_type_id
-- Deactivate all others to ensure uniqueness before creating the constraint
UPDATE public.email_templates et
SET is_active = false
WHERE et.is_active = true
  AND et.notification_type_id IS NOT NULL
  AND et.id NOT IN (
    -- Keep the most recently updated template active for each notification_type_id
    SELECT DISTINCT ON (notification_type_id) id
    FROM public.email_templates
    WHERE is_active = true
      AND notification_type_id IS NOT NULL
    ORDER BY notification_type_id, updated_at DESC, created_at DESC
  );

-- Add constraint: Only one active template per notification_type
-- This ensures that when a template is active, it's the only active one for that notification type
CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_one_active_per_type
  ON public.email_templates(notification_type_id)
  WHERE is_active = true AND notification_type_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.email_templates.notification_type_id IS 'Links email template to notification_types. Only one active template per notification_type is allowed.';
