import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, SectionHeader } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { USE_FAKE_DATA } from '../data/config'
import { captureEvent } from '../lib/analytics/analytics'
import { useAuth } from '../hooks/useAuth'

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
  const { user, profile } = useAuth()
  const trackedSessionRef = useRef<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => navigate('/portal/payments'), 5000)
    return () => clearTimeout(timer)
  }, [navigate])

  useEffect(() => {
    if (USE_FAKE_DATA) return
    if (sessionId) fetchSession(sessionId)
  }, [sessionId])

  useEffect(() => {
    if (!sessionId || !session || trackedSessionRef.current === sessionId) return
    trackedSessionRef.current = sessionId
    const totalCents = session.total_cents ?? 0
    const orgId = profile?.organizations?.[0]?.id ?? profile?.org_id ?? undefined
    captureEvent('payment_completed', {
      checkout_session_id: session.id,
      amount_cents: totalCents,
      user_id: user?.id,
      organization_id: orgId,
    })
  }, [sessionId, session, user?.id, profile])

  // Refetch session on window focus to get updated balance
  useEffect(() => {
    if (USE_FAKE_DATA) return
    const handleFocus = () => {
      if (sessionId) {
        fetchSession(sessionId)
      }
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [sessionId])

  async function fetchSession(id: string) {
    setLoading(true)
    try {
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
              athlete:athletes ( first_name, last_name )
            )
          )
        `)
        .eq('stripe_checkout_session_id', id)
        .maybeSingle()

      setSession((data as CheckoutSession | null) ?? null)
    } catch (err) {
      console.error('Failed to load checkout session', err)
      setSession(null)
    } finally {
      setLoading(false)
    }
  }

  return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Payments', path: '/portal/payments' },
          { label: 'Payment received' },
        ]}
      >
        <div className="max-w-2xl mx-auto">
          <div className="mb-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-6">
              <Icon name="check_circle" size="text-4xl" className="text-emerald-500 dark:text-emerald-400" />
            </div>
            <PageTitle>Payment received</PageTitle>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
              Payment processed successfully.
            </p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-3">
              Your balance will update shortly.
            </p>
          </div>

          {loading && (
            <Card className="text-center py-12 mb-6">
              <p className="text-slate-500 dark:text-slate-400">Loading receipt</p>
            </Card>
          )}

          {session && (
            <Card className="p-8 mb-8">
              <SectionHeader className="mb-6">Receipt</SectionHeader>
              <div className="flex items-center justify-between mb-6 pb-6 border-b border-slate-200 dark:border-slate-700">
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Total</span>
                <span className="text-2xl font-black text-slate-900 dark:text-white">${((session.total_cents ?? 0) / 100).toFixed(2)}</span>
              </div>
              <div className="space-y-3 mb-6">
                {session.items?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm font-bold">
                    <span className="text-slate-700 dark:text-slate-300">
                      {item.fee_assignment?.fee?.title || 'Fee'}
                      {item.fee_assignment?.child && (
                        <span className="text-slate-400"> — {item.fee_assignment.child.first_name} {item.fee_assignment.child.last_name}</span>
                      )}
                    </span>
                    <span className="text-slate-900 dark:text-white">${((item.amount_cents ?? 0) / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {session.payments?.[0] && (
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 pt-6 border-t border-slate-200 dark:border-slate-700">
                  Paid at: {session.payments[0].paid_at ? new Date(session.payments[0].paid_at).toLocaleString() : 'Pending'}
                </div>
              )}
            </Card>
          )}

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/portal/payments">
              <Button variant="primary">
                Return to payments
              </Button>
            </Link>
            <Link to="/portal/dashboard" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              Go to dashboard
            </Link>
          </div>

          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 text-center mt-6">
            Redirecting to payments
          </p>
        </div>
      </PortalLayout>
  )
}
