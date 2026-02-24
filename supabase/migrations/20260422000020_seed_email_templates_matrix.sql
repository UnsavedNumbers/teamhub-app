-- Seed email_templates with Master Email Event Matrix rows.
-- Uses universal wrapper (same structure as wrapEmailContent). ON CONFLICT (slug) DO NOTHING for idempotency.
-- All templates are inserted with is_active = false.

WITH universal_wrapper AS (
  SELECT $$
<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{{email_subject}}</title>
  <style>
    body { margin: 0; padding: 0; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    @media only screen and (max-width: 600px) {
      .responsive-table { width: 100% !important; }
      .responsive-image { max-width: 100% !important; height: auto !important; }
      .mobile-padding { padding: 10px !important; }
    }
  </style>
</head>
<body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0;">
  <table role="presentation" style="width: 100%; background-color: #f8fafc;">
    <tr>
      <td align="center" style="padding: 20px 0;">
        <table role="presentation" class="responsive-table" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 8px;">
          <tr>
            <td style="padding: 30px 30px 20px; text-align: center;">
              {{#if organization_logo_url}}
              <img src="{{organization_logo_url}}" alt="{{organization_name}}" style="max-height: 60px; max-width: 200px;" />
              {{else}}
              <h1 style="color: {{organization_secondary_color}}; margin: 0;">{{organization_name}}</h1>
              {{/if}}
            </td>
          </tr>
          <tr>
            <td style="padding: 0 30px 30px;" class="mobile-padding">
              {{BODY_CONTENT}}
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 30px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;" class="mobile-padding">
              {{email_footer_text}}
              {{#if unsubscribe_url}}
              <p style="margin-top: 10px;"><a href="{{unsubscribe_url}}" style="color: #6b7280;">Unsubscribe</a></p>
              {{/if}}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$$ AS t
),
seed_data(name, slug, type, subject_template, preview_text, description, body_content, category) AS (
  VALUES
  -- 1. Auth & account
  ('Welcome - Org Admin', 'welcome-org-admin', 'welcome_org_admin'::public.notification_job_type, 'Welcome to YouthSports Team Hub', 'Confirm account and next steps', 'New org_admin account created. Confirm account creation and next steps. Includes login link and setup checklist.', '<p>Hi {{recipient_name}},</p><p>Your organization admin account has been created. Use the login link below and follow the setup checklist to get started.</p>', 'Authentication & Account'),
  ('Welcome - Coach', 'welcome-coach', 'welcome_coach'::public.notification_job_type, 'Welcome to {{organization_name}}', 'Confirm access and role permissions', 'Coach account created or invited. Confirm access and explain role permissions.', '<p>Hi {{recipient_name}},</p><p>Your coach account for {{organization_name}} is ready. You can now access your team hub and manage events as permitted by your role.</p>', 'Authentication & Account'),
  ('Welcome - Parent', 'welcome-parent', 'welcome_parent'::public.notification_job_type, 'Welcome to {{organization_name}}', 'Confirm account and athlete linking', 'Parent account created. Confirm account and explain athlete linking.', '<p>Hi {{recipient_name}},</p><p>Your parent account is set up. Link your athletes from the portal to receive event and team updates.</p>', 'Authentication & Account'),
  ('Welcome - Staff', 'welcome-staff', 'welcome_staff'::public.notification_job_type, 'Welcome to {{organization_name}}', 'Staff account ready', 'Staff account created.', '<p>Hi {{recipient_name}},</p><p>Your staff account for {{organization_name}} has been created. Log in to access your assigned areas.</p>', 'Authentication & Account'),
  ('Welcome - Fan', 'welcome-fan', 'welcome_fan'::public.notification_job_type, 'Welcome to {{organization_name}}', 'Fan account created', 'Fan account created (if fan accounts exist).', '<p>Hi {{recipient_name}},</p><p>Your fan account is ready. Follow your favorite teams and events from the hub.</p>', 'Authentication & Account'),
  ('Email Verification', 'email-verification', 'email_verification'::public.notification_job_type, 'Verify your email address', 'Verify email ownership', 'New account signup. Verify email ownership.', '<p>Hi {{recipient_name}},</p><p>Please verify your email by clicking the link below.</p>', 'Authentication & Account'),
  ('Password Reset', 'password-reset', 'password_reset'::public.notification_job_type, 'Reset Your Password', 'Password reset instructions', 'User requests password reset.', '<p>Hi {{recipient_name}},</p><p>You requested a password reset. Use the link below to set a new password.</p>', 'Authentication & Account'),
  ('Password Changed Confirmation', 'password-changed-confirmation', 'password_changed_confirmation'::public.notification_job_type, 'Your password was changed', 'Password successfully updated', 'Password successfully updated.', '<p>Hi {{recipient_name}},</p><p>Your password was changed successfully. If you did not make this change, contact support.</p>', 'Authentication & Account'),
  ('Email Address Changed Confirmation', 'email-changed-confirmation', 'email_changed_confirmation'::public.notification_job_type, 'Your email address was updated', 'Email updated', 'Email updated.', '<p>Hi {{recipient_name}},</p><p>Your email address has been updated. Use this address to sign in from now on.</p>', 'Authentication & Account'),
  ('Account Deactivated', 'account-deactivated', 'account_deactivated'::public.notification_job_type, 'Your account has been deactivated', 'Admin disabled account', 'Admin disables account.', '<p>Hi {{recipient_name}},</p><p>Your account has been deactivated. Contact your organization administrator if you believe this is an error.</p>', 'Authentication & Account'),
  ('Account Reactivated', 'account-reactivated', 'account_reactivated'::public.notification_job_type, 'Your account has been reactivated', 'Admin re-enabled account', 'Admin re-enables account.', '<p>Hi {{recipient_name}},</p><p>Your account has been reactivated. You can log in again.</p>', 'Authentication & Account'),
  -- 2. Invites & role assignments
  ('Org Admin Invite', 'org-admin-invite', 'org_admin_invite'::public.notification_job_type, 'You are invited to be an org admin', 'Invited to become org_admin', 'Invited to become org_admin.', '<p>Hi {{recipient_name}},</p><p>You have been invited to join {{organization_name}} as an organization administrator. Accept the invite to get started.</p>', 'Invites & Role Assignments'),
  ('Coach Invite', 'coach-invite', 'coach_invite'::public.notification_job_type, 'You are invited to coach at {{organization_name}}', 'Invited to join as coach', 'Invited to join organization as coach.', '<p>Hi {{recipient_name}},</p><p>You have been invited to join {{organization_name}} as a coach. Accept the invite to access your team hub.</p>', 'Invites & Role Assignments'),
  ('Staff Invite', 'staff-invite', 'staff_invite'::public.notification_job_type, 'You are invited to join {{organization_name}}', 'Invited to join as staff', 'Invited to join organization as staff.', '<p>Hi {{recipient_name}},</p><p>You have been invited to join {{organization_name}} as staff. Accept the invite to get started.</p>', 'Invites & Role Assignments'),
  ('Parent Invite (Guardian Invite)', 'parent-invite', 'parent_invite'::public.notification_job_type, 'You are invited to connect with {{athlete_name}}', 'Accept invite link', 'Athlete guardian invited before account exists. Includes accept invite link.', '<p>Hi {{recipient_name}},</p><p>You have been invited to connect with {{athlete_name}} at {{organization_name}}. Use the link below to accept the invite.</p>', 'Invites & Role Assignments'),
  ('Role Updated Notification', 'role-updated-notification', 'role_updated_notification'::public.notification_job_type, 'Your role was updated', 'User role changed', 'User role changed within organization.', '<p>Hi {{recipient_name}},</p><p>Your role in {{organization_name}} has been updated. You may have access to new features.</p>', 'Invites & Role Assignments'),
  ('Removed From Organization', 'removed-from-org', 'removed_from_org'::public.notification_job_type, 'You were removed from {{organization_name}}', 'User removed from org', 'User removed from org.', '<p>Hi {{recipient_name}},</p><p>You have been removed from {{organization_name}}. If you have questions, contact the organization administrator.</p>', 'Invites & Role Assignments'),
  -- 3. Team management
  ('Added to Team', 'added-to-team', 'added_to_team'::public.notification_job_type, 'You were added to {{team_name}}', 'User added to team', 'User added to team.', '<p>Hi {{recipient_name}},</p><p>You have been added to {{team_name}}. View the team in your hub.</p>', 'Team Management'),
  ('Removed from Team', 'removed-from-team', 'removed_from_team'::public.notification_job_type, 'You were removed from {{team_name}}', 'User removed from team', 'User removed from team.', '<p>Hi {{recipient_name}},</p><p>You have been removed from {{team_name}}.</p>', 'Team Management'),
  ('Team Assignment - Athlete', 'team-assignment-athlete', 'team_assignment_athlete'::public.notification_job_type, '{{athlete_name}} was assigned to {{team_name}}', 'Athlete assigned to team', 'Athlete assigned to team. Recipient: Parent(s).', '<p>Hi {{recipient_name}},</p><p>{{athlete_name}} has been assigned to {{team_name}}. View details in your portal.</p>', 'Team Management'),
  ('Team Assignment Updated', 'team-assignment-updated', 'team_assignment_updated'::public.notification_job_type, 'Team assignment updated for {{athlete_name}}', 'Athlete moved to different team', 'Athlete moved to different team.', '<p>Hi {{recipient_name}},</p><p>The team assignment for {{athlete_name}} has been updated.</p>', 'Team Management'),
  -- 4. Events
  ('Event Created (Internal Notice)', 'event-created', 'event_created'::public.notification_job_type, 'Event created: {{event_title}}', 'Optional internal notice', 'Event created. Recipient: Coaches/Staff (optional).', '<p>Hi {{recipient_name}},</p><p>A new event has been created: {{event_title}}. Date: {{event_date}}, Location: {{event_location}}.</p>', 'Events'),
  ('Event Published', 'event-published', 'event_published'::public.notification_job_type, 'Event published: {{event_title}}', 'Event visible to parents/fans', 'Event becomes visible to parents/fans.', '<p>Hi {{recipient_name}},</p><p>{{event_title}} is now published and visible. Date: {{event_date}}, Location: {{event_location}}.</p>', 'Events'),
  ('Event Reminder - 7 Days', 'event-reminder-7d', 'event_reminder_7d'::public.notification_job_type, 'Reminder: {{event_title}} in 7 days', '7 days before event', '7 days before event.', '<p>Hi {{recipient_name}},</p><p>Reminder: {{event_title}} is in 7 days. Date: {{event_date}}, Location: {{event_location}}.</p>', 'Events'),
  ('Event Reminder - 24 Hours', 'event-reminder-24h', 'event_reminder_24h'::public.notification_job_type, 'Tomorrow: {{event_title}}', '24 hours before event', '24 hours before event.', '<p>Hi {{recipient_name}},</p><p>Reminder: {{event_title}} is tomorrow. Date: {{event_date}}, Location: {{event_location}}.</p>', 'Events'),
  ('Event Reminder - 2 Hours', 'event-reminder-2h', 'event_reminder_2h'::public.notification_job_type, 'Soon: {{event_title}}', 'Same-day reminder', 'Same-day reminder.', '<p>Hi {{recipient_name}},</p><p>{{event_title}} starts in about 2 hours. Location: {{event_location}}.</p>', 'Events'),
  ('Event Updated', 'event-updated', 'event_updated'::public.notification_job_type, 'Event updated: {{event_title}}', 'Date/time/location changed', 'Date/time/location changed.', '<p>Hi {{recipient_name}},</p><p>{{event_title}} has been updated. Check the new date, time, or location in your hub.</p>', 'Events'),
  ('Event Cancelled', 'event-cancelled', 'event_cancelled'::public.notification_job_type, 'Event cancelled: {{event_title}}', 'Event cancelled', 'Event cancelled.', '<p>Hi {{recipient_name}},</p><p>{{event_title}} has been cancelled. We will notify you if it is rescheduled.</p>', 'Events'),
  ('RSVP Confirmation', 'rsvp-confirmation', 'rsvp_confirmation'::public.notification_job_type, 'RSVP received: {{event_title}}', 'Parent RSVPs to event', 'Parent RSVPs to event.', '<p>Hi {{recipient_name}},</p><p>Your RSVP for {{event_title}} has been received. We look forward to seeing you.</p>', 'Events'),
  ('RSVP Change Confirmation', 'rsvp-change-confirmation', 'rsvp_change_confirmation'::public.notification_job_type, 'RSVP updated: {{event_title}}', 'RSVP status changed', 'RSVP status changed.', '<p>Hi {{recipient_name}},</p><p>Your RSVP for {{event_title}} has been updated.</p>', 'Events'),
  -- 5. Ticketing & payments (ticket_receipt exists; add others)
  ('Ticket Purchase Receipt', 'ticket-purchase-receipt', 'ticket_receipt'::public.notification_job_type, 'Your Tickets: {{event_title}}', 'Order summary, QR code, refund policy', 'Successful Stripe payment. Recipient: purchaser. Includes order summary, QR code, refund policy.', '<p>Hi {{recipient_name}},</p><p>Thank you for your purchase. Your tickets for {{event_title}} are attached. Show your QR code at entry.</p>', 'Ticketing & Payments'),
  ('Ticket Purchase Confirmation (Non-payment)', 'ticket-purchase-confirmation-non-payment', 'ticket_purchase_confirmation_non_payment'::public.notification_job_type, 'Confirmation: {{event_title}}', 'Non-payment items', 'Ticket purchase confirmation for non-payment items.', '<p>Hi {{recipient_name}},</p><p>Your registration for {{event_title}} has been confirmed.</p>', 'Ticketing & Payments'),
  ('Payment Failed', 'payment-failed', 'payment_failed'::public.notification_job_type, 'Payment could not be processed', 'Stripe failure', 'Stripe failure.', '<p>Hi {{recipient_name}},</p><p>We could not process your payment. Please update your payment method and try again.</p>', 'Ticketing & Payments'),
  ('Refund Issued', 'refund-issued', 'refund_issued'::public.notification_job_type, 'Refund processed for your order', 'Refund processed', 'Refund processed.', '<p>Hi {{recipient_name}},</p><p>Your refund has been processed. It may take a few days to appear on your statement.</p>', 'Ticketing & Payments'),
  ('Partial Refund Issued', 'partial-refund-issued', 'partial_refund_issued'::public.notification_job_type, 'Partial refund processed', 'Partial refund', 'Partial refund issued.', '<p>Hi {{recipient_name}},</p><p>A partial refund has been processed for your order.</p>', 'Ticketing & Payments'),
  ('Chargeback Alert (Internal)', 'chargeback-alert', 'chargeback_alert'::public.notification_job_type, 'Chargeback alert', 'Stripe dispute', 'Stripe dispute. Recipient: org_admin.', '<p>A chargeback has been reported for a recent transaction. Review your Stripe dashboard for details.</p>', 'Ticketing & Payments'),
  ('Payout Summary', 'payout-summary', 'payout_summary'::public.notification_job_type, 'Payout summary', 'Stripe payout', 'Stripe payout. Recipient: org_admin. Optional.', '<p>Your payout summary is ready. Check your connected account for details.</p>', 'Ticketing & Payments'),
  ('Season Pass Purchase Confirmation', 'season-pass-confirmation', 'season_pass_confirmation'::public.notification_job_type, 'Season pass confirmed', 'Season pass purchase', 'Season pass purchase confirmation.', '<p>Hi {{recipient_name}},</p><p>Your season pass purchase has been confirmed. Enjoy full access for the season.</p>', 'Ticketing & Payments'),
  ('Invoice Available', 'invoice-available', 'invoice_available'::public.notification_job_type, 'Your invoice is ready', 'If invoicing is used', 'If invoicing is used.', '<p>Hi {{recipient_name}},</p><p>Your invoice is ready. View and pay from the link below.</p>', 'Ticketing & Payments'),
  ('Payment Reminder', 'payment-reminder', 'payment_reminder'::public.notification_job_type, 'Reminder: payment due', 'If unpaid registration exists', 'Payment reminder if unpaid registration exists.', '<p>Hi {{recipient_name}},</p><p>You have an outstanding payment. Please complete payment to secure your registration.</p>', 'Ticketing & Payments'),
  -- 6. Announcements & communication
  ('New Organization Announcement', 'org-announcement', 'org_announcement'::public.notification_job_type, '{{organization_name}}: {{subject}}', 'Org-wide announcement', 'Org-wide announcement.', '<p>Hi {{recipient_name}},</p><p>{{organization_name}} has posted an announcement: {{subject}}</p><p>{{body}}</p>', 'Announcements & Communication'),
  ('New Team Announcement', 'team-announcement', 'team_announcement'::public.notification_job_type, '{{team_name}}: {{subject}}', 'Team-level announcement', 'Team-level announcement.', '<p>Hi {{recipient_name}},</p><p>{{team_name}} has posted an announcement: {{subject}}</p><p>{{body}}</p>', 'Announcements & Communication'),
  ('Announcement Edited', 'announcement-edited', 'announcement_edited'::public.notification_job_type, 'Announcement updated: {{subject}}', 'Optional', 'Announcement edited (optional).', '<p>Hi {{recipient_name}},</p><p>An announcement you follow has been updated: {{subject}}</p>', 'Announcements & Communication'),
  ('Direct Message Notification', 'direct-message-notification', 'direct_message_notification'::public.notification_job_type, 'New message from {{sender_name}}', 'If messaging exists', 'Direct message notification (if messaging exists).', '<p>Hi {{recipient_name}},</p><p>You have a new message from {{sender_name}}.</p>', 'Announcements & Communication'),
  ('Comment Reply Notification', 'comment-reply-notification', 'comment_reply_notification'::public.notification_job_type, 'New reply to your comment', 'If comments exist', 'Comment reply notification (if comments exist).', '<p>Hi {{recipient_name}},</p><p>Someone replied to your comment. View it in the hub.</p>', 'Announcements & Communication'),
  -- 7. Athlete & guardian management
  ('Guardian Linked Confirmation', 'guardian-linked-confirmation', 'guardian_linked_confirmation'::public.notification_job_type, 'Guardian linked to {{athlete_name}}', 'Guardian successfully linked', 'Guardian successfully linked to athlete.', '<p>Hi {{recipient_name}},</p><p>You have been successfully linked to {{athlete_name}}. You will receive updates for this athlete.</p>', 'Athlete & Guardian Management'),
  ('Guardian Removed Notification', 'guardian-removed', 'guardian_removed'::public.notification_job_type, 'Guardian access removed', 'Guardian removed', 'Guardian removed notification.', '<p>Hi {{recipient_name}},</p><p>Your guardian access has been removed for the associated athlete.</p>', 'Athlete & Guardian Management'),
  ('Athlete Profile Updated', 'athlete-profile-updated', 'athlete_profile_updated'::public.notification_job_type, 'Profile updated for {{athlete_name}}', 'Optional', 'Athlete profile updated (optional).', '<p>Hi {{recipient_name}},</p><p>The profile for {{athlete_name}} has been updated.</p>', 'Athlete & Guardian Management'),
  ('Medical Form Submitted (Internal)', 'medical-form-submitted', 'medical_form_submitted'::public.notification_job_type, 'Medical form submitted', 'Internal notice', 'Medical form submitted. Internal notice.', '<p>A medical form has been submitted and is ready for review.</p>', 'Athlete & Guardian Management'),
  ('Medical Form Expiring Soon', 'medical-form-expiring-soon', 'medical_form_expiring_soon'::public.notification_job_type, 'Medical form expiring for {{athlete_name}}', 'Expiring soon', 'Medical form expiring soon.', '<p>Hi {{recipient_name}},</p><p>The medical form for {{athlete_name}} is expiring soon. Please submit an updated form.</p>', 'Athlete & Guardian Management'),
  ('Document Uploaded Confirmation', 'document-uploaded-confirmation', 'document_uploaded_confirmation'::public.notification_job_type, 'Document received', 'Document upload confirmation', 'Document uploaded confirmation.', '<p>Hi {{recipient_name}},</p><p>We have received your uploaded document. Thank you.</p>', 'Athlete & Guardian Management'),
  -- 8. Media
  ('New Gallery Published', 'new-gallery-published', 'new_gallery_published'::public.notification_job_type, 'New gallery: {{gallery_title}}', 'Album made public', 'Album made public.', '<p>Hi {{recipient_name}},</p><p>A new gallery has been published: {{gallery_title}}. View it in the hub.</p>', 'Media'),
  ('Photo Tag Notification', 'photo-tag-notification', 'photo_tag_notification'::public.notification_job_type, 'You were tagged in a photo', 'Athlete tagged in photo. Recipient: Parent.', 'Athlete tagged in photo. Recipient: Parent.', '<p>Hi {{recipient_name}},</p><p>{{athlete_name}} was tagged in a photo. View it in the gallery.</p>', 'Media'),
  ('Video Uploaded (Internal)', 'video-uploaded-internal', 'video_uploaded_internal'::public.notification_job_type, 'Video uploaded', 'Internal', 'Video uploaded. Internal notice.', '<p>A new video has been uploaded and is available for review.</p>', 'Media'),
  -- 9. Subscriptions & billing (org-level)
  ('Organization Subscription Started', 'org-subscription-started', 'org_subscription_started'::public.notification_job_type, 'Your subscription has started', 'Subscription started', 'Organization subscription started.', '<p>Hi {{recipient_name}},</p><p>Your organization subscription has started. You now have access to your plan features.</p>', 'Subscriptions & Billing'),
  ('Organization Subscription Renewed', 'org-subscription-renewed', 'org_subscription_renewed'::public.notification_job_type, 'Subscription renewed', 'Subscription renewed', 'Organization subscription renewed.', '<p>Hi {{recipient_name}},</p><p>Your subscription has been renewed. Thank you for continuing with us.</p>', 'Subscriptions & Billing'),
  ('Organization Subscription Failed', 'org-subscription-failed', 'org_subscription_failed'::public.notification_job_type, 'Subscription payment failed', 'Payment failed', 'Organization subscription payment failed.', '<p>Hi {{recipient_name}},</p><p>We could not process your subscription payment. Please update your billing information.</p>', 'Subscriptions & Billing'),
  ('Organization Subscription Canceled', 'org-subscription-canceled', 'org_subscription_canceled'::public.notification_job_type, 'Subscription canceled', 'Subscription canceled', 'Organization subscription canceled.', '<p>Hi {{recipient_name}},</p><p>Your subscription has been canceled. You will retain access until the end of the current period.</p>', 'Subscriptions & Billing'),
  ('Trial Ending Soon', 'trial-ending-soon', 'trial_ending_soon'::public.notification_job_type, 'Your trial ends soon', 'Trial ending', 'Trial ending soon.', '<p>Hi {{recipient_name}},</p><p>Your trial period is ending soon. Add a payment method to continue without interruption.</p>', 'Subscriptions & Billing'),
  ('License Tier Changed', 'license-tier-changed', 'license_tier_changed'::public.notification_job_type, 'Your plan has been updated', 'License tier changed', 'License tier changed.', '<p>Hi {{recipient_name}},</p><p>Your plan has been updated. You may have access to new features.</p>', 'Subscriptions & Billing'),
  ('Billing Info Updated Confirmation', 'billing-info-updated', 'billing_info_updated'::public.notification_job_type, 'Billing information updated', 'Billing updated', 'Billing info updated confirmation.', '<p>Hi {{recipient_name}},</p><p>Your billing information has been updated successfully.</p>', 'Subscriptions & Billing'),
  -- 10. System & security
  ('Suspicious Login Alert', 'suspicious-login-alert', 'suspicious_login_alert'::public.notification_job_type, 'Suspicious login detected', 'Security alert', 'Suspicious login alert.', '<p>Hi {{recipient_name}},</p><p>We detected a suspicious login to your account. If this was not you, please reset your password immediately.</p>', 'System & Security'),
  ('New Device Login Alert', 'new-device-login-alert', 'new_device_login_alert'::public.notification_job_type, 'New device used to sign in', 'New device', 'New device login alert.', '<p>Hi {{recipient_name}},</p><p>Your account was used to sign in from a new device or location. If this was you, you can ignore this message.</p>', 'System & Security'),
  ('Data Export Ready', 'data-export-ready', 'data_export_ready'::public.notification_job_type, 'Your data export is ready', 'Data export', 'Data export ready.', '<p>Hi {{recipient_name}},</p><p>Your data export is ready. Use the link below to download it.</p>', 'System & Security'),
  ('Privacy Policy Update', 'privacy-policy-update', 'privacy_policy_update'::public.notification_job_type, 'Privacy policy updated', 'Policy update', 'Privacy policy update.', '<p>Hi {{recipient_name}},</p><p>We have updated our privacy policy. Please review the changes.</p>', 'System & Security'),
  ('Terms of Service Update', 'terms-update', 'terms_update'::public.notification_job_type, 'Terms of service updated', 'Terms update', 'Terms of service update.', '<p>Hi {{recipient_name}},</p><p>We have updated our terms of service. Please review the changes.</p>', 'System & Security'),
  ('Maintenance Notification', 'maintenance-notification', 'maintenance_notification'::public.notification_job_type, 'Scheduled maintenance', 'Scheduled downtime', 'Maintenance notification (scheduled downtime).', '<p>Hi {{recipient_name}},</p><p>We will perform scheduled maintenance. Services may be briefly unavailable during the window.</p>', 'System & Security'),
  ('Incident Notification', 'incident-notification', 'incident_notification'::public.notification_job_type, 'Service update', 'Major outage', 'Incident notification (major outage).', '<p>Hi {{recipient_name}},</p><p>We are experiencing an issue that may affect the service. We are working to resolve it and will update you soon.</p>', 'System & Security'),
  -- 11. Admin alerts (internal)
  ('New Org Signup (Internal)', 'new-org-signup-internal', 'new_org_signup_internal'::public.notification_job_type, 'New organization signup', 'Internal platform admin', 'New org signup. Internal platform admin.', '<p>A new organization has signed up. Review in the platform admin dashboard.</p>', 'Admin Alerts'),
  ('Large Purchase Alert', 'large-purchase-alert', 'large_purchase_alert'::public.notification_job_type, 'Large purchase alert', 'Fraud threshold', 'Large purchase alert. Fraud threshold. Recipient: org_admin.', '<p>A large purchase has been flagged for review. Check the dashboard for details.</p>', 'Admin Alerts'),
  ('Multiple Failed Payments Alert', 'multiple-failed-payments-alert', 'multiple_failed_payments_alert'::public.notification_job_type, 'Multiple failed payments', 'Alert', 'Multiple failed payments alert.', '<p>Multiple payment failures have been detected for an account. Review and follow up if needed.</p>', 'Admin Alerts'),
  ('Guardian Invite Expiring Soon', 'guardian-invite-expiring-soon', 'guardian_invite_expiring_soon'::public.notification_job_type, 'Guardian invite expiring', 'Invite expiring', 'Guardian invite expiring soon.', '<p>A guardian invite is expiring soon. Send a reminder or create a new invite if needed.</p>', 'Admin Alerts'),
  ('Event Overcapacity Warning', 'event-overcapacity-warning', 'event_overcapacity_warning'::public.notification_job_type, 'Event near or over capacity', 'Overcapacity', 'Event overcapacity warning.', '<p>An event is near or over capacity. Consider adding capacity or closing registration.</p>', 'Admin Alerts'),
  -- 12. Optional marketing / engagement
  ('Season Kickoff Welcome', 'season-kickoff-welcome', 'season_kickoff_welcome'::public.notification_job_type, 'Season kickoff at {{organization_name}}', 'Season kickoff', 'Season kickoff welcome.', '<p>Hi {{recipient_name}},</p><p>The season is about to begin. Here is what you need to know to get started.</p>', 'Marketing & Engagement'),
  ('Mid-Season Check-In', 'mid-season-check-in', 'mid_season_check_in'::public.notification_job_type, 'Mid-season check-in', 'Check-in', 'Mid-season check-in.', '<p>Hi {{recipient_name}},</p><p>We are halfway through the season. Here is a quick update and what is coming next.</p>', 'Marketing & Engagement'),
  ('End of Season Summary', 'end-of-season-summary', 'end_of_season_summary'::public.notification_job_type, 'End of season summary', 'Season summary', 'End of season summary.', '<p>Hi {{recipient_name}},</p><p>The season has ended. Thank you for participating. Here is a brief summary and how to stay connected.</p>', 'Marketing & Engagement'),
  ('Fan Engagement Highlight', 'fan-engagement-highlight', 'fan_engagement_highlight'::public.notification_job_type, 'Highlight from {{organization_name}}', 'Engagement highlight', 'Fan engagement highlight.', '<p>Hi {{recipient_name}},</p><p>Check out this highlight from {{organization_name}}. We hope you enjoy it.</p>', 'Marketing & Engagement'),
  ('Donation Campaign Launch', 'donation-campaign-launch', 'donation_campaign_launch'::public.notification_job_type, 'Support {{organization_name}}', 'If applicable', 'Donation campaign launch (if applicable).', '<p>Hi {{recipient_name}},</p><p>{{organization_name}} has launched a campaign. Learn how you can support.</p>', 'Marketing & Engagement')
)
INSERT INTO public.email_templates (name, slug, type, subject_template, preview_text, description, body_content, html_content, variables, required_variables, is_active, category)
SELECT
  d.name,
  d.slug,
  d.type,
  d.subject_template,
  d.preview_text,
  d.description,
  d.body_content,
  REPLACE((SELECT t FROM universal_wrapper), '{{BODY_CONTENT}}', d.body_content),
  '[]'::jsonb,
  '[]'::jsonb,
  false,
  d.category
FROM seed_data d
ON CONFLICT (slug) DO NOTHING;
