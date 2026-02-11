import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useT } from '../../i18n/useI18n'
import { getFeeAssignmentsForUser, getOrgPaymentSummary, formatCurrency } from '../../data/services/paymentsService'
import { getStripeConnectStatus } from '../../data/services/paymentSettingsService'
import { supabase } from '../../lib/supabase'
import { getLink, RouteKeys } from '../../utils/routes'
import { 
  AdminPageHeader, 
  Badge, 
  Button,
  Card,
  OrgDataTable,
  type ColumnConfig
} from '../../components/admin'
import { FeatureGatedButton } from '../../components/FeatureGatedButton'
import { cn } from '../../utils/cn'
import '../../styles/orgAdmin.css'

interface PaymentDisplay {
  id: string
  child_name: string
  fee_title: string
  total_display: string
  paid_display: string
  remaining_display: string
  status: 'unpaid' | 'partial' | 'paid' | 'waived' | 'overdue'
  created_at: string
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <Card>
      <div className={cn('oa-flex', 'oa-items-center', 'oa-justify-between', 'oa-gap-3')}>
        <div>
          <div className="oa-caption oa-text-muted">{label}</div>
          <div className="oa-h2">{value}</div>
        </div>
        <span className="material-symbols-outlined oa-text-muted">{icon}</span>
      </div>
    </Card>
  )
}

