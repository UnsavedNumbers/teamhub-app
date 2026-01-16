import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

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
    not_submitted: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
    submitted: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
    locked: 'bg-[#137fec]/10 text-[#137fec]',
    fulfilled: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
  }

  return (
    <>
      <PortalHeader />
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Uniforms' },
        ]}
      >
        <div className="mb-12">
          <PageTitle>Uniforms</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
            Submit uniform sizes for your athletes.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        ) : children.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 mb-6">Add children first to manage uniforms.</p>
            <Button variant="primary" as={Link} to="/portal/children">
              Add
            </Button>
          </Card>
        ) : (
          <>
            {pendingCount > 0 && (
              <Card className="mb-8 border-l-4 border-red-500 bg-red-50 dark:bg-red-950/20 p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                  <div className="flex-1">
                    <SectionHeader className="text-red-500 mb-2">Action Required</SectionHeader>
                    <CardTitle className="mb-3">Sizes needed</CardTitle>
                    <p className="text-slate-600 dark:text-slate-300 mb-4">
                      Submit measurements to ensure on-time production and delivery.
                    </p>
                    <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 text-sm font-bold uppercase tracking-widest">
                      <Icon name="schedule" size="text-sm" />
                      <span>{pendingCount} item{pendingCount > 1 ? 's' : ''} pending</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <div className="space-y-6">
              {children.map((child) => (
                <Card key={child.id} className="overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                    <CardTitle className="text-lg">{child.first_name} {child.last_name}</CardTitle>
                  </div>
                  
                  {(memberships[child.id] || []).length === 0 ? (
                    <div className="px-6 py-8 text-center">
                      <p className="text-slate-400 text-sm">Not on any teams yet.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800">
                      {(memberships[child.id] || []).map((mem) => {
                        const memKits = getKitsForMembership(mem)

                        return (
                          <div key={`${mem.team_id}-${mem.season_id}`} className="px-6 py-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <p className="font-black text-slate-900 dark:text-white">{mem.team.name}</p>
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{mem.season.name}</p>
                              </div>
                            </div>

                            {memKits.length === 0 ? (
                              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
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
                                    <Card key={kit.id} className="p-4">
                                      <div className="flex items-start justify-between gap-3 mb-3">
                                        <div>
                                          <CardTitle className="text-lg mb-1">{kit.name}</CardTitle>
                                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                            {kit.deadline_at ? `Deadline: ${new Date(kit.deadline_at).toLocaleDateString()}` : 'No deadline set'}
                                          </p>
                                        </div>
                                        <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest ${statusColors[status]}`}>
                                          {status.replace('_', ' ')}
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between">
                                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                                          {kitItems.length} item{kitItems.length === 1 ? '' : 's'} {kitItems.some((i) => i.required) ? '(required included)' : ''}
                                        </p>
                                        <Button
                                          variant="secondary"
                                          onClick={() => openModal(child, kit)}
                                          disabled={isLocked}
                                          className="text-sm px-6 py-2"
                                          title={isLocked ? 'This kit is locked' : undefined}
                                        >
                                          {submission ? 'View / Edit' : 'Submit Sizes'}
                                        </Button>
                                      </div>
                                    </Card>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </Card>
              ))}
            </div>

            <Card className="mt-10 p-6 border-t-4 border-[#137fec]">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <Icon name="help" size="text-4xl" className="text-slate-400" />
                  <div>
                    <CardTitle className="text-lg mb-1">Need sizing help</CardTitle>
                    <p className="text-sm text-slate-500 dark:text-slate-400">View our youth fit guide for accurate measurements.</p>
                  </div>
                </div>
                <Button variant="secondary" className="border-2">
                  Open Fit Guide
                </Button>
              </div>
            </Card>
          </>
        )}

        {/* Size Entry Modal */}
        {showModal && selectedChild && selectedKit && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
            <Card className="max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
              <div className="mb-6">
                <CardTitle className="mb-1">Submit Sizes</CardTitle>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                  {selectedChild.first_name} • {selectedKit.name}
                  {selectedKit.locked_at ? ' • Locked' : ''}
                </p>
              </div>

              <div className="space-y-5 mb-6">
                {(kitItemsByKitId[selectedKit.id] || []).map((it) => {
                  const value = formByItemId[it.id] || ''
                  const disabled = !!selectedKit.locked_at
                  const hasOptions = Array.isArray(it.size_options) && it.size_options.length > 0

                  return (
                    <div key={it.id}>
                      <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                        {it.name} {it.required ? '' : '(optional)'}
                      </label>
                      {hasOptions ? (
                        <select
                          value={value}
                          onChange={(e) => setFormByItemId({ ...formByItemId, [it.id]: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white"
                          disabled={disabled}
                        >
                          <option value="">{it.required ? 'Select size' : 'Skip (optional)'}</option>
                          {it.size_options.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
                          value={value}
                          onChange={(e) => setFormByItemId({ ...formByItemId, [it.id]: e.target.value })}
                          disabled={disabled}
                          placeholder={it.required ? 'Enter size' : 'Optional'}
                        />
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                {!selectedKit.locked_at && (
                  <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={saving || (kitItemsByKitId[selectedKit.id] || []).some((it) => it.required && !formByItemId[it.id])}
                  >
                    {saving ? 'Saving' : 'Save'}
                  </Button>
                )}
              </div>
            </Card>
          </div>
        )}
      </PortalLayout>
    </>
  )
}
