/**
 * Join Links Service
 *
 * Provides data access for join link operations including:
 * - Creating join links (org-scoped or team-scoped)
 * - Validating join link tokens
 * - Submitting join requests
 * - Reviewing join requests (admin)
 */

import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { mapDatabaseError } from './teamsService'
import { logOrganizationJoinEvent } from '../../utils/eventLogger'

type JoinLink = Database['public']['Tables']['join_links']['Row']
type JoinRequest = Database['public']['Tables']['join_requests']['Row']

export interface CreateJoinLinkParams {
    orgId: string
    teamId?: string | null
    autoApprove?: boolean
    expiresInDays?: number
}

export interface JoinLinkResult {
    token: string
    expiresAt: string
    url: string
}

export interface SubmitJoinRequestParams {
    linkToken: string
    childId: string
    seasonId: string
    teamId?: string | null
}

export interface JoinRequestResult {
    requestId: string
    status: 'pending' | 'approved' | 'denied'
    message: string
}

export interface ReviewJoinRequestParams {
    requestId: string
    approve: boolean
    decisionReason?: string | null
}

/**
 * Create a join link for an organization or team
 */
export async function createJoinLink(
    params: CreateJoinLinkParams
): Promise<{ data: JoinLinkResult | null; error: Error | null }> {
    debug.flow('JoinLinksService.createJoinLink', 'Creating join link', params)
    debug.perf.start('joinLinksService.createJoinLink')

    try {
        const { data, error } = await supabase.rpc('create_join_link', {
            p_org_id: params.orgId,
            p_team_id: params.teamId || undefined,
            p_auto_approve: params.autoApprove ?? false,
            p_expires_in_days: params.expiresInDays ?? 7,
        })

        if (error) throw error

        if (!data || !Array.isArray(data) || data.length === 0) {
            return {
                data: null,
                error: new Error('Failed to create join link')
            }
        }

        const result = data[0] as { token: string; expires_at: string }
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
        const joinUrl = `${baseUrl}/portal/join/link?token=${encodeURIComponent(result.token)}`

        // Log join link creation event
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await logOrganizationJoinEvent(
                'JOIN_LINK_CREATED',
                params.orgId,
                'join_link',
                result.token, // Use token as entity ID temporarily
                user?.id,
                'org_admin',
                {
                    org_id: params.orgId,
                    team_id: params.teamId,
                    auto_approve: params.autoApprove ?? false,
                    expires_in_days: params.expiresInDays ?? 7,
                    expires_at: result.expires_at,
                }
            )
        } catch (logErr) {
            console.warn('Failed to log join link creation event:', logErr)
        }

        debug.perf.end('joinLinksService.createJoinLink')
        debug.flow('JoinLinksService.createJoinLink', 'Join link created', { token: result.token })

        return {
            data: {
                token: result.token,
                expiresAt: result.expires_at,
                url: joinUrl,
            },
            error: null
        }
    } catch (err) {
        debug.perf.end('joinLinksService.createJoinLink')
        debug.error('JoinLinksService.createJoinLink', 'Failed to create join link', { error: err, params })
        return {
            data: null,
            error: mapDatabaseError(err)
        }
    }
}

/**
 * Get join link details by token (for validation)
 */
export async function getJoinLinkByToken(
    token: string
): Promise<{ data: JoinLink | null; error: Error | null }> {
    debug.data('JoinLinksService.getJoinLinkByToken', 'Request', { token })
    debug.perf.start('joinLinksService.getJoinLinkByToken')

    try {
        const { data, error } = await supabase
            .from('join_links')
            .select('*')
            .eq('token', token)
            .single()

        if (error) {
            if (error.code === 'PGRST116') {
                return { data: null, error: new Error('Invalid join link') }
            }
            throw error
        }

        // Check if expired
        if (data && data.expires_at) {
            const expiresAt = new Date(data.expires_at)
            if (expiresAt < new Date()) {
                return { data: null, error: new Error('This join link has expired') }
            }
        }

        debug.perf.end('joinLinksService.getJoinLinkByToken')
        debug.data('JoinLinksService.getJoinLinkByToken', 'Response', { token, found: !!data })

        return { data: data as JoinLink, error: null }
    } catch (err) {
        debug.perf.end('joinLinksService.getJoinLinkByToken')
        debug.error('JoinLinksService.getJoinLinkByToken', 'Failed to get join link', { error: err, token })
        return {
            data: null,
            error: mapDatabaseError(err)
        }
    }
}