export default function Payments() {
  const [payments, setPayments] = useState<PaymentDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'partial' | 'paid'>('all')
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState({
    outstanding: 0,
    collected: 0,
  })
  const [hasAthletes, setHasAthletes] = useState<boolean | null>(null)
  const [athleteCheckError, setAthleteCheckError] = useState<string | null>(null)
  const [paymentsError, setPaymentsError] = useState<string | null>(null)
  const [stripeConnected, setStripeConnected] = useState<boolean | null>(null)
  const [stripeCheckLoading, setStripeCheckLoading] = useState(true)

  const isMountedRef = useRef(true)

  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()
  const t = useT()
  
  // Extract primitive values to avoid infinite loops in useEffect dependencies
  const orgId = context.orgId

  const fetchPayments = useCallback(async () => {
    if (!isReady) return

    setLoading(true)
    setPaymentsError(null)

    try {
      // Fetch fee assignments
      const { data, error } = await getFeeAssignmentsForUser(context)

      if (error) {
        console.error('Error fetching payments:', error)
        const errorMessage = error instanceof Error ? error.message : 'Failed to load payments'
        setPaymentsError(errorMessage)
        setLoading(false)
        return
      }

      // Transform to display format
      const displayPayments: PaymentDisplay[] = data.map(assignment => {
        // Get athlete name from the joined athlete data
        const athlete = (assignment as any).athlete
        const athleteName = athlete 
          ? `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim() || 'Unknown'
          : 'Unknown'
        
        // Handle both fake data (amount_due_cents) and real data (amount_cents) field names
        const raw = assignment as any
        const totalCents = raw.amount_due_cents ?? raw.amount_cents ?? 0
        const paidCents = raw.amount_paid_cents ?? raw.paid_cents_total ?? 0
        const balanceCents = raw.balance_cents ?? Math.max(0, totalCents - paidCents)
        
        return {
          id: assignment.id,
          child_name: athleteName,
          fee_title: assignment.fee?.title ?? 'Fee',
          total_display: formatCurrency(totalCents),
          paid_display: formatCurrency(paidCents),
          remaining_display: formatCurrency(balanceCents),
          status: assignment.status as PaymentDisplay['status'],
          created_at: assignment.created_at,
        }
      })

      // Apply filter
      let filtered = displayPayments
      if (filter === 'unpaid') {
        filtered = displayPayments.filter(p => p.status === 'unpaid' || p.status === 'overdue')
      } else if (filter === 'partial') {
        filtered = displayPayments.filter(p => p.status === 'partial')
      } else if (filter === 'paid') {
        filtered = displayPayments.filter(p => p.status === 'paid')
      }

      setTotalCount(filtered.length)
      
      // Client-side pagination
      const from = page * rowsPerPage
      const to = from + rowsPerPage
      setPayments(filtered.slice(from, to))

      // Fetch stats
      const { data: summaryData } = await getOrgPaymentSummary(context)
      if (summaryData) {
        setStats({
          outstanding: summaryData.totalOutstandingCents / 100,
          collected: summaryData.totalPaidCents / 100,
        })
      }
    } catch (err) {
      console.error('Error:', err)
    } finally {
      setLoading(false)
    }
  }, [context, isReady, filter, page, rowsPerPage])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  // Check Stripe Connect status
  useEffect(() => {
    async function checkStripeStatus() {
      if (!currentOrganization?.id) {
        setStripeCheckLoading(false)
        return
      }
      
      try {
        const { data: status, error } = await getStripeConnectStatus(currentOrganization.id)
        if (error) {
          console.error('Error checking Stripe status:', error)
        }
        if (isMountedRef.current) {
          setStripeConnected(status?.connected ?? false)
        }
      } catch (err) {
        console.error('Error checking Stripe status:', err)
        if (isMountedRef.current) {
          setStripeConnected(false)
        }
      } finally {
        if (isMountedRef.current) {
          setStripeCheckLoading(false)
        }
      }
    }
    
    checkStripeStatus()
  }, [currentOrganization?.id])

  // Cleanup effect to prevent state updates after unmount
  useEffect(() => {
    // Reset to true on mount (handles StrictMode remounts)
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Check if organization has athletes with guardians (who can receive fees)
  // This matches the logic in admin-create-fee function
  const checkAthletesExists = useCallback(async () => {
    if (!isReady || !orgId) {
      if (isMountedRef.current) {
        setHasAthletes(null)
      }
      return
    }

    try {
      if (isMountedRef.current) {
        setAthleteCheckError(null)
      }
      
      // Check athlete_guardians table - fees can only be assigned to athletes with guardians
      const { count, error } = await supabase
        .from('athlete_guardians')
        .select('athlete_id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'active')
        .limit(1)

      if (error) {
        throw error
      }

      // Count queries return { count: number | null }
      const hasAny = (count ?? 0) > 0

      // Check mounted before state update
      if (isMountedRef.current) {
        setHasAthletes(hasAny)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('Error checking athletes:', errorMsg)

      // Fail closed - disable button on error
      if (isMountedRef.current) {
        setAthleteCheckError('Unable to verify athletes. Please refresh or contact support.')
        setHasAthletes(false)
      }
    }
  }, [isReady, orgId])

  // Effect to check athletes when dependencies change
  useEffect(() => {
    checkAthletesExists()
  }, [checkAthletesExists])

  // Re-check athletes when page becomes visible (user returns from adding athlete)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isReady && orgId) {
        checkAthletesExists()
      }
    }

    const handleFocus = () => {
      if (isReady && orgId) {
        checkAthletesExists()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [isReady, orgId, checkAthletesExists])


  const columns: ColumnConfig<PaymentDisplay>[] = [
    { 
        id: 'child_name', 
        label: 'Athlete',
        render: (row) => <span className="oa-font-bold oa-text-slate-900">{row.child_name}</span>
    },
    { id: 'fee_title', label: 'Fee' },
    { 
        id: 'total_display', 
        label: 'Total', 
        align: 'right',
        render: (row) => <span className="oa-font-semibold">{row.total_display}</span>
    },
    { id: 'paid_display', label: 'Paid', align: 'right' },
    { 
      id: 'remaining_display', 
      label: 'Remaining', 
      align: 'right',
      render: (row) => <span className="oa-font-semibold">{row.remaining_display}</span>
    },
    { 
      id: 'status', 
      label: 'Status',
      render: (row) => {
        const variant = 
          row.status === 'paid' ? 'success' : 
          row.status === 'partial' ? 'warning' : 'danger'
        const statusLabel = 
          row.status === 'paid' ? 'Paid in Full' :
          row.status === 'partial' ? 'Partially Paid' :
          row.status === 'waived' ? 'Waived' :
          row.status === 'overdue' ? 'Overdue' :
          'Unpaid'
        return <Badge variant={variant}>{statusLabel}</Badge>
      }
    },
    { 
      id: 'created_at', 
      label: 'Assigned',
      render: (row) => <span className="oa-text-sm oa-text-slate-500">{new Date(row.created_at).toLocaleDateString()}</span>
    },
  ]

  const isButtonDisabled = hasAthletes === false || hasAthletes === null
  const buttonTooltip = hasAthletes === false 
    ? "No athletes with guardians found. Athletes must have a guardian linked before fees can be assigned."
    : hasAthletes === null 
    ? "Checking athletes..."
    : ""

  // Show loading state while checking Stripe
  if (stripeCheckLoading) {
    return (
      <div className="oa-root">
        <AdminPageHeader 
          title={t('admin.payments.title')}
          subtitle={t('admin.payments.subtitle')} 
        />
        <Card>
          <div style={{ padding: '48px', textAlign: 'center' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '48px', color: 'var(--oa-n400)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
            <p style={{ marginTop: '16px', color: 'var(--oa-n500)' }}>{t('common.loading')}</p>
          </div>
        </Card>
      </div>
    )
  }

  // Show onboarding wall if Stripe Connect is not set up
  if (!stripeConnected) {
    return (
      <div className="oa-root">
        <AdminPageHeader 
          title={t('admin.payments.title')}
          subtitle={t('admin.payments.subtitle')} 
        />

        {/* Introduction to Payments - Nike-style Hero with Onboarding */}
        <Card>
          {/* Hero Section with Background Image and Dark Overlay */}
          <div style={{
            position: 'relative',
            backgroundImage: 'url(/images/payments.png)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '12px',
            overflow: 'hidden',
          }}>
            {/* Dark overlay */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.8) 100%)',
            }} />
            
            {/* All Content on top of hero */}
            <div style={{
              position: 'relative',
              zIndex: 10,
              padding: '56px 48px',
            }}>
              {/* Hero Text */}
              <div style={{ maxWidth: '720px', marginBottom: '40px' }}>
                {/* Badge */}
                <div style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  background: 'rgba(255, 255, 255, 0.15)',
                  backdropFilter: 'blur(8px)',
                  marginBottom: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                }}>
                  <span style={{ 
                    position: 'relative',
                    display: 'inline-flex',
                    height: '8px',
                    width: '8px'
                  }}>
                    <span style={{
                      position: 'absolute',
                      display: 'inline-flex',
                      height: '100%',
                      width: '100%',
                      borderRadius: '50%',
                      background: '#fff',
                      opacity: 0.75,
                      animation: 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite'
                    }}></span>
                    <span style={{
                      position: 'relative',
                      display: 'inline-flex',
                      borderRadius: '50%',
                      height: '8px',
                      width: '8px',
                      background: '#fff'
                    }}></span>
                  </span>
                  <span style={{ 
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em'
                  }}>{t('admin.payments.onboarding.badge')}</span>
                </div>

                {/* Title */}
                <h1 style={{ 
                  fontSize: '64px', 
                  fontWeight: 900, 
                  color: '#fff',
                  marginBottom: '16px',
                  fontFamily: 'var(--oa-font-display, Oswald, sans-serif)',
                  letterSpacing: '-0.03em',
                  lineHeight: 1.1,
                  textTransform: 'uppercase',
                  textShadow: '0 2px 12px rgba(0,0,0,0.3)',
                }}>
                  {t('admin.payments.onboarding.title')}
                </h1>
                
                {/* Description */}
                <p style={{ 
                  fontSize: '20px', 
                  color: 'rgba(255,255,255,0.9)',
                  lineHeight: 1.6,
                  fontWeight: 500,
                  maxWidth: '560px',
                }}>
                  {t('admin.payments.onboarding.description')}
                </p>
              </div>

              {/* Cards Grid - Translucent on hero */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
                marginBottom: '28px',
              }}>
                {/* Payment Setup Card */}
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: 800, 
                    color: '#fff', 
                    fontFamily: 'var(--oa-font-display, Oswald, sans-serif)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    marginBottom: '12px',
                  }}>
                    {t('admin.payments.onboarding.setup.title')}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
                    {t('admin.payments.onboarding.setup.description')}
                  </p>
                </div>

                {/* Withdrawals Card */}
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: 800, 
                    color: '#fff', 
                    fontFamily: 'var(--oa-font-display, Oswald, sans-serif)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    marginBottom: '12px',
                  }}>
                    {t('admin.payments.onboarding.withdrawals.title')}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
                    {t('admin.payments.onboarding.withdrawals.description')}
                  </p>
                </div>

                {/* Assigning Fees Card */}
                <div style={{
                  background: 'rgba(255,255,255,0.15)',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}>
                  <h3 style={{ 
                    fontSize: '16px', 
                    fontWeight: 800, 
                    color: '#fff', 
                    fontFamily: 'var(--oa-font-display, Oswald, sans-serif)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.02em',
                    marginBottom: '12px',
                  }}>
                    {t('admin.payments.onboarding.fees.title')}
                  </h3>
                  <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.7 }}>
                    {t('admin.payments.onboarding.fees.description')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Example and CTA Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginTop: '24px' }}>
          {/* Real-world Example */}
          <div style={{
            background: 'rgba(251, 191, 36, 0.15)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            borderRadius: '12px',
            padding: '18px 22px',
            alignSelf: 'start',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: '#fbbf24', marginTop: '2px' }}>lightbulb</span>
              <div>
                <h4 style={{ 
                  fontSize: '12px', 
                  fontWeight: 700, 
                  color: '#fbbf24', 
                  marginBottom: '6px', 
                  fontFamily: 'var(--oa-font-display, Oswald, sans-serif)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {t('admin.payments.onboarding.example.title')}
                </h4>
                <p style={{ fontSize: '14px', color: '#374151', lineHeight: 1.6 }}>
                  {t('admin.payments.onboarding.example.description')}
                </p>
              </div>
            </div>
          </div>

          {/* Complete Payment Setup CTA */}
          <Card>
            <div style={{
              background: '#fff',
              borderRadius: '16px',
              padding: '36px',
              textAlign: 'center',
            }}>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: 900, 
                color: '#0B0F14', 
                marginBottom: '10px',
                fontFamily: 'var(--oa-font-display, Oswald, sans-serif)',
                textTransform: 'uppercase',
                letterSpacing: '-0.01em',
              }}>
                {t('admin.payments.onboarding.cta.title')}
              </h3>
              <p style={{ 
                fontSize: '15px', 
                color: '#4A5568', 
                lineHeight: 1.6,
                maxWidth: '440px',
                margin: '0 auto 24px'
              }}>
                {t('admin.payments.onboarding.cta.description')}
              </p>
              <Button 
                variant="primary"
                icon="arrow_forward"
                onClick={() => navigate('/admin/organization?tab=payments')}
                style={{
                  padding: '16px 36px',
                  fontSize: '14px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {t('admin.payments.onboarding.cta.button')}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  // Show full payments UI when Stripe is connected
  return (
    <div className="oa-root">
      <AdminPageHeader 
        title={t('admin.payments.title')}
        subtitle={t('admin.payments.subtitle')} 
        actions={
          <FeatureGatedButton
            actionKey="create_fee"
            onClick={() => navigate(getLink(RouteKeys.ADMIN_CREATE_FEE))}
            disabled={isButtonDisabled}
            title={buttonTooltip}
            themeNamespace="oa"
            variant="primary"
            className="w-full sm:w-auto"
          >
            Assign Fee
          </FeatureGatedButton>
        }
      />

      {/* Show error message if athlete check failed */}
      {athleteCheckError && (
        <Card className="oa-mb-4">
          <div className="oa-p-4" style={{ background: 'var(--oa-danger-bg, #fef2f2)', borderLeft: '4px solid var(--oa-danger, #ef4444)' }}>
            <div className="oa-text-sm oa-font-medium" style={{ color: 'var(--oa-danger-dark, #991b1b)' }}>{athleteCheckError}</div>
          </div>
        </Card>
      )}

      {/* Show error message if payments fetch failed */}
      {paymentsError && (
        <Card className="oa-mb-4">
          <div className="oa-p-4" style={{ background: 'var(--oa-danger-bg, #fef2f2)', borderLeft: '4px solid var(--oa-danger, #ef4444)' }}>
            <div className="oa-text-sm oa-font-medium" style={{ color: 'var(--oa-danger-dark, #991b1b)' }}>{paymentsError}</div>
          </div>
        </Card>
      )}

      {/* Show info message when no athletes with guardians found */}
      {hasAthletes === false && !athleteCheckError && (
        <Card className="oa-mb-4">
          <div className="oa-p-4" style={{ background: 'var(--oa-info-bg, #eff6ff)', borderLeft: '4px solid var(--oa-info, #3b82f6)' }}>
            <div className="oa-text-sm oa-font-medium" style={{ color: 'var(--oa-info-dark, #1e40af)' }}>
                No athletes with guardians found. To assign fees, athletes must have a guardian linked to them (the guardian is responsible for payment).
            </div>
          </div>
        </Card>
      )}

      <div className={cn('oa-grid', 'oa-grid-2', 'oa-gap-6', 'oa-mb-8')}>
        <StatCard 
          label="COLLECTED" 
          value={`$${stats.collected.toLocaleString()}`}
          icon="check_circle"
        />
        <StatCard 
          label="OUTSTANDING" 
          value={`$${stats.outstanding.toLocaleString()}`}
          icon="error"
        />
      </div>

      <div className={cn('oa-flex', 'oa-gap-2', 'oa-mb-6', 'oa-mt-2')}>
        {(['all', 'unpaid', 'partial', 'paid'] as const).map((f) => (
          <Button
            key={f}
            variant={filter === f ? 'primary' : 'secondary'}
            size="compact"
            onClick={() => {
              setFilter(f)
              setPage(0)
            }}
          >
            {f.toUpperCase()}
          </Button>
        ))}
      </div>

      <OrgDataTable
        columns={columns}
        rows={payments}
        loading={loading}
        totalCount={totalCount}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={setRowsPerPage}
        onRowClick={(row) => navigate(`/admin/payments/${row.id}`)}
      />
    </div>
  )
}

