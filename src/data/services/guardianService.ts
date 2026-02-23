/**
 * Guardian Service
 *
 * Provides data access for guardian operations including:
 * - Guardian email matching and lookup
 * - Linking guardians to athletes
 * - Managing guardian relationships
 * - Getting athletes for a guardian
 */

import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA } from '../config'
import type {
    Guardian,
    GuardianMatch,
    AthleteGuardian,
    Athlete,
    RelationshipType
} from '../../types/family'

type ParentInvite = Database['public']['Tables']['parent_invites']['Row']

// ============================================================================
// Notification Helper
// ============================================================================

/**
 * Trigger the notification worker to process queued emails
 * This is called after creating or resending an invite
 * Passes the current app origin so email links use the correct base URL
 * When jobIds is provided, the worker processes only those jobs (e.g. after resend).
 */
async function triggerNotificationWorker(jobIds?: string[]): Promise<void> {
    try {
        const appBaseUrl = window.location.origin
        const body: { appBaseUrl: string; job_ids?: string[] } = { appBaseUrl }
        if (jobIds?.length) body.job_ids = jobIds
        const { error } = await supabase.functions.invoke('notification-worker', { body })
        if (error) {
            console.warn('Failed to trigger notification worker:', error)
        }
    } catch (err) {
        console.warn('Error triggering notification worker:', err)
    }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Normalize email on client side (matches server-side normalization)
 */
export function normalizeEmail(email: string): string {
    if (!email) return ''

    const normalized = email.toLowerCase().trim()
    const [local, domain] = normalized.split('@')

    if (!local || !domain) return normalized

    // Gmail-specific normalization
    if (domain === 'gmail.com' || domain === 'googlemail.com') {
        // Remove dots and everything after +
        const cleanLocal = local.replace(/\./g, '').split('+')[0]
        return `${cleanLocal}@${domain}`
    }

    return normalized
}

/**
 * Validate email format
 */
export function validateGuardianEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

// ============================================================================
// Guardian Lookup & Matching
// ============================================================================

/**
 * Find existing guardian by email with normalized matching
 */
export async function findGuardianByEmail(
    email: string,
    orgId: string
): Promise<{ data: GuardianMatch | null; error: Error | null }> {
    console.groupCollapsed(`%cfindGuardianByEmail: ${email}`, 'color: #666; font-weight: bold;');
    debug.data('GuardianService.findGuardianByEmail', 'Request', { email, orgId })
    debug.perf.start('guardianService.findGuardianByEmail')

    try {
        if (!email || !validateGuardianEmail(email)) {
            debug.perf.end('guardianService.findGuardianByEmail')
            debug.error('GuardianService.findGuardianByEmail', 'Invalid email format', { email })
            console.groupEnd()
            return {
                data: null,
                error: new Error('Invalid email format')
            }
        }

        // Call RPC function that does normalized email matching
        // Note: This function returns a TABLE, so we get an array of rows
        const { data, error } = await supabase
            .rpc('find_guardian_by_email', {
                p_email: email,
                p_org_id: orgId
            })

        if (error) {
            throw error
        }

        // If no rows returned, user doesn't exist
        if (!data || !Array.isArray(data) || data.length === 0) {
            debug.perf.end('guardianService.findGuardianByEmail')
            debug.data('GuardianService.findGuardianByEmail', 'Response (not found)', { email, exists: false })
            console.groupEnd()
            return {
                data: {
                    exists: false,
                    user: null,
                    linkedAthletes: [],
                    suggestion: 'create_invite'
                },
                error: null
            }
        }

        // Get the first (and should be only) row
        const row = data[0]

        type LinkedAthlete = { id: string; first_name: string; last_name: string; birthdate: string }

        // Parse linked_athletes JSONB
        const linkedAthletes = Array.isArray(row.linked_athletes)
            ? row.linked_athletes as LinkedAthlete[]
            : []

        debug.perf.end('guardianService.findGuardianByEmail')
        debug.data('GuardianService.findGuardianByEmail', 'Response', { email, exists: true, linkedAthleteCount: linkedAthletes.length })
        console.groupEnd()
        return {
            data: {
                exists: true,
                user: {
                    id: row.user_id,
                    email: row.email,
                    display_name: row.display_name,
                    phone: row.phone
                },
                linkedAthletes,
                suggestion: 'link'
            },
            error: null
        }
    } catch (err) {
        debug.perf.end('guardianService.findGuardianByEmail')
        debug.error('GuardianService.findGuardianByEmail', 'Failed to find guardian', { error: err, email, orgId })
        console.groupEnd()
        console.error('Error finding guardian by email:', err)
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Check if guardian is already linked to an athlete
 */
export async function isGuardianLinkedToAthlete(
    athleteId: string,
    email: string,
    orgId: string
): Promise<{ isLinked: boolean; error: Error | null }> {
    debug.data('GuardianService.isGuardianLinkedToAthlete', 'Request', { athleteId, email, orgId })
    debug.perf.start('guardianService.isGuardianLinkedToAthlete')

    try {
        const { data: match, error } = await findGuardianByEmail(email, orgId)

        if (error || !match || !match.exists) {
            debug.perf.end('guardianService.isGuardianLinkedToAthlete')
            debug.data('GuardianService.isGuardianLinkedToAthlete', 'Response', { athleteId, email, isLinked: false })
            return { isLinked: false, error }
        }

        // Check if this athlete is in the linked athletes list
        const isLinked = match.linkedAthletes.some(a => a.id === athleteId)

        debug.perf.end('guardianService.isGuardianLinkedToAthlete')
        debug.data('GuardianService.isGuardianLinkedToAthlete', 'Response', { athleteId, email, isLinked })
        return { isLinked, error: null }
    } catch (err) {
        debug.perf.end('guardianService.isGuardianLinkedToAthlete')
        debug.error('GuardianService.isGuardianLinkedToAthlete', 'Failed to check link', { error: err, athleteId, email, orgId })
        return {
            isLinked: false,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

// ============================================================================
// Guardian Linking
// ============================================================================

/**
 * Link guardian to athlete (creates athlete_guardians or parent_invites)
 * Uses RPC for atomic operation with advisory locks
 */
export async function linkGuardianToAthlete(
    athleteId: string,
    email: string,
    orgId: string,
    relationshipType: RelationshipType = 'parent'
): Promise<{ data: AthleteGuardian | ParentInvite | null; error: Error | null }> {
    console.groupCollapsed(`%clinkGuardianToAthlete: ${athleteId} - ${email}`, 'color: #666; font-weight: bold;');
    debug.flow('GuardianService.linkGuardianToAthlete', 'Linking guardian', { athleteId, email, orgId, relationshipType })
    debug.perf.start('guardianService.linkGuardianToAthlete')

    try {
        if (!email || !validateGuardianEmail(email)) {
            debug.perf.end('guardianService.linkGuardianToAthlete')
            debug.error('GuardianService.linkGuardianToAthlete', 'Invalid email format', { email })
            console.groupEnd()
            return {
                data: null,
                error: new Error('Invalid email format')
            }
        }

        const { data, error } = await supabase
            .rpc('link_guardian_to_athlete', {
                p_athlete_id: athleteId,
                p_email: email,
                p_org_id: orgId,
                p_relationship_type: relationshipType
            })

        if (error) throw error

        // Trigger notification worker to send the invite email
        // This runs in the background and doesn't block the response
        triggerNotificationWorker()

        debug.perf.end('guardianService.linkGuardianToAthlete')
        debug.flow('GuardianService.linkGuardianToAthlete', 'Guardian linked successfully', { athleteId, email, relationshipType })
        console.groupEnd()
        return { data: data as AthleteGuardian | ParentInvite | null, error: null }
    } catch (err) {
        debug.perf.end('guardianService.linkGuardianToAthlete')
        debug.error('GuardianService.linkGuardianToAthlete', 'Failed to link guardian', { error: err, athleteId, email, orgId, relationshipType })
        console.groupEnd()
        console.error('Error linking guardian to athlete:', err)
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Remove guardian from athlete (soft delete)
 */
export async function removeGuardianFromAthlete(
    athleteId: string,
    userId: string,
    orgId: string
): Promise<{ success: boolean; error: Error | null }> {
    console.groupCollapsed(`%cremoveGuardianFromAthlete: ${athleteId} - ${userId}`, 'color: #666; font-weight: bold;');
    debug.flow('GuardianService.removeGuardianFromAthlete', 'Removing guardian', { athleteId, userId, orgId })
    debug.perf.start('guardianService.removeGuardianFromAthlete')

    try {
        const { data, error } = await supabase
            .rpc('remove_guardian_from_athlete', {
                p_athlete_id: athleteId,
                p_user_id: userId,
                p_org_id: orgId
            })

        if (error) throw error

        const success = typeof data === 'object' && data !== null && !Array.isArray(data) && 'success' in data && typeof (data as any).success === 'boolean' ? (data as any).success : false

        debug.perf.end('guardianService.removeGuardianFromAthlete')
        debug.flow('GuardianService.removeGuardianFromAthlete', 'Guardian removed successfully', { athleteId, userId, success })
        console.groupEnd()
        return { success: success || false, error: null }
    } catch (err) {
        debug.perf.end('guardianService.removeGuardianFromAthlete')
        debug.error('GuardianService.removeGuardianFromAthlete', 'Failed to remove guardian', { error: err, athleteId, userId, orgId })
        console.groupEnd()
        console.error('Error removing guardian from athlete:', err)
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

// ============================================================================
// Get Guardian Relationships
// ============================================================================

/**
 * Get all guardians for an athlete
 */
export async function getAthleteGuardians(
    athleteId: string,
    orgId: string
): Promise<{ data: Guardian[]; error: Error | null }> {
    console.groupCollapsed(`%cgetAthleteGuardians: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.data('GuardianService.getAthleteGuardians', 'Request', { athleteId, orgId })
    debug.perf.start('guardianService.getAthleteGuardians')

    try {
        const { data, error } = await supabase
            .rpc('get_athlete_guardians', {
                p_athlete_id: athleteId,
                p_org_id: orgId
            })

        if (error) throw error

        const guardians: Guardian[] = (data || []).map((g: any) => ({
            id: g.guardian_id,
            user_id: g.user_id,
            email: g.email,
            display_name: g.display_name,
            phone: g.phone,
            relationship_type: g.relationship_type || 'parent',
            status: g.status
        }))

        debug.perf.end('guardianService.getAthleteGuardians')
        debug.data('GuardianService.getAthleteGuardians', 'Response', { athleteId, guardianCount: guardians.length })
        console.groupEnd()
        return { data: guardians, error: null }
    } catch (err) {
        debug.perf.end('guardianService.getAthleteGuardians')
        debug.error('GuardianService.getAthleteGuardians', 'Failed to get guardians', { error: err, athleteId, orgId })
        console.groupEnd()
        console.error('Error getting athlete guardians:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Get all athletes for a guardian (by user ID)
 */
export async function getGuardianAthletes(
    userId: string,
    orgId: string
): Promise<{ data: Athlete[]; error: Error | null }> {
    console.groupCollapsed(`%cgetGuardianAthletes: ${userId}`, 'color: #666; font-weight: bold;');
    debug.data('GuardianService.getGuardianAthletes', 'Request', { userId, orgId })
    debug.perf.start('guardianService.getGuardianAthletes')

    try {
        const { data, error } = await supabase
            .rpc('get_guardian_athletes', {
                p_user_id: userId,
                p_org_id: orgId
            })

        if (error) throw error

        const athletes: Athlete[] = (data || []).map((a: any) => ({
            id: a.athlete_id,
            first_name: a.first_name,
            last_name: a.last_name,
            date_of_birth: a.birthdate,
            gender: a.gender,
            family_id: null,  // Families are derived
            preferred_name: a.preferred_name ?? null,
            photo_url: a.photo_url ?? null,
            jersey_number: null,
            medical_notes: null,
            allergies: null,
            emergency_contact_name: null,
            emergency_contact_phone: null,
            phone: a.phone ?? null,
            email: a.email ?? null,
            profile_photo_updated_at: a.profile_photo_updated_at ?? null,
            has_profile_photo: a.has_profile_photo ?? false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null
        }) as unknown as Athlete)

        debug.perf.end('guardianService.getGuardianAthletes')
        debug.data('GuardianService.getGuardianAthletes', 'Response', { userId, athleteCount: athletes.length })
        console.groupEnd()
        return { data: athletes, error: null }
    } catch (err) {
        debug.perf.end('guardianService.getGuardianAthletes')
        debug.error('GuardianService.getGuardianAthletes', 'Failed to get athletes', { error: err, userId, orgId })
        console.groupEnd()
        console.error('Error getting guardian athletes:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Get pending invites for an athlete
 */
export async function getAthleteInvites(
    athleteId: string,
    orgId: string
): Promise<{ data: ParentInvite[]; error: Error | null }> {
    console.groupCollapsed(`%cgetAthleteInvites: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.data('GuardianService.getAthleteInvites', 'Request', { athleteId, orgId })
    debug.perf.start('guardianService.getAthleteInvites')

    try {
        const { data, error } = await supabase
            .from('parent_invites')
            .select('*')
            .eq('athlete_id', athleteId)
            .eq('org_id', orgId)
            .eq('status', 'pending')
            .order('created_at', { ascending: false })

        if (error) throw error

        debug.perf.end('guardianService.getAthleteInvites')
        debug.data('GuardianService.getAthleteInvites', 'Response', { athleteId, inviteCount: data?.length || 0 })
        console.groupEnd()
        return { data: data ?? [], error: null }
    } catch (err) {
        debug.perf.end('guardianService.getAthleteInvites')
        debug.error('GuardianService.getAthleteInvites', 'Failed to get invites', { error: err, athleteId, orgId })
        console.groupEnd()
        console.error('Error getting athlete invites:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Cancel a pending invite
 */
export async function cancelInvite(
    inviteId: string
): Promise<{ success: boolean; error: Error | null }> {
    console.groupCollapsed(`%ccancelInvite: ${inviteId}`, 'color: #666; font-weight: bold;');
    debug.flow('GuardianService.cancelInvite', 'Cancelling invite', { inviteId })
    debug.perf.start('guardianService.cancelInvite')

    try {
        const { error } = await supabase
            .from('parent_invites')
            .update({ status: 'cancelled' })
            .eq('id', inviteId)

        if (error) throw error

        return { success: true, error: null }
    } catch (err) {
        console.error('Error cancelling invite:', err)
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Resend invite (extend expiration and queue new email notification)
 */
export async function resendInvite(
    inviteId: string
): Promise<{ success: boolean; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .rpc('resend_guardian_invite' as any, {
                p_invite_id: inviteId
            })

        if (error) throw error

        const result = data as { success?: boolean; error?: string; notification_job_id?: string } | null
        if (result && result.success === false) {
            throw new Error(result.error || 'Failed to resend invite')
        }

        const jobIds = result?.notification_job_id ? [result.notification_job_id] : undefined
        triggerNotificationWorker(jobIds)

        debug.perf.end('guardianService.resendInvite')
        debug.flow('GuardianService.resendInvite', 'Invite resent successfully', { inviteId })
        console.groupEnd()
        return { success: true, error: null }
    } catch (err) {
        debug.perf.end('guardianService.resendInvite')
        debug.error('GuardianService.resendInvite', 'Failed to resend invite', { error: err, inviteId })
        console.groupEnd()
        console.error('Error resending invite:', err)
        return {
            success: false,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

// ============================================================================
// Guardian Attachment Requests
// ============================================================================

/**
 * Search result for athlete in guardian attachment search
 */
export interface AthleteSearchResult {
    id: string
    first_name: string
    last_name: string
    birthdate: string | null
    gender: string | null
}

/**
 * Guardian attachment request
 */
export interface GuardianAttachmentRequest {
    id: string
    org_id: string
    athlete_id: string
    requested_by_user_id: string
    status: 'pending' | 'approved' | 'denied'
    reviewed_by_user_id: string | null
    reviewed_at: string | null
    decision_reason: string | null
    expires_at: string
    created_at: string
    updated_at: string
}

/**
 * Search athletes for guardian attachment
 * Returns athletes in org that don't have existing guardians
 */
export async function searchAthletesForAttachment(
    orgId: string,
    searchText: string
): Promise<{ data: AthleteSearchResult[]; error: Error | null }> {
    debug.data('GuardianService.searchAthletesForAttachment', 'Request', { orgId, searchText })
    debug.perf.start('guardianService.searchAthletesForAttachment')

    try {
        // Validate inputs
        if (!orgId) {
            debug.perf.end('guardianService.searchAthletesForAttachment')
            debug.error('GuardianService.searchAthletesForAttachment', 'Missing orgId', { orgId })
            return {
                data: [],
                error: new Error('Organization ID is required')
            }
        }

        if (!searchText || searchText.trim().length < 2) {
            debug.perf.end('guardianService.searchAthletesForAttachment')
            debug.data('GuardianService.searchAthletesForAttachment', 'Response (search too short)', { orgId, searchText })
            return {
                data: [],
                error: null  // Not an error, just no search yet
            }
        }

        const { data, error } = await supabase
            .rpc('search_athletes_for_guardian' as any, {
                p_org_id: orgId,
                p_search: searchText.trim(),
                p_limit: 50
            })

        if (error) throw error

        // Map results to type-safe format
        const results: AthleteSearchResult[] = (data || []).map((row: any) => ({
            id: row.id,
            first_name: row.first_name ?? '',
            last_name: row.last_name ?? '',
            birthdate: row.birthdate ?? null,
            gender: row.gender ?? null
        }))

        return { data: results, error: null }
    } catch (err) {
        console.error('Error searching athletes for attachment:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Submit guardian attachment request
 */
export async function submitGuardianAttachmentRequest(
    athleteId: string,
    orgId: string
): Promise<{ data: GuardianAttachmentRequest | null; error: Error | null }> {
    try {
        // Validate inputs
        if (!athleteId || !orgId) {
            debug.perf.end('guardianService.submitGuardianAttachmentRequest')
            debug.error('GuardianService.submitGuardianAttachmentRequest', 'Missing required fields', { athleteId, orgId })
            console.groupEnd()
            return {
                data: null,
                error: new Error('Athlete ID and Organization ID are required')
            }
        }

        const { data, error } = await supabase
            .rpc('submit_guardian_attachment_request' as any, {
                p_athlete_id: athleteId,
                p_org_id: orgId
            })

        if (error) throw error

        // Check if request was successful
        const result = data as { success?: boolean; error?: string; id?: string; status?: string; expires_at?: string; created_at?: string; already_existed?: boolean } | null

        if (!result || result.success === false) {
            return {
                data: null,
                error: new Error(result?.error || 'Failed to submit request')
            }
        }

        // Map to GuardianAttachmentRequest type
        const request: GuardianAttachmentRequest = {
            id: result.id!,
            org_id: orgId,
            athlete_id: athleteId,
            requested_by_user_id: '', // Will be set by backend
            status: (result.status as 'pending' | 'approved' | 'denied') || 'pending',
            reviewed_by_user_id: null,
            reviewed_at: null,
            decision_reason: null,
            expires_at: result.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_at: result.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString()
        }

        // Trigger notification worker
        triggerNotificationWorker()

        debug.perf.end('guardianService.submitGuardianAttachmentRequest')
        debug.flow('GuardianService.submitGuardianAttachmentRequest', 'Request submitted successfully', { athleteId, orgId, requestId: request.id })
        console.groupEnd()
        return { data: request, error: null }
    } catch (err) {
        debug.perf.end('guardianService.submitGuardianAttachmentRequest')
        debug.error('GuardianService.submitGuardianAttachmentRequest', 'Failed to submit request', { error: err, athleteId, orgId })
        console.groupEnd()
        console.error('Error submitting guardian attachment request:', err)
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Get guardian attachment requests for current user
 */
export async function getGuardianAttachmentRequests(
    orgId: string
): Promise<{ data: GuardianAttachmentRequest[]; error: Error | null }> {
    console.groupCollapsed(`%cgetGuardianAttachmentRequests: ${orgId}`, 'color: #666; font-weight: bold;');
    debug.data('GuardianService.getGuardianAttachmentRequests', 'Request', { orgId })
    debug.perf.start('guardianService.getGuardianAttachmentRequests')

    try {
        if (!orgId) {
            return {
                data: [],
                error: new Error('Organization ID is required')
            }
        }

        const { data, error } = await supabase
            .from('guardian_attachment_requests' as any)
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false })

        if (error) throw error

        const requests: GuardianAttachmentRequest[] = (data || []).map((row: any) => ({
            id: row.id,
            org_id: row.org_id,
            athlete_id: row.athlete_id,
            requested_by_user_id: row.requested_by_user_id,
            status: row.status,
            reviewed_by_user_id: row.reviewed_by_user_id ?? null,
            reviewed_at: row.reviewed_at ?? null,
            decision_reason: row.decision_reason ?? null,
            expires_at: row.expires_at,
            created_at: row.created_at,
            updated_at: row.updated_at
        }))

        debug.perf.end('guardianService.getGuardianAttachmentRequests')
        debug.data('GuardianService.getGuardianAttachmentRequests', 'Response', { orgId, requestCount: requests.length })
        console.groupEnd()
        return { data: requests, error: null }
    } catch (err) {
        debug.perf.end('guardianService.getGuardianAttachmentRequests')
        debug.error('GuardianService.getGuardianAttachmentRequests', 'Failed to get requests', { error: err, orgId })
        console.groupEnd()
        console.error('Error getting guardian attachment requests:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

// ============================================================================
// Admin Functions for Guardian Attachment Requests
// ============================================================================

/**
 * Get pending guardian attachment requests for an organization (admin only)
 */
export async function getPendingGuardianAttachmentRequests(
    orgId: string
): Promise<{ data: GuardianAttachmentRequest[]; error: Error | null }> {
    console.groupCollapsed(`%cgetPendingGuardianAttachmentRequests: ${orgId}`, 'color: #666; font-weight: bold;');
    debug.data('GuardianService.getPendingGuardianAttachmentRequests', 'Request', { orgId })
    debug.perf.start('guardianService.getPendingGuardianAttachmentRequests')

    try {
        if (!orgId) {
            return {
                data: [],
                error: new Error('Organization ID is required')
            }
        }

        const { data, error } = await supabase
            .from('guardian_attachment_requests' as any)
            .select('*')
            .eq('org_id', orgId)
            .eq('status', 'pending')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: true })

        if (error) throw error

        const requests: GuardianAttachmentRequest[] = (data || []).map((row: any) => ({
            id: row.id,
            org_id: row.org_id,
            athlete_id: row.athlete_id,
            requested_by_user_id: row.requested_by_user_id,
            status: row.status,
            reviewed_by_user_id: row.reviewed_by_user_id ?? null,
            reviewed_at: row.reviewed_at ?? null,
            decision_reason: row.decision_reason ?? null,
            expires_at: row.expires_at,
            created_at: row.created_at,
            updated_at: row.updated_at
        }))

        return { data: requests, error: null }
    } catch (err) {
        console.error('Error getting pending guardian attachment requests:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Enriched guardian attachment request with athlete and user details
 */
export interface GuardianAttachmentRequestEnriched extends GuardianAttachmentRequest {
    athlete_first_name: string
    athlete_last_name: string
    athlete_birthdate: string | null
    requester_email: string
    requester_display_name: string | null
    reviewer_email: string | null
    reviewer_display_name: string | null
}

/**
 * Get all guardian attachment requests for an organization with optional status filter (admin only)
 * Returns enriched data with athlete and user details
 */
export async function getGuardianAttachmentRequestsForOrg(
    orgId: string,
    status?: 'pending' | 'approved' | 'denied'
): Promise<{ data: GuardianAttachmentRequestEnriched[]; error: Error | null }> {
    try {
        if (!orgId) {
            debug.perf.end('guardianService.getGuardianAttachmentRequestsForOrg')
            debug.error('GuardianService.getGuardianAttachmentRequestsForOrg', 'Missing orgId', { orgId })
            console.groupEnd()
            return {
                data: [],
                error: new Error('Organization ID is required')
            }
        }

        if (USE_FAKE_DATA) {
            const now = new Date()
            const fakeRequests: GuardianAttachmentRequestEnriched[] = [
                {
                    id: 'guardian-req-1',
                    org_id: orgId,
                    athlete_id: 'demo-athlete-1',
                    requested_by_user_id: 'demo-user-1',
                    status: 'pending',
                    reviewed_by_user_id: null,
                    reviewed_at: null,
                    decision_reason: null,
                    expires_at: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    athlete_first_name: 'Alex',
                    athlete_last_name: 'Johnson',
                    athlete_birthdate: '2015-05-15',
                    requester_email: 'parent1@example.com',
                    requester_display_name: 'Sarah Johnson',
                    reviewer_email: null,
                    reviewer_display_name: null,
                },
                {
                    id: 'guardian-req-2',
                    org_id: orgId,
                    athlete_id: 'demo-athlete-2',
                    requested_by_user_id: 'demo-user-2',
                    status: 'pending',
                    reviewed_by_user_id: null,
                    reviewed_at: null,
                    decision_reason: null,
                    expires_at: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString(),
                    created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    athlete_first_name: 'Jordan',
                    athlete_last_name: 'Smith',
                    athlete_birthdate: '2016-08-22',
                    requester_email: 'parent2@example.com',
                    requester_display_name: 'Michael Smith',
                    reviewer_email: null,
                    reviewer_display_name: null,
                },
                {
                    id: 'guardian-req-3',
                    org_id: orgId,
                    athlete_id: 'demo-athlete-3',
                    requested_by_user_id: 'demo-user-3',
                    status: 'approved',
                    reviewed_by_user_id: 'admin-user-1',
                    reviewed_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    decision_reason: 'Verified relationship',
                    expires_at: '',
                    created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                    athlete_first_name: 'Sam',
                    athlete_last_name: 'Davis',
                    athlete_birthdate: '2014-11-10',
                    requester_email: 'parent3@example.com',
                    requester_display_name: 'Jennifer Davis',
                    reviewer_email: 'admin@example.com',
                    reviewer_display_name: 'Admin User',
                },
                {
                    id: 'guardian-req-4',
                    org_id: orgId,
                    athlete_id: 'demo-athlete-4',
                    requested_by_user_id: 'demo-user-4',
                    status: 'denied',
                    reviewed_by_user_id: 'admin-user-1',
                    reviewed_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    decision_reason: 'Unable to verify relationship',
                    expires_at: '',
                    created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                    updated_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                    athlete_first_name: 'Taylor',
                    athlete_last_name: 'Brown',
                    athlete_birthdate: '2015-03-18',
                    requester_email: 'parent4@example.com',
                    requester_display_name: 'Robert Brown',
                    reviewer_email: 'admin@example.com',
                    reviewer_display_name: 'Admin User',
                },
            ]
            
            let filtered = fakeRequests
            if (status) {
                filtered = fakeRequests.filter(req => req.status === status)
            }
            
            debug.perf.end('guardianService.getGuardianAttachmentRequestsForOrg')
            debug.data('GuardianService.getGuardianAttachmentRequestsForOrg', 'Response (fake)', { orgId, status, requestCount: filtered.length })
            console.groupEnd()
            return { data: filtered, error: null }
        }

        const { data, error } = await supabase
            .rpc('get_guardian_attachment_requests_for_admin' as any, {
                p_org_id: orgId,
                p_status: status || null
            })

        if (error) throw error

        const requestsData = Array.isArray(data) ? data : []
        const requests: GuardianAttachmentRequestEnriched[] = requestsData.map((row: any) => ({
            id: row.id,
            org_id: row.org_id,
            athlete_id: row.athlete_id,
            requested_by_user_id: row.requested_by_user_id,
            status: row.status,
            reviewed_by_user_id: row.reviewed_by_user_id ?? null,
            reviewed_at: row.reviewed_at ?? null,
            decision_reason: row.decision_reason ?? null,
            expires_at: row.expires_at,
            created_at: row.created_at,
            updated_at: row.updated_at,
            athlete_first_name: row.athlete_first_name ?? '',
            athlete_last_name: row.athlete_last_name ?? '',
            athlete_birthdate: row.athlete_birthdate ?? null,
            requester_email: row.requester_email ?? '',
            requester_display_name: row.requester_display_name ?? null,
            reviewer_email: row.reviewer_email ?? null,
            reviewer_display_name: row.reviewer_display_name ?? null
        }))

        debug.perf.end('guardianService.getGuardianAttachmentRequestsForOrg')
        debug.data('GuardianService.getGuardianAttachmentRequestsForOrg', 'Response', { orgId, status, requestCount: requests.length })
        console.groupEnd()
        return { data: requests, error: null }
    } catch (err) {
        debug.perf.end('guardianService.getGuardianAttachmentRequestsForOrg')
        debug.error('GuardianService.getGuardianAttachmentRequestsForOrg', 'Failed to get requests', { error: err, orgId, status })
        console.groupEnd()
        console.error('Error getting guardian attachment requests for org:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Get pending guardian attachment request count for an organization (admin only)
 */
export async function getPendingGuardianAttachmentCount(
    orgId: string
): Promise<{ data: number; error: Error | null }> {
    debug.data('GuardianService.getPendingGuardianAttachmentCount', 'Request', { orgId })
    debug.perf.start('guardianService.getPendingGuardianAttachmentCount')

    try {
        if (!orgId) {
            return {
                data: 0,
                error: new Error('Organization ID is required')
            }
        }

        if (USE_FAKE_DATA) {
            return {
                data: 2,
                error: null
            }
        }

        const { data, error } = await supabase
            .rpc('get_pending_guardian_attachment_count' as any, {
                p_org_id: orgId
            })

        if (error) throw error

        const count = typeof data === 'number' ? data : 0

        return { data: count, error: null }
    } catch (err) {
        console.error('Error getting pending guardian attachment count:', err)
        return {
            data: 0,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Review guardian attachment request (approve or deny)
 */
export async function reviewGuardianAttachmentRequest(
    requestId: string,
    approve: boolean,
    reason?: string | null
): Promise<{ data: GuardianAttachmentRequest | null; error: Error | null }> {
    try {
        if (!requestId) {
            debug.perf.end('guardianService.reviewGuardianAttachmentRequest')
            debug.error('GuardianService.reviewGuardianAttachmentRequest', 'Missing requestId', { requestId })
            console.groupEnd()
            return {
                data: null,
                error: new Error('Request ID is required')
            }
        }

        // Require reason for denials
        if (!approve && (!reason || reason.trim().length === 0)) {
            debug.perf.end('guardianService.reviewGuardianAttachmentRequest')
            debug.error('GuardianService.reviewGuardianAttachmentRequest', 'Missing reason for denial', { requestId, approve })
            console.groupEnd()
            return {
                data: null,
                error: new Error('Decision reason is required when denying a request')
            }
        }

        const { data, error } = await supabase
            .rpc('review_guardian_attachment_request' as any, {
                p_request_id: requestId,
                p_approve: approve,
                p_decision_reason: reason || null
            })

        if (error) throw error

        const result = data as { success?: boolean; error?: string; status?: string; message?: string } | null

        if (!result || result.success === false) {
            return {
                data: null,
                error: new Error(result?.error || 'Failed to review request')
            }
        }

        // Fetch updated request
        const { data: updatedRequest, error: fetchError } = await supabase
            .from('guardian_attachment_requests' as any)
            .select('*')
            .eq('id', requestId)
            .single()

        if (fetchError) throw fetchError

        const requestRow = updatedRequest as any
        const request: GuardianAttachmentRequest = {
            id: requestRow.id,
            org_id: requestRow.org_id,
            athlete_id: requestRow.athlete_id,
            requested_by_user_id: requestRow.requested_by_user_id,
            status: requestRow.status,
            reviewed_by_user_id: requestRow.reviewed_by_user_id ?? null,
            reviewed_at: requestRow.reviewed_at ?? null,
            decision_reason: requestRow.decision_reason ?? null,
            expires_at: requestRow.expires_at,
            created_at: requestRow.created_at,
            updated_at: requestRow.updated_at
        }

        // Trigger notification worker
        triggerNotificationWorker()

        debug.perf.end('guardianService.reviewGuardianAttachmentRequest')
        debug.flow('GuardianService.reviewGuardianAttachmentRequest', 'Request reviewed successfully', { requestId, approve, status: request.status })
        console.groupEnd()
        return { data: request, error: null }
    } catch (err) {
        debug.perf.end('guardianService.reviewGuardianAttachmentRequest')
        debug.error('GuardianService.reviewGuardianAttachmentRequest', 'Failed to review request', { error: err, requestId, approve })
        console.groupEnd()
        console.error('Error reviewing guardian attachment request:', err)
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}
