import { useEffect, useMemo, useState } from 'react'

import { useUserContext } from '../hooks/useUserContext'
import { getFeeAssignmentsForUser } from '../data/services/paymentsService'
import { createParentCheckoutSession } from '../api/payments'
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
    season?: { team?: { id: string; name: string } | null } | null
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


  const { context, isReady } = useUserContext()

  useEffect(() => {
    if (!isReady) return
    fetchAssignments()
  }, [context, isReady])

  async function fetchAssignments() {
    setLoading(true)
    setError(null)
    
    const { data, error: queryError } = await getFeeAssignmentsForUser(context)

    if (queryError) {
      setError(queryError.message)
    } else {
      // Transform service data to component format
      const transformed: FeeAssignment[] = data.map(fa => ({
        id: fa.id,
        amount_cents: fa.amount_due_cents,
        balance_cents: fa.amount_due_cents - fa.amount_paid_cents,
        paid_cents_total: fa.amount_paid_cents,
        due_date: fa.due_date ?? null,
        status: fa.status as FeeAssignmentStatus,
        fee: fa.fee ? {
          id: fa.fee.id,
          title: fa.fee.title,
          description: fa.fee.description ?? null,
          due_date: fa.fee.due_date,
          fee_type: fa.fee.fee_type ?? '',
          season: (fa.fee as any).season ? {
            team: (fa.fee as any).season.team || null,
          } : null,
        } : null,
        child: (fa as any).athlete ? {
          id: (fa as any).athlete.id,
          first_name: (fa as any).athlete.first_name,
          last_name: (fa as any).athlete.last_name,
        } : null,
      }))
      setAssignments(transformed)
    }
    setLoading(false)
  }


  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (statusFilter !== 'all' && a.status !== statusFilter) return false
      if (childFilter !== 'all' && a.child?.id !== childFilter) return false
      const teamName = a.fee?.season?.team?.name
      if (teamFilter !== 'all' && teamName !== teamFilter) return false
      return true
    })
  }, [assignments, statusFilter, childFilter, teamFilter])

  const selectedAssignments = filteredAssignments.filter((a) => selectedIds.includes(a.id))
  const unpaidAssignments = filteredAssignments.filter((a) => ['unpaid', 'partial', 'overdue'].includes(a.status))

  const totalDue = unpaidAssignments.reduce((sum, a) => sum + (a.balance_cents ?? 0), 0)
  const selectedTotal = (selectedAssignments.length > 0 ? selectedAssignments : unpaidAssignments).reduce(
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

  const handleApplyDiscount = () => {
    if (!discountCode) return
    setAppliedDiscount(discountCode.trim())
    setCheckoutError(null)
  }

  const handlePayNow = async () => {
    const target = selectedAssignments.length > 0 ? selectedAssignments : unpaidAssignments
    if (target.length === 0) {
      setCheckoutError('Select at least one fee to pay')
      return
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
      }
    } catch (err: any) {
      setCheckoutError(err?.message || 'Unable to start checkout')
    } finally {
      setCreatingCheckout(false)
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
        <div className="mb-12">
          <PageTitle>Payments</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
            Select fees to pay or filter to find a specific fee.
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4">
            <p className="text-red-600 dark:text-red-400 text-sm font-bold">{error}</p>
          </Card>
        )}

        <div className="mb-8">
          <SectionHeader className="mb-4">Filters</SectionHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-3 items-center">
              <select
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white font-medium"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as FeeAssignmentStatus | 'all')}
              >
                <option value="all">All statuses</option>
                <option value="unpaid">Unpaid</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="waived">Waived</option>
                <option value="overdue">Overdue</option>
              </select>
              <select
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white font-medium"
                value={childFilter}
                onChange={(e) => setChildFilter(e.target.value)}
              >
                <option value="all">All children</option>
                {childOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
              <select
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white font-medium"
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
              >
                <option value="all">All teams</option>
                {teamOptions.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
              <Button variant="secondary" onClick={toggleSelectAll} className="text-sm px-6 py-2">
                {selectedIds.length === unpaidAssignments.length && unpaidAssignments.length > 0 ? 'Clear Selection' : 'Select All Due'}
              </Button>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <SectionHeader className="mb-4">Checkout</SectionHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <input
                className="bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                placeholder="Discount code"
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
              />
              <Button variant="secondary" onClick={handleApplyDiscount} className="text-sm px-6 py-2">
                Apply
              </Button>
              {appliedDiscount && (
                <span className="text-emerald-500 dark:text-emerald-400 text-sm font-bold">Applied: {appliedDiscount}</span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Selected total</p>
                <p className="text-lg font-black text-slate-900 dark:text-white">${(selectedTotal / 100).toFixed(2)}</p>
              </div>
              <Button
                variant="primary"
                disabled={creatingCheckout || loading || (selectedAssignments.length === 0 && unpaidAssignments.length === 0)}
                onClick={handlePayNow}
              >
                {creatingCheckout ? 'Starting checkout' : 'Pay'}
              </Button>
            </div>
          </div>
        </div>

        {checkoutError && (
          <Card className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4">
            <p className="text-red-600 dark:text-red-400 text-sm font-bold">{checkoutError}</p>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {filteredAssignments.map((a) => {
                const isSelected = selectedIds.includes(a.id)
                const dueDate = a.due_date || a.fee?.due_date
                const isOverdue = dueDate ? new Date(dueDate) < new Date() && ['unpaid', 'partial'].includes(a.status) : false

                return (
                  <Card
                    key={a.id}
                    className={`p-6 hover:shadow-2xl hover:shadow-[#137fec]/5 transition-all duration-300 ${
                      isSelected ? 'ring-2 ring-[#137fec]' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelected(a.id)}
                            className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-[#137fec] focus:ring-[#137fec]"
                          />
                          <p className="font-black text-slate-900 dark:text-white text-lg uppercase">{a.fee?.title || 'Fee'}</p>
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
                      <div className="text-right space-y-1">
                        <p className="text-2xl font-black text-slate-900 dark:text-white">${((a.balance_cents ?? 0) / 100).toFixed(2)}</p>
                        {a.paid_cents_total > 0 && (
                          <p className="text-xs font-bold text-emerald-500 dark:text-emerald-400">Paid ${(a.paid_cents_total / 100).toFixed(2)}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Total due</p>
                  <p className="text-xl font-black text-slate-900 dark:text-white">${(totalDue / 100).toFixed(2)}</p>
                </div>
                <div className="text-sm font-bold text-slate-500 dark:text-slate-400">
                  {unpaidAssignments.length} open {unpaidAssignments.length === 1 ? 'fee' : 'fees'}
                </div>
              </div>
            </Card>
          </>
        )}
      </PortalLayout>
  )
}
