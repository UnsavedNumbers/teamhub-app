import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface SessionItem {
  amount_cents: number
  fee_assignment?: {
    fee?: { title: string | null } | null
    child?: { first_name: string; last_name: string } | null
  } | null
}

interface CheckoutSession {
  id: string
  status: string | null
  total_cents: number | null
  created_at: string | null
  payments: { id: string; status: string | null; amount_cents: number; paid_at: string | null }[]
  items: SessionItem[]
}

export default function PaymentSuccess() {
  const [search] = useSearchParams()
  const navigate = useNavigate()
  const [session, setSession] = useState<CheckoutSession | null>(null)
  const [loading, setLoading] = useState(false)
  const sessionId = search.get('session_id')

  useEffect(() => {
    const timer = setTimeout(() => navigate('/portal/payments'), 5000)
    return () => clearTimeout(timer)
  }, [navigate])

  useEffect(() => {
    if (sessionId) fetchSession()
  }, [sessionId])

  async function fetchSession() {
    setLoading(true)
    const { data } = await supabase
      .from('checkout_sessions')
      .select(`
        id,
        status,
        total_cents,
        created_at,
        payments:payments ( id, status, amount_cents, paid_at ),
        items:checkout_session_items (
          amount_cents,
          fee_assignment:fee_assignments (
            fee:fees ( title ),
            child:children ( first_name, last_name )
          )
        )
      `)
      .eq('stripe_checkout_session_id', sessionId)
      .maybeSingle()

    setSession((data as CheckoutSession | null) ?? null)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex items-center">
      <div className="max-w-3xl mx-auto px-4 py-16 space-y-4">
        <h1 className="text-3xl font-bold">Payment successful</h1>
        <p className="text-slate-300">Thank you! Your payment has been received.</p>
        {sessionId && <p className="text-sm text-slate-400">Stripe session: {sessionId}</p>}
        {loading && <p className="text-slate-400">Loading receipt…</p>}
        {session && (
          <div className="card bg-slate-800/60 border border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Receipt total</span>
              <span className="text-xl font-semibold">${((session.total_cents ?? 0) / 100).toFixed(2)}</span>
            </div>
            <div className="space-y-1">
              {session.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm text-slate-300">
                  <span>
                    {item.fee_assignment?.fee?.title || 'Fee'}
                    {item.fee_assignment?.child && (
                      <span className="text-slate-500"> — {item.fee_assignment.child.first_name} {item.fee_assignment.child.last_name}</span>
                    )}
                  </span>
                  <span>${((item.amount_cents ?? 0) / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
            {session.payments?.[0] && (
              <div className="text-sm text-slate-400">
                Paid at: {session.payments[0].paid_at ? new Date(session.payments[0].paid_at).toLocaleString() : 'Pending'}
              </div>
            )}
          </div>
        )}
        <div className="flex items-center gap-4">
          <Link to="/portal/payments" className="btn-primary">Return to payments</Link>
          <Link to="/portal/dashboard" className="text-slate-300 hover:text-white">Go to dashboard</Link>
        </div>
        <p className="text-xs text-slate-500">You will be redirected to your payments in a few seconds.</p>
      </div>
    </div>
  )
}