/**
 * Submit a join request via join link
 */
export async function submitJoinRequest(
    params: SubmitJoinRequestParams
): Promise<{ data: JoinRequestResult | null; error: Error | null }> {
    debug.flow('JoinLinksService.submitJoinRequest', 'Submitting join request', params)
    debug.perf.start('joinLinksService.submitJoinRequest')

    try {
        const { data, error } = await supabase.rpc('submit_join_request', {
            p_link_token: params.linkToken,
            p_child_id: params.childId,
            p_season_id: params.seasonId,
            p_team_id: params.teamId || undefined,
        })

        if (error) throw error

        if (!data || !Array.isArray(data) || data.length === 0) {
            return {
                data: null,
                error: new Error('Failed to submit join request')
            }
        }

        const result = data[0] as { request_id: string; status: string; message: string }

        // Log join request submission event
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: linkData } = await supabase
                .from('join_links')
                .select('org_id')
                .eq('token', params.linkToken)
                .single()

            if (linkData) {
                await logOrganizationJoinEvent(
                    'JOIN_REQUEST_SUBMITTED',
                    linkData.org_id,
                    'join_request',
                    result.request_id,
                    user?.id,
                    'parent',
                    {
                        link_token: params.linkToken,
                        child_id: params.childId,
                        season_id: params.seasonId,
                        team_id: params.teamId,
                        status: result.status,
                    }
                )
            }
        } catch (logErr) {
            console.warn('Failed to log join request submission event:', logErr)
        }

        debug.perf.end('joinLinksService.submitJoinRequest')
        debug.flow('JoinLinksService.submitJoinRequest', 'Join request submitted', { requestId: result.request_id, status: result.status })

        return {
            data: {
                requestId: result.request_id,
                status: result.status as 'pending' | 'approved' | 'denied',
                message: result.message,
            },
            error: null
        }
    } catch (err) {
        debug.perf.end('joinLinksService.submitJoinRequest')
        debug.error('JoinLinksService.submitJoinRequest', 'Failed to submit join request', { error: err, params })
        return {
            data: null,
            error: mapDatabaseError(err)
        }
    }
}

/**
 * Review a join request (approve or deny)
 */
export async function reviewJoinRequest(
    params: ReviewJoinRequestParams
): Promise<{ data: JoinRequestResult | null; error: Error | null }> {
    debug.flow('JoinLinksService.reviewJoinRequest', 'Reviewing join request', params)
    debug.perf.start('joinLinksService.reviewJoinRequest')

    try {
        const { data, error } = await supabase.rpc('review_join_request', {
            p_request_id: params.requestId,
            p_approve: params.approve,
            p_decision_reason: params.decisionReason || undefined,
        })

        if (error) throw error

        if (!data || !Array.isArray(data) || data.length === 0) {
            return {
                data: null,
                error: new Error('Failed to review join request')
            }
        }

        const result = data[0] as { request_id: string; status: string; message: string }

        // Log join request review event
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const { data: requestData } = await supabase
                .from('join_requests')
                .select('org_id')
                .eq('id', params.requestId)
                .single()

            if (requestData) {
                const eventType = params.approve ? 'JOIN_REQUEST_APPROVED' : 'JOIN_REQUEST_DENIED'
                await logOrganizationJoinEvent(
                    eventType,
                    requestData.org_id,
                    'join_request',
                    params.requestId,
                    user?.id,
                    'org_admin',
                    {
                        request_id: params.requestId,
                        approve: params.approve,
                        decision_reason: params.decisionReason,
                        status: result.status,
                    }
                )
            }
        } catch (logErr) {
            console.warn('Failed to log join request review event:', logErr)
        }

        debug.perf.end('joinLinksService.reviewJoinRequest')
        debug.flow('JoinLinksService.reviewJoinRequest', 'Join request reviewed', { requestId: result.request_id, status: result.status })

        return {
            data: {
                requestId: result.request_id,
                status: result.status as 'pending' | 'approved' | 'denied',
                message: result.message,
            },
            error: null
        }
    } catch (err) {
        debug.perf.end('joinLinksService.reviewJoinRequest')
        debug.error('JoinLinksService.reviewJoinRequest', 'Failed to review join request', { error: err, params })
        return {
            data: null,
            error: mapDatabaseError(err)
        }
    }
}

