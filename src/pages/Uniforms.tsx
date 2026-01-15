import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

interface Child {
  id: string
  first_name: string
  last_name: string
}

interface Membership {
  team_id: string
  season_id: string
  team: { name: string }
  season: { name: string }
}

type UniformSubmissionStatus = 'not_submitted' | 'submitted' | 'locked' | 'fulfilled'

interface UniformKit {
  id: string
  team_id: string
  season_id: string
  name: string
  deadline_at: string | null
  locked_at: string | null
}

interface UniformKitItem {
  id: string
  kit_id: string
  name: string
  required: boolean
  size_options: string[]
  sort_order: number
}

interface UniformSubmission {
  id: string
  kit_id: string
  child_id: string
  status: UniformSubmissionStatus
  submitted_at: string | null
  locked_at: string | null
  fulfilled_at: string | null
}

interface UniformSubmissionItem {
  item_id: string
  size: string
}

export default function Uniforms() {
  // Typed Supabase client lags behind new schema during migrations; use untyped client for new uniforms tables/RPC.
  const sb = supabase as any

  const [children, setChildren] = useState<Child[]>([])
  const [memberships, setMemberships] = useState<Record<string, Membership[]>>({})
  const [kits, setKits] = useState<UniformKit[]>([])
  const [kitItemsByKitId, setKitItemsByKitId] = useState<Record<string, UniformKitItem[]>>({})
  const [submissions, setSubmissions] = useState<UniformSubmission[]>([])
  const [_submissionItemsBySubmissionId, setSubmissionItemsBySubmissionId] = useState<Record<string, UniformSubmissionItem[]>>({})
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedChild, setSelectedChild] = useState<Child | null>(null)
  const [selectedKit, setSelectedKit] = useState<UniformKit | null>(null)
  const [formByItemId, setFormByItemId] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const { profile } = useAuth()

  const fetchData = useCallback(async () => {
    const { data: childData } = await supabase
      .from('children')
      .select('id, first_name, last_name')
      .eq('family_id', profile?.family_id || '')
    
    const kids = (childData as Child[]) || []
    setChildren(kids)

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

    // Fetch kits/items/submissions for all memberships in one pass
    const childIds = kids.map((c) => c.id)
    const allMemberships = Object.values(membershipMap).flat()
    const teamIds = Array.from(new Set(allMemberships.map((m) => m.team_id)))

    if (teamIds.length === 0 || childIds.length === 0) {
      setKits([])
      setKitItemsByKitId({})
      setSubmissions([])
      setSubmissionItemsBySubmissionId({})
      setLoading(false)
      return
    }

    const { data: kitsData } = await sb
      .from('uniform_kits')
      .select('id, team_id, season_id, name, deadline_at, locked_at')
      .in('team_id', teamIds)

    const loadedKits = (kitsData as unknown as UniformKit[]) || []
    setKits(loadedKits)

    const kitIds = loadedKits.map((k) => k.id)
    if (kitIds.length === 0) {
      setKitItemsByKitId({})
      setSubmissions([])
      setSubmissionItemsBySubmissionId({})
      setLoading(false)
      return
    }

    const [{ data: kitItemsData }, { data: subsData }] = await Promise.all([
      sb
        .from('uniform_kit_items')
        .select('id, kit_id, name, required, size_options, sort_order')
        .in('kit_id', kitIds),
      sb
        .from('uniform_submissions')
        .select('id, kit_id, child_id, status, submitted_at, locked_at, fulfilled_at')
        .in('kit_id', kitIds)
        .in('child_id', childIds),
    ])

    const items = (kitItemsData as unknown as UniformKitItem[]) || []
    const itemsMap: Record<string, UniformKitItem[]> = {}
    for (const item of items) {
      const list = itemsMap[item.kit_id] || []
      list.push({
        ...item,
        size_options: Array.isArray(item.size_options) ? item.size_options : [],
      })
      itemsMap[item.kit_id] = list
    }
    for (const kitId of Object.keys(itemsMap)) {
      itemsMap[kitId].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.name.localeCompare(b.name))
    }
    setKitItemsByKitId(itemsMap)

    const loadedSubs = (subsData as unknown as UniformSubmission[]) || []
    setSubmissions(loadedSubs)
    setSubmissionItemsBySubmissionId({})

    setLoading(false)
  }, [profile?.family_id])

  useEffect(() => {
    if (profile?.family_id) fetchData()
    else setLoading(false)
  }, [profile, fetchData])

  function getKitsForMembership(mem: Membership) {
    return kits.filter((k) => k.team_id === mem.team_id && k.season_id === mem.season_id)
  }

  function getSubmission(childId: string, kitId: string) {
    return submissions.find((s) => s.child_id === childId && s.kit_id === kitId)
  }

  async function handleSave() {
    if (!selectedChild || !selectedKit) return

    const kitItems = kitItemsByKitId[selectedKit.id] || []
    const requiredMissing = kitItems.some((it) => it.required && !formByItemId[it.id])
    if (requiredMissing) return
    if (selectedKit.locked_at) return

    setSaving(true)
    const itemsPayload = Object.entries(formByItemId)
      .filter(([, size]) => !!size && size.trim().length > 0)
      .map(([item_id, size]) => ({ item_id, size }))

    await sb.rpc('submit_uniform_sizes', {
      p_kit_id: selectedKit.id,
      p_child_id: selectedChild.id,
      p_items: itemsPayload,
    })

    await fetchData()
    setShowModal(false)
    setSelectedChild(null)
    setSelectedKit(null)
    setFormByItemId({})
    setSaving(false)
  }

  async function openModal(child: Child, kit: UniformKit) {
    const existing = getSubmission(child.id, kit.id)
    setSelectedChild(child)
    setSelectedKit(kit)

    const kitItems = kitItemsByKitId[kit.id] || []

    if (existing?.id) {
      const { data } = await sb
        .from('uniform_submission_items')
        .select('item_id, size')
        .eq('submission_id', existing.id)

      const existingItems = (data as unknown as UniformSubmissionItem[]) || []
      setSubmissionItemsBySubmissionId((prev) => ({ ...prev, [existing.id]: existingItems }))
      const initial: Record<string, string> = {}
      for (const it of kitItems) initial[it.id] = ''
      for (const si of existingItems) initial[si.item_id] = si.size
      setFormByItemId(initial)
    } else {
      const initial: Record<string, string> = {}
      for (const it of kitItems) initial[it.id] = ''
      setFormByItemId(initial)
    }
    setShowModal(true)
  }

  // Count pending items
  const pendingCount = children.reduce((acc, child) => {
    const mems = memberships[child.id] || []
    const pending = mems.reduce((mAcc, m) => {
      const kitsForMem = getKitsForMembership(m)
      const missingForMem = kitsForMem.filter((k) => {
        const s = getSubmission(child.id, k.id)
        return !s || s.status === 'not_submitted'
      }).length
      return mAcc + missingForMem
    }, 0)
    return acc + pending
  }, 0)

  const statusColors: Record<UniformSubmissionStatus, string> = {
    not_submitted: 'bg-slate-700 text-slate-300',
    submitted: 'bg-amber-500/20 text-amber-400',
    locked: 'bg-blue-500/20 text-blue-400',
    fulfilled: 'bg-green-500/20 text-green-400',
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
                        const memKits = getKitsForMembership(mem)

                        return (
                          <div key={`${mem.team_id}-${mem.season_id}`} className="px-6 py-5 hover:bg-slate-700/30 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="font-bold text-white">{mem.team.name}</p>
                                <p className="text-sm text-slate-400">{mem.season.name}</p>
                              </div>
                            </div>

                            {memKits.length === 0 ? (
                              <div className="p-4 bg-slate-900/40 rounded-lg">
                                <p className="text-slate-400 text-sm">No uniform kits yet.</p>
                              </div>
                            ) : (
                              <div className="space-y-4">
                                {memKits.map((kit) => {
                                  const submission = getSubmission(child.id, kit.id)
                                  const status: UniformSubmissionStatus = submission?.status || 'not_submitted'
                                  const kitItems = kitItemsByKitId[kit.id] || []
                                  const isLocked = !!kit.locked_at || status === 'locked' || status === 'fulfilled'

                                  return (
                                    <div key={kit.id} className="p-4 bg-slate-900/40 rounded-lg border border-slate-700/50">
                                      <div className="flex items-start justify-between gap-3">
                                        <div>
                                          <p className="font-black text-white uppercase tracking-tight">{kit.name}</p>
                                          <p className="text-xs text-slate-500">
                                            {kit.deadline_at ? `Deadline: ${new Date(kit.deadline_at).toLocaleDateString()}` : 'No deadline set'}
                                          </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${statusColors[status]}`}>
                                          {status.replace('_', ' ')}
                                        </span>
                                      </div>

                                      <div className="mt-3 flex items-center justify-between">
                                        <p className="text-sm text-slate-300">
                                          {kitItems.length} item{kitItems.length === 1 ? '' : 's'} {kitItems.some((i) => i.required) ? '(required included)' : ''}
                                        </p>
                                        <button
                                          onClick={() => openModal(child, kit)}
                                          className="px-5 py-2 bg-white text-slate-900 font-bold text-sm rounded-lg hover:bg-slate-100 transition-colors uppercase tracking-wide disabled:opacity-50"
                                          disabled={isLocked}
                                          title={isLocked ? 'This kit is locked' : undefined}
                                        >
                                          {submission ? 'View / Edit' : 'Submit Sizes'}
                                        </button>
                                      </div>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
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
      {showModal && selectedChild && selectedKit && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl max-w-lg w-full overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-xl font-black text-white uppercase tracking-tight">Submit Sizes</h2>
              <p className="text-slate-400 text-sm">
                {selectedChild.first_name} • {selectedKit.name}
                {selectedKit.locked_at ? ' • Locked' : ''}
              </p>
            </div>

            <div className="p-6 space-y-5">
              {(kitItemsByKitId[selectedKit.id] || []).map((it) => {
                const value = formByItemId[it.id] || ''
                const disabled = !!selectedKit.locked_at
                const hasOptions = Array.isArray(it.size_options) && it.size_options.length > 0

                return (
                  <div key={it.id}>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
                      {it.name} {it.required ? '' : '(optional)'}
                    </label>
                    {hasOptions ? (
                      <select
                        value={value}
                        onChange={(e) => setFormByItemId({ ...formByItemId, [it.id]: e.target.value })}
                        className="input-field"
                        disabled={disabled}
                      >
                        <option value="">{it.required ? 'Select size...' : 'Skip (optional)'}</option>
                        {it.size_options.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="input-field"
                        value={value}
                        onChange={(e) => setFormByItemId({ ...formByItemId, [it.id]: e.target.value })}
                        disabled={disabled}
                        placeholder={it.required ? 'Enter size...' : 'Optional'}
                      />
                    )}
                  </div>
                )
              })}
            </div>

            <div className="px-6 py-4 bg-slate-900/50 flex gap-3 justify-end">
              <button onClick={() => setShowModal(false)} className="px-5 py-2 text-slate-400 hover:text-white font-bold uppercase text-sm transition-colors">Cancel</button>
              {!selectedKit.locked_at && (
                <button
                  onClick={handleSave}
                  disabled={saving || (kitItemsByKitId[selectedKit.id] || []).some((it) => it.required && !formByItemId[it.id])}
                  className="px-6 py-2 bg-white text-slate-900 font-bold uppercase text-sm rounded-lg hover:bg-slate-100 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Sizes'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
