import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useOrganization } from '../contexts/OrganizationContext'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

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

  const fetchData = useCallback(async () => {
    if (!currentOrganization) return

    const { data: tryoutData } = await supabase
      .from('tryouts')
      .select('*')
      .eq('org_id', currentOrganization.id)
      .order('start_at', { ascending: true, nullsFirst: false })
      .order('tryout_date', { ascending: true })

    setTryouts((tryoutData as unknown as Tryout[]) || [])

    if (profile?.family_id) {
      const { data: regData } = await supabase
        .from('tryout_registrations')
        .select('*, child:children(first_name, last_name), tryout:tryouts(*)')
        .eq('family_id', profile.family_id)

      setRegistrations((regData as unknown as Registration[]) || [])

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
    registered: 'bg-[#137fec]/10 text-[#137fec]',
    checked_in: 'bg-amber-500/10 text-amber-500 dark:text-amber-400',
    evaluated: 'bg-purple-500/10 text-purple-500 dark:text-purple-400',
    offered: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
    accepted: 'bg-emerald-600/10 text-emerald-600 dark:text-emerald-300',
    declined: 'bg-slate-500/10 text-slate-500 dark:text-slate-400',
    rejected: 'bg-red-500/10 text-red-500 dark:text-red-400',
  }

  const offeredRegs = registrations.filter(r => r.status === 'offered')
  const otherRegs = registrations.filter(r => r.status !== 'offered')

  return (
    <>
      <PortalHeader />
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Tryouts' },
        ]}
      >
        <div className="mb-12">
          <PageTitle>Tryouts</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
            View and register for upcoming tryouts.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        ) : (
          <>
            {offeredRegs.length > 0 && (
              <Card className="mb-8 border-l-4 border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20 p-8">
                {offeredRegs.map((reg) => (
                  <div key={reg.id} className="text-center">
                    <SectionHeader className="text-emerald-500 mb-2">Offer Received</SectionHeader>
                    <CardTitle className="mb-4">OFFER RECEIVED</CardTitle>
                    {reg.offer_deadline && (
                      <p className="text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-6">
                        Decision Deadline: {formatDate(reg.offer_deadline)}
                      </p>
                    )}
                    <div className="flex gap-4 justify-center">
                      <Button variant="primary" className="bg-emerald-500 hover:bg-emerald-600">
                        Accept Offer
                      </Button>
                      <Button variant="secondary">
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            )}

            {otherRegs.length > 0 && (
              <div className="mb-8">
                <SectionHeader className="mb-6">My Registrations</SectionHeader>
                <div className="space-y-3">
                  {otherRegs.map((reg) => (
                    <Card key={reg.id} className="p-6 flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg mb-1">{reg.child.first_name} {reg.child.last_name}</CardTitle>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                          {reg.tryout.title}
                          {reg.tryout.tryout_date ? ` • ${formatDate(reg.tryout.tryout_date)}` : ''}
                        </p>
                      </div>
                      <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-widest ${statusColors[reg.status]}`}>
                        {reg.status.replace('_', ' ')}
                      </span>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            <SectionHeader className="mb-6">Upcoming Tryouts</SectionHeader>
            {tryouts.length === 0 ? (
              <Card className="text-center py-12">
                <Icon name="sports_soccer" size="text-6xl" className="text-slate-400 mb-4" />
                <CardTitle className="mb-2">No upcoming tryouts</CardTitle>
                <p className="text-slate-500 dark:text-slate-400">Check back soon for new opportunities.</p>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                {tryouts.map((tryout) => {
                  const registered = isRegistered(tryout.id)
                  const dateStr = getTryoutDate(tryout)
                  return (
                    <Card key={tryout.id} className="overflow-hidden hover:shadow-2xl hover:shadow-[#137fec]/5 transition-all duration-300">
                      <div className="h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                        <Icon name="sports_soccer" size="text-5xl" className="text-slate-400" />
                      </div>
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <span className={`px-3 py-1 text-xs font-bold uppercase tracking-widest rounded ${registered ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                              {registered ? 'Registered' : (tryout.type ?? 'Tryout')}
                            </span>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-slate-900 dark:text-white">
                              {dateStr ? formatDate(dateStr).split(',')[0].toUpperCase() : 'TBD'}
                            </p>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{tryout.start_time ? formatTime(tryout.start_time) : ''}</p>
                          </div>
                        </div>
                        <CardTitle className="mb-2">{tryout.title}</CardTitle>
                        <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-2">{tryout.age_group}</p>
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
                          <Icon name="location_on" size="text-sm" />
                          {tryout.location}
                        </div>
                        <Button
                          variant="secondary"
                          as={Link}
                          to={`/portal/tryouts/${tryout.id}`}
                          className="w-full text-center"
                        >
                          {registered ? 'View Details' : 'View & Register'}
                        </Button>
                      </div>
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* Registration Modal */}
        {selectedTryout && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTryout(null)}>
            <Card className="max-w-lg w-full p-6" onClick={e => e.stopPropagation()}>
              <CardTitle className="mb-2">Register for Tryout</CardTitle>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">{selectedTryout.title}</p>
              <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Date & Time</p>
                  <p className="font-black text-slate-900 dark:text-white">
                    {selectedTryout.tryout_date ? formatDate(selectedTryout.tryout_date) : 'TBD'}
                  </p>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400">
                    {selectedTryout.start_time ? formatTime(selectedTryout.start_time) : ''}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Location</p>
                  <p className="font-black text-slate-900 dark:text-white">{selectedTryout.location}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Entry Fee</p>
                  <p className="font-black text-slate-900 dark:text-white">{selectedTryout.entry_fee ? `$${(selectedTryout.entry_fee / 100).toFixed(2)}` : 'Free'}</p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Select Athlete</label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white"
                >
                  <option value="">Choose athlete</option>
                  {children.filter(c => !registrations.some(r => r.child_id === c.id && r.tryout_id === selectedTryout.id)).map((c) => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 justify-end">
                <Button variant="secondary" onClick={() => setSelectedTryout(null)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleRegister} disabled={!selectedChild}>
                  Register
                </Button>
              </div>
            </Card>
          </div>
        )}
      </PortalLayout>
    </>
  )
}

