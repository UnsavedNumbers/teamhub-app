import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { 
  getFeeAssignmentById, 
  formatCurrency,
  markFeeAssignmentAsPaidOffline,
  issueRefundForFeeAssignment,
  voidFeeAssignment,
  sendPaymentReminder,
  generateReceiptPDF
} from '../../data/services/paymentsService'
import { supabase } from '../../lib/supabase'
import { getLink } from '../../utils/routes'
import { AdminPageHeader, Card, Button, ConfirmDialog } from '../../components/platformAdmin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import { showSuccess, showError } from '../../utils/toast'

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
  const componentIdRef = useRef(`PaymentDetail-Admin-${Date.now()}-${Math.random()}`)
  const renderCountRef = useRef(0)
  const effectRunCountRef = useRef(0)
  const fetchDataCountRef = useRef(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<PaymentDetailData | null>(null)

  renderCountRef.current++
  console.log(`[PaymentDetail-Admin:${componentIdRef.current}] RENDER #${renderCountRef.current}`, {
    timestamp: new Date().toISOString(),
    id, 
    isReady, 
    loading, 
    hasAssignment: !!assignment,
    error,
    contextUserId: context.userId,
    contextOrgId: context.orgId,
    contextRoles: context.roles 
  })
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const isMountedRef = useRef(true)
  const receiptInProgressRef = useRef(false)
  
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    action: 'markPaid' | 'refund' | 'void' | null
    title: string
    description: string
    variant: 'info' | 'warning' | 'danger'
    requireReason: boolean
    error: string | null
  }>({
    open: false,
    action: null,
    title: '',
    description: '',
    variant: 'info',
    requireReason: false,
    error: null,
  })

  useEffect(() => {
    const mountTime = new Date().toISOString()
    console.log(`[PaymentDetail-Admin:${componentIdRef.current}] MOUNT`, { timestamp: mountTime })
    isMountedRef.current = true
    return () => {
      const unmountTime = new Date().toISOString()
      console.log(`[PaymentDetail-Admin:${componentIdRef.current}] UNMOUNT`, {
        timestamp: unmountTime,
        mountTime,
        renderCount: renderCountRef.current,
        effectRuns: effectRunCountRef.current,
        fetchDataCalls: fetchDataCountRef.current,
      })
      isMountedRef.current = false
    }
  }, [])

  const fetchData = useCallback(async () => {
    fetchDataCountRef.current++
    const fetchId = fetchDataCountRef.current
    console.log(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} START`, {
      timestamp: new Date().toISOString(),
      id, 
      isReady, 
      contextOrgId: context.orgId,
      isMounted: isMountedRef.current,
    })

    if (!isReady) {
      console.log(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Not ready yet, waiting...`)
      return
    }

    if (!id) {
      console.warn(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - No ID provided, navigating back to list`)
      if (isMountedRef.current) {
        setLoading(false)
      }
      navigate(getLink('admin.payments.list'), { replace: true })
      return
    }

    if (!isMountedRef.current) {
      console.log(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Aborted (unmounted)`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Calling getFeeAssignmentById`)
      const apiStartTime = Date.now()
      const { data, error: fetchError } = await getFeeAssignmentById(context, id)
      const apiDuration = Date.now() - apiStartTime
      console.log(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - getFeeAssignmentById completed`, {
        duration: `${apiDuration}ms`,
        hasData: !!data, 
        hasError: !!fetchError,
        errorMessage: fetchError?.message,
        dataId: data?.id 
      })

      if (!isMountedRef.current) {
        console.log(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Aborted after API (unmounted)`)
        return
      }

      if (fetchError) {
        console.error(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Fetch error:`, fetchError)
        if (isMountedRef.current) {
          setLoading(false)
          if (fetchError.message?.includes('Access denied') || fetchError.message?.includes('not found')) {
            console.log(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Access denied or not found, navigating back`)
            navigate(getLink('admin.payments.list'), { replace: true })
          } else {
            console.log(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Setting error state:`, fetchError.message)
            setError(fetchError.message || 'Failed to load payment details')
          }
        }
        return
      }

      if (!data) {
        console.warn(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - No data returned for payment:`, id)
        if (isMountedRef.current) {
          setLoading(false)
          setError('Payment not found')
        }
        return
      }

      console.log(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Fetched data:`, data)

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
          console.log(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Fetching team info`)
          const teamStartTime = Date.now()
          const { data: teamSeasons } = await supabase
            .from('team_seasons')
            .select('team_id, team:teams(id, name)')
            .eq('season_id', transformed.fee.season.id)
            .limit(1)
          const teamDuration = Date.now() - teamStartTime
          console.log(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Team fetch completed`, {
            duration: `${teamDuration}ms`,
            hasData: !!teamSeasons,
            dataLength: teamSeasons?.length,
          })
          
          if (!isMountedRef.current) {
            console.log(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Aborted after team fetch (unmounted)`)
            return
          }
          
          if (teamSeasons && teamSeasons.length > 0 && (teamSeasons[0] as any).team) {
            transformed.team = {
              id: (teamSeasons[0] as any).team.id,
              name: (teamSeasons[0] as any).team.name,
            }
          }
          transformed.season = transformed.fee.season
        } catch (err) {
          if (!isMountedRef.current) return
          console.error(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Team fetch error:`, err)
        }
      }

      if (!isMountedRef.current) {
        console.log('[PaymentDetail] Component unmounted after team fetch, aborting')
        return
      }
      
      // Validate transformed data has required fields
      if (!transformed.id) {
        console.error(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Invalid payment data: missing ID`)
        if (isMountedRef.current) {
          setError('Invalid payment data: missing ID')
          setLoading(false)
        }
        return
      }
      
      console.log(`[PaymentDetail-Admin:${componentIdRef.current}] fetchData #${fetchId} - Setting assignment state`)
      if (isMountedRef.current) {
        setAssignment(transformed)
        setLoading(false)
      }
    } catch (err) {
      if (!isMountedRef.current) {
        console.log('[PaymentDetail] Component unmounted during error handling')
        return
      }
      console.error('[PaymentDetail] Caught error in fetchData:', err)
      setError(err instanceof Error ? err.message : 'Failed to load payment details')
      setLoading(false)
    }
  }, [id, context.orgId, context.userId, isReady, navigate])

  useEffect(() => {
    effectRunCountRef.current++
    const effectId = effectRunCountRef.current
    console.log(`[PaymentDetail-Admin:${componentIdRef.current}] Effect #${effectId} - Trigger fetchData`, {
      timestamp: new Date().toISOString(),
      isReady, 
      id,
      isMounted: isMountedRef.current,
    })
    if (isReady && id) {
      console.log(`[PaymentDetail-Admin:${componentIdRef.current}] Effect #${effectId} - Calling fetchData`)
      fetchData()
    } else {
      console.log(`[PaymentDetail-Admin:${componentIdRef.current}] Effect #${effectId} - Skipping fetchData`, {
        reason: !isReady ? 'not ready' : 'no id',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, id])

  const handleSendReminder = async () => {
    if (!assignment || !isMountedRef.current || actionLoading !== null) return
    
    setActionLoading('reminder')
    try {
      const { data, error } = await sendPaymentReminder(context, assignment.id)
      
      if (!isMountedRef.current) return
      
      if (error) {
        showError(error.message || 'Failed to send reminder')
        setError(error.message || 'Failed to send reminder')
      } else if (data?.sent) {
        showSuccess('Payment reminder sent successfully')
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send reminder'
        showError(errorMessage)
        setError(errorMessage)
      }
    } finally {
      if (isMountedRef.current) {
        setActionLoading(null)
      }
    }
  }

  const handleDownloadReceipt = async (e?: React.MouseEvent) => {
    if (e && !e.isTrusted) return
    if (!assignment || actionLoading !== null || receiptInProgressRef.current) return
    receiptInProgressRef.current = true
    setActionLoading('download')
    try {
      const { data, error } = await generateReceiptPDF(context, assignment.id)
      if (!isMountedRef.current) return
      if (error) {
        showError(error.message || 'Failed to generate receipt')
        return
      }
      if (data?.url) {
        if (data.url.startsWith('http') || data.url.startsWith('https')) {
          window.open(data.url, '_blank')
          showSuccess('Receipt opened in new tab')
        } else {
          showError('Receipt URL is not available')
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to download receipt'
        showError(errorMessage)
      }
    } finally {
      receiptInProgressRef.current = false
      if (isMountedRef.current) setActionLoading(null)
    }
  }

  const handleMarkAsPaidClick = () => {
    if (!assignment) return
    setConfirmDialog({
      open: true,
      action: 'markPaid',
      title: 'Mark as Paid (Offline)',
      description: `Mark this payment as paid offline? This will update the status to "paid" and set the balance to $0. Amount: ${formatCurrency(assignment.amount_cents)}`,
      variant: 'info',
      requireReason: false,
      error: null,
    })
  }

  const handleMarkAsPaid = async (_reason: string) => {
    if (!assignment || !isMountedRef.current) return
    
    setActionLoading('markPaid')
    try {
      const { data, error } = await markFeeAssignmentAsPaidOffline(context, assignment.id)
      
      if (!isMountedRef.current) return
      
      if (error) {
        const errorMessage = error.message || 'Failed to mark as paid'
        showError(errorMessage)
        setConfirmDialog(prev => ({ ...prev, error: errorMessage }))
      } else if (data) {
        showSuccess('Payment marked as paid successfully')
        setConfirmDialog(prev => ({ ...prev, open: false, error: null }))
        // Refresh data
        await fetchData()
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to mark as paid'
        showError(errorMessage)
        setConfirmDialog(prev => ({ ...prev, error: errorMessage }))
      }
    } finally {
      if (isMountedRef.current) {
        setActionLoading(null)
      }
    }
  }

  const handleIssueRefundClick = () => {
    if (!assignment) return
    setConfirmDialog({
      open: true,
      action: 'refund',
      title: 'Issue Refund',
      description: `Issue a refund for this payment? Amount paid: ${formatCurrency(assignment.paid_cents_total)}. You will be able to specify the refund amount.`,
      variant: 'warning',
      requireReason: true,
      error: null,
    })
  }

  const handleIssueRefund = async (reason: string) => {
    if (!assignment || !isMountedRef.current || !reason.trim()) return
    
    setActionLoading('refund')
    try {
      // For now, refund the full amount. In production, you might want a dialog to specify amount
      const refundAmount = assignment.paid_cents_total
      const { data, error } = await issueRefundForFeeAssignment(
        context, 
        assignment.id, 
        refundAmount,
        reason
      )
      
      if (!isMountedRef.current) return
      
      if (error) {
        const errorMessage = error.message || 'Failed to issue refund'
        showError(errorMessage)
        setConfirmDialog(prev => ({ ...prev, error: errorMessage }))
      } else if (data) {
        showSuccess(`Refund of ${formatCurrency(refundAmount)} issued successfully`)
        setConfirmDialog(prev => ({ ...prev, open: false, error: null }))
        // Refresh data
        await fetchData()
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to issue refund'
        showError(errorMessage)
        setConfirmDialog(prev => ({ ...prev, error: errorMessage }))
      }
    } finally {
      if (isMountedRef.current) {
        setActionLoading(null)
      }
    }
  }

  const handleVoidPaymentClick = () => {
    if (!assignment) return
    setConfirmDialog({
      open: true,
      action: 'void',
      title: 'Void Payment',
      description: `Void this payment assignment? This will mark it as waived and set the balance to $0. This action cannot be undone. Amount: ${formatCurrency(assignment.amount_cents)}`,
      variant: 'danger',
      requireReason: true,
      error: null,
    })
  }

  const handleVoidPayment = async (reason: string) => {
    if (!assignment || !isMountedRef.current || !reason.trim()) return
    
    setActionLoading('void')
    try {
      const { data, error } = await voidFeeAssignment(context, assignment.id, reason)
      
      if (!isMountedRef.current) return
      
      if (error) {
        const errorMessage = error.message || 'Failed to void payment'
        showError(errorMessage)
        setConfirmDialog(prev => ({ ...prev, error: errorMessage }))
      } else if (data) {
        showSuccess('Payment voided successfully')
        setConfirmDialog(prev => ({ ...prev, open: false, error: null }))
        // Refresh data
        await fetchData()
      }
    } catch (err) {
      if (isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to void payment'
        showError(errorMessage)
        setConfirmDialog(prev => ({ ...prev, error: errorMessage }))
      }
    } finally {
      if (isMountedRef.current) {
        setActionLoading(null)
      }
    }
  }

  const handleConfirmDialogConfirm = (reason: string) => {
    if (confirmDialog.action === 'markPaid') {
      handleMarkAsPaid(reason)
    } else if (confirmDialog.action === 'refund') {
      handleIssueRefund(reason)
    } else if (confirmDialog.action === 'void') {
      handleVoidPayment(reason)
    }
  }

  const handleConfirmDialogCancel = () => {
    setConfirmDialog(prev => ({ ...prev, open: false }))
  }

  if (loading) {
    return (
      <div className="pa-root">
        <div style={{ padding: '24px' }}>
          <div className="pa-skeleton" style={{ height: '60px', marginBottom: '24px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="pa-skeleton" style={{ height: '100px' }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="pa-skeleton" style={{ height: '300px' }} />
            ))}
          </div>
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
          <div className="pa-flex pa-flex-wrap pa-justify-center pa-gap-3">
            <Button variant="primary" onClick={() => { setError(null); fetchData() }}>
              Retry
            </Button>
            <Button variant="secondary" onClick={() => navigate(getLink('admin.payments.list'))}>
              Back to Payments
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  console.log('[PaymentDetail] Rendering main content with assignment:', assignment.id)

  const isPaid = assignment.status === 'paid'
  const isUnpaid = assignment.status === 'unpaid' || assignment.status === 'overdue'
  const pageTitle = assignment.fee?.title ?? 'Payment Details'
  const paymentDate = assignment.payments && assignment.payments.length > 0
    ? new Date(assignment.payments[0].created_at)
    : new Date(assignment.created_at)

  return (
    <div className="pa-root">
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: 'var(--pa-space-8) var(--pa-space-5)',
        }}
      >
        {/* Custom Header with Back Button and Title */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(getLink('admin.payments.list'))}
              className="size-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-[var(--org-btn-primary-bg, #137fec)] transition-colors min-h-[44px] min-w-[44px]"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {pageTitle}
            </h1>
          </div>
          <OrgAdminButton
            variant="primary"
            onClick={handleDownloadReceipt}
            disabled={!isPaid || actionLoading !== null}
            loading={actionLoading === 'download'}
            icon="download"
            className="flex items-center gap-2 uppercase tracking-widest w-full sm:w-auto min-h-[44px]"
          >
            DOWNLOAD PDF
          </OrgAdminButton>
        </div>

        {error && (
          <Card className="mb-6" style={{ borderLeft: '3px solid var(--pa-danger)' }}>
            <div className="text-sm font-medium text-red-600 dark:text-red-400" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)' }}>
              {error}
            </div>
          </Card>
        )}

        {/* Payment Status Card */}
        <Card className="mb-12 text-center relative overflow-hidden">
          <div className="relative z-10">
            <div className={`inline-flex items-center justify-center size-16 rounded-full mb-6 ${
              isPaid 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
            }`}>
              <span className="material-symbols-outlined text-4xl font-bold">
                {isPaid ? 'check_circle' : 'pending'}
              </span>
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em] text-sm mb-2">
              {isPaid ? 'Total Amount Paid' : 'Amount Due'}
            </p>
            <h2 className="text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">
              {formatCurrency(isPaid ? assignment.paid_cents_total : assignment.balance_cents)}
            </h2>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full font-black text-xs uppercase tracking-widest ${
              isPaid
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : assignment.status === 'partial'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              {isPaid && <span className="size-2 bg-green-500 rounded-full animate-pulse"></span>}
              STATUS: {assignment.status.toUpperCase()}
            </div>
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--org-btn-primary-bg, #137fec)]/5 -mr-16 -mt-16 rounded-full"></div>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Payer and For Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">PAYER</h3>
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <span className="material-symbols-outlined text-slate-500">person</span>
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {assignment.parent?.display_name || assignment.parent?.email || 'Unknown'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {assignment.parent?.email || 'No email'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">FOR</h3>
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full border-2 border-[var(--org-btn-primary-bg, #137fec)] overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    {assignment.athlete ? (
                      <span className="text-slate-500 text-xs font-bold">
                        {assignment.athlete.first_name[0]}{assignment.athlete.last_name[0]}
                      </span>
                    ) : (
                      <span className="material-symbols-outlined text-slate-500">person</span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {assignment.athlete 
                        ? `${assignment.athlete.first_name} ${assignment.athlete.last_name}`
                        : 'Unknown Athlete'}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Athlete #{assignment.athlete?.id.slice(-4) || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Itemization */}
            <Card noPadding>
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center rounded-t-2xl">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">ITEMIZATION</h3>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {paymentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {paymentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })}
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {assignment.fee && (
                  <div className="p-6 flex justify-between items-center">
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{assignment.fee.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {assignment.fee.description || 'Fee payment'}
                      </p>
                    </div>
                    <p className="font-bold text-slate-900 dark:text-white">
                      {formatCurrency(assignment.fee.amount_cents)}
                    </p>
                  </div>
                )}
                {assignment.payments && assignment.payments.length > 0 && (
                  <>
                    {assignment.payments.map((p) => (
                      <div key={p.id} className="p-6 flex justify-between items-center">
                        <div>
                          <p className="font-medium text-slate-900 dark:text-white">Payment</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(p.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} • {formatCurrency(p.amount_cents)}
                          </p>
                        </div>
                        <p className="font-bold text-slate-900 dark:text-white">
                          {formatCurrency(p.amount_cents)}
                        </p>
                      </div>
                    ))}
                    <div className="p-6 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center">
                      <p className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">
                        Grand Total
                      </p>
                      <p className="text-2xl font-black text-[var(--org-btn-primary-bg, #137fec)]">
                        {formatCurrency(assignment.paid_cents_total)}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Destination */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">DESTINATION</h3>
              <Card 
                className={`p-5 transition-all group ${assignment.team?.id || assignment.season?.id ? 'hover:border-[var(--org-btn-primary-bg, #137fec)] cursor-pointer' : 'cursor-default'}`}
                onClick={() => {
                  if (assignment.team?.id) {
                    navigate(getLink('admin.teams.detail', { id: assignment.team.id }))
                  } else if (assignment.season?.id) {
                    navigate(getLink('admin.seasons.detail', { id: assignment.season.id }))
                  }
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="size-10 bg-[var(--org-btn-primary-bg, #137fec)]/10 text-[var(--org-btn-primary-bg, #137fec)] rounded-lg flex items-center justify-center group-hover:bg-[var(--org-btn-primary-bg, #137fec)] group-hover:text-white transition-colors">
                    <span className="material-symbols-outlined">sports_soccer</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white leading-tight">
                      {assignment.team?.name || assignment.fee?.title || 'Fee'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {context.organizationName || 'Organization'}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-[var(--org-btn-primary-bg, #137fec)]">open_in_new</span>
                </div>
              </Card>
            </div>

            {/* Payment Method */}
            {assignment.payments && assignment.payments.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">PAYMENT METHOD</h3>
                <Card className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="size-10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-slate-500">credit_card</span>
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white leading-tight">
                        {assignment.payments[0].stripe_payment_intent_id 
                          ? `Payment #${assignment.payments[0].stripe_payment_intent_id.slice(-4)}`
                          : 'Payment Processed'}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Authorization: #{assignment.payments[0].id.slice(-8).toUpperCase()}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Admin Actions Section - Additional data not in Guardian view */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">ADMIN ACTIONS</h3>
              <Card className="p-6 space-y-2">
                {isUnpaid && (
                  <Button
                    variant="secondary"
                    size="compact"
                    className="w-full justify-start"
                    onClick={handleMarkAsPaidClick}
                    disabled={actionLoading !== null}
                    loading={actionLoading === 'markPaid'}
                  >
                    Mark as Paid (Offline)
                  </Button>
                )}
                {isPaid && (
                  <Button
                    variant="secondary"
                    size="compact"
                    className="w-full justify-start"
                    onClick={handleIssueRefundClick}
                    disabled={actionLoading !== null}
                    loading={actionLoading === 'refund'}
                  >
                    Issue Refund
                  </Button>
                )}
                {isUnpaid && (
                  <Button
                    variant="secondary"
                    size="compact"
                    className="w-full justify-start"
                    onClick={handleVoidPaymentClick}
                    disabled={actionLoading !== null}
                    loading={actionLoading === 'void'}
                  >
                    Void Payment
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="compact"
                  className="w-full justify-start"
                  onClick={handleDownloadReceipt}
                  disabled={!isPaid || actionLoading !== null}
                  loading={actionLoading === 'download'}
                >
                  Download Receipt
                </Button>
              </Card>
            </div>

            {/* Additional Info - Team, Season, etc. */}
            {(assignment.team || assignment.season || assignment.due_date) && (
              <div className="space-y-4">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">DETAILS</h3>
                <Card className="p-5 space-y-3">
                  {assignment.team && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Team</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {assignment.team.name}
                      </p>
                    </div>
                  )}
                  {assignment.season && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Season</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {assignment.season.name}
                      </p>
                    </div>
                  )}
                  {assignment.due_date && (
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Due Date</p>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {new Date(assignment.due_date).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Created</p>
                    <p className="text-sm font-medium text-slate-900 dark:text-white">
                      {new Date(assignment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </Card>
              </div>
            )}

            {/* Contact Registrar */}
            <Card className="p-6 bg-slate-100 dark:bg-slate-800/30 border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center mb-4">
                Questions about this payment?
              </p>
              <Button
                variant="secondary"
                onClick={handleSendReminder}
                disabled={actionLoading !== null}
                loading={actionLoading === 'reminder'}
                className="w-full h-10 border-2 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold tracking-widest uppercase"
              >
                CONTACT REGISTRAR
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        requireReason={confirmDialog.requireReason}
        loading={actionLoading !== null}
        error={confirmDialog.error}
        confirmLabel={
          confirmDialog.action === 'markPaid' ? 'Mark as Paid' :
          confirmDialog.action === 'refund' ? 'Issue Refund' :
          confirmDialog.action === 'void' ? 'Void Payment' :
          'Confirm'
        }
        onConfirm={handleConfirmDialogConfirm}
        onCancel={handleConfirmDialogCancel}
      />
    </div>
  )
}
