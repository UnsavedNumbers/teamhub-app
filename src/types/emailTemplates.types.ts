// Manually defining to avoid dependency on generated types being up to date
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
