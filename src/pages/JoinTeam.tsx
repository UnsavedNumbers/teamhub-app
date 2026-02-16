import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { useAuth } from '../hooks/useAuth'
import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'
import { getTeamByInviteCode, getTeamDetails, createTeamMembership } from '../data/services/teamsService'
import { getAthletes } from '../data/services/familyService'
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

// Minimal layout for unauthenticated users - no portal navigation
function MinimalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-impact text-slate-900 dark:text-slate-100 antialiased relative">
      {/* Background Field Markings (Grid) */}
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] z-[-1]"
        style={{
          backgroundImage: 'linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)',
          backgroundSize: '100px 100px',
        }}
      />
      
      {/* Simple header with logo */}
      <header className="py-6 px-6 border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-[1200px] mx-auto flex items-center">
          <span className="text-xl font-bold text-primary-600">YouthSports Team Hub</span>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}

export default function JoinTeam() {
  useDebugLifecycle('JoinTeam')
  const t = useT()
  const [searchParams] = useSearchParams()
  const [inviteCode, setInviteCode] = useState(searchParams.get('code') || sessionStorage.getItem('pending_join_team_code') || '')
  const [team, setTeam] = useState<Team | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('')
  const [step, setStep] = useState<'code' | 'select' | 'success' | 'signin'>('code')
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { context, isReady } = useUserContext()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const fetchChildren = useCallback(async () => {
    if (!isReady) return
    
    const { data } = await getAthletes(context)
    setChildren(data.map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
    })))
  }, [context, isReady])

  const handleLookup = useCallback(async () => {
    if (!inviteCode.trim()) return
    
    setLoading(true)
    setError(null)

    // Store code in sessionStorage for persistence across signup
    sessionStorage.setItem('pending_join_team_code', inviteCode.trim().toUpperCase())

    // Look up team by invite code using real database query (works without auth)
    const { data: teamData, error: teamError } = await getTeamByInviteCode(inviteCode)

    if (teamError || !teamData) {
      // Provide more specific error messages
      let errorMessage = teamError?.message || t('portal.joinTeam.invalidCode')
      
      // Check for rate limiting errors
      if (teamError?.message?.includes('Too many requests')) {
        errorMessage = 'Too many requests. Please wait a minute and try again.'
      } else if (teamError?.message?.includes('Invalid invite code')) {
        errorMessage = t('portal.joinTeam.invalidCode')
      }
      
      setError(errorMessage)
      setLoading(false)
      return
    }

    setTeam({
      id: teamData.id,
      name: teamData.name,
    })

    // If user is not authenticated, show sign in/sign up prompt
    if (!user && !authLoading) {
      setStep('signin')
      setLoading(false)
      return
    }

    // If authenticated but context not ready, wait
    if (!isReady) {
      setLoading(false)
      return
    }

    // Fetch team details with seasons (requires auth)
    const { data: teamDetails, error: detailsError } = await getTeamDetails(context!, teamData.id)

    if (detailsError || !teamDetails) {
      // Provide more specific error messages
      let errorMessage = t('portal.joinTeam.failedToLoad')
      
      if (detailsError?.message?.includes('not found') || detailsError?.message?.includes('permission')) {
        errorMessage = 'Unable to access team details. Please ensure you have permission to view this team.'
      } else if (detailsError?.message?.includes('network') || detailsError?.message?.includes('timeout')) {
        errorMessage = 'Network error. Please check your connection and try again.'
      }
      
      setError(errorMessage)
      setLoading(false)
      return
    }

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
      setSeasons([])
    }
    
    setStep('select')
    setLoading(false)
  }, [inviteCode, context, isReady, user, authLoading, t])

  useEffect(() => {
    if (isReady && user) fetchChildren()
  }, [isReady, user, fetchChildren])

  // Auto-lookup if code is in URL or sessionStorage
  useEffect(() => {
    const codeFromUrl = searchParams.get('code')
    const codeFromStorage = sessionStorage.getItem('pending_join_team_code')
    const codeToUse = codeFromUrl || codeFromStorage
    
    if (codeToUse && codeToUse !== inviteCode) {
      setInviteCode(codeToUse)
    }
    
    // If we have a code and user is authenticated and ready, lookup team
    if (codeToUse && user && isReady && !team) {
      handleLookup()
    } else if (codeToUse && !user && !authLoading && !team) {
      // If not authenticated, lookup team info (public) and show sign in prompt
      handleLookup()
    }
  }, [searchParams, isReady, user, authLoading, handleLookup, inviteCode, team])

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
        // Map specific error messages
        let errorMessage = membershipError.message || t('portal.joinTeam.failedToJoin')
        if (membershipError.message?.includes('full')) {
          errorMessage = t('portal.joinTeam.teamFull')
        } else if (membershipError.message?.includes('already')) {
          errorMessage = t('portal.joinTeam.alreadyMember')
        }
        setError(errorMessage)
        setJoining(false)
        return
      }

      if (!membershipData) {
        setError('Failed to create membership. Please try again.')
        setJoining(false)
        return
      }

      // Check if this is user's first team join and profile not completed
      if (membershipData.isNew && context?.userId) {
      }

      // Success - show success step
      setStep('success')
      setJoining(false)
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
      setJoining(false)
    }
  }

  // Use minimal layout for unauthenticated users, portal layout for authenticated
  const Layout = user ? PortalLayout : MinimalLayout

  const handleSignIn = () => {
    const returnTo = `/portal/join?code=${encodeURIComponent(inviteCode)}`
    navigate('/portal/login', { state: { returnTo } })
  }

  const handleSignUp = () => {
    const returnTo = `/portal/join?code=${encodeURIComponent(inviteCode)}`
    navigate('/portal/signup', { state: { returnTo } })
  }

  return (
      <Layout
        breadcrumbs={user ? [
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Join Team' },
        ] : undefined}
      >
        <div className="max-w-md mx-auto">
          <div className="mb-12 text-center">
            <PageTitle>{t('portal.joinTeam.title')}</PageTitle>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
              {t('portal.joinTeam.description')}
            </p>
          </div>

          <Card className="p-8">
            {error && (
              <Card className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4">
                <p className="text-red-600 dark:text-red-400 text-sm font-bold mb-3">{error}</p>
                <div className="flex gap-2">
                  {step === 'code' && (
                    <Button
                      variant="secondary"
                      onClick={handleLookup}
                      disabled={loading || !inviteCode.trim()}
                    >
                      {t('common.retry')}
                    </Button>
                  )}
                  {step === 'select' && (
                    <Button
                      variant="secondary"
                      onClick={handleJoin}
                      disabled={joining || !selectedChild || !selectedSeason}
                    >
                      {t('common.retry')}
                    </Button>
                  )}
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setError(null)
                      if (step === 'select') {
                        setStep('code')
                        setTeam(null)
                        setSeasons([])
                        setSelectedChild('')
                        setSelectedSeason('')
                      }
                    }}
                  >
                    {t('common.back')}
                  </Button>
                </div>
              </Card>
            )}

            {step === 'code' && (
              <>
                <SectionHeader className="mb-6">{t('portal.joinTeam.enterCode')}</SectionHeader>
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
                  {loading ? t('portal.joinTeam.lookingUp') : t('portal.joinTeam.findTeam')}
                </Button>
              </>
            )}

            {step === 'signin' && team && (
              <>
                <Card className="mb-6 border-[var(--org-btn-primary-bg, #137fec)]/30 bg-[var(--org-btn-primary-bg)]/10 p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{t('portal.joinTeam.joiningTeam')}</p>
                  <CardTitle className="text-lg">{team.name}</CardTitle>
                </Card>
                <div className="text-center py-4">
                  <p className="text-slate-500 dark:text-slate-400 mb-6">{t('portal.joinTeam.signInToJoin')}</p>
                  <div className="space-y-3">
                    <Button variant="primary" onClick={handleSignIn} className="w-full">
                      {t('portal.joinTeam.signIn')}
                    </Button>
                    <Button variant="secondary" onClick={handleSignUp} className="w-full">
                      {t('portal.joinTeam.createAccount')}
                    </Button>
                  </div>
                </div>
                <Button variant="secondary" onClick={() => { setStep('code'); setTeam(null) }} className="w-full mt-3">
                  {t('portal.joinTeam.back')}
                </Button>
              </>
            )}

            {step === 'select' && team && (
              <>
                <Card className="mb-6 border-[var(--org-btn-primary-bg, #137fec)]/30 bg-[var(--org-btn-primary-bg)]/10 p-4 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">{t('portal.joinTeam.joiningTeam')}</p>
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
                          <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">{t('portal.joinTeam.selectSeason')}</label>
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
                      {joining ? t('portal.joinTeam.joining') : t('portal.joinTeam.joinTeam')}
                    </Button>
                  </>
                )}

                <Button variant="secondary" onClick={() => { setStep('code'); setTeam(null) }} className="w-full mt-3">
                  {t('portal.joinTeam.back')}
                </Button>
              </>
            )}

            {step === 'success' && (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-6">
                  <Icon name="check_circle" size="text-4xl" className="text-emerald-500 dark:text-emerald-400" />
                </div>
                <CardTitle className="mb-2">{t('portal.joinTeam.teamJoined')}</CardTitle>
                <p className="text-slate-500 dark:text-slate-400 mb-6">{t('portal.joinTeam.success')} {team?.name}.</p>
                <Button variant="primary" onClick={() => {
                  sessionStorage.removeItem('pending_join_team_code')
                  navigate('/portal/dashboard')
                }}>
                  {t('portal.joinTeam.goToDashboard')}
                </Button>
              </div>
            )}
          </Card>

          {user && (
            <div className="mt-6 text-center">
              <Link to="/portal/dashboard" className="text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
                {t('portal.joinTeam.backToDashboard')}
              </Link>
            </div>
          )}
        </div>
      </Layout>
  )
}
