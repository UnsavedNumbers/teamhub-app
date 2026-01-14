import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

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

    // Fetch seasons for this team
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
    // Auto-lookup if code in URL
    if (searchParams.get('code')) {
      handleLookup()
    }
  }, [searchParams, handleLookup])

  async function handleJoin() {
    if (!selectedChild || !selectedSeason || !team) return
    
    setJoining(true)
    setError(null)

    // Check if already a member
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-600/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-600/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
            TeamHub
          </h1>
          <p className="mt-2 text-slate-400">Join a Team</p>
        </div>

        <div className="card">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {step === 'code' && (
            <>
              <p className="text-slate-300 mb-4">Enter the team invite code you received:</p>
              <div className="mb-6">
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  className="input-field text-center text-2xl tracking-widest"
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  autoFocus
                />
              </div>
              <button onClick={handleLookup} disabled={loading || !inviteCode.trim()} className="w-full btn-primary">
                {loading ? 'Looking up...' : 'Find Team'}
              </button>
            </>
          )}

          {step === 'select' && team && (
            <>
              <div className="mb-6 p-4 bg-primary-600/10 border border-primary-600/30 rounded-lg text-center">
                <p className="text-sm text-slate-400 mb-1">Joining team:</p>
                <p className="text-xl font-semibold text-white">{team.name}</p>
              </div>

              {children.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-slate-400 mb-4">You need to add a child first.</p>
                  <Link to="/portal/children" className="btn-primary">Add Child</Link>
                </div>
              ) : (
                <>
                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-1.5">Select Child</label>
                      <select
                        value={selectedChild}
                        onChange={(e) => setSelectedChild(e.target.value)}
                        className="input-field"
                      >
                        <option value="">Choose a child...</option>
                        {children.map((c) => (
                          <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
                        ))}
                      </select>
                    </div>

                    {seasons.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-1.5">Select Season</label>
                        <select
                          value={selectedSeason}
                          onChange={(e) => setSelectedSeason(e.target.value)}
                          className="input-field"
                        >
                          {seasons.map((s) => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <button onClick={handleJoin} disabled={joining || !selectedChild || !selectedSeason} className="w-full btn-primary">
                    {joining ? 'Joining...' : 'Join Team'}
                  </button>
                </>
              )}

              <button onClick={() => { setStep('code'); setTeam(null) }} className="w-full mt-3 btn-secondary">
                ← Back
              </button>
            </>
          )}

          {step === 'success' && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-600/20 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">Welcome to the team!</h2>
              <p className="text-slate-400 mb-6">Your child has been added to {team?.name}.</p>
              <button onClick={() => navigate('/portal/dashboard')} className="btn-primary">Go to Dashboard</button>
            </div>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link to="/portal/dashboard" className="text-sm text-slate-400 hover:text-slate-300 transition-colors">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
