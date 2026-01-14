import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface Payment {
  id: string
  amount: number
  description: string | null
  due_date: string | null
  status: 'due' | 'paid' | 'refunded'
  child: { first_name: string; last_name: string }
  team: { name: string }
}

export default function MyPayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const { profile } = useAuth()

  useEffect(() => {
    if (profile) fetchPayments()
  }, [profile])

  async function fetchPayments() {
    // RLS will filter to only show payments for user's children
    const { data } = await supabase
      .from('payments')
      .select('id, amount, description, due_date, status, child:children(first_name, last_name), team:teams(name)')
      .order('status', { ascending: true })
      .order('due_date', { ascending: true })

    setPayments((data as unknown as Payment[]) || [])
    setLoading(false)
  }

  const duePayments = payments.filter((p) => p.status === 'due')
  const paidPayments = payments.filter((p) => p.status === 'paid')
  const totalDue = duePayments.reduce((sum, p) => sum + p.amount, 0)

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

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : payments.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-400">No payments found.</p>
          </div>
        ) : (
          <>
            {/* Due Now */}
            {duePayments.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Due Now</h2>
                  <span className="text-lg font-bold text-amber-400">${(totalDue / 100).toFixed(2)}</span>
                </div>
                <div className="space-y-3">
                  {duePayments.map((p) => (
                    <div key={p.id} className="card border-l-4 border-l-amber-500">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{p.child.first_name} {p.child.last_name}</p>
                          <p className="text-sm text-slate-400">{p.team.name} • {p.description || 'Fee'}</p>
                          {p.due_date && (
                            <p className="text-xs text-amber-400 mt-1">Due {new Date(p.due_date).toLocaleDateString()}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold text-white">${(p.amount / 100).toFixed(2)}</p>
                          <button className="mt-2 btn-primary text-sm">Pay Now</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Paid */}
            {paidPayments.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold text-white mb-4">Paid</h2>
                <div className="space-y-3">
                  {paidPayments.map((p) => (
                    <div key={p.id} className="card opacity-70">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white">{p.child.first_name} {p.child.last_name}</p>
                          <p className="text-sm text-slate-400">{p.team.name} • {p.description || 'Fee'}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-white">${(p.amount / 100).toFixed(2)}</p>
                          <span className="text-xs text-green-400">✓ Paid</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
