/**
 * Invitations Dashboard
 *
 * Centralized view of all pending guardian invites and join requests for the organization.
 */

import { useState, useEffect, useCallback } from 'react'
import { useUserContext } from '../../hooks/useUserContext'
import { getJoinRequests } from '../../data/services/joinLinksService'
import { resendInvite, cancelInvite } from '../../data/services/guardianService'
import { reviewJoinRequest } from '../../data/services/joinLinksService'
import { getJoinAnalytics, type JoinAnalytics } from '../../data/services/joinAnalytics'
import { supabase } from '../../lib/supabase'
import { AdminPageHeader, Button, Card, Table, type TableColumn, Badge, ConfirmDialog } from '../../components/admin'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/platformAdmin'
import { showSuccess, showError } from '../../utils/toast'
import { useT } from '../../i18n/useI18n'
import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'
import OfflineBanner from '../../components/admin/OfflineBanner'
import '../../styles/orgAdmin.css'

interface GuardianInvite {
    id: string
    email: string
    status: string
    expires_at: string
    created_at: string
    athlete_id: string
    athlete_name?: string
    team_name?: string
}

interface JoinRequest {
    id: string
    athlete_id: string
    athlete_name?: string
    team_id: string
    team_name?: string
    season_id: string
    season_name?: string
    status: 'pending' | 'approved' | 'denied'
    created_at: string
    requested_by_user_id: string
    requester_email?: string
}

