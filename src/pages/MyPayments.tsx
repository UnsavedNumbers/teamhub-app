import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import type { Database } from '../lib/database.types'
import { createParentCheckoutSession } from '../api/payments'

type FeeAssignmentStatus = Database['public']['Enums']['fee_assignment_status']

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
  refunded: 'Refunded',
  waived: 'Waived',
  scholarship_applied: 'Scholarship',
  offline_recorded: 'Recorded',
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

  const { profile } = useAuth()

  useEffect(() => {
    if (profile?.id) fetchAssignments()
  }, [profile?.id])

  async function fetchAssignments() {
    setLoading(true)
    setError(null)
    const { data, error: queryError } = await supabase
      .from('fee_assignments')
      .select(`
        id,
        amount_cents,
        balance_cents,
        paid_cents_total,
        due_date,
        status,
        fee:fees (
          id,
          title,
          description,
          due_date,
          fee_type,
          season:seasons (
            team:teams ( id, name )
          )
        ),
        child:children (
          id,
          first_name,
          last_name
        )
      `)
      .eq('parent_id', profile?.id)
      .order('due_date', { ascending: true })

    if (queryError) {
      setError(queryError.message)
    } else {
      setAssignments((data as unknown as FeeAssignment[]) || [])
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
  const unpaidAssignments = filteredAssignments.filter((a) => ['unpaid', 'partial'].includes(a.status))

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
    const base = 'px-2 py-1 rounded text-xs font-semibold'
    switch (status) {
      case 'paid':
        return <span className={`${base} bg-emerald-500/10 text-emerald-300`}>{statusLabels[status]}</span>
      case 'partial':
        return <span className={`${base} bg-amber-500/10 text-amber-300`}>{statusLabels[status]}</span>
      case 'unpaid':
        return <span className={`${base} bg-rose-500/10 text-rose-300`}>{statusLabels[status]}</span>
      default:
        return <span className={`${base} bg-slate-500/10 text-slate-200`}>{statusLabels[status]}</span>
    }
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/portal/dashboard" className="text-slate-400 hover:text-white transition-colors mr-4">← Dashboard</Link>
            <h1 className="text-xl font-bold text-white">My Payments</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {error && (
          <div className="card border border-rose-700/40 bg-rose-950/40 text-rose-100">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-slate-400">Select fees to pay or filter to find a specific fee.</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
            <select
              className="input bg-slate-800/60 border-slate-700 text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FeeAssignmentStatus | 'all')}
            >
              <option value="all">All statuses</option>
              <option value="unpaid">Unpaid</option>
              <option value="partial">Partial</option>
              <option value="paid">Paid</option>
              <option value="waived">Waived</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              className="input bg-slate-800/60 border-slate-700 text-sm"
              value={childFilter}
              onChange={(e) => setChildFilter(e.target.value)}
            >
              <option value="all">All children</option>
              {childOptions.map(([id, name]) => (
                <option key={id} value={id}>{name}</option>
              ))}
            </select>
            <select
              className="input bg-slate-800/60 border-slate-700 text-sm"
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
            >
              <option value="all">All teams</option>
              {teamOptions.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            <button
              className="btn-secondary text-sm"
              onClick={toggleSelectAll}
            >
              {selectedIds.length === unpaidAssignments.length && unpaidAssignments.length > 0 ? 'Clear Selection' : 'Select All Due'}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <input
              className="input bg-slate-800/60 border-slate-700 text-sm"
              placeholder="Discount code"
              value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
            />
            <button className="btn-secondary text-sm" onClick={handleApplyDiscount}>Apply</button>
            {appliedDiscount && (
              <span className="text-emerald-300 text-sm">Applied: {appliedDiscount}</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-slate-400">Selected total</p>
              <p className="text-lg font-semibold text-white">${(selectedTotal / 100).toFixed(2)}</p>
            </div>
            <button
              className="btn-primary"
              disabled={creatingCheckout || loading || (selectedAssignments.length === 0 && unpaidAssignments.length === 0)}
              onClick={handlePayNow}
            >
              {creatingCheckout ? 'Starting checkout…' : 'Pay Now'}
            </button>
          </div>
        </div>

        {checkoutError && (
          <div className="card border border-rose-700/40 bg-rose-950/40 text-rose-100">
            {checkoutError}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No fees found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredAssignments.map((a) => {
              const isSelected = selectedIds.includes(a.id)
              const dueDate = a.due_date || a.fee?.due_date
              const isOverdue = dueDate ? new Date(dueDate) < new Date() && ['unpaid', 'partial'].includes(a.status) : false

              return (
                <div
                  key={a.id}
                  className={`card border ${isSelected ? 'border-primary-500' : 'border-slate-800'} bg-slate-800/40`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(a.id)}
                          className="h-4 w-4 rounded border-slate-600 text-primary-500"
                        />
                        <p className="font-semibold text-white">{a.fee?.title || 'Fee'}</p>
                        {renderStatus(a.status)}
                      </div>
                      <p className="text-sm text-slate-400">{a.child ? `${a.child.first_name} ${a.child.last_name}` : 'Child'}</p>
                      <p className="text-xs text-slate-500">{a.fee?.season?.team?.name || 'Team not set'}</p>
                      {a.fee?.description && <p className="text-sm text-slate-300 line-clamp-2">{a.fee.description}</p>}
                      {dueDate && (
                        <p className={`text-xs ${isOverdue ? 'text-rose-300' : 'text-slate-400'}`}>
                          Due {new Date(dueDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-2xl font-bold text-white">${((a.balance_cents ?? 0) / 100).toFixed(2)}</p>
                      {a.paid_cents_total > 0 && (
                        <p className="text-xs text-emerald-300">Paid ${(a.paid_cents_total / 100).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="card bg-slate-800/60 border border-slate-700/60">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-400">Total due (all unpaid/partial)</p>
              <p className="text-xl font-semibold text-white">${(totalDue / 100).toFixed(2)}</p>
            </div>
            <div className="text-sm text-slate-400">
              {unpaidAssignments.length} open {unpaidAssignments.length === 1 ? 'fee' : 'fees'}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
