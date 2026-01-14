import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface Child {
  id: string
  first_name: string
  last_name: string
}

interface UniformOrder {
  id: string
  child_id: string
  team_id: string
  season_id: string
  jersey_size: string
  shorts_size: string
  socks_size: string
  status: 'pending' | 'ordered' | 'delivered'
  team: { name: string }
  season: { name: string }
}

interface Membership {
  team_id: string
  season_id: string
  team: { name: string }
  season: { name: string }
}

const JERSEY_SHORTS_SIZES = ['YXS', 'YS', 'YM', 'YL', 'YXL', 'AS', 'AM', 'AL', 'AXL', 'AXXL']
const SOCKS_SIZES = ['YS (1-3)', 'YM (4-6)', 'YL (7-9)', 'AS (6-8)', 'AM (8-10)', 'AL (10-12)']

export default function Uniforms() {
  const [children, setChildren] = useState<Child[]>([])
  const [orders, setOrders] = useState<UniformOrder[]>([])
  const [memberships, setMemberships] = useState<Record<string, Membership[]>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [selectedMembership, setSelectedMembership] = useState<Membership | null>(null)
  const [form, setForm] = useState({ jersey_size: '', shorts_size: '', socks_size: '' })
  const [saving, setSaving] = useState(false)

  const { profile } = useAuth()

  useEffect(() => {
    if (profile?.family_id) fetchData()
    else setLoading(false)
  }, [profile])

  async function fetchData() {
    const { data: childData } = await supabase
      .from('children')
      .select('id, first_name, last_name')
      .eq('family_id', profile?.family_id || '')
    
    const kids = (childData as Child[]) || []
    setChildren(kids)

    const { data: orderData } = await supabase
      .from('uniform_orders')
      .select('*, team:teams(name), season:seasons(name)')

    setOrders((orderData as unknown as UniformOrder[]) || [])

    const membershipMap: Record<string, Membership[]> = {}
    for (const child of kids) {
      const { data: memData } = await supabase
        .from('team_memberships')
        .select('team_id, season_id, team:teams(name), season:seasons(name)')
        .eq('child_id', child.id)
        .eq('status', 'active')
      
      membershipMap[child.id] = (memData as unknown as Membership[]) || []
    }
    setMemberships(membershipMap)
    setLoading(false)
  }

  function getExistingOrder(childId: string, teamId: string, seasonId: string) {
    return orders.find(o => o.child_id === childId && o.team_id === teamId && o.season_id === seasonId)
  }

  async function handleSave() {
    if (!selectedChild || !selectedMembership || !form.jersey_size || !form.shorts_size || !form.socks_size) return
    
    setSaving(true)
    const existing = getExistingOrder(selectedChild.id, selectedMembership.team_id, selectedMembership.season_id)

    if (existing) {
      await supabase.from('uniform_orders').update({
        jersey_size: form.jersey_size,
        shorts_size: form.shorts_size,
        socks_size: form.socks_size,
      } as never).eq('id', existing.id)
    } else {
      await supabase.from('uniform_orders').insert({
        child_id: selectedChild.id,
        team_id: selectedMembership.team_id,
        season_id: selectedMembership.season_id,
        jersey_size: form.jersey_size,
        shorts_size: form.shorts_size,
        socks_size: form.socks_size,
        status: 'pending',
      } as never)
    }

    await fetchData()
    setShowModal(false)
    setSelectedChild(null)
    setSelectedMembership(null)
    setForm({ jersey_size: '', shorts_size: '', socks_size: '' })
    setSaving(false)
  }

  function openModal(child: Child, membership: Membership) {
    const existing = getExistingOrder(child.id, membership.team_id, membership.season_id)
    setSelectedChild(child)
    setSelectedMembership(membership)
    setForm({
      jersey_size: existing?.jersey_size || '',
      shorts_size: existing?.shorts_size || '',
      socks_size: existing?.socks_size || '',
    })
    setShowModal(true)
  }

  // Count pending items
  const pendingCount = children.reduce((acc, child) => {
    const mems = memberships[child.id] || []
    const pending = mems.filter(m => !getExistingOrder(child.id, m.team_id, m.season_id)).length
    return acc + pending
  }, 0)

  const statusColors = {
    pending: 'bg-amber-500/20 text-amber-400',
    ordered: 'bg-blue-500/20 text-blue-400',
    delivered: 'bg-green-500/20 text-green-400',
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <header className="bg-white dark:bg-slate-800/50 backdrop-blur-sm border-b border-neutral-200 dark:border-slate-700/50 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Link to="/portal/dashboard" className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors mr-4">← Dashboard</Link>
            <h1 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Uniforms</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
          </div>
        ) : children.length === 0 ? (
          <div className="bg-slate-800 rounded-xl text-center py-12 px-6">
            <p className="text-slate-400 mb-4">Add children first to manage uniforms.</p>
            <Link to="/portal/children" className="btn-primary">Add Children</Link>
          </div>
        ) : (
          <>
            {/* Hero Action Card */}
            {pendingCount > 0 && (
              <div className="mb-8 rounded-xl overflow-hidden shadow-2xl border-l-[12px] border-red-600 bg-gradient-to-br from-slate-800 to-slate-900">
                <div className="flex flex-col md:flex-row">
                  <div className="w-full md:w-1/2 h-48 md:h-auto bg-gradient-to-br from-primary-600/30 to-slate-800 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-6xl">👕</span>
                    </div>
                  </div>
                  <div className="flex-1 p-8">
                    <p className="text-red-500 text-xs font-black tracking-[0.2em] uppercase mb-2">Action Required</p>
                    <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-tighter mb-3">SIZES NEEDED</h1>
                    <p className="text-slate-400 mb-6">Please submit your athlete's measurements to ensure on-time production and delivery for the season.</p>
                    <div className="flex items-center gap-2 text-amber-400 text-sm mb-4">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="font-bold uppercase">{pendingCount} item{pendingCount > 1 ? 's' : ''} pending</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Children & Teams */}
            <div className="space-y-6">
              {children.map((child) => (
                <div key={child.id} className="bg-slate-800 rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-700/50">
                    <h2 className="text-lg font-black text-white uppercase tracking-tight">{child.first_name} {child.last_name}</h2>
                  </div>
                  
                  {(memberships[child.id] || []).length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <p className="text-slate-400 text-sm">Not on any teams yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-700/50">
                      {(memberships[child.id] || []).map((mem) => {
                        const order = getExistingOrder(child.id, mem.team_id, mem.season_id)
                        {/* const itemsSet = order ? 3 : 0 */}
                        
                        return (
                          <div key={`${mem.team_id}-${mem.season_id}`} className="px-6 py-5 hover:bg-slate-700/30 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="font-bold text-white">{mem.team.name}</p>
                                <p className="text-sm text-slate-400">{mem.season.name}</p>
                              </div>
                              {order && (
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColors[order.status]}`}>
                                  {order.status}
                                </span>
                              )}
                            </div>

                            {/* Gear Items */}
                            <div className="space-y-3">
                              {/* Jersey */}
                              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center text-2xl">👕</div>
                                  <div>
                                    <p className="font-bold text-white text-sm uppercase">Official Game Jersey</p>
                                    <p className="text-xs text-slate-500 uppercase">Dri-FIT Technology</p>
                                  </div>
                                </div>
                                {order?.jersey_size ? (
                                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">{order.jersey_size}</span>
                                ) : (
                                  <span className="px-3 py-1 bg-slate-700 text-slate-400 rounded-full text-xs font-bold">Not Set</span>
                                )}
                              </div>

                              {/* Shorts */}
                              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center text-2xl">🩳</div>
                                  <div>
                                    <p className="font-bold text-white text-sm uppercase">Performance Shorts</p>
                                    <p className="text-xs text-slate-500 uppercase">Lightweight Stretch Mesh</p>
                                  </div>
                                </div>
                                {order?.shorts_size ? (
                                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">{order.shorts_size}</span>
                                ) : (
                                  <span className="px-3 py-1 bg-slate-700 text-slate-400 rounded-full text-xs font-bold">Not Set</span>
                                )}
                              </div>

                              {/* Socks */}
                              <div className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-12 bg-slate-700/50 rounded-lg flex items-center justify-center text-2xl">🧦</div>
                                  <div>
                                    <p className="font-bold text-white text-sm uppercase">Squad Crew Socks</p>
                                    <p className="text-xs text-slate-500 uppercase">Pack of 2 • Zonal Cushioning</p>
                                  </div>
                                </div>
                                {order?.socks_size ? (
                                  <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-bold">{order.socks_size}</span>
                                ) : (
                                  <span className="px-3 py-1 bg-slate-700 text-slate-400 rounded-full text-xs font-bold">Not Set</span>
                                )}
                              </div>
                            </div>

                            {/* Action Button */}
                            <div className="mt-4 flex justify-end">
                              <button onClick={() => openModal(child, mem)} className="px-6 py-2 bg-white text-slate-900 font-bold text-sm rounded-lg hover:bg-slate-100 transition-colors uppercase tracking-wide">
                                {order ? 'Edit Sizes' : 'Submit Sizes Now'}
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Sizing Help Footer */}
            <div className="mt-10 p-6 bg-slate-800 rounded-xl border-t-4 border-primary-500 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <span className="text-4xl">❓</span>
                <div>
                  <h3 className="font-black text-white uppercase tracking-tight">Need Sizing Help?</h3>
                  <p className="text-sm text-slate-400">View our youth fit guide for accurate measurements.</p>
                </div>
              </div>
              <button className="px-6 py-3 border-2 border-white text-white font-bold uppercase tracking-wide text-sm hover:bg-white hover:text-slate-900 transition-colors rounded-lg">
                Open Fit Guide
              </button>
            </div>
          </>
        )}
      </main>

      {/* Size Entry Modal */}
      {showModal && selectedChild && selectedMembership && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Submit Sizes</h2>
              <p className="text-slate-400 text-sm">{selectedChild.first_name} • {selectedMembership.team.name}</p>
            </div>

            <div className="p-6 space-y-5">
              {/* Jersey */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Official Game Jersey</label>
                <select value={form.jersey_size} onChange={(e) => setForm({ ...form, jersey_size: e.target.value })} className="input-field">
                  <option value="">Select size...</option>
                  {JERSEY_SHORTS_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Shorts */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Performance Shorts</label>
                <select value={form.shorts_size} onChange={(e) => setForm({ ...form, shorts_size: e.target.value })} className="input-field">
                  <option value="">Select size...</option>
                  {JERSEY_SHORTS_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* Socks */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Squad Crew Socks</label>
                <select value={form.socks_size} onChange={(e) => setForm({ ...form, socks_size: e.target.value })} className="input-field">
                  <option value="">Select size...</option>
                  {SOCKS_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-900/50 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 text-slate-400 hover:text-white font-bold uppercase text-sm transition-colors">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.jersey_size || !form.shorts_size || !form.socks_size} className="px-6 py-2 bg-white text-slate-900 font-bold uppercase text-sm rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50">
                {saving ? 'Saving...' : 'Save Sizes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
