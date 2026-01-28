import { useState, useEffect, useCallback } from 'react'

import { useUserContext } from '../hooks/useUserContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { getTryouts, getTryoutRegistrations, registerAthleteForTryout } from '../data/services/tryoutsService'
import { getAthletes } from '../data/services/familyService'
import type { Tryout, TryoutRegistration } from '../data/services/tryoutsService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

export default function Tryouts() {
  const [tryouts, setTryouts] = useState<Tryout[]>([])
  const [registrations, setRegistrations] = useState<TryoutRegistration[]>([])
  const [children, setChildren] = useState<{ id: string; first_name: string; last_name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTryout, setSelectedTryout] = useState<Tryout | null>(null)
  const [selectedChild, setSelectedChild] = useState('')


  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()

  const fetchData = useCallback(async () => {
    if (!isReady || !currentOrganization) return

    setLoading(true)
    const [tryoutsRes, regsRes, childrenRes] = await Promise.all([
      getTryouts(context, currentOrganization.id),
      getTryoutRegistrations(context),
      getAthletes(context)
    ])

    setTryouts(tryoutsRes.data)
    setRegistrations(regsRes.data)
    setChildren(childrenRes.data.map(c => ({ id: c.id, first_name: c.first_name, last_name: c.last_name })))
    setLoading(false)
  }, [context, isReady, currentOrganization])

  useEffect(() => {
    if (isReady && currentOrganization) fetchData()
  }, [isReady, currentOrganization, fetchData])

  async function handleRegister() {
    if (!selectedTryout || !selectedChild) return
    await registerAthleteForTryout(context, selectedTryout.id, selectedChild)
    setSelectedTryout(null)
    setSelectedChild('')
    await fetchData()
  }

  function formatDate(dateStr: string) {
    if (!dateStr) return 'TBD'
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  function formatTime(timeStr: string) {
    if (!timeStr) return ''
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  function isRegistered(tryoutId: string) {
    return registrations.some(r => r.tryout_id === tryoutId)
  }

  return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Tryouts' },
        ]}
      >
        <div className="mb-8 sm:mb-12">
          <PageTitle>Tryouts</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-light tracking-wide">
            View and register for upcoming tryouts.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        ) : (
          <>
            <SectionHeader className="mb-4 sm:mb-6">Upcoming Tryouts</SectionHeader>
            {tryouts.length === 0 ? (
              <Card className="text-center py-8 sm:py-12">
                <Icon name="sports_soccer" size="text-5xl sm:text-6xl" className="text-slate-400 mb-4" />
                <CardTitle className="mb-2">No upcoming tryouts</CardTitle>
                <p className="text-slate-500 dark:text-slate-400">Check back soon for new opportunities.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {tryouts.map((tryout) => (
                  <Card key={tryout.id} className="overflow-hidden hover:shadow-2xl hover:shadow-[var(--org-btn-primary-bg, #137fec)]/5 transition-all duration-300">
                    <div className="h-24 sm:h-32 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center">
                      <Icon name="sports_soccer" size="text-4xl sm:text-5xl" className="text-slate-400" />
                    </div>
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1 text-xs font-bold uppercase tracking-widest rounded self-start">
                          {tryout.age_group}
                        </span>
                        <div className="text-left sm:text-right">
                          <p className="font-black text-slate-900 dark:text-white text-sm sm:text-base">
                            {formatDate(tryout.tryout_date || '')}
                          </p>
                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
                            {formatTime(tryout.start_time || '')}
                          </p>
                        </div>
                      </div>
                      <CardTitle className="mb-2 text-base sm:text-lg break-words">{tryout.title}</CardTitle>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-400 mb-3 sm:mb-4">
                        <Icon name="location_on" size="text-sm" className="flex-shrink-0" />
                        <span className="break-words">{tryout.location}</span>
                      </div>
                      <Button
                        variant={isRegistered(tryout.id) ? 'secondary' : 'primary'}
                        onClick={() => setSelectedTryout(tryout)}
                        disabled={isRegistered(tryout.id)}
                        className="w-full"
                      >
                        {isRegistered(tryout.id) ? 'Registered' : 'Register Now'}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {selectedTryout && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTryout(null)}>
            <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg">
              <Card className="w-full p-4 sm:p-6">
              <CardTitle className="mb-2 text-base sm:text-lg">Register for Tryout</CardTitle>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 sm:mb-6 break-words">{selectedTryout.title}</p>
              
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Select Athlete</label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2.5 text-sm"
                >
                  <option value="">Choose athlete</option>
                  {children.map(c => (
                    <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <Button variant="secondary" onClick={() => setSelectedTryout(null)} className="w-full sm:w-auto order-2 sm:order-1">Cancel</Button>
                <Button variant="primary" onClick={handleRegister} disabled={!selectedChild} className="w-full sm:w-auto order-1 sm:order-2">Confirm Registration</Button>
              </div>
              </Card>
            </div>
          </div>
        )}
      </PortalLayout>
  )
}
