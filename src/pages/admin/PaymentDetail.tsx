import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getFeeAssignmentById, formatCurrency } from '../../data/services/paymentsService'
import { supabase } from '../../lib/supabase'
import { getLink } from '../../utils/routes'
import { AdminPageHeader, Badge, Card, Button } from '../../components/platformAdmin'

interface PaymentDetailData {
  id: string
  amount_cents: number
  balance_cents: number
  paid_cents_total: number
  status: 'unpaid' | 'partial' | 'paid' | 'waived' | 'overdue'
  due_date: string | null
  created_at: string
  fee?: {
    id: string
    title: string
    description: string | null
    amount_cents: number
    season?: { id: string; name: string } | null
  } | null
  athlete?: {
    id: string
    first_name: string
    last_name: string
  } | null
  parent?: {
    id: string
    email: string
    display_name: string | null
  } | null
  payments?: Array<{
    id: string
    amount_cents: number
    status: string
    created_at: string
    stripe_payment_intent_id: string | null
  }>
  team?: {
    id: string
    name: string
  } | null
  season?: {
    id: string
    name: string
  } | null
  created_by?: {
    id: string
    display_name: string | null
    email: string
  } | null
}

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<PaymentDetailData | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  console.log('[PaymentDetail] Render:', { 
    id, 
    isReady, 
    loading, 
    hasAssignment: !!assignment,
    error,
    contextUserId: context.userId,
    contextOrgId: context.orgId,
    contextRoles: context.roles 
  })

  useEffect(() => {
    console.log('[PaymentDetail] Component mounted')
    return () => {
      console.log('[PaymentDetail] Component unmounting')
      isMountedRef.current = false
    }
  }, [])

  const fetchData = useCallback(async () => {
    console.log('[PaymentDetail] fetchData called:', { id, isReady, contextOrgId: context.orgId })

    if (!isReady) {
      console.log('[PaymentDetail] Not ready yet, waiting...')
      return
    }

    if (!id) {
      console.warn('[PaymentDetail] No ID provided, navigating back to list')
      setLoading(false)
      navigate(getLink('admin.payments.list'), { replace: true })
      return
    }

    console.log('[PaymentDetail] Starting fetch for payment ID:', id)
    setLoading(true)
    setError(null)

    try {
      console.log('[PaymentDetail] Calling getFeeAssignmentById with:', { context, id })
      const { data, error: fetchError } = await getFeeAssignmentById(context, id)

      console.log('[PaymentDetail] getFeeAssignmentById response:', { 
        hasData: !!data, 
        hasError: !!fetchError,
        errorMessage: fetchError?.message,
        dataId: data?.id 
      })

      if (!isMountedRef.current) {
        console.log('[PaymentDetail] Component unmounted, aborting')
        return
      }

      if (fetchError) {
        console.error('[PaymentDetail] Fetch error:', fetchError)
        setLoading(false)
        if (fetchError.message?.includes('Access denied') || fetchError.message?.includes('not found')) {
          console.log('[PaymentDetail] Access denied or not found, navigating back')
          navigate(getLink('admin.payments.list'), { replace: true })
        } else {
          console.log('[PaymentDetail] Setting error state:', fetchError.message)
          setError(fetchError.message || 'Failed to load payment details')
        }
        return
      }

      if (!data) {
        console.warn('[PaymentDetail] No data returned for payment:', id)
        setLoading(false)
        setError('Payment not found')
        return
      }

      console.log('[PaymentDetail] Fetched data:', data)

      // Transform to component format
      const rawAmount = (data as any).amount_cents ?? (data as any).amount_due_cents ?? 0
      const rawBalance = (data as any).balance_cents
      const rawPaid = (data as any).paid_cents_total ?? (data as any).amount_paid_cents ?? 0
      
      const amountCents = Number(rawAmount) || 0
      const paidCentsTotal = Number(rawPaid) || 0
      const balanceCents = rawBalance !== undefined && rawBalance !== null 
        ? Number(rawBalance) 
        : Math.max(0, amountCents - paidCentsTotal)

      const transformed: PaymentDetailData = {
        id: data.id,
        amount_cents: amountCents,
        balance_cents: balanceCents,
        paid_cents_total: paidCentsTotal,
        status: (data.status || 'unpaid') as PaymentDetailData['status'],
        due_date: (data as any).due_date ?? null,
        created_at: (data as any).created_at || new Date().toISOString(),
        fee: data.fee ? {
          id: data.fee.id,
          title: data.fee.title || 'Fee',
          description: (data.fee as any).description ?? null,
          amount_cents: (data.fee as any).amount_cents ?? amountCents,
          season: (data.fee as any).season ? {
            id: (data.fee as any).season.id,
            name: (data.fee as any).season.name,
          } : null,
        } : null,
        athlete: (data as any).athlete ? {
          id: (data as any).athlete.id,
          first_name: (data as any).athlete.first_name || '',
          last_name: (data as any).athlete.last_name || '',
        } : null,
        parent: (data as any).parent ? {
          id: (data as any).parent.id,
          email: (data as any).parent.email || '',
          display_name: (data as any).parent.display_name || null,
        } : null,
        payments: (data as any).payments ?? [],
      }

      // Fetch team and season info if available
      if (transformed.fee?.season?.id) {
        try {
          const { data: teamSeasons } = await supabase
            .from('team_seasons')
            .select('team_id, team:teams(id, name)')
            .eq('season_id', transformed.fee.season.id)
            .limit(1)
          
          if (teamSeasons && teamSeasons.length > 0 && (teamSeasons[0] as any).team) {
            transformed.team = {
              id: (teamSeasons[0] as any).team.id,
              name: (teamSeasons[0] as any).team.name,
            }
          }
          transformed.season = transformed.fee.season
        } catch (err) {
          console.error('Error fetching team info:', err)
        }
      }

      if (!isMountedRef.current) {
        console.log('[PaymentDetail] Component unmounted after team fetch, aborting')
        return
      }
      
      // Validate transformed data has required fields
      if (!transformed.id) {
        console.error('[PaymentDetail] Invalid payment data: missing ID')
        setError('Invalid payment data: missing ID')
        setLoading(false)
        return
      }
      
      console.log('[PaymentDetail] Setting assignment and completing load:', transformed)
      setAssignment(transformed)
      setLoading(false)
      console.log('[PaymentDetail] State updated - loading=false, assignment set')
    } catch (err) {
      if (!isMountedRef.current) {
        console.log('[PaymentDetail] Component unmounted during error handling')
        return
      }
      console.error('[PaymentDetail] Caught error in fetchData:', err)
      setError(err instanceof Error ? err.message : 'Failed to load payment details')
      setLoading(false)
    }
  }, [id, context, isReady, navigate])

  useEffect(() => {
    console.log('[PaymentDetail] Effect triggered:', { isReady, id })
    if (isReady && id) {
      console.log('[PaymentDetail] Calling fetchData from effect')
      fetchData()
    } else {
      console.log('[PaymentDetail] Conditions not met for fetchData:', { isReady, hasId: !!id })
    }
  }, [isReady, id, fetchData])

  const handleMarkAsPaid = async () => {
    if (!assignment) return
    setActionLoading('markPaid')
    try {
      // TODO: Implement mark as paid offline
      console.log('Mark as paid offline:', assignment.id)
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark as paid')
    } finally {
      setActionLoading(null)
    }
  }

  const handleSendReminder = async () => {
    if (!assignment) return
    setActionLoading('reminder')
    try {
      // TODO: Implement send reminder
      console.log('Send reminder:', assignment.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reminder')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDownloadReceipt = () => {
    if (!assignment) return
    // TODO: Implement PDF download
    console.log('Download receipt:', assignment.id)
  }

  const handleIssueRefund = async () => {
    if (!assignment) return
    setActionLoading('refund')
    try {
      // TODO: Implement refund
      console.log('Issue refund:', assignment.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to issue refund')
    } finally {
      setActionLoading(null)
    }
  }

  const handleVoidPayment = async () => {
    if (!assignment) return
    setActionLoading('void')
    try {
      // TODO: Implement void payment
      console.log('Void payment:', assignment.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to void payment')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    console.log('[PaymentDetail] Rendering loading state')
    return (
      <div className="pa-root">
        <AdminPageHeader title="Payment" />
        <div className="pa-flex pa-justify-center pa-py-12">
          <div className="pa-animate-spin pa-rounded-full pa-h-8 pa-w-8 pa-border-t-2 pa-border-b-2 pa-border-slate-900 dark:pa-border-white"></div>
        </div>
      </div>
    )
  }

  if (error || !assignment) {
    console.log('[PaymentDetail] Rendering error state:', { error, hasAssignment: !!assignment })
    return (
      <div className="pa-root">
        <AdminPageHeader title="Payment" />
        <Card className="pa-text-center pa-py-12">
          <p className="pa-text-red-600 dark:pa-text-red-400 pa-text-sm pa-font-bold pa-mb-4">{error || 'Payment not found'}</p>
          <Button variant="primary" onClick={() => navigate(getLink('admin.payments.list'))}>
            Back to Payments
          </Button>
        </Card>
      </div>
    )
  }

  console.log('[PaymentDetail] Rendering main content with assignment:', assignment.id)

  const isPaid = assignment.status === 'paid'
  const isUnpaid = assignment.status === 'unpaid' || assignment.status === 'overdue'
  const contextLine = [
    assignment.fee?.season?.name,
    assignment.team?.name,
  ].filter(Boolean).join(' • ') || 'Payment'

  const statusVariant = 
    isPaid ? 'success' :
    assignment.status === 'overdue' ? 'danger' :
    assignment.status === 'partial' ? 'warning' :
    'neutral'

  return (
    <div className="pa-root">
      <div
        style={{
          maxWidth: 'calc(var(--pa-space-9) * 22.5)',
          margin: '0 auto',
          padding: 'var(--pa-space-6) var(--pa-space-4)',
        }}
      >
        <AdminPageHeader
          title="Payment"
          actions={
            <div className="pa-flex pa-gap-2">
              {isUnpaid && (
                <Button
                  variant="secondary"
                  size="compact"
                  onClick={handleSendReminder}
                  disabled={actionLoading !== null}
                >
                  Send Reminder
                </Button>
              )}
              <Button
                variant="secondary"
                size="compact"
                onClick={handleDownloadReceipt}
                disabled={!isPaid || actionLoading !== null}
              >
                Download Receipt
              </Button>
              <Button
                variant="secondary"
                size="compact"
                onClick={() => navigate(getLink('admin.payments.list'))}
              >
                Back to Payments
              </Button>
            </div>
          }
        />

        {error && (
          <Card className="pa-mb-6" style={{ borderLeft: '3px solid var(--pa-danger)' }}>
            <div className="pa-body-m pa-text-danger" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)' }}>
              {error}
            </div>
          </Card>
        )}

        {/* Context Line and Status */}
        <div className="pa-mb-6">
          <p className="pa-text-sm pa-text-slate-500 dark:pa-text-slate-400 pa-mb-2">{contextLine}</p>
          <Badge variant={statusVariant}>{assignment.status.toUpperCase()}</Badge>
        </div>

        <div className="pa-grid pa-grid-cols-1 lg:pa-grid-cols-3 pa-gap-8">
        {/* Main Content */}
        <div className="lg:pa-col-span-2 pa-space-y-8">
          {/* Payment Breakdown */}
          <Card>
            <div className="pa-p-6">
              <h3 className="pa-text-xs pa-font-bold pa-uppercase pa-tracking-[0.2em] pa-text-slate-400 pa-mb-4">
                PAYMENT BREAKDOWN
              </h3>
              <div className="pa-divide-y pa-divide-slate-100 dark:pa-divide-slate-800">
                {assignment.fee && (
                  <div className="pa-py-4 pa-flex pa-justify-between">
                    <div>
                      <p className="pa-font-bold pa-text-slate-900 dark:pa-text-white">{assignment.fee.title}</p>
                      {assignment.fee.description && (
                        <p className="pa-text-xs pa-text-slate-500 dark:pa-text-slate-400 pa-mt-1">
                          {assignment.fee.description}
                        </p>
                      )}
                    </div>
                    <p className="pa-font-bold pa-text-slate-900 dark:pa-text-white">
                      {formatCurrency(assignment.fee.amount_cents)}
                    </p>
                  </div>
                )}
                <div className="pa-py-4 pa-bg-slate-50 dark:pa-bg-slate-800/30 pa-flex pa-justify-between pa-items-center">
                  <p className="pa-font-black pa-text-slate-900 dark:pa-text-white pa-uppercase pa-tracking-widest pa-text-sm">
                    Grand Total
                  </p>
                  <p className="pa-text-2xl pa-font-black pa-text-[var(--org-btn-primary-bg, #137fec)]">
                    {formatCurrency(isPaid ? assignment.paid_cents_total : assignment.amount_cents)}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Who Owes This Payment */}
          <Card>
            <div className="pa-p-6">
              <h3 className="pa-text-xs pa-font-bold pa-uppercase pa-tracking-[0.2em] pa-text-slate-400 pa-mb-4">
                WHO OWES THIS PAYMENT
              </h3>
              <div className="pa-space-y-4">
                <div>
                  <p className="pa-text-sm pa-text-slate-500 dark:pa-text-slate-400 pa-mb-1">Guardian</p>
                  <p className="pa-font-bold pa-text-slate-900 dark:pa-text-white">
                    {assignment.parent?.display_name || assignment.parent?.email || 'Unknown'}
                  </p>
                  <p className="pa-text-sm pa-text-slate-500 dark:pa-text-slate-400">
                    {assignment.parent?.email || 'No email'}
                  </p>
                </div>
                {assignment.athlete && (
                  <div>
                    <p className="pa-text-sm pa-text-slate-500 dark:pa-text-slate-400 pa-mb-1">Athlete</p>
                    <p className="pa-font-bold pa-text-slate-900 dark:pa-text-white">
                      {assignment.athlete.first_name} {assignment.athlete.last_name}
                    </p>
                    {assignment.team && (
                      <p className="pa-text-sm pa-text-slate-500 dark:pa-text-slate-400">
                        {assignment.team.name}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Activity Timeline */}
          <Card>
            <div className="pa-p-6">
              <h3 className="pa-text-xs pa-font-bold pa-uppercase pa-tracking-[0.2em] pa-text-slate-400 pa-mb-4">
                ACTIVITY
              </h3>
              <div className="pa-space-y-3">
                <div className="pa-flex pa-items-start pa-gap-3">
                  <div className="pa-size-2 pa-rounded-full pa-bg-[var(--org-btn-primary-bg, #137fec)] pa-mt-2"></div>
                  <div className="pa-flex-1">
                    <p className="pa-text-sm pa-font-medium pa-text-slate-900 dark:pa-text-white">
                      Payment created
                    </p>
                    <p className="pa-text-xs pa-text-slate-500 dark:pa-text-slate-400">
                      {new Date(assignment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
                {assignment.payments && assignment.payments.length > 0 && (
                  <div className="pa-flex pa-items-start pa-gap-3">
                    <div className="pa-size-2 pa-rounded-full pa-bg-green-500 pa-mt-2"></div>
                    <div className="pa-flex-1">
                      <p className="pa-text-sm pa-font-medium pa-text-slate-900 dark:pa-text-white">
                        Payment completed
                      </p>
                      <p className="pa-text-xs pa-text-slate-500 dark:pa-text-slate-400">
                        {new Date(assignment.payments[0].created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Summary Sidebar */}
        <div className="pa-space-y-6">
          <Card>
            <div className="pa-p-6">
              <div className="pa-text-center pa-mb-6">
                <p className="pa-text-xs pa-font-bold pa-uppercase pa-tracking-[0.2em] pa-text-slate-400 pa-mb-2">
                  {isPaid ? 'Amount Paid' : 'Amount Due'}
                </p>
                <p className="pa-text-4xl pa-font-black pa-text-slate-900 dark:pa-text-white pa-tracking-tighter">
                  {formatCurrency(isPaid ? assignment.paid_cents_total : assignment.balance_cents)}
                </p>
                <Badge variant={statusVariant} className="pa-mt-3">
                  {assignment.status.toUpperCase()}
                </Badge>
              </div>

              <div className="pa-space-y-4 pa-divide-y pa-divide-slate-100 dark:pa-divide-slate-800">
                <div className="pa-pt-4">
                  <p className="pa-text-xs pa-text-slate-500 dark:pa-text-slate-400 pa-mb-1">Status</p>
                  <p className="pa-text-sm pa-font-medium pa-text-slate-900 dark:pa-text-white">
                    {assignment.status}
                  </p>
                </div>
                {assignment.due_date && (
                  <div className="pa-pt-4">
                    <p className="pa-text-xs pa-text-slate-500 dark:pa-text-slate-400 pa-mb-1">Due Date</p>
                    <p className="pa-text-sm pa-font-medium pa-text-slate-900 dark:pa-text-white">
                      {new Date(assignment.due_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
                <div className="pa-pt-4">
                  <p className="pa-text-xs pa-text-slate-500 dark:pa-text-slate-400 pa-mb-1">Created</p>
                  <p className="pa-text-sm pa-font-medium pa-text-slate-900 dark:pa-text-white">
                    {new Date(assignment.created_at).toLocaleDateString()}
                  </p>
                </div>
                {assignment.fee && (
                  <div className="pa-pt-4">
                    <p className="pa-text-xs pa-text-slate-500 dark:pa-text-slate-400 pa-mb-1">Fee Type</p>
                    <p className="pa-text-sm pa-font-medium pa-text-slate-900 dark:pa-text-white">
                      {assignment.fee.title}
                    </p>
                  </div>
                )}
                {assignment.team && (
                  <div className="pa-pt-4">
                    <p className="pa-text-xs pa-text-slate-500 dark:pa-text-slate-400 pa-mb-1">Team</p>
                    <p className="pa-text-sm pa-font-medium pa-text-slate-900 dark:pa-text-white">
                      {assignment.team.name}
                    </p>
                  </div>
                )}
                {assignment.season && (
                  <div className="pa-pt-4">
                    <p className="pa-text-xs pa-text-slate-500 dark:pa-text-slate-400 pa-mb-1">Season</p>
                    <p className="pa-text-sm pa-font-medium pa-text-slate-900 dark:pa-text-white">
                      {assignment.season.name}
                    </p>
                  </div>
                )}
              </div>

              {assignment.payments && assignment.payments.length > 0 && (
                <div className="pa-mt-6 pa-pt-6 pa-border-t pa-border-slate-100 dark:pa-border-slate-800">
                  <p className="pa-text-xs pa-font-bold pa-uppercase pa-tracking-[0.2em] pa-text-slate-400 pa-mb-3">
                    PAYMENT METHOD
                  </p>
                  <div className="pa-space-y-2">
                    <p className="pa-text-sm pa-font-medium pa-text-slate-900 dark:pa-text-white">
                      {assignment.payments[0].stripe_payment_intent_id 
                        ? `Payment #${assignment.payments[0].stripe_payment_intent_id.slice(-4)}`
                        : 'Payment Processed'}
                    </p>
                    <p className="pa-text-xs pa-text-slate-500 dark:pa-text-slate-400">
                      Transaction: #{assignment.payments[0].id.slice(-8).toUpperCase()}
                    </p>
                  </div>
                </div>
              )}

              <div className="pa-mt-6 pa-pt-6 pa-border-t pa-border-slate-100 dark:pa-border-slate-800 pa-space-y-2">
                <p className="pa-text-xs pa-font-bold pa-uppercase pa-tracking-[0.2em] pa-text-slate-400 pa-mb-3">
                  ADMIN ACTIONS
                </p>
                {isUnpaid && (
                  <Button
                    variant="secondary"
                    size="compact"
                    className="pa-w-full pa-justify-start"
                    onClick={handleMarkAsPaid}
                    disabled={actionLoading !== null}
                  >
                    Mark as Paid (Offline)
                  </Button>
                )}
                {isPaid && (
                  <Button
                    variant="secondary"
                    size="compact"
                    className="pa-w-full pa-justify-start"
                    onClick={handleIssueRefund}
                    disabled={actionLoading !== null}
                  >
                    Issue Refund
                  </Button>
                )}
                {isUnpaid && (
                  <Button
                    variant="secondary"
                    size="compact"
                    className="pa-w-full pa-justify-start"
                    onClick={handleVoidPayment}
                    disabled={actionLoading !== null}
                  >
                    Void Payment
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="compact"
                  className="pa-w-full pa-justify-start"
                  onClick={handleDownloadReceipt}
                  disabled={!isPaid || actionLoading !== null}
                >
                  Download Receipt
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
      </div>
    </div>
  )
}