/**
 * Get join links for an organization
 */
export async function getJoinLinks(
    orgId: string
): Promise<{ data: JoinLink[]; error: Error | null }> {
    debug.data('JoinLinksService.getJoinLinks', 'Request', { orgId })
    debug.perf.start('joinLinksService.getJoinLinks')

    try {
        const { data, error } = await supabase
            .from('join_links')
            .select('*')
            .eq('org_id', orgId)
            .order('created_at', { ascending: false })

        if (error) throw error

        debug.perf.end('joinLinksService.getJoinLinks')
        debug.data('JoinLinksService.getJoinLinks', 'Response', { orgId, count: data?.length || 0 })

        return { data: (data || []) as JoinLink[], error: null }
    } catch (err) {
        debug.perf.end('joinLinksService.getJoinLinks')
        debug.error('JoinLinksService.getJoinLinks', 'Failed to get join links', { error: err, orgId })
        return {
            data: [],
            error: mapDatabaseError(err)
        }
    }
}

/**
 * Get join requests for an organization (pending, approved, or denied)
 */
export async function getJoinRequests(
    orgId: string,
    status?: 'pending' | 'approved' | 'denied'
): Promise<{ data: JoinRequest[]; error: Error | null }> {
    debug.data('JoinLinksService.getJoinRequests', 'Request', { orgId, status })
    debug.perf.start('joinLinksService.getJoinRequests')

    try {
        let query = supabase
            .from('join_requests')
            .select('*')
            .eq('org_id', orgId)

        if (status) {
            query = query.eq('status', status)
        }

        query = query.order('created_at', { ascending: false })

        const { data, error } = await query

        if (error) throw error

        debug.perf.end('joinLinksService.getJoinRequests')
        debug.data('JoinLinksService.getJoinRequests', 'Response', { orgId, status, count: data?.length || 0 })

        return { data: (data || []) as JoinRequest[], error: null }
    } catch (err) {
        debug.perf.end('joinLinksService.getJoinRequests')
        debug.error('JoinLinksService.getJoinRequests', 'Failed to get join requests', { error: err, orgId, status })
        return {
            data: [],
            error: mapDatabaseError(err)
        }
    }
}

/**
 * Delete/revoke a join link
 */
export async function deleteJoinLink(
    linkId: string
): Promise<{ success: boolean; error: Error | null }> {
    debug.flow('JoinLinksService.deleteJoinLink', 'Deleting join link', { linkId })
    debug.perf.start('joinLinksService.deleteJoinLink')

    try {
        const { error } = await supabase
            .from('join_links')
            .delete()
            .eq('id', linkId)

        if (error) throw error

        debug.perf.end('joinLinksService.deleteJoinLink')
        debug.flow('JoinLinksService.deleteJoinLink', 'Join link deleted', { linkId })

        return { success: true, error: null }
    } catch (err) {
        debug.perf.end('joinLinksService.deleteJoinLink')
        debug.error('JoinLinksService.deleteJoinLink', 'Failed to delete join link', { error: err, linkId })
        return {
            success: false,
            error: mapDatabaseError(err)
        }
    }
}
