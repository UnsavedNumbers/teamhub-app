import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { getTeamByInviteCode, getTeamDetails, createTeamMembership } from '../data/services/teamsService'
import { getChildren } from '../data/services/familyService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { useT } from '../i18n/useI18n'

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
  const t = useT()
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


  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const fetchChildren = useCallback(async () => {
    if (!isReady) return
    
    const { data } = await getChildren(context)
    setChildren(data.map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
    })))
  }, [context, isReady])

  const handleLookup = useCallback(async () => {
    if (!inviteCode.trim() || !isReady) return
    
    setLoading(true)
    setError(null)

    // Look up team by invite code using real database query
    const { data: teamData, error: teamError } = await getTeamByInviteCode(inviteCode)

    if (teamError || !teamData) {
      setError(teamError?.message || 'Invalid invite code. Please check and try again.')
      setLoading(false)
      return
    }

    // Fetch team details with seasons
    const { data: teamDetails, error: detailsError } = await getTeamDetails(context, teamData.id)

    if (detailsError || !teamDetails) {
      setError('Failed to load team details. Please try again.')
      setLoading(false)
      return
    }

    setTeam({
      id: teamData.id,
      name: teamData.name,
    })

    // Extract seasons from team details
    if (teamDetails.seasons) {
      const seasonList = teamDetails.seasons.map((s: any) => ({
        id: s.id,
        name: s.name,
      }))
      setSeasons(seasonList)
      if (seasonList.length > 0) {
        setSelectedSeason(seasonList[0].id)
      }
    } else {
      // If no seasons in details, try to get them from team_seasons
      // This is a fallback in case the relationship isn't loaded
      setSeasons([])
    }
    
    setStep('select')
    setLoading(false)
  }, [inviteCode, context, isReady])

  useEffect(() => {
    if (isReady) fetchChildren()
  }, [isReady, fetchChildren])

  useEffect(() => {
    if (searchParams.get('code') && isReady) {
      handleLookup()
    }
  }, [searchParams, isReady, handleLookup])

  async function handleJoin() {
    if (!selectedChild || !selectedSeason || !team || !isReady) return
    
    setJoining(true)
    setError(null)

    try {
      // Create team membership using real database operation
      const { data: membershipData, error: membershipError } = await createTeamMembership(
        context,
        selectedChild,
        team.id,
        selectedSeason
      )

      if (membershipError) {
        setError(membershipError.message || 'Failed to join team. Please try again.')
        setJoining(false)
        return
      }

      if (!membershipData) {
        setError('Failed to create membership. Please try again.')
        setJoining(false)
        return
      }

      // Success - show success step
      setStep('success')
      setJoining(false)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setJoining(false)
    }
  }

  return (
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
                    <p className="text-slate-500 dark:text-slate-400 mb-6">{t('portal.joinTeam.addChildFirst')}</p>
                    <Link to="/portal/athletes">
                      <Button variant="primary">
                        {t('portal.joinTeam.add')}
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{t('portal.joinTeam.selectChild')}</label>
                        <select
                          value={selectedChild}
                          onChange={(e) => setSelectedChild(e.target.value)}
                          className="w-full bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded px-4 py-2 text-sm text-slate-900 dark:text-white"
                        >
                          <option value="">{t('portal.joinTeam.chooseChild')}</option>
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
                <p className="text-slate-500 dark:text-slate-400 mb-6">{t('portal.joinTeam.success')} {team?.name}.</p>
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
  )
}
