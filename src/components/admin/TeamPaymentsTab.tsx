/**
 * Team Payments Tab
 * 
 * Displays fee assignments and payments for a specific team within the Team Detail page.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getFeeAssignmentsForTeam } from '../../data/services/paymentsService'
import { formatCurrency } from '../../data/services/paymentsService'
import { Button, EmptyState } from '../platformAdmin'
import type { FakeFeeAssignment } from '../../data/fake/fakePayments'

interface TeamPaymentsTabProps {
  teamId: string
  seasonId: string | null
  teamName: string
}

interface PaymentDisplay {
  id: string
  athlete_name: string
  fee_title: string
  amount_due: string
  amount_paid: string
  balance: string
  status: 'unpaid' | 'partial' | 'paid' | 'overdue'
  due_date: string | null
}

export function TeamPaymentsTab({ teamId, seasonId, teamName }: TeamPaymentsTabProps) {
  // All hooks must be called unconditionally at the top
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const [payments, setPayments] = useState<PaymentDisplay[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const isMountedRef = useRef(true)

  const handleViewAllPayments = useCallback(() => {
    navigate(`/admin/payments?teamId=${teamId}`)
  }, [navigate, teamId])

  const fetchPayments = useCallback(async () => {
    if (!isReady || !teamId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch fee assignments for this team (team-scoped query)
      const { data, error: paymentsError } = await getFeeAssignmentsForTeam(context, teamId, seasonId)

      if (paymentsError) {
        if (isMountedRef.current) {
          setError(paymentsError.message)
          setPayments([])
        }
        return
      }

      if (isMountedRef.current) {
        // Transform to display format
        const displayPayments: PaymentDisplay[] = (data || []).map((assignment: FakeFeeAssignment & { fee?: any; athlete?: any }) => {
          const athlete = assignment.athlete || (assignment as any).athlete
          const athleteName = athlete 
            ? `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim() 
            : 'Unknown Athlete'
          
          const amountDue = assignment.amount_due_cents || 0
          const amountPaid = assignment.amount_paid_cents || 0
          const balance = amountDue - amountPaid
          
          let status: PaymentDisplay['status'] = 'unpaid'
          if (balance <= 0) {
            status = 'paid'
          } else if (amountPaid > 0) {
            status = 'partial'
          } else {
            const dueDate = assignment.due_date ? new Date(assignment.due_date) : null
            if (dueDate && dueDate < new Date()) {
              status = 'overdue'
            }
          }

          return {
            id: assignment.id,
            athlete_name: athleteName,
            fee_title: assignment.fee?.title || 'Fee',
            amount_due: formatCurrency(amountDue),
            amount_paid: formatCurrency(amountPaid),
            balance: formatCurrency(balance),
            status,
            due_date: assignment.due_date || null,
          }
        })

        setPayments(displayPayments)
        setError(null)
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load payments')
        setPayments([])
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [context, isReady, teamId, seasonId])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  const handleViewOrganizationPayments = useCallback(() => {
    navigate('/admin/payments')
  }, [navigate])

  // Early returns after all hooks are called
  // If no season, show message (payments can still work without season, but less useful)
  if (!seasonId) {
    return (
      <div className="pa-card">
        <EmptyState
          icon="payments"
          title="No active season"
          description="Please select an active season to view team payments, or view all organization payments."
          noCard
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--pa-space-4)' }}>
          <Button variant="secondary" onClick={() => navigate('/admin/payments')}>
            View All Organization Payments
          </Button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="pa-card">
        <div className="pa-skeleton" style={{ height: '200px' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="pa-card">
        <div style={{ padding: 'var(--pa-space-5)' }}>
          <p className="pa-body-m" style={{ color: 'var(--pa-danger)', marginBottom: 'var(--pa-space-4)' }}>
            {error}
          </p>
          <Button variant="secondary" onClick={fetchPayments}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  if (payments.length === 0) {
    return (
      <div className="pa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--pa-space-4)' }}>
          <EmptyState
            icon="payments"
            title="No payments"
            description={`No fee assignments or payments found for ${teamName}.`}
            noCard
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--pa-space-4)' }}>
          <Button variant="secondary" onClick={handleViewAllPayments}>
            View All Organization Payments
          </Button>
        </div>
      </div>
    )
  }

  const unpaidCount = payments.filter(p => p.status === 'unpaid' || p.status === 'overdue').length
  const totalOutstanding = payments.reduce((sum, p) => {
    const balance = parseInt(p.balance.replace(/[^0-9]/g, ''), 10) || 0
    return sum + balance
  }, 0)
  const paidCount = payments.filter(p => p.status === 'paid').length
  const partialCount = payments.filter(p => p.status === 'partial').length
  const overdueCount = payments.filter(p => p.status === 'overdue').length

  // Calculate total amounts
  const totalAmountDue = payments.reduce((sum, p) => {
    const amount = parseInt(p.amount_due.replace(/[^0-9]/g, ''), 10) || 0
    return sum + amount
  }, 0)
  const totalAmountPaid = payments.reduce((sum, p) => {
    const amount = parseInt(p.amount_paid.replace(/[^0-9]/g, ''), 10) || 0
    return sum + amount
  }, 0)

  // Determine overall status
  let overallStatus: 'active' | 'warning' | 'error' = 'active'
  if (overdueCount > 0) {
    overallStatus = 'error'
  } else if (unpaidCount > 0 || partialCount > 0) {
    overallStatus = 'warning'
  }

  return (
    <div>
      {/* Top row with title and org-level link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--pa-space-6)' }}>
        <div>
          <h3 className="pa-h3" style={{ margin: 0 }}>
            Payments
          </h3>
          <p className="pa-body-s dark:text-slate-400" style={{ color: 'var(--pa-n500)', margin: 'var(--pa-space-1) 0 0 0' }}>
            {teamName}
          </p>
        </div>
        <Button variant="secondary" size="small" onClick={handleViewOrganizationPayments}>
          View organization payments
        </Button>
      </div>

      {/* Summary card grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--pa-space-4)',
          marginBottom: 'var(--pa-space-6)',
        }}
      >
        {/* Overall Status Card */}
        <div 
          className="pa-card" 
          style={{ 
            padding: 'var(--pa-space-5)',
            background: overallStatus === 'error' 
              ? 'color-mix(in srgb, rgb(239, 68, 68) 8%, transparent)'
              : overallStatus === 'warning'
              ? 'color-mix(in srgb, rgb(251, 191, 36) 8%, transparent)'
              : 'color-mix(in srgb, rgb(16, 185, 129) 8%, transparent)',
            border: overallStatus === 'error'
              ? '1px solid color-mix(in srgb, rgb(239, 68, 68) 20%, transparent)'
              : overallStatus === 'warning'
              ? '1px solid color-mix(in srgb, rgb(251, 191, 36) 20%, transparent)'
              : '1px solid color-mix(in srgb, rgb(16, 185, 129) 20%, transparent)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-3)' }}>
            <span 
              className="oa-label dark:text-slate-400" 
              style={{ 
                color: overallStatus === 'error'
                  ? 'rgb(239, 68, 68)'
                  : overallStatus === 'warning'
                  ? 'rgb(251, 191, 36)'
                  : 'rgb(16, 185, 129)',
                margin: 0,
                fontWeight: 700,
                textTransform: 'uppercase',
              }}
            >
              Status
            </span>
          </div>
          <div 
            style={{ 
              fontSize: '20px', 
              fontWeight: 900,
              color: overallStatus === 'error'
                ? 'rgb(239, 68, 68)'
                : overallStatus === 'warning'
                ? 'rgb(251, 191, 36)'
                : 'rgb(16, 185, 129)'
            }}
          >
            {overallStatus === 'error' ? 'Overdue' : overallStatus === 'warning' ? 'Pending' : 'All Paid'}
          </div>
        </div>

        {/* Total Due Card */}
        <div className="pa-card" style={{ padding: 'var(--pa-space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-3)' }}>
            <span className="oa-label dark:text-slate-400" style={{ color: 'var(--pa-n500)', margin: 0 }}>
              Total Due
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--pa-n900)' }} className="dark:text-white">
            {formatCurrency(totalAmountDue)}
          </div>
        </div>

        {/* Total Paid Card */}
        <div className="pa-card" style={{ padding: 'var(--pa-space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-3)' }}>
            <span className="oa-label dark:text-slate-400" style={{ color: 'var(--pa-n500)', margin: 0 }}>
              Total Paid
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'rgb(16, 185, 129)' }}>
            {formatCurrency(totalAmountPaid)}
          </div>
        </div>

        {/* Outstanding Balance Card */}
        <div className="pa-card" style={{ padding: 'var(--pa-space-5)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-3)' }}>
            <span className="oa-label dark:text-slate-400" style={{ color: 'var(--pa-n500)', margin: 0 }}>
              Outstanding
            </span>
          </div>
          <div 
            style={{ 
              fontSize: '20px', 
              fontWeight: 900,
              color: totalOutstanding > 0 ? 'rgb(239, 68, 68)' : 'var(--pa-n900)'
            }}
            className={totalOutstanding === 0 ? 'dark:text-white' : ''}
          >
            {formatCurrency(totalOutstanding)}
          </div>
        </div>

        {/* Paid Count Card */}
        <div 
          className="pa-card" 
          style={{ 
            padding: 'var(--pa-space-5)',
            background: 'color-mix(in srgb, rgb(16, 185, 129) 8%, transparent)',
            border: '1px solid color-mix(in srgb, rgb(16, 185, 129) 20%, transparent)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-3)' }}>
            <span className="oa-label dark:text-slate-400" style={{ color: 'rgb(16, 185, 129)', margin: 0, fontWeight: 700 }}>
              Paid
            </span>
          </div>
          <div style={{ fontSize: '20px', fontWeight: 900, color: 'rgb(16, 185, 129)' }}>
            {paidCount}
          </div>
        </div>

        {/* Partial Count Card */}
        {partialCount > 0 && (
          <div 
            className="pa-card" 
            style={{ 
              padding: 'var(--pa-space-5)',
              background: 'color-mix(in srgb, rgb(251, 191, 36) 8%, transparent)',
              border: '1px solid color-mix(in srgb, rgb(251, 191, 36) 20%, transparent)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-3)' }}>
              <span className="oa-label dark:text-slate-400" style={{ color: 'rgb(251, 191, 36)', margin: 0, fontWeight: 700 }}>
                Partial
              </span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'rgb(251, 191, 36)' }}>
              {partialCount}
            </div>
          </div>
        )}

        {/* Overdue Count Card */}
        {overdueCount > 0 && (
          <div 
            className="pa-card" 
            style={{ 
              padding: 'var(--pa-space-5)',
              background: 'color-mix(in srgb, rgb(239, 68, 68) 8%, transparent)',
              border: '1px solid color-mix(in srgb, rgb(239, 68, 68) 20%, transparent)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-3)', marginBottom: 'var(--pa-space-3)' }}>
              <span className="oa-label dark:text-slate-400" style={{ color: 'rgb(239, 68, 68)', margin: 0, fontWeight: 700 }}>
                Overdue
              </span>
            </div>
            <div style={{ fontSize: '20px', fontWeight: 900, color: 'rgb(239, 68, 68)' }}>
              {overdueCount}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          border: '1px solid var(--pa-n200)',
          borderRadius: 'var(--pa-radius-m)',
          overflow: 'hidden',
        }}
        className="dark:border-slate-700"
      >
        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--pa-n50)' }} className="dark:bg-slate-800/50">
              <th
                style={{
                  padding: 'var(--pa-space-4) var(--pa-space-6)',
                  color: 'var(--pa-n500)',
                  fontSize: '12px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderBottom: '1px solid var(--pa-n200)',
                }}
                className="dark:text-slate-400 dark:border-slate-700"
              >
                Athlete
              </th>
              <th
                style={{
                  padding: 'var(--pa-space-4) var(--pa-space-6)',
                  color: 'var(--pa-n500)',
                  fontSize: '12px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderBottom: '1px solid var(--pa-n200)',
                }}
                className="dark:text-slate-400 dark:border-slate-700"
              >
                Fee
              </th>
              <th
                style={{
                  padding: 'var(--pa-space-4) var(--pa-space-6)',
                  color: 'var(--pa-n500)',
                  fontSize: '12px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderBottom: '1px solid var(--pa-n200)',
                  textAlign: 'right',
                }}
                className="dark:text-slate-400 dark:border-slate-700"
              >
                Amount Due
              </th>
              <th
                style={{
                  padding: 'var(--pa-space-4) var(--pa-space-6)',
                  color: 'var(--pa-n500)',
                  fontSize: '12px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderBottom: '1px solid var(--pa-n200)',
                  textAlign: 'right',
                }}
                className="dark:text-slate-400 dark:border-slate-700"
              >
                Paid
              </th>
              <th
                style={{
                  padding: 'var(--pa-space-4) var(--pa-space-6)',
                  color: 'var(--pa-n500)',
                  fontSize: '12px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderBottom: '1px solid var(--pa-n200)',
                  textAlign: 'right',
                }}
                className="dark:text-slate-400 dark:border-slate-700"
              >
                Balance
              </th>
              <th
                style={{
                  padding: 'var(--pa-space-4) var(--pa-space-6)',
                  color: 'var(--pa-n500)',
                  fontSize: '12px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  borderBottom: '1px solid var(--pa-n200)',
                }}
                className="dark:text-slate-400 dark:border-slate-700"
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => {
              const statusColors = {
                paid: { bg: 'rgba(16, 185, 129, 0.1)', text: 'rgb(16, 185, 129)' },
                partial: { bg: 'rgba(251, 191, 36, 0.1)', text: 'rgb(251, 191, 36)' },
                unpaid: { bg: 'var(--pa-n100)', text: 'var(--pa-n500)' },
                overdue: { bg: 'rgba(239, 68, 68, 0.1)', text: 'rgb(239, 68, 68)' },
              }
              const statusColor = statusColors[payment.status]

              return (
                <tr
                  key={payment.id}
                  style={{
                    borderBottom: '1px solid var(--pa-n100)',
                  }}
                  className="dark:border-slate-700"
                >
                  <td style={{ padding: 'var(--pa-space-4) var(--pa-space-6)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--pa-n900)' }} className="dark:text-white">
                      {payment.athlete_name}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--pa-space-4) var(--pa-space-6)', color: 'var(--pa-n600)' }} className="dark:text-slate-400">
                    {payment.fee_title}
                  </td>
                  <td style={{ padding: 'var(--pa-space-4) var(--pa-space-6)', textAlign: 'right', fontWeight: 700 }}>
                    {payment.amount_due}
                  </td>
                  <td style={{ padding: 'var(--pa-space-4) var(--pa-space-6)', textAlign: 'right', color: 'var(--pa-n600)' }} className="dark:text-slate-400">
                    {payment.amount_paid}
                  </td>
                  <td style={{ padding: 'var(--pa-space-4) var(--pa-space-6)', textAlign: 'right', fontWeight: 700, color: payment.status === 'paid' ? 'rgb(16, 185, 129)' : 'var(--pa-n900)' }}>
                    {payment.balance}
                  </td>
                  <td style={{ padding: 'var(--pa-space-4) var(--pa-space-6)' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 12px',
                        borderRadius: '9999px',
                        background: statusColor.bg,
                        color: statusColor.text,
                        fontSize: '10px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                      }}
                    >
                      {payment.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

