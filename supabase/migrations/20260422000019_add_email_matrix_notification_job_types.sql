-- Add all Master Email Event Matrix notification job types to the enum.
-- Existing values (baseline + prior migrations): new_event, new_message, payment_receipt,
-- event_reminder, registration_confirmation, team_invite, password_reset, welcome_email,
-- guardian_invite, guardian_attachment_request_submitted, guardian_attachment_request_reviewed,
-- ticket_receipt, uniform_notification, travel_notification, photo_moderation, rsvp_notification.
-- Below: net-new matrix types only. IF NOT EXISTS allows idempotent re-run.

-- 1. Auth & account
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'welcome_org_admin';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'welcome_coach';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'welcome_parent';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'welcome_staff';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'welcome_fan';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'email_verification';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'password_changed_confirmation';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'email_changed_confirmation';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'account_deactivated';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'account_reactivated';

-- 2. Invites & role assignments
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'org_admin_invite';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'coach_invite';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'staff_invite';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'parent_invite';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'role_updated_notification';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'removed_from_org';

-- 3. Team management
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'added_to_team';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'removed_from_team';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'team_assignment_athlete';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'team_assignment_updated';

-- 4. Events
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'event_created';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'event_published';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'event_reminder_7d';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'event_reminder_24h';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'event_reminder_2h';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'event_updated';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'event_cancelled';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'rsvp_confirmation';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'rsvp_change_confirmation';

-- 5. Ticketing & payments (ticket_receipt may exist from prior migration; ensure it for seed)
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'ticket_receipt';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'ticket_purchase_confirmation_non_payment';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'payment_failed';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'refund_issued';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'partial_refund_issued';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'chargeback_alert';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'payout_summary';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'season_pass_confirmation';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'invoice_available';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'payment_reminder';

-- 6. Announcements & communication
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'org_announcement';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'team_announcement';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'announcement_edited';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'direct_message_notification';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'comment_reply_notification';

-- 7. Athlete & guardian management
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'guardian_linked_confirmation';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'guardian_removed';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'athlete_profile_updated';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'medical_form_submitted';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'medical_form_expiring_soon';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'document_uploaded_confirmation';

-- 8. Media
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'new_gallery_published';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'photo_tag_notification';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'video_uploaded_internal';

-- 9. Subscriptions & billing (org-level)
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'org_subscription_started';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'org_subscription_renewed';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'org_subscription_failed';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'org_subscription_canceled';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'trial_ending_soon';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'license_tier_changed';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'billing_info_updated';

-- 10. System & security
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'suspicious_login_alert';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'new_device_login_alert';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'data_export_ready';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'privacy_policy_update';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'terms_update';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'maintenance_notification';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'incident_notification';

-- 11. Admin alerts (internal)
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'new_org_signup_internal';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'large_purchase_alert';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'multiple_failed_payments_alert';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'guardian_invite_expiring_soon';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'event_overcapacity_warning';

-- 12. Optional marketing / engagement
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'season_kickoff_welcome';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'mid_season_check_in';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'end_of_season_summary';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'fan_engagement_highlight';
ALTER TYPE public.notification_job_type ADD VALUE IF NOT EXISTS 'donation_campaign_launch';