export default function Invitations() {
    useDebugLifecycle('Invitations')
    const { context, isReady } = useUserContext()
    const t = useT()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<'invites' | 'requests' | 'analytics'>('invites')
    const [analytics, setAnalytics] = useState<JoinAnalytics | null>(null)
    const [analyticsLoading, setAnalyticsLoading] = useState(false)
    
    // Guardian invites
    const [guardianInvites, setGuardianInvites] = useState<GuardianInvite[]>([])
    const [inviteActionLoading, setInviteActionLoading] = useState<string | null>(null)
    const [inviteToCancel, setInviteToCancel] = useState<string | null>(null)
    
    // Join requests
    const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([])
    const [requestActionLoading, setRequestActionLoading] = useState<string | null>(null)
    const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null)
    const [reviewDecision, setReviewDecision] = useState<'approve' | 'deny' | null>(null)
    const [reviewReason, setReviewReason] = useState('')

    const fetchAnalytics = useCallback(async () => {
        if (!isReady || !context) return

        setAnalyticsLoading(true)
        try {
            const { data, error } = await getJoinAnalytics(context.orgId, 30)
            if (error) {
                console.error('Failed to fetch analytics:', error)
            } else {
                setAnalytics(data)
            }
        } catch (err) {
            console.error('Error fetching analytics:', err)
        } finally {
            setAnalyticsLoading(false)
        }
    }, [isReady, context])

    const fetchData = useCallback(async () => {
        if (!isReady || !context) {
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            // Fetch all pending guardian invites across the org
            // We need to query parent_invites directly since getAthleteInvites is per-athlete
            const { data: invitesData, error: invitesError } = await supabase
                .from('parent_invites')
                .select(`
                    id,
                    email,
                    status,
                    expires_at,
                    created_at,
                    athlete_id,
                    athletes!inner(first_name, last_name),
                    team_id,
                    teams(name)
                `)
                .eq('org_id', context.orgId)
                .eq('status', 'pending')
                .order('created_at', { ascending: false })

            if (invitesError) {
                throw invitesError
            }

            const enrichedInvites: GuardianInvite[] = (invitesData || []).map((invite: any) => ({
                id: invite.id,
                email: invite.email,
                status: invite.status,
                expires_at: invite.expires_at,
                created_at: invite.created_at,
                athlete_id: invite.athlete_id,
                athlete_name: invite.athletes 
                    ? `${invite.athletes.first_name} ${invite.athletes.last_name}`
                    : 'Unknown',
                team_name: invite.teams?.name || null,
            }))

            setGuardianInvites(enrichedInvites)

            // Fetch pending join requests
            const { data: requestsData, error: requestsError } = await getJoinRequests(context.orgId, 'pending')

            if (requestsError) {
                console.error('Failed to fetch join requests:', requestsError)
            } else {
                // Enrich with athlete and team details
                const enrichedRequests = await Promise.all((requestsData || []).map(async (req: any) => {
                    const [athleteResult, teamResult, seasonResult, userResult] = await Promise.all([
                        supabase.from('athletes').select('first_name, last_name').eq('id', req.athlete_id).single(),
                        supabase.from('teams').select('name').eq('id', req.team_id).single(),
                        supabase.from('seasons').select('name').eq('id', req.season_id).single(),
                        supabase.from('users').select('email').eq('id', req.requested_by_user_id).single(),
                    ])
                    
                    return {
                        ...req,
                        athlete_name: athleteResult.data 
                            ? `${athleteResult.data.first_name} ${athleteResult.data.last_name}`
                            : 'Unknown',
                        team_name: teamResult.data?.name || 'Unknown',
                        season_name: seasonResult.data?.name || 'Unknown',
                        requester_email: userResult.data?.email || 'Unknown',
                    }
                }))
                
                setJoinRequests(enrichedRequests)
            }

            setLoading(false)
        } catch (err) {
            console.error('Error fetching invitations:', err)
            setError(err instanceof Error ? err.message : 'Failed to load invitations')
            setLoading(false)
        }
    }, [isReady, context])

    useEffect(() => {
        if (isReady && context) {
            fetchData()
            fetchAnalytics()
        }
    }, [isReady, context, fetchData, fetchAnalytics])

    const handleResendInvite = async (inviteId: string) => {
        if (!context) return

        setInviteActionLoading(inviteId)
        const { error } = await resendInvite(inviteId)

        if (error) {
            showError(error.message || t('admin.invitations.resendError'))
        } else {
            showSuccess(t('admin.invitations.resendSuccess'))
            fetchData()
        }
        setInviteActionLoading(null)
    }

    const handleCancelInvite = async (inviteId: string) => {
        if (!context) return

        setInviteActionLoading(inviteId)
        const { error } = await cancelInvite(inviteId)

        if (error) {
            showError(error.message || t('admin.invitations.cancelError'))
        } else {
            showSuccess(t('admin.invitations.cancelSuccess'))
            fetchData()
        }
        setInviteActionLoading(null)
        setInviteToCancel(null)
    }

    const handleReviewRequest = async (requestId: string, approve: boolean) => {
        if (!context) return

        setRequestActionLoading(requestId)
        const { data, error } = await reviewJoinRequest({
            requestId,
            approve,
            decisionReason: reviewReason || null,
        })

        if (error) {
            showError(error.message || t('admin.invitations.reviewError'))
        } else if (data) {
            showSuccess(approve ? t('admin.invitations.approveSuccess') : t('admin.invitations.denySuccess'))
            fetchData()
            setReviewingRequestId(null)
            setReviewDecision(null)
            setReviewReason('')
        }
        setRequestActionLoading(null)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const isExpired = (expiresAt: string) => {
        return new Date(expiresAt) < new Date()
    }

    const inviteColumns: TableColumn<GuardianInvite>[] = [
        {
            key: 'email',
            header: t('admin.invitations.email'),
            render: (invite) => invite.email,
        },
        {
            key: 'athlete',
            header: t('admin.invitations.athlete'),
            render: (invite) => invite.athlete_name || 'Unknown',
        },
        {
            key: 'team',
            header: t('admin.invitations.team'),
            render: (invite) => invite.team_name || 'â€”',
        },
        {
            key: 'expires',
            header: t('admin.invitations.expires'),
            render: (invite) => (
                <span className={isExpired(invite.expires_at) ? 'text-red-600 dark:text-red-400' : ''}>
                    {formatDate(invite.expires_at)}
                    {isExpired(invite.expires_at) && ' (Expired)'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: t('admin.invitations.actions'),
            render: (invite) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        size="compact"
                        onClick={() => handleResendInvite(invite.id)}
                        disabled={inviteActionLoading === invite.id}
                        loading={inviteActionLoading === invite.id}
                    >
                        {t('admin.invitations.resend')}
                    </Button>
                    <Button
                        variant="danger"
                        size="compact"
                        onClick={() => setInviteToCancel(invite.id)}
                        disabled={inviteActionLoading === invite.id}
                    >
                        {t('admin.invitations.cancel')}
                    </Button>
                </div>
            ),
        },
    ]

    const requestColumns: TableColumn<JoinRequest>[] = [
        {
            key: 'athlete',
            header: t('admin.invitations.athlete'),
            render: (req) => req.athlete_name || 'Unknown',
        },
        {
            key: 'team',
            header: t('admin.invitations.team'),
            render: (req) => req.team_name || 'Unknown',
        },
        {
            key: 'season',
            header: t('admin.invitations.season'),
            render: (req) => req.season_name || 'Unknown',
        },
        {
            key: 'requester',
            header: t('admin.invitations.requester'),
            render: (req) => req.requester_email || 'Unknown',
        },
        {
            key: 'requested',
            header: t('admin.invitations.requested'),
            render: (req) => formatDate(req.created_at),
        },
        {
            key: 'actions',
            header: t('admin.invitations.actions'),
            render: (req) => (
                <div className="flex items-center gap-2">
                    <Button
                        variant="primary"
                        size="compact"
                        onClick={() => {
                            setReviewingRequestId(req.id)
                            setReviewDecision('approve')
                        }}
                        disabled={requestActionLoading === req.id}
                    >
                        {t('admin.invitations.approve')}
                    </Button>
                    <Button
                        variant="secondary"
                        size="compact"
                        onClick={() => {
                            setReviewingRequestId(req.id)
                            setReviewDecision('deny')
                        }}
                        disabled={requestActionLoading === req.id}
                    >
                        {t('admin.invitations.deny')}
                    </Button>
                </div>
            ),
        },
    ]

    if (!isReady) {
        return (
            <div className="oa-root">
                <AdminPageHeader title={t('admin.invitations.title')} subtitle={t('admin.invitations.description')} />
                <div className="oa-container">
                    <Card className="p-8 text-center">
                        <p>{t('common.loading')}</p>
                    </Card>
                </div>
            </div>
        )
    }

    return (
        <div className="oa-root">
            <OfflineBanner />
            <AdminPageHeader 
                title={t('admin.invitations.title')}
            />
            <div className="oa-container">
                {error && (
                    <Card className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4">
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                    </Card>
                )}

                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'invites' | 'requests' | 'analytics')} className="oa-tabs">
                    <TabsList className="oa-mb-6">
                        <TabsTrigger value="invites">
                            {t('admin.invitations.guardianInvites')}
                            {guardianInvites.length > 0 && (
                                <Badge variant="warning" className="ml-2">
                                    {guardianInvites.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="requests">
                            {t('admin.invitations.joinRequests')}
                            {joinRequests.length > 0 && (
                                <Badge variant="warning" className="ml-2">
                                    {joinRequests.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="analytics">Analytics</TabsTrigger>
                    </TabsList>

                    <TabsContent value="invites">
                        {loading ? (
                            <Card className="p-8 text-center">
                                <p>{t('common.loading')}</p>
                            </Card>
                        ) : guardianInvites.length === 0 ? (
                            <Card className="p-8 text-center">
                                <p 
                                  style={{
                                    color: 'var(--pa-text-muted)'
                                  }}
                                >
                                    {t('admin.invitations.noPendingInvites')}
                                </p>
                            </Card>
                        ) : (
                            <Card className="p-0 overflow-hidden">
                                <Table
                                    data={guardianInvites}
                                    columns={inviteColumns}
                                />
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="requests">
                        {loading ? (
                            <Card className="p-8 text-center">
                                <p>{t('common.loading')}</p>
                            </Card>
                        ) : joinRequests.length === 0 ? (
                            <Card className="p-8 text-center">
                                <p 
                                  style={{
                                    color: 'var(--pa-text-muted)'
                                  }}
                                >
                                    {t('admin.invitations.noPendingRequests')}
                                </p>
                            </Card>
                        ) : (
                            <Card className="p-0 overflow-hidden">
                                <Table
                                    data={joinRequests}
                                    columns={requestColumns}
                                />
                            </Card>
                        )}
                    </TabsContent>

                    <TabsContent value="analytics">
                        {analyticsLoading ? (
                            <Card>
                                <div className="p-6 text-center">Loading analytics...</div>
                            </Card>
                        ) : analytics ? (
                            <div className="space-y-6">
                                {/* Invite Metrics */}
                                <Card>
                                    <h3 className="text-lg font-semibold mb-4">Guardian Invite Metrics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                                        <div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Sent</div>
                                            <div className="text-2xl font-bold">{analytics.invite_metrics.total_sent}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Accepted</div>
                                            <div className="text-2xl font-bold text-green-600">{analytics.invite_metrics.total_accepted}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
                                            <div className="text-2xl font-bold text-yellow-600">{analytics.invite_metrics.total_pending}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Expired</div>
                                            <div className="text-2xl font-bold text-gray-600">{analytics.invite_metrics.total_expired}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Cancelled</div>
                                            <div className="text-2xl font-bold text-red-600">{analytics.invite_metrics.total_cancelled}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Acceptance Rate</div>
                                            <div className="text-2xl font-bold">{analytics.invite_metrics.acceptance_rate.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Join Request Metrics */}
                                <Card>
                                    <h3 className="text-lg font-semibold mb-4">Join Request Metrics</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Total Submitted</div>
                                            <div className="text-2xl font-bold">{analytics.join_request_metrics.total_submitted}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Approved</div>
                                            <div className="text-2xl font-bold text-green-600">{analytics.join_request_metrics.total_approved}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Denied</div>
                                            <div className="text-2xl font-bold text-red-600">{analytics.join_request_metrics.total_denied}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Pending</div>
                                            <div className="text-2xl font-bold text-yellow-600">{analytics.join_request_metrics.total_pending}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">Approval Rate</div>
                                            <div className="text-2xl font-bold">{analytics.join_request_metrics.approval_rate.toFixed(1)}%</div>
                                        </div>
                                    </div>
                                </Card>

                                {/* Team Joins Last 30 Days */}
                                {analytics.team_joins_last_30_days.length > 0 && (
                                    <Card>
                                        <h3 className="text-lg font-semibold mb-4">Team Joins (Last 30 Days)</h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead>
                                                    <tr className="border-b">
                                                        <th className="text-left p-2">Team</th>
                                                        <th className="text-right p-2">Joins (30d)</th>
                                                        <th className="text-right p-2">Total Members</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {analytics.team_joins_last_30_days.map((team) => (
                                                        <tr key={team.team_id} className="border-b">
                                                            <td className="p-2">{team.team_name}</td>
                                                            <td className="text-right p-2 font-semibold">{team.joins_last_30_days}</td>
                                                            <td className="text-right p-2">{team.total_members}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                )}

                                {/* Code Lookups */}
                                <Card>
                                    <h3 className="text-lg font-semibold mb-4">Team Code Activity</h3>
                                    <div>
                                        <div className="text-sm text-gray-600 dark:text-gray-400">Code Lookups (Last 30 Days)</div>
                                        <div className="text-2xl font-bold">{analytics.total_team_code_lookups}</div>
                                    </div>
                                </Card>
                            </div>
                        ) : (
                            <Card>
                                <div className="p-6 text-center text-gray-500">No analytics data available</div>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Cancel Invite Confirmation */}
                {inviteToCancel && (
                    <ConfirmDialog
                        open={!!inviteToCancel}
                        title={t('admin.invitations.cancelConfirmTitle')}
                        description={t('admin.invitations.cancelConfirmMessage')}
                        confirmLabel={t('admin.invitations.cancel')}
                        cancelLabel={t('common.cancel')}
                        variant="danger"
                        onConfirm={() => inviteToCancel && handleCancelInvite(inviteToCancel)}
                        onCancel={() => setInviteToCancel(null)}
                    />
                )}

                {/* Review Request Modal */}
                {reviewingRequestId && reviewDecision && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <Card className="w-full max-w-md p-6 m-4">
                            <h3 className="text-lg font-semibold mb-4">
                                {reviewDecision === 'approve' 
                                    ? t('admin.invitations.approveRequest')
                                    : t('admin.invitations.denyRequest')}
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2">
                                        {t('admin.invitations.decisionReason')} ({t('common.optional')})
                                    </label>
                                    <input
                                        type="text"
                                        value={reviewReason}
                                        onChange={(e) => setReviewReason(e.target.value)}
                                        placeholder={t('admin.invitations.reasonPlaceholder')}
                                        className="w-full px-3 py-2 border rounded"
                                        style={{
                                          background: 'var(--pa-surface-panel)',
                                          borderColor: 'var(--pa-border-default)',
                                          color: 'var(--pa-text-primary)'
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <Button
                                    variant={reviewDecision === 'approve' ? 'primary' : 'danger'}
                                    onClick={() => handleReviewRequest(reviewingRequestId, reviewDecision === 'approve')}
                                    disabled={requestActionLoading === reviewingRequestId}
                                    loading={requestActionLoading === reviewingRequestId}
                                    className="flex-1"
                                >
                                    {reviewDecision === 'approve' 
                                        ? t('admin.invitations.approve')
                                        : t('admin.invitations.deny')}
                                </Button>
                                <Button
                                    variant="secondary"
                                    onClick={() => {
                                        setReviewingRequestId(null)
                                        setReviewDecision(null)
                                        setReviewReason('')
                                    }}
                                    className="flex-1"
                                >
                                    {t('common.cancel')}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    )
}
