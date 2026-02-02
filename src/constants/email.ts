/**
 * Email templates and configuration
 */

// Email from address (default, can be overridden by env var)
export const EMAIL_FROM_ADDRESS = 'notifications@youthsports.team'

// Email subjects and preview text
export const EMAIL_TEMPLATES = {
  new_event: {
    subject: 'New Event: {{event_title}}',
    preview: 'A new event has been scheduled for your team',
  },
  new_message: {
    subject: 'New Message from {{sender_name}}',
    preview: 'You have a new message in Team Hub',
  },
  payment_receipt: {
    subject: 'Payment Receipt - ${{amount}}',
    preview: 'Your payment has been processed successfully',
  },
  payment_reminder: {
    subject: 'Payment Reminder - ${{amount}} due {{due_date}}',
    preview: 'You have an upcoming payment due',
  },
  event_reminder: {
    subject: 'Reminder: {{event_title}}',
    preview: 'Upcoming event reminder',
  },
  registration_confirmation: {
    subject: 'Registration Confirmed',
    preview: 'Your registration has been confirmed',
  },
  team_invite: {
    subject: 'You\'re invited to join {{team_name}}',
    preview: 'Join your team on YouthSports Team Hub',
  },
  password_reset: {
    subject: 'Reset Your Password',
    preview: 'Password reset instructions',
  },
  welcome_email: {
    subject: 'Welcome to YouthSports Team Hub',
    preview: 'Get started with your new account',
  },
  photo_approved: {
    subject: 'Your photo was approved - {{gallery_name}}',
    preview: 'Your photo has been approved and added to the gallery',
  },
  photo_rejected: {
    subject: 'Your photo was not approved - {{gallery_name}}',
    preview: 'Your photo was not approved for the gallery',
  },
  admin_invite: {
    subject: 'Admin Invitation - {{org_name}}',
    preview: 'You have been invited as an administrator',
  },
  guardian_invite: {
    subject: 'Guardian Invitation - {{org_name}}',
    preview: 'You have been invited as a guardian',
  },
  coach_invite: {
    subject: 'Coach Invitation - {{org_name}}',
    preview: 'You have been invited as a coach',
  },
  staff_invite: {
    subject: 'Staff Invitation - {{org_name}}',
    preview: 'You have been invited to the staff',
  },
  announcement: {
    subject: 'Announcement: {{title}}',
    preview: 'New announcement from {{org_name}}',
  },
  follow_up_message: {
    subject: 'Follow-up: {{subject}}',
    preview: 'A follow-up message from {{sender_name}}',
  },
  marketing_promo: {
    subject: 'Special Offer from {{org_name}}',
    preview: 'Don\'t miss out on this opportunity',
  },
  member_referral: {
    subject: 'Refer a Friend - {{org_name}}',
    preview: 'Invite friends to join your team',
  },
  program_highlights: {
    subject: 'Program Highlights - {{program_name}}',
    preview: 'Updates from your program',
  },
  re_engagement: {
    subject: 'We miss you! - {{org_name}}',
    preview: 'Come back and see what\'s new',
  },
  urgent_notification: {
    subject: 'Urgent: {{title}}',
    preview: 'Important information from {{org_name}}',
  },
} as const

export type EmailTemplateKey = keyof typeof EMAIL_TEMPLATES

// Email configuration
export const EMAIL_CONFIG = {
  // Email types supported by notification system
  SUPPORTED_TYPES: [
    'new_event',
    'new_message',
    'payment_receipt',
    'payment_reminder',
    'event_reminder',
    'registration_confirmation',
    'team_invite',
    'password_reset',
    'welcome_email',
    'photo_approved',
    'photo_rejected',
  ] as const,
  
  // Email priority levels
  PRIORITY: {
    LOW: 'low',
    NORMAL: 'normal',
    HIGH: 'high',
    URGENT: 'urgent',
  } as const,
} as const

export type EmailPriority = typeof EMAIL_CONFIG.PRIORITY[keyof typeof EMAIL_CONFIG.PRIORITY]
