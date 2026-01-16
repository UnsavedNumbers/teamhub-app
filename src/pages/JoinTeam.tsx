import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

interface Team {
  id: string
  name: string
}

interface Child {
  id: string
  first_name: string
  last_name: string
}

interface Season {
  id: string
  name: string
}

export default function JoinTeam() {
  const [searchParams] = useSearchParams()
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') || '')
  const [team, setTeam] = useState<Team | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('')
  const [step, setStep] = useState<'code' | 'select' | 'success'>('code')
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { profile } = useAuth()
  const navigate = useNavigate()

  const fetchChildren = useCallback(async () => {
    if (!profile?.family_id) return
    const { data } = await supabase
      .from('children')
      .select('id, first_name, last_name')
      .eq('family_id', profile.family_id)
    setChildren((data as Child[]) || [])
  }, [profile?.family_id])

  const handleLookup = useCallback(async () => {
    if (!inviteCode.trim()) return
    
    setLoading(true)
    setError(null)

    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('invite_code', inviteCode.toUpperCase().trim())
      .single()

    if (teamError || !teamData) {
      setError('Invalid invite code. Please check and try again.')
      setLoading(false)
      return
    }

    setTeam(teamData as Team)

    const { data: seasonData } = await supabase
      .from('seasons')
      .select('id, name')
      .eq('team_id', (teamData as Team).id)
      .order('start_date', { ascending: false })

    const seasons = (seasonData as Season[] | null) || []
    setSeasons(seasons)
    if (seasons.length > 0) {
      setSelectedSeason(seasons[0].id)
    }
    
    setStep('select')
    setLoading(false)
  }, [inviteCode])

  useEffect(() => {
    if (profile?.family_id) fetchChildren()
  }, [profile, fetchChildren])

  useEffect(() => {
    if (searchParams.get('code')) {
      handleLookup()
    }
  }, [searchParams, handleLookup])

  async function handleJoin() {
    if (!selectedChild || !selectedSeason || !team) return
    
    setJoining(true)
    setError(null)

    const { data: existing } = await supabase
      .from('team_memberships')
      .select('id')
      .eq('child_id', selectedChild)
      .eq('team_id', team.id)
      .eq('season_id', selectedSeason)
      .single()

    if (existing) {
      setError('This child is already on this team.')
      setJoining(false)
      return
    }

    const { error } = await supabase.from('team_memberships').insert({
      child_id: selectedChild,
      team_id: team.id,
      season_id: selectedSeason,
      status: 'active',
    } as never)

    if (error) {
      setError(error.message)
    } else {
      setStep('success')
    }
    setJoining(false)
  }

  return (
    <>
      <PortalHeader />
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Join Team' },
        ]}
      >
        <div className="max-w-md mx-auto">
          <div className="mb-12 text-center">
            <PageTitle>Join Team</PageTitle>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
              Enter a team invite code to join.
            </p>
          </div>

          <Card className="p-8">
            {error && (
              <Card className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4">
                <p className="text-red-600 dark:text-red-400 text-sm font-bold">{error}</p>
              </Card>
            )}

            {step === 'code' && (
              <>
                <SectionHeader className="mb-6">Enter Invite Code</SectionHeader>
                <div className="mb-6">
                  <input
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                    className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-3 text-center text-2xl tracking-widest font-black text-slate-900 dark:text-white placeholder:text-slate-400"
                    placeholder="XXXXXXXX"
                    maxLength={8}
                    autoFocus
                  />
                </div>
                <Button variant="primary" onClick={handleLookup} disabled={loading || !inviteCode.trim()} className="w-full">
                  {loading ? 'Looking up' : 'Find Team'}
                </Button>
              </>
            )}

            {step === 'select' && team && (
              <>
                <Card className="mb-6 border-[#137fec]/30 bg-[#137fec]/10 p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Joining team</p>
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                </Card>

                {children.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-slate-500 dark:text-slate-400 mb-6">Add a child first.</p>
                    <Button variant="primary" as={Link} to="/portal/children">
                      Add
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Select Child</label>
                        <select
                          value={selectedChild}
                          onChange={(e) => setSelectedChild(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="">Choose a child</option>
                          {children.map((c) => (
                            <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                          ))}
                        </select>
                      </div>

                      {seasons.length > 0 && (
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Select Season</label>
                          <select
                            value={selectedSeason}
                            onChange={(e) => setSelectedSeason(e.target.value)}
                            className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white"
                          >
                            {seasons.map((s) => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <Button variant="primary" onClick={handleJoin} disabled={joining || !selectedChild || !selectedSeason} className="w-full">
                      {joining ? 'Joining' : 'Join Team'}
                    </Button>
                  </>
                )}

                <Button variant="secondary" onClick={() => { setStep('code'); setTeam(null) }} className="w-full mt-3">
                  Back
                </Button>
              </>
            )}

            {step === 'success' && (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-6">
                  <Icon name="check_circle" size="text-4xl" className="text-emerald-500 dark:text-emerald-400" />
                </div>
                <CardTitle className="mb-2">Team joined</CardTitle>
                <p className="text-slate-500 dark:text-slate-400 mb-6">Your child has been added to {team?.name}.</p>
                <Button variant="primary" onClick={() => navigate('/portal/dashboard')}>
                  Go to Dashboard
                </Button>
              </div>
            )}
          </Card>

          <div className="mt-6 text-center">
            <Link to="/portal/dashboard" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
              Back to Dashboard
            </Link>
          </div>
        </div>
      </PortalLayout>
    </>
  )
}
