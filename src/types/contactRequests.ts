/**
 * Contact Requests Types
 *
 * TypeScript types for the org_contact_requests table and related flows.
 * These must exactly match the DB CHECK constraints and column names.
 *
 * Key rule: The category values here must match the SQL CHECK constraint in
 * 20260412000056_org_contact_requests.sql.
 */

// ============================================================================
// Enums
// ============================================================================

export const CONTACT_REQUEST_CATEGORIES = [
  'schedule_event',
  'payments_fees',
  'registration_eligibility',
  'attendance_availability',
  'team_roster',
  'technical_bug',
  'general_question',
  'feature_request',
] as const

export type ContactRequestCategory = typeof CONTACT_REQUEST_CATEGORIES[number]

export const CONTACT_REQUEST_STATUSES = [
  'new',
  'open',
  'in_progress',
  'resolved',
  'closed',
] as const

export type ContactRequestStatus = typeof CONTACT_REQUEST_STATUSES[number]

export const REQUESTER_ROLES = ['guardian', 'athlete', 'coach', 'other'] as const
export type RequesterRole = typeof REQUESTER_ROLES[number]

// ============================================================================
// Domain model — maps directly to org_contact_requests columns
// ============================================================================

export interface OrgContactRequest {
  id: string
  org_id: string
  requester_user_id: string
  requester_role: RequesterRole

  athlete_id: string | null
  team_id: string | null
  season_id: string | null
  event_id: string | null

  category: ContactRequestCategory
  subject: string | null
  message: string
  attachments: unknown[]

  // Feature-request–specific (null for all other categories)
  requested_feature_key: string | null
  requested_feature_name: string | null
  requested_feature_reason: string | null
  requested_feature_use_case: string | null

  // Admin workflow
  status: ContactRequestStatus
  assigned_to_user_id: string | null
  admin_notes: string | null

  created_at: string
  updated_at: string
}

// ============================================================================
// Payload types (for submit edge function)
// ============================================================================

export interface SubmitOrgContactRequestPayload {
  org_id: string
  category: ContactRequestCategory
  message: string
  subject?: string
  athlete_id?: string
  team_id?: string
  season_id?: string
  event_id?: string
  requested_feature_key?: string
  requested_feature_name?: string
  requested_feature_reason?: string
  requested_feature_use_case?: string
  attachments?: unknown[]
}

// ============================================================================
// Filters (for org admin list view)
// ============================================================================

export interface OrgContactRequestFilters {
  status?: ContactRequestStatus
  category?: ContactRequestCategory
  team_id?: string
  date_from?: string
  date_to?: string
}

// ============================================================================
// Admin update (workflow fields only — requester_user_id is immutable)
// ============================================================================

export interface OrgContactRequestUpdate {
  status?: ContactRequestStatus
  assigned_to_user_id?: string | null
  admin_notes?: string | null
}

// ============================================================================
// Feature availability (returned by get_features_not_in_org RPC)
// ============================================================================

export interface UnavailableFeature {
  feature_key: string
  display_name: string
  description: string
  recommended_action: 'upgrade_plan'
}

// ============================================================================
// Edge function response
// ============================================================================

export interface SubmitOrgContactRequestResult {
  request_id: string
  status: ContactRequestStatus
  org_admins_notified: number
  platform_admins_notified: number
}
