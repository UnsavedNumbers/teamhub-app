import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useUserContext } from '../hooks/useUserContext'
import { getFeeAssignmentsForUser, validateDiscountCode } from '../data/services/paymentsService'
import { createParentCheckoutSession, createParentPartialCheckoutSession } from '../api/payments'
import { supabase } from '../lib/supabase'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, SectionHeader } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'

type FeeAssignmentStatus = 'unpaid' | 'partial' | 'paid' | 'waived' | 'overdue'

interface FeeAssignment {
  id: string
  amount_cents: number
  balance_cents: number
  paid_cents_total: number
  due_date: string | null
  status: FeeAssignmentStatus
  fee?: {
    id: string
    title: string
    description: string | null
    due_date: string | null
    fee_type: string
    allow_partial_payment?: boolean
    min_partial_cents?: number | null
    season?: { id?: string; name?: string; team?: { id: string; name: string } | null } | null
  } | null
  child?: { id: string; first_name: string; last_name: string } | null
}

const statusLabels: Record<FeeAssignmentStatus, string> = {
  unpaid: 'Unpaid',
  partial: 'Partial',
  paid: 'Paid',
  waived: 'Waived',
  overdue: 'Overdue',
}

export default function MyPayments() {
  const [assignments, setAssignments] = useState<FeeAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [statusFilter, setStatusFilter] = useState<FeeAssignmentStatus | 'all'>('all')
  const [childFilter, setChildFilter] = useState<string>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<string | null>(null)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [creatingCheckout, setCreatingCheckout] = useState(false)
  const [validatingDiscount, setValidatingDiscount] = useState(false)
  const [discountError, setDiscountError] = useState<string | null>(null)
  const [orgAllowsPartialPayments, setOrgAllowsPartialPayments] = useState<boolean>(false)
  const [partialPaymentModalOpen, setPartialPaymentModalOpen] = useState<string | null>(null)
  const [partialAmountCents, setPartialAmountCents] = useState<string>('')
  const [partialPaymentError, setPartialPaymentError] = useState<string | null>(null)
  const [creatingPartialCheckout, setCreatingPartialCheckout] = useState(false)


  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isReady) return
    fetchAssignments()
    fetchOrgPaymentPolicy()
  }, [context, isReady])

  async function fetchOrgPaymentPolicy() {
    try {
      const { data, error } = await supabase
        .from('org_payment_policies')
        .select('allow_partial_payments')
        .eq('org_id', context.orgId)
        .maybeSingle()

      if (!error && data) {
        setOrgAllowsPartialPayments(data.allow_partial_payments ?? false)
      } else {
        // No row = table empty or org has no policy; default to true so fee-level allow_partial_payment controls visibility
        setOrgAllowsPartialPayments(true)
      }
    } catch (err) {
      console.error('Failed to fetch org payment policy:', err)
      setOrgAllowsPartialPayments(true)
    }
  }

  async function fetchAssignments() {
    setLoading(true)
    setError(null)
    
    const { data, error: queryError } = await getFeeAssignmentsForUser(context)

    if (queryError) {
      setError(queryError.message)
      setLoading(false)
      return
    }

    // Transform service data to component format
    const transformed: FeeAssignment[] = data.map(fa => {
      // Handle both database field names (amount_cents, balance_cents, paid_cents_total)
      // and fake data field names (amount_due_cents, amount_paid_cents)
      const rawAmount = (fa as any).amount_cents ?? (fa as any).amount_due_cents ?? 0
      const rawBalance = (fa as any).balance_cents
      const rawPaid = (fa as any).paid_cents_total ?? (fa as any).amount_paid_cents ?? 0
      
      // Ensure all values are numbers
      const amountCents = Number(rawAmount) || 0
      const paidCentsTotal = Number(rawPaid) || 0
      // Balance should be provided by DB, but calculate if missing
      const balanceCents = rawBalance !== undefined && rawBalance !== null 
        ? Number(rawBalance) 
        : Math.max(0, amountCents - paidCentsTotal)
      
      return {
        id: fa.id,
        amount_cents: amountCents,
        balance_cents: balanceCents,
        paid_cents_total: paidCentsTotal,
        due_date: fa.due_date ?? null,
        status: fa.status as FeeAssignmentStatus,
      fee: fa.fee ? {
        id: fa.fee.id,
        title: fa.fee.title,
        description: fa.fee.description ?? null,
        due_date: fa.fee.due_date,
        fee_type: fa.fee.fee_type ?? '',
        allow_partial_payment: (fa.fee as any).allow_partial_payment ?? false,
        min_partial_cents: (fa.fee as any).min_partial_cents ?? null,
        season: (fa.fee as any).season ? {
          id: (fa.fee as any).season.id,
          name: (fa.fee as any).season.name,
          team: null, // Will be fetched separately
        } : null,
      } : null,
      child: (fa as any).athlete ? {
        id: (fa as any).athlete.id,
        first_name: (fa as any).athlete.first_name,
        last_name: (fa as any).athlete.last_name,
      } : null,
      }
    })

    // Fetch teams for seasons that have them
    const seasonIds = transformed
      .map(a => a.fee?.season?.id)
      .filter((id): id is string => !!id)
    
    if (seasonIds.length > 0) {
      try {
        // Get teams for these seasons via team_seasons junction table
        const { data: teamSeasonsData, error: teamSeasonsError } = await supabase
          .from('team_seasons')
          .select('season_id, team:teams(id, name)')
          .in('season_id', seasonIds)

        if (!teamSeasonsError && teamSeasonsData) {
          // Create a map of season_id -> team
          const seasonTeamMap = new Map<string, { id: string; name: string }>()
          teamSeasonsData.forEach((ts: any) => {
            if (ts.team && ts.season_id) {
              seasonTeamMap.set(ts.season_id, {
                id: ts.team.id,
                name: ts.team.name,
              })
            }
          })

          // Update transformed assignments with team info
          transformed.forEach(assignment => {
            if (assignment.fee?.season?.id) {
              const team = seasonTeamMap.get(assignment.fee.season.id)
              if (team && assignment.fee.season) {
                assignment.fee.season.team = team
              }
            }
          })
        }
      } catch (err) {
        console.error('Error fetching teams for seasons:', err)
        // Continue without team info - it's optional
      }
    }

    setAssignments(transformed)
    setLoading(false)
  }


  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (statusFilter === 'unpaid') {
        // Treat partial as unpaid for filtering so guardians can see anything still owed
        if (!['unpaid', 'partial'].includes(a.status)) return false
      } else if (statusFilter !== 'all' && a.status !== statusFilter) {
        return false
      }
      if (childFilter !== 'all' && a.child?.id !== childFilter) return false
      const teamName = a.fee?.season?.team?.name
      if (teamFilter !== 'all' && teamName !== teamFilter) return false
      return true
    })
  }, [assignments, statusFilter, childFilter, teamFilter])

  const selectedAssignments = filteredAssignments.filter((a) => selectedIds.includes(a.id))
  const unpaidAssignments = filteredAssignments.filter((a) => ['unpaid', 'partial', 'overdue'].includes(a.status))

  const totalDue = unpaidAssignments.reduce((sum, a) => sum + (a.balance_cents ?? 0), 0)
  const selectedTotal = selectedAssignments.reduce(
    (sum, a) => sum + (a.balance_cents ?? 0),
    0,
  )

  const childOptions = useMemo(() => {
    const unique = new Map<string, string>()
    assignments.forEach((a) => {
      if (a.child?.id) unique.set(a.child.id, `${a.child.first_name} ${a.child.last_name}`)
    })
    return Array.from(unique.entries())
  }, [assignments])

  const teamOptions = useMemo(() => {
    const names = new Set<string>()
    assignments.forEach((a) => {
      const name = a.fee?.season?.team?.name
      if (name) names.add(name)
    })
    return Array.from(names)
  }, [assignments])

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const toggleSelectAll = () => {
    if (selectedIds.length === unpaidAssignments.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(unpaidAssignments.map((a) => a.id))
    }
  }

  const handleApplyDiscount = async () => {
    const code = discountCode.trim()
    if (!code) {
      setDiscountError('Please enter a discount code')
      return
    }

    setValidatingDiscount(true)
    setDiscountError(null)
    setCheckoutError(null)

    try {
      if (selectedAssignments.length === 0) {
        setDiscountError('Please select fees to apply discount')
        setValidatingDiscount(false)
        return
      }
      
      const selectedIdsForValidation = selectedAssignments.map(a => a.id)

      const { data, error } = await validateDiscountCode(context, code, selectedIdsForValidation)

      if (error) {
        setDiscountError(error.message || 'Failed to validate discount code')
        setValidatingDiscount(false)
        return
      }

      if (!data || !data.valid) {
        setDiscountError(data?.errorMessage || 'Invalid discount code')
        setValidatingDiscount(false)
        return
      }

      setAppliedDiscount(code.toUpperCase())
      setDiscountError(null)
    } catch (err: any) {
      setDiscountError(err?.message || 'Failed to validate discount code')
    } finally {
      setValidatingDiscount(false)
    }
  }

  const handlePayNow = async () => {
    if (selectedAssignments.length === 0) {
      setCheckoutError('Select at least one fee to pay')
      return
    }
    
    const target = selectedAssignments

    // Validate discount code again if one is applied
    if (appliedDiscount) {
      setValidatingDiscount(true)
      try {
        const { data, error } = await validateDiscountCode(context, appliedDiscount, target.map(t => t.id))
        if (error || !data || !data.valid) {
          setCheckoutError(data?.errorMessage || 'Discount code is no longer valid')
          setValidatingDiscount(false)
          return
        }
      } catch (err: any) {
        setCheckoutError(err?.message || 'Failed to validate discount code')
        setValidatingDiscount(false)
        return
      } finally {
        setValidatingDiscount(false)
      }
    }

    setCheckoutError(null)
    setCreatingCheckout(true)
    try {
      const { checkout_session_url } = await createParentCheckoutSession({
        feeAssignmentIds: target.map((t) => t.id),
        discountCode: appliedDiscount ?? undefined,
        successUrl: `${window.location.origin}/portal/payments/success`,
        cancelUrl: `${window.location.origin}/portal/payments/cancel`,
      })

      if (checkout_session_url) {
        window.location.href = checkout_session_url
      } else {
        setCheckoutError('Failed to create checkout session')
      }
    } catch (err: any) {
      setCheckoutError(err?.message || 'Unable to start checkout')
    } finally {
      setCreatingCheckout(false)
    }
  }

  const handlePartialPayment = async (assignment: FeeAssignment) => {
    const amount = Number.parseFloat(partialAmountCents)
    if (!Number.isFinite(amount) || amount <= 0) {
      setPartialPaymentError('Enter a valid amount')
      return
    }

    const amountCents = Math.round(amount * 100)

    setPartialPaymentError(null)
    setCreatingPartialCheckout(true)
    try {
      const { checkout_session_url } = await createParentPartialCheckoutSession({
        feeAssignmentId: assignment.id,
        amountCents,
        successUrl: `${window.location.origin}/portal/payments/success`,
        cancelUrl: `${window.location.origin}/portal/payments/cancel`,
      })

      if (checkout_session_url) {
        window.location.href = checkout_session_url
      } else {
        setPartialPaymentError('Failed to create checkout session')
      }
    } catch (err: any) {
      setPartialPaymentError(err?.message || 'Unable to start checkout')
    } finally {
      setCreatingPartialCheckout(false)
    }
  }

  const renderStatus = (status: FeeAssignmentStatus) => {
    const base = 'px-2 py-1 rounded text-xs font-bold uppercase tracking-widest'
    switch (status) {
      case 'paid':
        return <span className={`${base} bg-emerald-500/10 text-emerald-500 dark:text-emerald-400`}>{statusLabels[status]}</span>
      case 'partial':
        return <span className={`${base} bg-amber-500/10 text-amber-500 dark:text-amber-400`}>{statusLabels[status]}</span>
      case 'unpaid':
      case 'overdue':
        return <span className={`${base} bg-red-500/10 text-red-500 dark:text-red-400`}>{statusLabels[status]}</span>
      default:
        return <span className={`${base} bg-slate-500/10 text-slate-500 dark:text-slate-400`}>{statusLabels[status] ?? status}</span>
    }
  }

  return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Payments' },
        ]}
      >
        <div className="mb-8 sm:mb-12">
          <PageTitle>Payments</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-light tracking-wide">
            Select fees to pay or filter to find a specific fee.
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4">
            <p className="text-red-600 dark:text-red-400 text-sm font-bold">{error}</p>
          </Card>
        )}

        <div className="mb-6 sm:mb-8">
          <SectionHeader className="mb-3 sm:mb-4">Filters</SectionHeader>
          <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-center">
              <select
                className="w-full sm:w-auto bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2.5 text-sm text-slate-900 dark:text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FeeAssignmentStatus | 'all')}
                disabled={loading}
              >
                <option value="all">All statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="waived">Waived</option>
                <option value="overdue">Overdue</option>
              </select>
              <select
                className="w-full sm:w-auto bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2.5 text-sm text-slate-900 dark:text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                value={childFilter}
                onChange={(e) => setChildFilter(e.target.value)}
                disabled={loading}
              >
                <option value="all">All children</option>
                {childOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <select
                className="w-full sm:w-auto bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2.5 text-sm text-slate-900 dark:text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                disabled={loading}
              >
                <option value="all">All teams</option>
                {teamOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <Button 
                variant="secondary" 
                onClick={toggleSelectAll} 
                disabled={loading || unpaidAssignments.length === 0}
                className="w-full sm:w-auto text-sm px-6 py-2.5"
              >
                {selectedIds.length === unpaidAssignments.length && unpaidAssignments.length > 0 ? 'Clear Selection' : 'Select All Due'}
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-6 sm:mb-8">
          <SectionHeader className="mb-3 sm:mb-4">Checkout</SectionHeader>
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <input
                className="flex-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                placeholder="Discount code"
                value={discountCode}
                onChange={(e) => {
                  setDiscountCode(e.target.value)
                  setDiscountError(null)
                  setAppliedDiscount(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !validatingDiscount && discountCode.trim()) {
                    e.preventDefault()
                    handleApplyDiscount()
                  }
                }}
                disabled={validatingDiscount || creatingCheckout || loading}
              />
              <Button 
                variant="secondary" 
                onClick={handleApplyDiscount} 
                disabled={validatingDiscount || creatingCheckout || loading || !discountCode.trim()}
                className="w-full sm:w-auto text-sm px-6 py-2.5"
              >
                {validatingDiscount ? 'Validating...' : 'Apply'}
              </Button>
            </div>
            {appliedDiscount && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="text-emerald-500 dark:text-emerald-400 text-sm font-bold">Applied: {appliedDiscount}</span>
                <button
                  onClick={() => {
                    setAppliedDiscount(null)
                    setDiscountCode('')
                    setDiscountError(null)
                  }}
                  className="text-red-500 dark:text-red-400 text-sm font-bold hover:underline"
                  type="button"
                >
                  Remove
                </button>
              </div>
            )}
            {discountError && (
              <span className="text-red-500 dark:text-red-400 text-sm font-bold">{discountError}</span>
            )}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
              <div className="text-left sm:text-right">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Selected total</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">${(selectedTotal / 100).toFixed(2)}</p>
              </div>
              <Button
                variant="primary"
                disabled={creatingCheckout || validatingDiscount || loading || selectedAssignments.length === 0}
                onClick={handlePayNow}
                className="w-full sm:w-auto"
              >
                {creatingCheckout ? 'Starting checkout...' : validatingDiscount ? 'Validating...' : 'Pay'}
              </Button>
            </div>
          </div>
        </div>

        {(checkoutError || discountError) && (
          <Card className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4">
            <p className="text-red-600 dark:text-red-400 text-sm font-bold">{checkoutError || discountError}</p>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400">No fees found.</p>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {filteredAssignments.map((a) => {
                const isSelected = selectedIds.includes(a.id)
                const dueDate = a.due_date || a.fee?.due_date
                const isOverdue = dueDate ? new Date(dueDate) < new Date() && ['unpaid', 'partial'].includes(a.status) : false

                return (
                  <Card
                    key={a.id}
                    onClick={(e) => {
                      // Don't navigate if clicking checkbox or its label
                      if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
                        return
                      }
                      navigate(`/portal/payments/${a.id}`)
                    }}
                    className={`p-4 sm:p-6 hover:shadow-2xl hover:shadow-[var(--org-btn-primary-bg, #137fec)]/5 transition-all duration-300 cursor-pointer ${
                      isSelected ? 'ring-2 ring-[var(--org-btn-primary-bg, #137fec)]' : ''
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4">
                      <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation()
                              toggleSelected(a.id)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            disabled={loading || creatingCheckout}
                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[var(--org-link-color)] focus:ring-[var(--org-btn-primary-bg, #137fec)] disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                          />
                          <p className="font-black text-slate-900 dark:text-white text-base sm:text-lg uppercase break-words">{a.fee?.title || 'Fee'}</p>
                          {renderStatus(a.status)}
                        </div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {a.child ? `${a.child.first_name} ${a.child.last_name}` : 'Child'}
                        </p>
                        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                          {a.fee?.season?.team?.name || 'Team not set'}
                        </p>
                        {a.fee?.description && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">{a.fee.description}</p>
                        )}
                        {dueDate && (
                          <p className={`text-xs font-bold uppercase tracking-widest ${isOverdue ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`}>
                            Due {new Date(dueDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-left sm:text-right space-y-2 flex-shrink-0">
                        <div className="space-y-1">
                          {a.paid_cents_total > 0 ? (
                            <>
                              <p className="text-xs font-bold text-slate-400">Total: ${(a.amount_cents / 100).toFixed(2)}</p>
                              <p className="text-xs font-bold text-emerald-500 dark:text-emerald-400">Paid: ${(a.paid_cents_total / 100).toFixed(2)}</p>
                              <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">Remaining: ${((a.balance_cents ?? 0) / 100).toFixed(2)}</p>
                            </>
                          ) : (
                            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">${((a.balance_cents ?? a.amount_cents ?? 0) / 100).toFixed(2)}</p>
                          )}
                        </div>
                        {orgAllowsPartialPayments && 
                         a.fee?.allow_partial_payment && 
                         (a.status === 'unpaid' || a.status === 'partial') && 
                         a.balance_cents > 0 && (
                          <Button
                            variant="secondary"
                            onClick={(e) => {
                              e.stopPropagation()
                              setPartialPaymentModalOpen(a.id)
                              setPartialAmountCents('')
                              setPartialPaymentError(null)
                            }}
                            disabled={creatingPartialCheckout || creatingCheckout}
                            className="mt-2 text-xs px-3 py-1.5"
                          >
                            Pay Partial
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            <Card className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Total due</p>
                  <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">${(totalDue / 100).toFixed(2)}</p>
                </div>
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  {unpaidAssignments.length} open {unpaidAssignments.length === 1 ? 'fee' : 'fees'}
                </div>
              </div>
            </Card>
          </>
        )}

        {/* Partial Payment Modal */}
        {partialPaymentModalOpen && (() => {
          const assignment = filteredAssignments.find(a => a.id === partialPaymentModalOpen)
          if (!assignment) return null

          const maxAmount = assignment.balance_cents / 100
          const minAmount = assignment.fee?.min_partial_cents ? assignment.fee.min_partial_cents / 100 : 0.01

          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => {
              setPartialPaymentModalOpen(null)
              setPartialAmountCents('')
              setPartialPaymentError(null)
            }}>
              <Card className="max-w-md w-full p-6 dark:bg-slate-900 dark:border-slate-700" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4">Make a Partial Payment</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  {assignment.fee?.title || 'Fee'}
                </p>
                <div className="space-y-2 mb-4">
                  {assignment.paid_cents_total > 0 ? (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Total: ${(assignment.amount_cents / 100).toFixed(2)} · 
                      Paid: ${(assignment.paid_cents_total / 100).toFixed(2)} · 
                      Remaining: ${(assignment.balance_cents / 100).toFixed(2)}
                    </p>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Amount due: ${(assignment.balance_cents / 100).toFixed(2)}
                    </p>
                  )}
                  {assignment.fee?.min_partial_cents && (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Minimum partial payment: ${(assignment.fee.min_partial_cents / 100).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="mb-4">
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                    Payment Amount ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min={minAmount}
                    max={maxAmount}
                    value={partialAmountCents}
                    onChange={(e) => {
                      setPartialAmountCents(e.target.value)
                      setPartialPaymentError(null)
                    }}
                    className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2.5 text-sm text-slate-900 dark:text-white"
                    placeholder={`Enter amount (min $${minAmount.toFixed(2)}, max $${maxAmount.toFixed(2)})`}
                    disabled={creatingPartialCheckout}
                  />
                  {partialPaymentError && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1">{partialPaymentError}</p>
                  )}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setPartialPaymentModalOpen(null)
                      setPartialAmountCents('')
                      setPartialPaymentError(null)
                    }}
                    disabled={creatingPartialCheckout}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handlePartialPayment(assignment)}
                    disabled={creatingPartialCheckout || !partialAmountCents}
                    className="flex-1"
                  >
                    {creatingPartialCheckout ? 'Starting...' : 'Pay'}
                  </Button>
                </div>
              </Card>
            </div>
          )
        })()}
      </PortalLayout>
  )
}
