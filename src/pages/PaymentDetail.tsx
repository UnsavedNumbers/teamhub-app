import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { getFeeAssignmentById } from '../data/services/paymentsService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, SectionHeader } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { formatCurrency } from '../data/services/paymentsService'
import { getLink } from '../utils/routes'

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
}

export default function PaymentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const componentIdRef = useRef(`PaymentDetail-${Date.now()}-${Math.random()}`)
  const renderCountRef = useRef(0)
  const effectRunCountRef = useRef(0)
  const fetchDataCountRef = useRef(0)
  
  renderCountRef.current++
  console.log(`[PaymentDetail:${componentIdRef.current}] RENDER #${renderCountRef.current}`, {
    timestamp: new Date().toISOString(),
    id,
    isReady,
    contextOrgId: context?.orgId,
    contextUserId: context?.userId,
  })

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<PaymentDetailData | null>(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    const mountTime = new Date().toISOString()
    console.log(`[PaymentDetail:${componentIdRef.current}] MOUNT`, { timestamp: mountTime })
    isMountedRef.current = true
    return () => {
      const unmountTime = new Date().toISOString()
      console.log(`[PaymentDetail:${componentIdRef.current}] UNMOUNT`, {
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
    const fetchStartTime = Date.now()
    console.log(`[PaymentDetail:${componentIdRef.current}] fetchData #${fetchId} START`, {
      timestamp: new Date().toISOString(),
      id,
      isReady,
      contextOrgId: context?.orgId,
      isMounted: isMountedRef.current,
    })

    if (!id || !isReady) {
      console.log(`[PaymentDetail:${componentIdRef.current}] fetchData #${fetchId} - Early return`, {
        reason: !id ? 'no id' : 'not ready',
      })
      if (!isReady) return
      if (isMountedRef.current) {
        setLoading(false)
        navigate(getLink('portal.payments'), { replace: true })
      }
      return
    }

    if (!isMountedRef.current) {
      console.log(`[PaymentDetail:${componentIdRef.current}] fetchData #${fetchId} - Aborted (unmounted)`)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log(`[PaymentDetail:${componentIdRef.current}] fetchData #${fetchId} - Calling getFeeAssignmentById`)
      const apiStartTime = Date.now()
      const { data, error: fetchError } = await getFeeAssignmentById(context, id)
      const apiDuration = Date.now() - apiStartTime
      console.log(`[PaymentDetail:${componentIdRef.current}] fetchData #${fetchId} - getFeeAssignmentById completed`, {
        duration: `${apiDuration}ms`,
        hasData: !!data,
        hasError: !!fetchError,
        errorMessage: fetchError?.message,
      })

      if (!isMountedRef.current) {
        console.log(`[PaymentDetail:${componentIdRef.current}] fetchData #${fetchId} - Aborted after API (unmounted)`)
        return
      }

      if (fetchError || !data) {
        console.log(`[PaymentDetail:${componentIdRef.current}] fetchData #${fetchId} - Error or no data`, {
          hasError: !!fetchError,
          hasData: !!data,
        })
        if (isMountedRef.current) {
          setLoading(false)
          if (fetchError?.message?.includes('Access denied') || fetchError?.message?.includes('not found')) {
            navigate(getLink('portal.payments'), { replace: true })
          } else {
            setError(fetchError?.message || 'Failed to load payment details')
          }
        }
        return
      }

      // Transform to component format
      const transformed: PaymentDetailData = {
        id: data.id,
        amount_cents: (data as any).amount_cents ?? (data as any).amount_due_cents ?? 0,
        balance_cents: (data as any).balance_cents ?? 0,
        paid_cents_total: (data as any).paid_cents_total ?? (data as any).amount_paid_cents ?? 0,
        status: data.status as PaymentDetailData['status'],
        due_date: data.due_date ?? null,
        created_at: data.created_at,
        fee: data.fee ? {
          id: data.fee.id,
          title: data.fee.title,
          description: data.fee.description ?? null,
          amount_cents: data.fee.amount_cents ?? 0,
        } : null,
        athlete: (data as any).athlete ? {
          id: (data as any).athlete.id,
          first_name: (data as any).athlete.first_name,
          last_name: (data as any).athlete.last_name,
        } : null,
        parent: (data as any).parent ? {
          id: (data as any).parent.id,
          email: (data as any).parent.email,
          display_name: (data as any).parent.display_name,
        } : null,
        payments: data.payments ?? [],
      }

      console.log(`[PaymentDetail:${componentIdRef.current}] fetchData #${fetchId} - Setting assignment state`)
      if (isMountedRef.current) {
        setAssignment(transformed)
        setLoading(false)
      }
    } catch (err) {
      if (!isMountedRef.current) return
      console.error(`[PaymentDetail:${componentIdRef.current}] fetchData #${fetchId} - Caught error:`, err)
      setError(err instanceof Error ? err.message : 'Failed to load payment details')
      setLoading(false)
    } finally {
      const totalDuration = Date.now() - fetchStartTime
      console.log(`[PaymentDetail:${componentIdRef.current}] fetchData #${fetchId} - COMPLETE`, {
        duration: `${totalDuration}ms`,
        isMounted: isMountedRef.current,
      })
    }
  }, [id, context.orgId, context.userId, isReady, navigate])

  useEffect(() => {
    effectRunCountRef.current++
    const effectId = effectRunCountRef.current
    console.log(`[PaymentDetail:${componentIdRef.current}] Effect #${effectId} - Trigger fetchData`, {
      timestamp: new Date().toISOString(),
      isReady,
      id,
      isMounted: isMountedRef.current,
    })
    if (isReady && id) {
      console.log(`[PaymentDetail:${componentIdRef.current}] Effect #${effectId} - Calling fetchData`)
      fetchData()
    } else {
      console.log(`[PaymentDetail:${componentIdRef.current}] Effect #${effectId} - Skipping fetchData`, {
        reason: !isReady ? 'not ready' : 'no id',
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, id])

  const handleDownloadPDF = () => {
    // TODO: Implement PDF download
    console.log('Download PDF for payment:', id)
  }

  const handleContactRegistrar = () => {
    // TODO: Implement contact registrar
    console.log('Contact registrar for payment:', id)
  }

  if (loading) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: getLink('portal.dashboard') },
          { label: 'Payments', path: getLink('portal.payments') },
          { label: 'Payment Details' },
        ]}
      >
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </PortalLayout>
    )
  }

  if (error || !assignment) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: getLink('portal.dashboard') },
          { label: 'Payments', path: getLink('portal.payments') },
          { label: 'Payment Details' },
        ]}
      >
        <Card className="text-center py-12">
          <p className="text-red-600 dark:text-red-400 text-sm font-bold mb-4">{error || 'Payment not found'}</p>
          <Button variant="primary" onClick={() => navigate(getLink('portal.payments'))}>
            Back to Payments
          </Button>
        </Card>
      </PortalLayout>
    )
  }

  const totalPaid = assignment.paid_cents_total
  const isPaid = assignment.status === 'paid'
  const receiptNumber = assignment.id.slice(-8).toUpperCase()
  const paymentDate = assignment.payments && assignment.payments.length > 0
    ? new Date(assignment.payments[0].created_at)
    : new Date(assignment.created_at)

  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: getLink('portal.dashboard') },
        { label: 'Payments', path: getLink('portal.payments') },
        { label: 'Payment Details' },
      ]}
    >
      <div className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(getLink('portal.payments'))}
              className="size-10 flex items-center justify-center rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-[var(--org-link-color)] transition-colors"
            >
              <Icon name="arrow_back" />
            </button>
            <PageTitle className="text-3xl">RECEIPT #{receiptNumber}</PageTitle>
          </div>
          <Button variant="primary" onClick={handleDownloadPDF} className="flex items-center gap-2 uppercase tracking-widest">
            <Icon name="download" />
            DOWNLOAD PDF
          </Button>
        </div>

        {/* Payment Status Card */}
        <Card className="mb-12 text-center relative overflow-hidden" highlight>
          <div className="relative z-10">
            <div className={`inline-flex items-center justify-center size-16 rounded-full mb-6 ${
              isPaid 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
            }`}>
              <Icon name={isPaid ? 'check_circle' : 'pending'} size="text-4xl" />
            </div>
            <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-[0.2em] text-sm mb-2">
              {isPaid ? 'Total Amount Paid' : 'Amount Due'}
            </p>
            <h2 className="text-7xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">
              {formatCurrency(isPaid ? totalPaid : assignment.balance_cents)}
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="md:col-span-2 space-y-8">
            {/* Payer and For Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-4">
                <SectionHeader>PAYER</SectionHeader>
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    <Icon name="person" className="text-slate-500" />
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
                <SectionHeader>FOR</SectionHeader>
                <div className="flex items-center gap-4">
                  <div className="size-12 rounded-full border-2 border-[var(--org-btn-primary-bg, #137fec)] overflow-hidden bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                    {assignment.athlete ? (
                      <span className="text-slate-500 text-xs font-bold">
                        {assignment.athlete.first_name[0]}{assignment.athlete.last_name[0]}
                      </span>
                    ) : (
                      <Icon name="person" className="text-slate-500" />
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
                <SectionHeader>ITEMIZATION</SectionHeader>
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
                  <div className="p-6 bg-slate-50 dark:bg-slate-800/30 flex justify-between items-center">
                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-widest text-sm">
                      Grand Total
                    </p>
                    <p className="text-2xl font-black text-[var(--org-btn-primary-bg, #137fec)]">
                      {formatCurrency(totalPaid)}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-8">
            {/* Destination */}
            <div className="space-y-4">
              <SectionHeader>DESTINATION</SectionHeader>
              <Card className="p-5 hover:border-[var(--org-btn-primary-bg, #137fec)] transition-all group cursor-pointer">
                <div className="flex items-center gap-4">
                  <div className="size-10 bg-[var(--org-btn-primary-bg, #137fec)]/10 text-[var(--org-btn-primary-bg, #137fec)] rounded-lg flex items-center justify-center group-hover:bg-[var(--org-btn-primary-bg, #137fec)] group-hover:text-white transition-colors">
                    <Icon name="sports_soccer" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900 dark:text-white leading-tight">
                      {assignment.fee?.title || 'Fee'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {context.organizationName || 'Organization'}
                    </p>
                  </div>
                  <Icon name="open_in_new" className="text-slate-300 group-hover:text-[var(--org-btn-primary-bg, #137fec)]" />
                </div>
              </Card>
            </div>

            {/* Payment Method */}
            {assignment.payments && assignment.payments.length > 0 && (
              <div className="space-y-4">
                <SectionHeader>PAYMENT METHOD</SectionHeader>
                <Card className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="size-10 flex items-center justify-center">
                      <Icon name="credit_card" className="text-slate-500" />
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

            {/* Contact Registrar */}
            <Card className="p-6 bg-slate-100 dark:bg-slate-800/30 border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 text-center mb-4">
                Questions about this payment?
              </p>
              <Button
                variant="secondary"
                onClick={handleContactRegistrar}
                className="w-full h-10 border-2 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold tracking-widest uppercase"
              >
                CONTACT REGISTRAR
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}
