/**
 * Contact Form Subject Enums
 * 
 * Defines subject options for each contact surface (help, portal, admin).
 * These enums are used to generate TypeScript types and translation keys.
 */

// Help contact subjects (public)
export const HELP_CONTACT_SUBJECTS = [
  'general_question',
  'account_help',
  'billing_question',
  'bug_report',
  'feature_request',
  'other',
] as const

// Portal contact subjects (coach/guardian portal)
export const PORTAL_CONTACT_SUBJECTS = [
  'schedule_question',
  'travel_question',
  'payments_question',
  'roster_question',
  'uniforms_question',
  'announcements_question',
  'huddles_question',
  'bug_report',
  'feature_request',
  'other',
] as const

// Admin contact subjects (org admins)
export const ADMIN_CONTACT_SUBJECTS = [
  'onboarding_help',
  'billing_and_license',
  'payments_and_payouts',
  'rls_or_permissions',
  'data_issue',
  'feature_request',
  'bug_report',
  'other',
] as const

// TypeScript union types derived from const arrays
export type HelpContactSubject = typeof HELP_CONTACT_SUBJECTS[number]
export type PortalContactSubject = typeof PORTAL_CONTACT_SUBJECTS[number]
export type AdminContactSubject = typeof ADMIN_CONTACT_SUBJECTS[number]

// Surface type
export type ContactSurface = 'help' | 'portal' | 'admin'

// Combined subject type
export type ContactSubject = HelpContactSubject | PortalContactSubject | AdminContactSubject
