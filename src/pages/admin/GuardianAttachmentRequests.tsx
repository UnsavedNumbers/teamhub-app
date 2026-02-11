/**
 * GuardianAttachmentRequests Component
 *
 * Admin page for reviewing guardian attachment requests.
 * Allows admins to approve or deny requests with reasons.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { 
    getGuardianAttachmentRequestsForOrg, 
    reviewGuardianAttachmentRequest,
    getPendingGuardianAttachmentCount,
    type GuardianAttachmentRequestEnriched
} from '../../data/services/guardianService'
import { 
    AdminPageHeader, 
    Button, 
    Badge,
    ConfirmDialog
} from '../../components/admin'
import OrgDataTable from '../../components/admin/OrgDataTable'
import type { ColumnConfig } from '../../components/admin/OrgDataTable'
import { getLink } from '../../utils/routes'
import { calculateAge } from '../../utils/athleteHelpers'
import '../../styles/orgAdmin.css'

type RequestStatus = 'pending' | 'approved' | 'denied' | 'all'

export default function GuardianAttachmentRequests() {
    const { context, isReady } = useUserContext()
    const navigate = useNavigate()
    
    // State
    const [requests, setRequests] = useState<GuardianAttachmentRequestEnriched[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState<RequestStatus>('pending')
    const [pendingCount, setPendingCount] = useState<number>(0)
    const [error, setError] = useState<string | null>(null)
    
    // Review dialog state
    const [reviewDialog, setReviewDialog] = useState<{
        open: boolean
        request: GuardianAttachmentRequestEnriched | null
        approve: boolean
    }>({ open: false, request: null, approve: false })
    const [isReviewing, setIsReviewing] = useState(false)
    
    // Refs for race condition prevention
    const requestIdRef = useRef(0)
    const isMountedRef = useRef(true)
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            isMountedRef.current = false
        }
    }, [])
    
    // Fetch requests
    const fetchRequests = useCallback(async () => {
        if (!isReady || !context.orgId) return
        
        const currentRequestId = ++requestIdRef.current
        setLoading(true)
        setError(null)
        
        try {
            const status = statusFilter === 'all' ? undefined : statusFilter
            const { data, error: fetchError } = await getGuardianAttachmentRequestsForOrg(context.orgId, status)
            
            if (!isMountedRef.current) return
            if (currentRequestId !== requestIdRef.current) return
            
            if (fetchError) {
                setError(fetchError.message || 'Failed to load requests')
                setRequests([])
            } else if (data) {
                setRequests(data)
            } else {
                setRequests([])
            }
        } catch (err) {
            console.error('Error fetching requests:', err)
            if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                setError('An error occurred while loading requests')
                setRequests([])
            }
        } finally {
            if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                setLoading(false)
            }
        }
    }, [isReady, context.orgId, statusFilter])
    
    // Fetch pending count
    const fetchPendingCount = useCallback(async () => {
        if (!isReady || !context.orgId) return
        
        try {
            const { data, error: countError } = await getPendingGuardianAttachmentCount(context.orgId)
            
            if (!isMountedRef.current) return
            
            if (!countError && typeof data === 'number') {
                setPendingCount(data)
            }
        } catch (err) {
            console.error('Error fetching pending count:', err)
        }
    }, [isReady, context.orgId])
    
    // Load data when ready or filter changes
    useEffect(() => {
        if (isReady) {
            fetchRequests()
            fetchPendingCount()
        }
    }, [isReady, fetchRequests, fetchPendingCount])
    
    // Handle review
    const handleReview = useCallback(async (request: GuardianAttachmentRequestEnriched, approve: boolean, reason?: string) => {
        if (!request || isReviewing) return
        
        // Require reason for denials
        if (!approve && (!reason || reason.trim().length === 0)) {
            setError('Please provide a reason when denying a request')
            return
        }
        
        const currentRequestId = ++requestIdRef.current
        setIsReviewing(true)
        setError(null)
        
        try {
            const { data, error: reviewError } = await reviewGuardianAttachmentRequest(
                request.id,
                approve,
                approve ? null : reason?.trim() || null
            )
            
            if (!isMountedRef.current) return
            if (currentRequestId !== requestIdRef.current) return
            
            if (reviewError) {
                setError(reviewError.message || 'Failed to review request')
            } else if (data) {
                // Refresh requests and count
                await fetchRequests()
                await fetchPendingCount()
                // Close dialog
                setReviewDialog({ open: false, request: null, approve: false })
            }
        } catch (err) {
            console.error('Error reviewing request:', err)
            if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                setError('An error occurred while reviewing the request')
            }
        } finally {
            if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                setIsReviewing(false)
            }
        }
    }, [isReviewing, fetchRequests, fetchPendingCount])
    
    // Open review dialog
    const openReviewDialog = useCallback((request: GuardianAttachmentRequestEnriched, approve: boolean) => {
        setReviewDialog({ open: true, request, approve })
        setError(null)
    }, [])
    
    // Format date
    const formatDate = (dateStr: string | null): string => {
        if (!dateStr) return '—'
        try {
            return new Date(dateStr).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return dateStr
        }
    }
    
    // Check if request is expired
    const isExpired = (expiresAt: string): boolean => {
        try {
            return new Date(expiresAt) <= new Date()
        } catch {
            return false
        }
    }
    
    // Table columns
    const columns: ColumnConfig<GuardianAttachmentRequestEnriched>[] = [
        {
            id: 'athlete',
            label: 'Athlete',
            render: (row) => (
                <div>
                    <div className="oa-body-m" style={{ fontWeight: 600 }}>
                        {row.athlete_first_name} {row.athlete_last_name}
                    </div>
                    {row.athlete_birthdate && (
                        <div className="oa-body-s oa-text-muted">
                            Age {String(calculateAge(row.athlete_birthdate))}
                        </div>
                    )}
                </div>
            )
        },
        {
            id: 'requester',
            label: 'Requester',
            render: (row) => (
                <div>
                    <div className="oa-body-m">{row.requester_email}</div>
                    {row.requester_display_name && (
                        <div className="oa-body-s oa-text-muted">{row.requester_display_name}</div>
                    )}
                </div>
            )
        },
        {
            id: 'status',
            label: 'Status',
            render: (row) => {
                const variant = row.status === 'approved' ? 'success' : 
                               row.status === 'denied' ? 'danger' : 
                               isExpired(row.expires_at) ? 'warning' : 'neutral'
                return (
                    <Badge variant={variant}>
                        {row.status.toUpperCase()}
                        {row.status === 'pending' && isExpired(row.expires_at) && ' (EXPIRED)'}
                    </Badge>
                )
            }
        },
        {
            id: 'requested',
            label: 'Requested',
            render: (row) => formatDate(row.created_at)
        },
        {
            id: 'expires',
            label: 'Expires',
            render: (row) => row.status === 'pending' ? formatDate(row.expires_at) : '—'
        },
        {
            id: 'reviewed',
            label: 'Reviewed',
            render: (row) => {
                if (row.status === 'pending') return '—'
                return (
                    <div>
                        <div className="oa-body-s">{formatDate(row.reviewed_at)}</div>
                        {row.reviewer_display_name && (
                            <div className="oa-body-s oa-text-muted">by {row.reviewer_display_name}</div>
                        )}
                    </div>
                )
            }
        },
        {
            id: 'reason',
            label: 'Reason',
            render: (row) => row.decision_reason || '—'
        },
        {
            id: 'actions',
            label: 'Actions',
            align: 'right',
            render: (row) => {
                if (row.status !== 'pending') {
                    return (
                        <Button
                            variant="ghost"
                            size="compact"
                            onClick={(e: React.MouseEvent<HTMLElement>) => {
                                e.stopPropagation()
                                navigate(getLink('admin.athletes.detail', { id: row.athlete_id }))
                            }}
                        >
                            View Athlete
                        </Button>
                    )
                }
                
                return (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <Button
                            variant="primary"
                            size="compact"
                            onClick={(e: React.MouseEvent<HTMLElement>) => {
                                e.stopPropagation()
                                openReviewDialog(row, true)
                            }}
                            disabled={isReviewing || isExpired(row.expires_at)}
                        >
                            Approve
                        </Button>
                        <Button
                            variant="danger"
                            size="compact"
                            onClick={(e: React.MouseEvent<HTMLElement>) => {
                                e.stopPropagation()
                                openReviewDialog(row, false)
                            }}
                            disabled={isReviewing || isExpired(row.expires_at)}
                        >
                            Deny
                        </Button>
                    </div>
                )
            }
        }
    ]
    
    if (!isReady) {
        return (
            <div className="oa-root">
                <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
                </div>
            </div>
        )
    }
    
    return (
        <div className="oa-root">
            <AdminPageHeader 
                title="Guardian Attachment Requests"
                actions={
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {pendingCount > 0 && (
                            <Badge variant="warning">{pendingCount} Pending</Badge>
                        )}
                    </div>
                }
            />
            
            {/* Error Message */}
            {error && (
                <div style={{ 
                    marginBottom: '16px', 
                    padding: '12px', 
                    backgroundColor: 'var(--oa-danger-light)', 
                    color: 'var(--oa-danger)', 
                    borderRadius: '8px' 
                }}>
                    {error}
                </div>
            )}
            
            {/* Status Filter */}
            <div style={{ marginBottom: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label className="oa-body-s" style={{ fontWeight: 600, marginRight: '8px' }}>
                    Filter:
                </label>
                <Button
                    variant={statusFilter === 'all' ? 'primary' : 'secondary'}
                    size="compact"
                    onClick={() => setStatusFilter('all')}
                >
                    All
                </Button>
                <Button
                    variant={statusFilter === 'pending' ? 'primary' : 'secondary'}
                    size="compact"
                    onClick={() => setStatusFilter('pending')}
                >
                    Pending
                </Button>
                <Button
                    variant={statusFilter === 'approved' ? 'primary' : 'secondary'}
                    size="compact"
                    onClick={() => setStatusFilter('approved')}
                >
                    Approved
                </Button>
                <Button
                    variant={statusFilter === 'denied' ? 'primary' : 'secondary'}
                    size="compact"
                    onClick={() => setStatusFilter('denied')}
                >
                    Denied
                </Button>
            </div>
            
            {/* Requests Table */}
            <OrgDataTable
                columns={columns}
                rows={requests}
                loading={loading}
                totalCount={requests.length}
                page={0}
                rowsPerPage={25}
                onPageChange={() => {}}
                onRowsPerPageChange={() => {}}
                emptyMessage={
                    statusFilter === 'pending' 
                        ? "No pending requests. All requests have been reviewed."
                        : `No ${statusFilter === 'all' ? '' : statusFilter} requests found.`
                }
                onRowClick={(row) => {
                    navigate(getLink('admin.athletes.detail', { id: row.athlete_id }))
                }}
            />
            
            {/* Review Dialog */}
            <ConfirmDialog
                open={reviewDialog.open}
                title={reviewDialog.approve ? 'Approve Request' : 'Deny Request'}
                description={
                    reviewDialog.request 
                        ? (reviewDialog.approve 
                            ? `Approve ${reviewDialog.request.requester_display_name || reviewDialog.request.requester_email}'s request to attach to ${reviewDialog.request.athlete_first_name} ${reviewDialog.request.athlete_last_name}?`
                            : `Deny ${reviewDialog.request.requester_display_name || reviewDialog.request.requester_email}'s request to attach to ${reviewDialog.request.athlete_first_name} ${reviewDialog.request.athlete_last_name}?`)
                        : ''
                }
                confirmLabel={reviewDialog.approve ? 'Approve' : 'Deny'}
                cancelLabel="Cancel"
                variant={reviewDialog.approve ? undefined : 'danger'}
                requireReason={!reviewDialog.approve}
                onConfirm={(reason) => {
                    if (reviewDialog.request) {
                        handleReview(reviewDialog.request, reviewDialog.approve, reason)
                    }
                }}
                onCancel={() => {
                    setReviewDialog({ open: false, request: null, approve: false })
                    setError(null)
                }}
                loading={isReviewing}
                error={error}
            />
        </div>
    )
}
