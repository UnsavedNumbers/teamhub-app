// Manually defining to avoid dependency on generated types being up to date.
// Includes existing types + Master Email Event Matrix types.
export type NotificationJobType =
    | "new_event"
    | "new_message"
    | "payment_receipt"
    | "event_reminder"
    | "registration_confirmation"
    | "team_invite"
    | "password_reset"
    | "welcome_email"
    | "guardian_invite"
    | "athlete_invite"
    | "athlete_account_created"
    | "athlete_linked"
    | "ticket_receipt"
    | "uniform_notification"
    | "travel_notification"
    | "photo_moderation"
    | "rsvp_notification"
    | "guardian_attachment_request_submitted"
    | "guardian_attachment_request_reviewed"
    | "org_contact_request"
    | "platform_feature_request_signal"
    | "welcome_org_admin"
    | "welcome_coach"
    | "welcome_parent"
    | "welcome_staff"
    | "welcome_fan"
    | "email_verification"
    | "password_changed_confirmation"
    | "email_changed_confirmation"
    | "account_deactivated"
    | "account_reactivated"
    | "org_admin_invite"
    | "coach_invite"
    | "staff_invite"
    | "parent_invite"
    | "role_updated_notification"
    | "removed_from_org"
    | "added_to_team"
    | "removed_from_team"
    | "team_assignment_athlete"
    | "team_assignment_updated"
    | "event_created"
    | "event_published"
    | "event_reminder_7d"
    | "event_reminder_24h"
    | "event_reminder_2h"
    | "event_updated"
    | "event_cancelled"
    | "rsvp_confirmation"
    | "rsvp_change_confirmation"
    | "ticket_purchase_confirmation_non_payment"
    | "payment_failed"
    | "refund_issued"
    | "partial_refund_issued"
    | "chargeback_alert"
    | "payout_summary"
    | "season_pass_confirmation"
    | "invoice_available"
    | "payment_reminder"
    | "org_announcement"
    | "team_announcement"
    | "announcement_edited"
    | "direct_message_notification"
    | "comment_reply_notification"
    | "guardian_linked_confirmation"
    | "guardian_removed"
    | "athlete_profile_updated"
    | "medical_form_submitted"
    | "medical_form_expiring_soon"
    | "document_uploaded_confirmation"
    | "new_gallery_published"
    | "photo_tag_notification"
    | "video_uploaded_internal"
    | "org_subscription_started"
    | "org_subscription_renewed"
    | "org_subscription_failed"
    | "org_subscription_canceled"
    | "trial_ending_soon"
    | "license_tier_changed"
    | "billing_info_updated"
    | "suspicious_login_alert"
    | "new_device_login_alert"
    | "data_export_ready"
    | "privacy_policy_update"
    | "terms_update"
    | "maintenance_notification"
    | "incident_notification"
    | "new_org_signup_internal"
    | "large_purchase_alert"
    | "multiple_failed_payments_alert"
    | "guardian_invite_expiring_soon"
    | "event_overcapacity_warning"
    | "season_kickoff_welcome"
    | "mid_season_check_in"
    | "end_of_season_summary"
    | "fan_engagement_highlight"
    | "donation_campaign_launch"
    | string;

export interface EmailTemplate {
    id: string;
    slug: string;
    name: string;
    description?: string | null;
    type: NotificationJobType;
    html_content: string; // Full wrapped HTML (source of truth)
    body_content: string; // Admin-edited content only
    subject_template: string;
    preview_text?: string | null;
    variables: string[];
    required_variables: string[];
    is_active: boolean;
    created_at: string;
    updated_at: string; // For optimistic locking
    updated_by_user_id?: string | null;
}

export interface EmailTemplateFormData {
    body_content: string;
    subject_template: string;
    preview_text?: string;
    variables?: string[];
    description?: string;
}
