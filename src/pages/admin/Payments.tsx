import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { useUserContext } from '../../hooks/useUserContext'
import { getFeeAssignmentsForUser, getOrgPaymentSummary, formatCurrency } from '../../data/services/paymentsService'
import { supabase } from '../../lib/supabase'
import { getLink, RouteKeys } from '../../utils/routes'
import { 
  AdminPageHeader, 
  Badge, 
  StatCard, 
  PlatformDataTable, 
  Button,
  Card,
  type ColumnConfig 
} from '../../components/platformAdmin'

interface PaymentDisplay {
  id: string
  child_name: string
  fee_title: string
  total_display: string
  paid_display: string
  status: 'unpaid' | 'partial' | 'paid' | 'waived' | 'overdue'
  created_at: string
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

  const isMountedRef = useRef(true)

  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  
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
      const displayPayments: PaymentDisplay[] = data.map(assignment => ({
        id: assignment.id,
        child_name: assignment.child_id ? getAthleteName(assignment.child_id) : 'Unknown',
        fee_title: assignment.fee?.title ?? 'Fee',
        total_display: formatCurrency(assignment.amount_due_cents),
        paid_display: formatCurrency(assignment.amount_paid_cents),
        status: assignment.status as PaymentDisplay['status'],
        created_at: assignment.created_at,
      }))

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

  // Cleanup effect to prevent state updates after unmount
  useEffect(() => {
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
      // This matches the check in admin-create-fee edge function
      // Note: Database column is org_id (migration renamed organization_id to org_id)
      const { count, error } = await supabase
        .from('athlete_guardians')
        .select('athlete_id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'active')
        .limit(1)

      console.log('[Payments] Athlete guardian check:', { orgId, count, error })

      // Debug: Check all athlete_guardians records (regardless of org)
      const { data: allGuardians, error: debugError } = await supabase
        .from('athlete_guardians')
        .select('athlete_id, org_id, status')
        .limit(10)
      console.log('[Payments] DEBUG all athlete_guardians:', { allGuardians, debugError })

      if (error) {
        throw error
      }

      // Count queries return { count: number | null }
      const hasAny = (count ?? 0) > 0
      console.log('[Payments] hasAthletes result:', hasAny)

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
    const check = async () => {
      await checkAthletesExists()
    }
    check()
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

  // Helper to get athlete name (in real implementation, comes from joined data)
  const getAthleteName = (childId: string): string => {
    const names: Record<string, string> = {
      'child-emma-001': 'Emma Johnson',
      'child-liam-002': 'Liam Williams',
      'child-sophia-003': 'Sophia Brown',
      'child-jackson-004': 'Jackson Davis',
    }
    return names[childId] ?? 'Athlete'
  }

  const columns: ColumnConfig<PaymentDisplay>[] = [
    { id: 'child_name', label: 'Athlete' },
    { id: 'fee_title', label: 'Fee' },
    { id: 'total_display', label: 'Total', align: 'right' },
    { id: 'paid_display', label: 'Paid', align: 'right' },
    { 
      id: 'status', 
      label: 'Status',
      render: (row) => {
        const variant = 
          row.status === 'paid' ? 'success' : 
          row.status === 'partial' ? 'warning' : 'danger'
        return <Badge variant={variant}>{row.status.toUpperCase()}</Badge>
      }
    },
    { 
      id: 'created_at', 
      label: 'Assigned',
      render: (row) => new Date(row.created_at).toLocaleDateString()
    },
  ]

  const isButtonDisabled = hasAthletes === false || hasAthletes === null
  const buttonTooltip = hasAthletes === false 
    ? "No athletes with guardians found. Athletes must have a guardian linked before fees can be assigned."
    : hasAthletes === null 
    ? "Checking athletes..."
    : ""

  return (
    <div className="pa-root">
      <AdminPageHeader 
        title="Payments" 
        actions={
          <Button 
            icon="add" 
            onClick={() => navigate(getLink(RouteKeys.ADMIN_CREATE_FEE))}
            disabled={isButtonDisabled}
            title={buttonTooltip}
          >
            Assign Fee
          </Button>
        }
      />

      {/* Show error message if athlete check failed */}
      {athleteCheckError && (
        <Card className="pa-mb-4" style={{ background: 'var(--pa-danger-bg)', border: '1px solid var(--pa-danger-text)' }}>
          <div className="pa-text-danger">{athleteCheckError}</div>
        </Card>
      )}

      {/* Show error message if payments fetch failed */}
      {paymentsError && (
        <Card className="pa-mb-4" style={{ background: 'var(--pa-danger-bg)', border: '1px solid var(--pa-danger-text)' }}>
          <div className="pa-text-danger">{paymentsError}</div>
        </Card>
      )}

      {/* Show info message when no athletes with guardians found */}
      {hasAthletes === false && !athleteCheckError && (
        <Card className="pa-mb-4" style={{ background: 'var(--pa-info-bg)', border: '1px solid var(--pa-info)' }}>
          <div style={{ color: 'var(--pa-info)' }}>No athletes with guardians found. To assign fees, athletes must have a guardian linked to them (the guardian is responsible for payment).</div>
        </Card>
      )}

      <div className="pa-grid pa-grid-2 pa-mb-5">
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

      <div className="pa-flex pa-gap-2 pa-mb-4">
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

      <PlatformDataTable
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
