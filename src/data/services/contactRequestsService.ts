/**
 * Contact Requests Service
 *
 * CRUD operations for org_contact_requests.
 * - Submission goes through the edge function (server-side auth + notifications).
 * - List/detail/update go through the Supabase client (RLS enforces access).
 *
 * NOTE: admin_notes is intentionally excluded from the guardian-facing query
 * (getMyOrgContactRequests). Org admins see all fields via getOrgContactRequests.
 */

import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import { debug } from '../../lib/debug'
import { createServiceResponse, normalizeSupabaseResponse } from './responseHelpers'
import { classifySupabaseError } from '../../utils/supabaseErrorHandler'
import type { ServiceResponse } from './responseHelpers'
import type {
  OrgContactRequest,
  OrgContactRequestFilters,
  OrgContactRequestUpdate,
  SubmitOrgContactRequestPayload,
  SubmitOrgContactRequestResult,
  UnavailableFeature,
} from '../../types/contactRequests'

// ============================================================================
// Mock data (demo mode only — never writes real data)
// ============================================================================

function generateMockRequests(orgId: string): OrgContactRequest[] {
  const categories: OrgContactRequest['category'][] = [
    'schedule_event', 'payments_fees', 'general_question', 'feature_request',
  ]
  const statuses: OrgContactRequest['status'][] = ['new', 'open', 'in_progress', 'resolved']
  const now = new Date()

  const realisticMessages: Record<string, string[]> = {
    schedule_event: [
      'Can we reschedule the practice on Friday? My son has a school event that conflicts.',
      'The game time changed but I didn\'t receive a notification. Can you confirm the new start time?',
      'Is there a make-up practice scheduled for the one we missed last week due to weather?',
      'My daughter can\'t make the away game this weekend. Should I notify the coach directly?',
    ],
    payments_fees: [
      'I submitted payment last week but it still shows as pending. Can you check the status?',
      'I need to update my payment method. How do I change the card on file?',
      'The registration fee seems higher than what was quoted. Can someone clarify the breakdown?',
      'I\'m having trouble accessing the payment portal. The link in the email isn\'t working.',
    ],
    general_question: [
      'What equipment does my child need to bring to the first practice?',
      'Are parents allowed to attend practices, or is it players and coaches only?',
      'How do I update my contact information in the system?',
      'Can you provide more information about the end-of-season tournament?',
    ],
    feature_request: [
      'It would be great if we could see photos from games directly in the app.',
      'Can we add a feature to track player statistics throughout the season?',
      'I\'d love to be able to message other parents on the team.',
      'Would it be possible to add a calendar sync feature so games automatically appear in my phone calendar?',
    ],
  }

  return Array.from({ length: 12 }, (_, i) => {
    const daysAgo = Math.floor(i * 1.5)
    const createdAt = new Date(now.getTime() - daysAgo * 86_400_000).toISOString()
    const category = categories[i % categories.length]
    const messages = realisticMessages[category] || []
    const message = messages[i % messages.length] || `I have a question about ${category.replace(/_/g, ' ')}.`

    return {
      id: `mock-req-${i}`,
      org_id: orgId,
      requester_user_id: `mock-user-${i % 4}`,
      requester_role: i % 2 === 0 ? 'guardian' : 'athlete',
      athlete_id: i % 3 === 0 ? `mock-athlete-${i}` : null,
      team_id: i % 2 === 0 ? `mock-team-${i % 2}` : null,
      season_id: null,
      event_id: null,
      category,
      subject: category === 'feature_request' ? 'Photo gallery request' : null,
      message,
      attachments: [],
      requested_feature_key: category === 'feature_request' ? 'photo_galleries' : null,
      requested_feature_name: category === 'feature_request' ? 'Photo Galleries' : null,
      requested_feature_reason: category === 'feature_request' ? 'We want to share photos' : null,
      requested_feature_use_case: category === 'feature_request' ? 'Photo sharing / galleries' : null,
      status: statuses[i % statuses.length],
      assigned_to_user_id: i > 6 ? `mock-admin-1` : null,
      admin_notes: i > 8 ? 'Reviewed — forwarding to billing.' : null,
      created_at: createdAt,
      updated_at: createdAt,
    }
  })
}

