/**
 * Join Analytics Service
 *
 * Provides analytics data for join flows including:
 * - Invite metrics (sent vs accepted)
 * - Join request statistics
 * - Team join completion rates
 * - Time-based trends
 */

import { supabase } from '../../lib/supabase'

export interface InviteMetrics {
    total_sent: number
    total_accepted: number
    total_pending: number
    total_expired: number
    total_cancelled: number
    acceptance_rate: number
}

export interface JoinRequestMetrics {
    total_submitted: number
    total_approved: number
    total_denied: number
    total_pending: number
    approval_rate: number
}

export interface TeamJoinMetrics {
    team_id: string
    team_name: string
    joins_last_30_days: number
    total_members: number
}

export interface JoinAnalytics {
    invite_metrics: InviteMetrics
    join_request_metrics: JoinRequestMetrics
    team_joins_last_30_days: TeamJoinMetrics[]
    total_team_code_lookups: number
}

/**
 * Get comprehensive join analytics for an organization
 */
export async function getJoinAnalytics(
    orgId: string,
    days: number = 30
): Promise<{ data: JoinAnalytics | null; error: Error | null }> {
    try {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)

        // Get invite metrics
        const { data: invitesData, error: invitesError } = await supabase
            .from('parent_invites')
            .select('status, created_at')
            .eq('org_id', orgId)

        if (invitesError) throw invitesError

        const inviteMetrics: InviteMetrics = {
            total_sent: invitesData?.length || 0,
            total_accepted: invitesData?.filter((i: any) => i.status === 'accepted').length || 0,
            total_pending: invitesData?.filter((i: any) => i.status === 'pending').length || 0,
            total_expired: invitesData?.filter((i: any) => i.status === 'expired').length || 0,
            total_cancelled: invitesData?.filter((i: any) => i.status === 'cancelled').length || 0,
            acceptance_rate: 0,
        }

        if (inviteMetrics.total_sent > 0) {
            inviteMetrics.acceptance_rate = (inviteMetrics.total_accepted / inviteMetrics.total_sent) * 100
        }

        // Get join request metrics
        const { data: requestsData, error: requestsError } = await supabase
            .from('join_requests')
            .select('status, created_at')
            .eq('org_id', orgId)

        if (requestsError) throw requestsError

        const joinRequestMetrics: JoinRequestMetrics = {
            total_submitted: requestsData?.length || 0,
            total_approved: requestsData?.filter((r: any) => r.status === 'approved').length || 0,
            total_denied: requestsData?.filter((r: any) => r.status === 'denied').length || 0,
            total_pending: requestsData?.filter((r: any) => r.status === 'pending').length || 0,
            approval_rate: 0,
        }

        if (joinRequestMetrics.total_submitted > 0) {
            const reviewed = joinRequestMetrics.total_approved + joinRequestMetrics.total_denied
            if (reviewed > 0) {
                joinRequestMetrics.approval_rate = (joinRequestMetrics.total_approved / reviewed) * 100
            }
        }

        // Get team joins in last 30 days from event_logs
        const { data: joinEvents, error: eventsError } = await supabase
            .from('event_logs')
            .select('target_entity_id, metadata, created_at')
            .eq('org_id', orgId)
            .eq('event_type', 'TEAM_JOIN_COMPLETED')
            .gte('created_at', cutoffDate.toISOString())

        if (eventsError) {
            console.warn('Failed to fetch join events:', eventsError)
        }

        // Group by team
        const teamJoinCounts: Record<string, { name: string; count: number }> = {}
        joinEvents?.forEach((event: any) => {
            const teamId = event.target_entity_id
            if (teamId) {
                if (!teamJoinCounts[teamId]) {
                    teamJoinCounts[teamId] = {
                        name: (event.metadata as any)?.team_name || 'Unknown Team',
                        count: 0,
                    }
                }
                teamJoinCounts[teamId].count++
            }
        })

        // Get total team memberships for each team
        const teamIds = Object.keys(teamJoinCounts)
        const teamJoinsLast30Days: TeamJoinMetrics[] = []

        if (teamIds.length > 0) {
            const { data: membershipsData } = await supabase
                .from('team_memberships')
                .select('team_id, teams!inner(name, org_id)')
                .in('team_id', teamIds)
                .eq('status', 'active')
                .eq('org_id', orgId)

            // Count memberships per team
            const memberCounts: Record<string, number> = {}
            membershipsData?.forEach((m: any) => {
                const teamId = m.team_id
                memberCounts[teamId] = (memberCounts[teamId] || 0) + 1
            })

            teamIds.forEach(teamId => {
                teamJoinsLast30Days.push({
                    team_id: teamId,
                    team_name: teamJoinCounts[teamId].name,
                    joins_last_30_days: teamJoinCounts[teamId].count,
                    total_members: memberCounts[teamId] || 0,
                })
            })
        }

        // Get total team code lookups from event_logs
        const { count: codeLookupsCount, error: lookupsError } = await supabase
            .from('event_logs')
            .select('*', { count: 'exact', head: true })
            .eq('org_id', orgId)
            .eq('event_type', 'TEAM_CODE_LOOKUP')
            .gte('created_at', cutoffDate.toISOString())

        if (lookupsError) {
            console.warn('Failed to fetch code lookups:', lookupsError)
        }

        return {
            data: {
                invite_metrics: inviteMetrics,
                join_request_metrics: joinRequestMetrics,
                team_joins_last_30_days: teamJoinsLast30Days,
                total_team_code_lookups: codeLookupsCount || 0,
            },
            error: null,
        }
    } catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Failed to fetch join analytics'),
        }
    }
}
