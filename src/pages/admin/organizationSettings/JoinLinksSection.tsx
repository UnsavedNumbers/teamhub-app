/**
 * Join Links Section
 *
 * Manage self-service registration links for teams and organization.
 */

import { useState, useEffect } from 'react'
import { useUserContext } from '../../../hooks/useUserContext'
import { createJoinLink, getJoinLinks, deleteJoinLink, getJoinRequests, reviewJoinRequest } from '../../../data/services/joinLinksService'
import { getTeams } from '../../../data/services/teamsService'
import type { Team } from '../../../data/types/organization'
import { Button, Card, Input, Select, Checkbox, ConfirmDialog, Tabs, TabsList, TabsTrigger, TabsContent } from '../../../components/platformAdmin'
import { OrgAdminButton } from '../../../components/admin/OrgAdminButton'
import { showSuccess, showError } from '../../../utils/toast'
import { useT } from '../../../i18n/useI18n'
import { supabase } from '../../../lib/supabase'

interface JoinLink {
    id: string
    org_id: string
    team_id: string | null
    token: string
    auto_approve: boolean
    expires_at: string
    created_at: string | null
    created_by_user_id: string | null
    updated_at: string | null
}

interface JoinLinksSectionProps {
    orgId: string
}

export default function JoinLinksSection({ orgId }: JoinLinksSectionProps) {
    const { context } = useUserContext()
    const t = useT()
    const [loading, setLoading] = useState(false)
    const [links, setLinks] = useState<JoinLink[]>([])
    const [teams, setTeams] = useState<Team[]>([])
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null)
    
    // Create form state
    const [selectedTeamId, setSelectedTeamId] = useState<string>('')
    const [autoApprove, setAutoApprove] = useState(false)
    const [expiresInDays, setExpiresInDays] = useState(7)
    const [createdLink, setCreatedLink] = useState<{ url: string; expiresAt: string } | null>(null)
    
    // Join requests state
    const [pendingRequests, setPendingRequests] = useState<any[]>([])
    const [reviewingRequestId, setReviewingRequestId] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState('links')
    const [reviewDecision, setReviewDecision] = useState<'approve' | 'deny' | null>(null)
    const [reviewReason, setReviewReason] = useState('')

    useEffect(() => {
        fetchLinks()
        fetchTeams()
        fetchJoinRequests()
    }, [orgId])

    const fetchLinks = async () => {
        if (!context) return
        
        setLoading(true)
        const { data, error } = await getJoinLinks(orgId)
        
        if (error) {
            showError(error.message || 'Failed to load join links')
        } else {
            setLinks(data || [])
        }
        setLoading(false)
    }

    const fetchTeams = async () => {
        if (!context) return
        
        const { data } = await getTeams(context)
        if (data) {
            setTeams(data)
        }
    }

    const fetchJoinRequests = async () => {
        if (!context) return
        
        const { data, error } = await getJoinRequests(orgId, 'pending')
        
        if (error) {
            console.error('Failed to load join requests:', error)
        } else {
            // Fetch athlete and team details for each request
            const enrichedRequests = await Promise.all((data || []).map(async (req) => {
                const [athleteResult, teamResult] = await Promise.all([
                    supabase.from('athletes').select('first_name, last_name').eq('id', req.athlete_id).single(),
                    req.team_id ? supabase.from('teams').select('name').eq('id', req.team_id).single() : Promise.resolve({ data: null }),
                ])
                
                return {
                    ...req,
                    athlete_name: athleteResult.data ? `${athleteResult.data.first_name} ${athleteResult.data.last_name}` : 'Unknown',
                    team_name: teamResult.data?.name || 'All Teams',
                }
            }))
            
            setPendingRequests(enrichedRequests)
        }
    }

    const handleReviewRequest = async (requestId: string, approve: boolean) => {
        if (!context) return

        setLoading(true)
        const { data, error } = await reviewJoinRequest({
            requestId,
            approve,
            decisionReason: reviewReason || null,
        })

        if (error) {
            showError(error.message || 'Failed to review join request')
        } else if (data) {
            showSuccess(approve ? 'Join request approved' : 'Join request denied')
            fetchJoinRequests()
            setReviewingRequestId(null)
            setReviewDecision(null)
            setReviewReason('')
        }
        setLoading(false)
    }

    const handleCreateLink = async () => {
        if (!context) return

        setLoading(true)
        const { data, error } = await createJoinLink({
            orgId,
            teamId: selectedTeamId || null,
            autoApprove,
            expiresInDays,
        })

        if (error) {
            showError(error.message || 'Failed to create join link')
            setLoading(false)
            return
        }

        if (data) {
            setCreatedLink({ url: data.url, expiresAt: data.expiresAt })
            setShowCreateModal(false)
            // Reset form
            setSelectedTeamId('')
            setAutoApprove(false)
            setExpiresInDays(7)
            fetchLinks()
            showSuccess('Join link created successfully')
        }
        setLoading(false)
    }

    const handleDeleteLink = async (linkId: string) => {
        if (!context) return

        setLoading(true)
        const { success, error } = await deleteJoinLink(linkId)

        if (error) {
            showError(error.message || 'Failed to delete join link')
        } else if (success) {
            showSuccess('Join link deleted')
            fetchLinks()
        }
        setDeletingLinkId(null)
        setLoading(false)
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            showSuccess('Link copied to clipboard')
        }).catch(() => {
            showError('Failed to copy link')
        })
    }

    const formatExpiresAt = (expiresAt: string) => {
        const date = new Date(expiresAt)
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    const isExpired = (expiresAt: string) => {
        return new Date(expiresAt) < new Date()
    }

    const getTeamName = (teamId: string | null) => {
        if (!teamId) return 'All Teams'
        const team = teams.find(t => t.id === teamId)
        return team?.name || 'Unknown Team'
    }

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-6">
                    <TabsTrigger value="links">{t('admin.organizationSettings.joinLinks.linksTab')}</TabsTrigger>
                    <TabsTrigger value="requests">
                        {t('admin.organizationSettings.joinLinks.requestsTab')}
                        {pendingRequests.length > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                                {pendingRequests.length}
                            </span>
                        )}
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="links" className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">{t('admin.organizationSettings.joinLinks.title')}</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {t('admin.organizationSettings.joinLinks.description')}
                    </p>
                </div>
                <OrgAdminButton
                    variant="primary"
                    icon="add"
                    onClick={() => setShowCreateModal(true)}
                    disabled={loading}
                >
                    {t('admin.organizationSettings.joinLinks.createLink')}
                </OrgAdminButton>
            </div>

            {createdLink && (
                <Card className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <p className="font-semibold text-emerald-900 dark:text-emerald-100 mb-2">
                                {t('admin.organizationSettings.joinLinks.linkCreated')}
                            </p>
                            <div className="flex items-center gap-2 mb-2">
                                <code 
                                  className="text-sm px-2 py-1 rounded flex-1 break-all"
                                  style={{
                                    background: 'var(--pa-surface-panel)',
                                    color: 'var(--pa-text-primary)'
                                  }}
                                >
                                    {createdLink.url}
                                </code>
                                <Button
                                    variant="secondary"
                                    size="compact"
                                    icon="content_copy"
                                    onClick={() => copyToClipboard(createdLink.url)}
                                >
                                    {t('admin.organizationSettings.joinLinks.copy')}
                                </Button>
                            </div>
                            <p 
                              className="text-xs"
                              style={{
                                color: 'var(--pa-text-muted)'
                              }}
                            >
                                {t('admin.organizationSettings.joinLinks.expiresAt')}: {formatExpiresAt(createdLink.expiresAt)}
                            </p>
                        </div>
                        <Button
                            variant="ghost"
                            size="compact"
                            icon="close"
                            onClick={() => setCreatedLink(null)}
                        />
                    </div>
                </Card>
            )}

            {loading && links.length === 0 ? (
                <Card className="p-8 text-center">
                    <p>{t('admin.organizationSettings.joinLinks.loading')}</p>
                </Card>
            ) : links.length === 0 ? (
                <Card className="p-8 text-center">
                    <p 
                      style={{
                        color: 'var(--pa-text-muted)'
                      }}
                    >
                        {t('admin.organizationSettings.joinLinks.noLinks')}
                    </p>
                </Card>
            ) : (
                <Card className="p-0 overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                            <tr>
                                <th 
                                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                  style={{
                                    color: 'var(--pa-text-secondary)'
                                  }}
                                >
                                    {t('admin.organizationSettings.joinLinks.team')}
                                </th>
                                <th 
                                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                  style={{
                                    color: 'var(--pa-text-secondary)'
                                  }}
                                >
                                    {t('admin.organizationSettings.joinLinks.link')}
                                </th>
                                <th 
                                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                  style={{
                                    color: 'var(--pa-text-secondary)'
                                  }}
                                >
                                    {t('admin.organizationSettings.joinLinks.autoApprove')}
                                </th>
                                <th 
                                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                  style={{
                                    color: 'var(--pa-text-secondary)'
                                  }}
                                >
                                    {t('admin.organizationSettings.joinLinks.expiresAt')}
                                </th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                    {t('admin.organizationSettings.joinLinks.actions')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {links.map((link) => {
                                const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
                                const linkUrl = `${baseUrl}/portal/join/link?token=${link.token}`
                                const expired = isExpired(link.expires_at)
                                
                                return (
                                    <tr key={link.id} className={expired ? 'opacity-50' : ''}>
                                        <td className="px-4 py-3 text-sm">
                                            {getTeamName(link.team_id)}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <code 
                                                  className="text-xs px-2 py-1 rounded max-w-xs truncate"
                                                  style={{
                                                    background: 'var(--pa-surface-panel)',
                                                    color: 'var(--pa-text-primary)'
                                                  }}
                                                >
                                                    {linkUrl}
                                                </code>
                                                <Button
                                                    variant="ghost"
                                                    size="compact"
                                                    icon="content_copy"
                                                    onClick={() => copyToClipboard(linkUrl)}
                                                />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            {link.auto_approve ? (
                                                <span className="text-emerald-600 dark:text-emerald-400">Yes</span>
                                            ) : (
                                                <span className="text-slate-400">No</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={expired ? 'text-red-600 dark:text-red-400' : ''}>
                                                {formatExpiresAt(link.expires_at)}
                                                {expired && ' (Expired)'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <Button
                                                variant="ghost"
                                                size="compact"
                                                icon="delete"
                                                onClick={() => setDeletingLinkId(link.id)}
                                            >
                                                {t('admin.organizationSettings.joinLinks.delete')}
                                            </Button>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </Card>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <Card className="w-full max-w-md p-6 m-4">
                        <h3 className="text-lg font-semibold mb-4">{t('admin.organizationSettings.joinLinks.createLink')}</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    {t('admin.organizationSettings.joinLinks.selectTeam')}
                                </label>
                                <Select
                                    value={selectedTeamId}
                                    onChange={(e) => setSelectedTeamId(e.target.value)}
                                    options={[
                                        { value: '', label: t('admin.organizationSettings.joinLinks.allTeams') },
                                        ...teams.map(team => ({ value: team.id, label: team.name }))
                                    ]}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2">
                                    {t('admin.organizationSettings.joinLinks.expiresInDays')}
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="365"
                                    value={expiresInDays}
                                    onChange={(e) => setExpiresInDays(parseInt(e.target.value) || 7)}
                                />
                            </div>

                            <div>
                                <label className="flex items-center gap-2">
                                    <Checkbox
                                        checked={autoApprove}
                                        onChange={(e) => setAutoApprove(e.target.checked)}
                                    />
                                    <span className="text-sm">{t('admin.organizationSettings.joinLinks.autoApproveLabel')}</span>
                                </label>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    {t('admin.organizationSettings.joinLinks.autoApproveHelp')}
                                </p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <Button
                                variant="primary"
                                onClick={handleCreateLink}
                                disabled={loading}
                                className="flex-1"
                            >
                                {t('admin.organizationSettings.joinLinks.create')}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setShowCreateModal(false)
                                    setSelectedTeamId('')
                                    setAutoApprove(false)
                                    setExpiresInDays(7)
                                }}
                                className="flex-1"
                            >
                                {t('admin.organizationSettings.joinLinks.cancel')}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            {/* Delete Confirmation */}
            {deletingLinkId && (
                <ConfirmDialog
                    open={!!deletingLinkId}
                    title={t('admin.organizationSettings.joinLinks.deleteConfirmTitle')}
                    description={t('admin.organizationSettings.joinLinks.deleteConfirmMessage')}
                    confirmLabel={t('admin.organizationSettings.joinLinks.delete')}
                    cancelLabel={t('admin.organizationSettings.joinLinks.cancel')}
                    onConfirm={() => handleDeleteLink(deletingLinkId)}
                    onCancel={() => setDeletingLinkId(null)}
                    variant="danger"
                />
            )}
                </TabsContent>

                <TabsContent value="requests" className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-2">{t('admin.organizationSettings.joinLinks.pendingRequests')}</h3>
                        <p 
                          className="text-sm"
                          style={{
                            color: 'var(--pa-text-muted)'
                          }}
                        >
                            {t('admin.organizationSettings.joinLinks.reviewRequestsDescription')}
                        </p>
                    </div>

                    {loading && pendingRequests.length === 0 ? (
                        <Card className="p-8 text-center">
                            <p>{t('admin.organizationSettings.joinLinks.loading')}</p>
                        </Card>
                    ) : pendingRequests.length === 0 ? (
                        <Card className="p-8 text-center">
                            <p className="text-slate-500 dark:text-slate-400">{t('admin.organizationSettings.joinLinks.noPendingRequests')}</p>
                        </Card>
                    ) : (
                        <Card className="p-0 overflow-hidden">
                            <table className="w-full">
                                <thead 
                                  className="border-b"
                                  style={{
                                    background: 'var(--pa-surface-panel)',
                                    borderColor: 'var(--pa-border-default)'
                                  }}
                                >
                                    <tr>
                                        <th 
                                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                  style={{
                                    color: 'var(--pa-text-secondary)'
                                  }}
                                >
                                            {t('admin.organizationSettings.joinLinks.athlete')}
                                        </th>
                                        <th 
                                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                  style={{
                                    color: 'var(--pa-text-secondary)'
                                  }}
                                >
                                            {t('admin.organizationSettings.joinLinks.team')}
                                        </th>
                                        <th 
                                  className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                                  style={{
                                    color: 'var(--pa-text-secondary)'
                                  }}
                                >
                                            {t('admin.organizationSettings.joinLinks.requestedAt')}
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                                            {t('admin.organizationSettings.joinLinks.actions')}
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {pendingRequests.map((req) => (
                                        <tr key={req.id}>
                                            <td className="px-4 py-3 text-sm">
                                                {req.athlete_name}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {req.team_name}
                                            </td>
                                            <td className="px-4 py-3 text-sm">
                                                {new Date(req.created_at).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="primary"
                                                        size="compact"
                                                        onClick={() => {
                                                            setReviewingRequestId(req.id)
                                                            setReviewDecision('approve')
                                                        }}
                                                        disabled={loading}
                                                    >
                                                        {t('admin.organizationSettings.joinLinks.approve')}
                                                    </Button>
                                                    <Button
                                                        variant="secondary"
                                                        size="compact"
                                                        onClick={() => {
                                                            setReviewingRequestId(req.id)
                                                            setReviewDecision('deny')
                                                        }}
                                                        disabled={loading}
                                                    >
                                                        {t('admin.organizationSettings.joinLinks.deny')}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Card>
                    )}

                    {/* Review Modal */}
                    {reviewingRequestId && reviewDecision && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <Card className="w-full max-w-md p-6 m-4">
                                <h3 className="text-lg font-semibold mb-4">
                                    {reviewDecision === 'approve' 
                                        ? t('admin.organizationSettings.joinLinks.approveRequest')
                                        : t('admin.organizationSettings.joinLinks.denyRequest')}
                                </h3>
                                
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-2">
                                            {t('admin.organizationSettings.joinLinks.decisionReason')} ({t('common.optional')})
                                        </label>
                                        <Input
                                            type="text"
                                            value={reviewReason}
                                            onChange={(e) => setReviewReason(e.target.value)}
                                            placeholder={t('admin.organizationSettings.joinLinks.reasonPlaceholder')}
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-6">
                                    <Button
                                        variant={reviewDecision === 'approve' ? 'primary' : 'danger'}
                                        onClick={() => handleReviewRequest(reviewingRequestId, reviewDecision === 'approve')}
                                        disabled={loading}
                                        className="flex-1"
                                    >
                                        {reviewDecision === 'approve' 
                                            ? t('admin.organizationSettings.joinLinks.approve')
                                            : t('admin.organizationSettings.joinLinks.deny')}
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
                                        {t('admin.organizationSettings.joinLinks.cancel')}
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}
                </TabsContent>
            </Tabs>
        </div>
    )
}