function generateMockUnavailableFeatures(): UnavailableFeature[] {
  return [
    { feature_key: 'photo_galleries', display_name: 'Photo Galleries', description: 'Share team photos and game highlights.', recommended_action: 'upgrade_plan' },
    { feature_key: 'advanced_reporting', display_name: 'Advanced Reporting', description: 'Detailed analytics and custom reports.', recommended_action: 'upgrade_plan' },
    { feature_key: 'custom_branding', display_name: 'Custom Branding', description: 'Apply your org colors and logo throughout the app.', recommended_action: 'upgrade_plan' },
    { feature_key: 'ticketing', display_name: 'Event Ticketing', description: 'Sell tickets to games and events online.', recommended_action: 'upgrade_plan' },
    { feature_key: 'travel_planning', display_name: 'Travel Planning', description: 'Coordinate travel logistics for away games.', recommended_action: 'upgrade_plan' },
  ]
}

// ============================================================================
// Guardian/athlete: submit via edge function
// ============================================================================

/**
 * Submit a new contact request to the org admin.
 * Routes through the edge function for server-side auth, validation,
 * duplicate detection, and notification dispatch.
 */
export async function submitOrgContactRequest(
  payload: SubmitOrgContactRequestPayload
): Promise<ServiceResponse<SubmitOrgContactRequestResult>> {
  debug.data('ContactRequestsService.submitOrgContactRequest', 'Request', { category: payload.category })
  debug.perf.start('contactRequestsService.submitOrgContactRequest')

  if (USE_FAKE_DATA) {
    try {
      await new Promise(resolve => setTimeout(resolve, 600))
      const result: SubmitOrgContactRequestResult = {
        request_id: `mock-req-${Date.now()}`,
        status: 'new',
        org_admins_notified: 2,
        platform_admins_notified: payload.category === 'feature_request' ? 1 : 0,
      }
      debug.perf.end('contactRequestsService.submitOrgContactRequest')
      return createServiceResponse(result, null)
    } catch (err) {
      debug.perf.end('contactRequestsService.submitOrgContactRequest')
      return createServiceResponse<SubmitOrgContactRequestResult>(null, err instanceof Error ? err : new Error('Unknown error'))
    }
  }

  try {
    const { data: session } = await supabase.auth.getSession()
    const token = session?.session?.access_token
    if (!token) {
      throw new Error('Not authenticated')
    }

    const supabaseUrl = (supabase as any).supabaseUrl as string
    const response = await fetch(`${supabaseUrl}/functions/v1/submit-org-contact-request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })

    const json = await response.json()

    if (!response.ok) {
      throw new Error(json?.error ?? `Request failed: ${response.status}`)
    }

    debug.perf.end('contactRequestsService.submitOrgContactRequest')
    return createServiceResponse(json as SubmitOrgContactRequestResult, null)
  } catch (err) {
    debug.perf.end('contactRequestsService.submitOrgContactRequest')
    const classifiedError = classifySupabaseError(err)
    return createServiceResponse<SubmitOrgContactRequestResult>(null, classifiedError)
  }
}

// ============================================================================
// Guardian/athlete: view own requests (status only — no admin_notes)
// ============================================================================

/**
 * Get the current user's own contact requests for a given org.
 * Excludes admin_notes (org-internal field).
 */
export async function getMyOrgContactRequests(
  orgId: string
): Promise<ServiceResponse<OrgContactRequest[]>> {
  debug.data('ContactRequestsService.getMyOrgContactRequests', 'Request', { orgId })
  debug.perf.start('contactRequestsService.getMyOrgContactRequests')

  if (USE_FAKE_DATA) {
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      const all = generateMockRequests(orgId)
      debug.perf.end('contactRequestsService.getMyOrgContactRequests')
      return createServiceResponse(all.slice(0, 3), null)
    } catch (err) {
      debug.perf.end('contactRequestsService.getMyOrgContactRequests')
      return createServiceResponse([], err instanceof Error ? err : new Error('Unknown error'))
    }
  }

  try {
    // Intentionally exclude admin_notes from requester-facing queries
    const { data, error } = await (supabase as any)
      .from('org_contact_requests')
      .select(`
        id, org_id, requester_user_id, requester_role,
        athlete_id, team_id, season_id, event_id,
        category, subject, message, attachments,
        requested_feature_key, requested_feature_name,
        requested_feature_reason, requested_feature_use_case,
        status, assigned_to_user_id,
        created_at, updated_at
      `)
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (error) throw error

    const normalized = normalizeSupabaseResponse(data, true) as OrgContactRequest[]

    debug.perf.end('contactRequestsService.getMyOrgContactRequests')
    return createServiceResponse(normalized, null)
  } catch (err) {
    debug.perf.end('contactRequestsService.getMyOrgContactRequests')
    const classifiedError = classifySupabaseError(err)
    return createServiceResponse([], classifiedError)
  }
}

// ============================================================================
// Org admin: list requests
// ============================================================================

/**
 * Get all contact requests for an org (org admin view — includes admin_notes).
 */
export async function getOrgContactRequests(
  orgId: string,
  filters: OrgContactRequestFilters = {},
  page = 0,
  rowsPerPage = 25
): Promise<ServiceResponse<OrgContactRequest[]>> {
  debug.data('ContactRequestsService.getOrgContactRequests', 'Request', { orgId, filters, page })
  debug.perf.start('contactRequestsService.getOrgContactRequests')

  if (USE_FAKE_DATA) {
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      let mock = generateMockRequests(orgId)

      if (filters.status) mock = mock.filter(r => r.status === filters.status)
      if (filters.category) mock = mock.filter(r => r.category === filters.category)
      if (filters.team_id) mock = mock.filter(r => r.team_id === filters.team_id)
      if (filters.date_from) {
        const from = new Date(filters.date_from)
        mock = mock.filter(r => new Date(r.created_at) >= from)
      }
      if (filters.date_to) {
        const to = new Date(filters.date_to)
        mock = mock.filter(r => new Date(r.created_at) <= to)
      }

      const start = page * rowsPerPage
      debug.perf.end('contactRequestsService.getOrgContactRequests')
      return createServiceResponse(mock.slice(start, start + rowsPerPage), null)
    } catch (err) {
      debug.perf.end('contactRequestsService.getOrgContactRequests')
      return createServiceResponse([], err instanceof Error ? err : new Error('Unknown error'))
    }
  }

  try {
    let query = (supabase as any)
      .from('org_contact_requests')
      .select('*')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false })

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.category) query = query.eq('category', filters.category)
    if (filters.team_id) query = query.eq('team_id', filters.team_id)
    if (filters.date_from) query = query.gte('created_at', filters.date_from)
    if (filters.date_to) query = query.lte('created_at', filters.date_to)

    const from = page * rowsPerPage
    query = query.range(from, from + rowsPerPage - 1)

    const { data, error } = await query

    if (error) throw error

    const normalized = normalizeSupabaseResponse(data, true) as OrgContactRequest[]
    debug.perf.end('contactRequestsService.getOrgContactRequests')
    return createServiceResponse(normalized, null)
  } catch (err) {
    debug.perf.end('contactRequestsService.getOrgContactRequests')
    const classifiedError = classifySupabaseError(err)
    return createServiceResponse([], classifiedError)
  }
}

// ============================================================================
// Org admin: request detail
// ============================================================================

/**
 * Get a single contact request by ID.
 * RLS ensures org admins can only see requests in their org.
 */
export async function getOrgContactRequest(
  requestId: string
): Promise<ServiceResponse<OrgContactRequest | null>> {
  debug.data('ContactRequestsService.getOrgContactRequest', 'Request', { requestId })
  debug.perf.start('contactRequestsService.getOrgContactRequest')

  if (USE_FAKE_DATA) {
    try {
      await new Promise(resolve => setTimeout(resolve, 200))
      const all = generateMockRequests('mock-org')
      const found = all.find(r => r.id === requestId) ?? all[0] ?? null
      debug.perf.end('contactRequestsService.getOrgContactRequest')
      return createServiceResponse(found, null)
    } catch (err) {
      debug.perf.end('contactRequestsService.getOrgContactRequest')
      return createServiceResponse(null, err instanceof Error ? err : new Error('Unknown error'))
    }
  }

  try {
    const { data, error } = await (supabase as any)
      .from('org_contact_requests')
      .select('*')
      .eq('id', requestId)
      .maybeSingle()

    if (error) throw error

    debug.perf.end('contactRequestsService.getOrgContactRequest')
    return createServiceResponse(data as OrgContactRequest | null, null)
  } catch (err) {
    debug.perf.end('contactRequestsService.getOrgContactRequest')
    const classifiedError = classifySupabaseError(err)
    return createServiceResponse(null, classifiedError)
  }
}

// ============================================================================
// Org admin: update workflow fields
// ============================================================================

/**
 * Update status, assignment, or admin_notes on a request.
 * Only workflow fields are permitted — requester_user_id is immutable.
 */
export async function updateOrgContactRequest(
  requestId: string,
  updates: OrgContactRequestUpdate
): Promise<ServiceResponse<OrgContactRequest>> {
  debug.data('ContactRequestsService.updateOrgContactRequest', 'Request', { requestId, updates })
  debug.perf.start('contactRequestsService.updateOrgContactRequest')

  if (USE_FAKE_DATA) {
    try {
      await new Promise(resolve => setTimeout(resolve, 300))
      const all = generateMockRequests('mock-org')
      const existing = all.find(r => r.id === requestId) ?? all[0]
      const updated: OrgContactRequest = { ...existing, ...updates, updated_at: new Date().toISOString() }
      debug.perf.end('contactRequestsService.updateOrgContactRequest')
      return createServiceResponse(updated, null)
    } catch (err) {
      debug.perf.end('contactRequestsService.updateOrgContactRequest')
      return createServiceResponse(null as unknown as OrgContactRequest, err instanceof Error ? err : new Error('Unknown error'))
    }
  }

  try {
    // Only allow the three workflow fields — never touch requester_user_id, org_id, etc.
    const safeUpdates: OrgContactRequestUpdate = {}
    if (updates.status !== undefined) safeUpdates.status = updates.status
    if (updates.assigned_to_user_id !== undefined) safeUpdates.assigned_to_user_id = updates.assigned_to_user_id
    if (updates.admin_notes !== undefined) safeUpdates.admin_notes = updates.admin_notes

    const { data, error } = await (supabase as any)
      .from('org_contact_requests')
      .update(safeUpdates)
      .eq('id', requestId)
      .select()
      .single()

    if (error) throw error

    debug.perf.end('contactRequestsService.updateOrgContactRequest')
    return createServiceResponse(data as OrgContactRequest, null)
  } catch (err) {
    debug.perf.end('contactRequestsService.updateOrgContactRequest')
    const classifiedError = classifySupabaseError(err)
    return createServiceResponse(null as unknown as OrgContactRequest, classifiedError)
  }
}

// ============================================================================
// Org admin: demand signal count for feature requests
// ============================================================================

/**
 * Count how many requests exist for a specific feature key in the last N days.
 * Used to show "X others have requested this" on the admin detail view.
 * Never exposed to guardians/athletes.
 */
export async function getFeatureRequestCount(
  orgId: string,
  featureKey: string,
  days = 30
): Promise<ServiceResponse<number>> {
  debug.data('ContactRequestsService.getFeatureRequestCount', 'Request', { orgId, featureKey, days })

  if (USE_FAKE_DATA) {
    return createServiceResponse(3, null)
  }

  try {
    const since = new Date(Date.now() - days * 86_400_000).toISOString()

    const { count, error } = await (supabase as any)
      .from('org_contact_requests')
      .select('id', { count: 'exact', head: true })
      .eq('org_id', orgId)
      .eq('category', 'feature_request')
      .eq('requested_feature_key', featureKey)
      .gte('created_at', since)

    if (error) throw error

    return createServiceResponse(count ?? 0, null)
  } catch (err) {
    const classifiedError = classifySupabaseError(err)
    return createServiceResponse(0, classifiedError)
  }
}

// ============================================================================
// Guardian/athlete: features not in org's current plan
// ============================================================================

/**
 * Fetch the list of features the org does NOT currently have, based on its tier.
 * Calls the get_features_not_in_org RPC.
 * Returns empty array for tier3 orgs (they have everything).
 * Always fetches fresh — no client-side cache.
 */
export async function getUnavailableFeatures(
  orgId: string
): Promise<ServiceResponse<UnavailableFeature[]>> {
  debug.data('ContactRequestsService.getUnavailableFeatures', 'Request', { orgId })
  debug.perf.start('contactRequestsService.getUnavailableFeatures')

  if (USE_FAKE_DATA) {
    try {
      await new Promise(resolve => setTimeout(resolve, 400))
      debug.perf.end('contactRequestsService.getUnavailableFeatures')
      return createServiceResponse(generateMockUnavailableFeatures(), null)
    } catch (err) {
      debug.perf.end('contactRequestsService.getUnavailableFeatures')
      return createServiceResponse([], err instanceof Error ? err : new Error('Unknown error'))
    }
  }

  try {
    const { data, error } = await (supabase as any).rpc('get_features_not_in_org', {
      p_org_id: orgId,
    })

    if (error) throw error

    const normalized = normalizeSupabaseResponse(data, true) as UnavailableFeature[]
    debug.perf.end('contactRequestsService.getUnavailableFeatures')
    return createServiceResponse(normalized, null)
  } catch (err) {
    debug.perf.end('contactRequestsService.getUnavailableFeatures')
    const classifiedError = classifySupabaseError(err)
    return createServiceResponse([], classifiedError)
  }
}
