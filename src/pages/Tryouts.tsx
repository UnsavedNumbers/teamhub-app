import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useOrganization } from '../contexts/OrganizationContext'

interface Tryout {
  id: string
  title: string
  age_group: string
  location: string
  entry_fee: number
  org_id: string
  start_at: string | null
  tryout_date: string | null
  start_time: string | null
  type: string | null
}

interface Registration {
  id: string
  tryout_id: string
  child_id: string
  status: string
  offer_deadline: string | null
  child: { first_name: string; last_name: string }
  tryout: Tryout
}

interface Child {
  id: string
  first_name: string
  last_name: string
}

export default function Tryouts() {
  const [tryouts, setTryouts] = useState<Tryout[]>([])
  const [registrations, setRegistrations] = useState<Registration[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTryout, setSelectedTryout] = useState<Tryout | null>(null)
  const [selectedChild, setSelectedChild] = useState('')

  const { profile } = useAuth()
  const { currentOrganization } = useOrganization()
  // const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    // Fetch upcoming tryouts
    if (!currentOrganization) return

    const { data: tryoutData } = await supabase
      .from('tryouts')
      .select('*')
      .eq('org_id', currentOrganization.id)
      .order('start_at', { ascending: true, nullsFirst: false })
      .order('tryout_date', { ascending: true })

    setTryouts((tryoutData as unknown as Tryout[]) || [])

    // Fetch my registrations
    if (profile?.family_id) {
      const { data: regData } = await supabase
        .from('tryout_registrations')
        .select('*, child:children(first_name, last_name), tryout:tryouts(*)')
        .eq('family_id', profile.family_id)

      setRegistrations((regData as unknown as Registration[]) || [])

      // Fetch children
      const { data: childData } = await supabase
        .from('children')
        .select('id, first_name, last_name')
        .eq('family_id', profile.family_id)

      setChildren((childData as Child[]) || [])
    }

    setLoading(false)
  }, [profile?.family_id, currentOrganization])

  useEffect(() => {
    if (profile && currentOrganization) fetchData()
  }, [profile, currentOrganization, fetchData])

  async function handleRegister() {
    if (!selectedTryout || !selectedChild || !profile?.family_id) return
    // Use RPC to enforce deadline/capacity atomically and create doc placeholders.
    const { error } = await supabase.rpc('register_child_for_tryout', {
      p_tryout_id: selectedTryout.id,
      p_child_id: selectedChild,
    })
    if (error) {
      alert(error.message)
      return
    }

    setSelectedTryout(null)
    setSelectedChild('')
    fetchData()
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function formatTime(time: string) {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  function getTryoutDate(tryout: Tryout): string | null {
    if (tryout.start_at) return tryout.start_at
    if (tryout.tryout_date) return tryout.tryout_date
    return null
  }

  function isRegistered(tryoutId: string) {
    return registrations.some(r => r.tryout_id === tryoutId)
  }

  const statusColors: Record<string, string> = {
    registered: 'bg-blue-500/20 text-blue-400',
    checked_in: 'bg-amber-500/20 text-amber-400',
    evaluated: 'bg-purple-500/20 text-purple-400',
    offered: 'bg-green-500/20 text-green-400',
    accepted: 'bg-green-600/20 text-green-300',
    declined: 'bg-slate-500/20 text-slate-400',
    rejected: 'bg-red-500/20 text-red-400',
  }

  // Separate registrations with offers
  const offeredRegs = registrations.filter(r => r.status === 'offered')
  const otherRegs = registrations.filter(r => r.status !== 'offered')

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800/50 border-b border-neutral-200 dark:border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/portal/dashboard" className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors mr-4">← Dashboard</Link>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Tryouts</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : (
          <>
            {/* Offers Banner */}
            {offeredRegs.length > 0 && (
              <div className="mb-8">
                {offeredRegs.map((reg) => (
                  <div key={reg.id} className="bg-gradient-to-r from-green-900/50 to-slate-900 rounded-xl p-8 text-center border border-green-500/30">
                    <span className="text-green-400 text-xs font-black tracking-[0.2em] uppercase">Elite Prospect Division</span>
                    <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter mt-2">OFFER RECEIVED</h2>
                    {reg.offer_deadline && (
                      <p className="text-slate-400 mt-4 uppercase text-sm tracking-wide">Decision Deadline: {formatDate(reg.offer_deadline)}</p>
                    )}
                    <div className="flex gap-4 justify-center mt-6">
                      <button className="px-8 py-3 bg-green-600 text-white font-bold uppercase rounded-lg hover:bg-green-700 transition-colors">
                        Accept Offer
                      </button>
                      <button className="px-8 py-3 bg-slate-700 text-white font-bold uppercase rounded-lg hover:bg-slate-600 transition-colors">
                        Decline
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-4">🎉 Congratulations! You are in the top 5% of this year's tryout class.</p>
                  </div>
                ))}
              </div>
            )}

            {/* My Registrations */}
            {otherRegs.length > 0 && (
              <div className="mb-8">
                <h2 className="text-lg font-black text-white uppercase tracking-tight mb-4">My Registrations</h2>
                <div className="space-y-3">
                  {otherRegs.map((reg) => (
                    <div key={reg.id} className="bg-slate-800 rounded-xl p-4 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-white">{reg.child.first_name} {reg.child.last_name}</p>
                        <p className="text-sm text-slate-400">
                          {reg.tryout.title}
                          {reg.tryout.tryout_date ? ` • ${formatDate(reg.tryout.tryout_date)}` : ''}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColors[reg.status]}`}>
                        {reg.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming Tryouts */}
            <h2 className="text-lg font-black text-white uppercase tracking-tight mb-4">Upcoming Tryouts</h2>
            {tryouts.length === 0 ? (
              <div className="bg-slate-800 rounded-xl text-center py-12 px-6">
                <span className="text-6xl mb-4 block">🏆</span>
                <h3 className="text-lg font-bold text-white mb-2">No Upcoming Tryouts</h3>
                <p className="text-slate-400">Check back soon for new opportunities.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {tryouts.map((tryout) => {
                  const registered = isRegistered(tryout.id)
                  const dateStr = getTryoutDate(tryout)
                  return (
                    <div key={tryout.id} className="bg-slate-800 rounded-xl overflow-hidden">
                      <div className="h-32 bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                        <span className="text-5xl">⚽</span>
                      </div>
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <span className={`px-2 py-1 text-xs font-bold uppercase rounded ${registered ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                              {registered ? 'Registered' : (tryout.type ?? 'Tryout')}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-white">
                              {dateStr ? formatDate(dateStr).split(',')[0].toUpperCase() : 'TBD'}
                            </p>
                            <p className="text-xs text-slate-400">{tryout.start_time ? formatTime(tryout.start_time) : ''}</p>
                          </div>
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight italic">{tryout.title}</h3>
                        <p className="text-sm text-slate-400 mt-1">{tryout.age_group}</p>
                        <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">📍 {tryout.location}</p>
                        <div className="mt-4">
                          <Link
                            to={`/portal/tryouts/${tryout.id}`}
                            className="block w-full text-center py-2.5 border border-slate-600 text-slate-300 font-bold uppercase text-sm rounded-lg hover:bg-slate-700"
                          >
                            {registered ? 'View Details' : 'View & Register'}
                          </Link>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Registration Modal */}
      {selectedTryout && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-lg w-full shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-xl font-black text-white uppercase">Register for Tryout</h2>
              <p className="text-slate-400 text-sm">{selectedTryout.title}</p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div>
                  <p className="text-xs text-slate-400 uppercase">Date & Time</p>
                  <p className="font-bold text-white">
                    {selectedTryout.tryout_date ? formatDate(selectedTryout.tryout_date) : 'TBD'}
                  </p>
                  <p className="text-sm text-slate-400">
                    {selectedTryout.start_time ? formatTime(selectedTryout.start_time) : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase">Location</p>
                  <p className="font-bold text-white">{selectedTryout.location}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase">Entry Fee</p>
                  <p className="font-bold text-white">{selectedTryout.entry_fee ? `$${(selectedTryout.entry_fee / 100).toFixed(2)}` : 'Free'}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Select Athlete</label>
                <select value={selectedChild} onChange={(e) => setSelectedChild(e.target.value)} className="input-field">
                  <option value="">Choose athlete...</option>
                  {children.filter(c => !registrations.some(r => r.child_id === c.id && r.tryout_id === selectedTryout.id)).map((c) => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="px-6 py-4 bg-slate-900/50 flex gap-3 justify-end">
              <button onClick={() => setSelectedTryout(null)} className="px-5 py-2 text-slate-400 hover:text-white font-bold uppercase text-sm">Cancel</button>
              <button onClick={handleRegister} disabled={!selectedChild} className="px-6 py-2 bg-white text-slate-900 font-bold uppercase text-sm rounded-lg hover:bg-slate-100 disabled:opacity-50">
                Begin Registration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
