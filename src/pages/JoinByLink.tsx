import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { useAuth } from '../hooks/useAuth'
import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'
import { getJoinLinkByToken, submitJoinRequest } from '../data/services/joinLinksService'
import { getAthletes } from '../data/services/familyService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { useT } from '../i18n/useI18n'
import { supabase } from '../lib/supabase'

// Minimal layout for unauthenticated users
function MinimalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-impact text-slate-900 dark:text-slate-100 antialiased relative">
      <div 
        className="fixed inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.02] z-[-1]"
        style={{
          backgroundImage: 'linear-gradient(to right, #f3f4f6 1px, transparent 1px), linear-gradient(to bottom, #f3f4f6 1px, transparent 1px)',
          backgroundSize: '100px 100px',
        }}
      />
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

interface Child {
  id: string
  first_name: string
  last_name: string
}

interface Season {
  id: string
  name: string
}

interface JoinLinkInfo {
  org_id: string
  team_id: string | null
  auto_approve: boolean
  expires_at: string
}

export default function JoinByLink() {
  useDebugLifecycle('JoinByLink')
  const t = useT()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') || sessionStorage.getItem('pending_join_link_token') || ''
  const [joinLink, setJoinLink] = useState<JoinLinkInfo | null>(null)
  const [seasons, setSeasons] = useState<Season[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [selectedChild, setSelectedChild] = useState('')
  const [selectedSeason, setSelectedSeason] = useState('')
  const [step, setStep] = useState<'loading' | 'signin' | 'select' | 'success' | 'pending'>('loading')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { context, isReady } = useUserContext()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const fetchChildren = useCallback(async () => {
    if (!isReady || !user) return
    
    const { data } = await getAthletes(context)
    setChildren(data.map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
    })))
  }, [context, isReady, user])

  const validateToken = useCallback(async () => {
    if (!token) {
      setError(t('portal.joinByLink.invalidLink'))
      setStep('signin')
      return
    }

    setLoading(true)
    setError(null)

    // Store token for persistence
    sessionStorage.setItem('pending_join_link_token', token)

    const { data: linkData, error: linkError } = await getJoinLinkByToken(token)

    if (linkError || !linkData) {
      setError(linkError?.message || t('portal.joinByLink.invalidLink'))
      setLoading(false)
      setStep('signin')
      return
    }

    setJoinLink({
      org_id: linkData.org_id,
      team_id: linkData.team_id,
      auto_approve: linkData.auto_approve,
      expires_at: linkData.expires_at,
    })

    // If not authenticated, show sign in prompt
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

    // Fetch seasons if team is specified
    if (linkData.team_id) {
      try {
        const { data: seasonsData, error: seasonsError } = await supabase
          .from('seasons')
          .select('id, name')
          .eq('org_id', linkData.org_id)
          .order('start_date', { ascending: false })

        if (!seasonsError && seasonsData) {
          setSeasons(seasonsData.map(s => ({ id: s.id, name: s.name })))
          if (seasonsData.length > 0) {
            setSelectedSeason(seasonsData[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch seasons:', err)
      }
    }

    setStep('select')
    setLoading(false)
  }, [token, user, authLoading, isReady, t])

  useEffect(() => {
    if (token) {
      validateToken()
    } else {
      setError(t('portal.joinByLink.missingToken'))
      setStep('signin')
    }
  }, [token, validateToken, t])

  useEffect(() => {
    if (isReady && user) {
      fetchChildren()
      // Re-validate token when user becomes available
      if (token && step === 'signin') {
        validateToken()
      }
    }
  }, [isReady, user, fetchChildren, token, step, validateToken])

  const handleSignIn = () => {
    const returnTo = `/portal/join/link?token=${encodeURIComponent(token)}`
    navigate('/portal/login', { state: { returnTo } })
  }

  const handleSignUp = () => {
    const returnTo = `/portal/join/link?token=${encodeURIComponent(token)}`
    navigate('/portal/signup', { state: { returnTo } })
  }

  const handleSubmit = async () => {
    if (!selectedChild || !selectedSeason || !token || !isReady) return
    
    setSubmitting(true)
    setError(null)

    try {
      const { data, error: submitError } = await submitJoinRequest({
        linkToken: token,
        childId: selectedChild,
        seasonId: selectedSeason,
        teamId: joinLink?.team_id || null,
      })

      if (submitError) {
        // Provide more specific error messages
        let errorMessage = submitError.message || t('portal.joinByLink.failedToSubmit')
        
        if (submitError.message?.includes('full') || submitError.message?.includes('capacity')) {
          errorMessage = 'This team is full. Please contact the organization for more information.'
        } else if (submitError.message?.includes('already')) {
          errorMessage = 'Your athlete is already on this team.'
        } else if (submitError.message?.includes('expired')) {
          errorMessage = 'This join link has expired. Please request a new link.'
        } else if (submitError.message?.includes('network') || submitError.message?.includes('timeout')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        }
        
        setError(errorMessage)
        setSubmitting(false)
        return
      }

      if (!data) {
        setError(t('portal.joinByLink.failedToSubmit'))
        setSubmitting(false)
        return
      }

      // Clear stored token
      sessionStorage.removeItem('pending_join_link_token')


      if (data.status === 'approved' || joinLink?.auto_approve) {
        setStep('success')
      } else {
        setStep('pending')
      }
      setSubmitting(false)
    } catch (err) {
      setError(t('portal.joinByLink.failedToSubmit'))
      setSubmitting(false)
    }
  }

  const Layout = user ? PortalLayout : MinimalLayout

  if (step === 'loading') {
    return (
      <Layout>
        <div className="max-w-md mx-auto">
          <Card className="p-8 text-center">
            <p>{t('portal.joinByLink.loading')}</p>
          </Card>
        </div>
      </Layout>
    )
  }

  return (
    <Layout
      breadcrumbs={user ? [
        { label: 'Home', path: '/portal/dashboard' },
        { label: t('portal.joinByLink.title') },
      ] : undefined}
    >
      <div className="max-w-md mx-auto">
        <div className="mb-12 text-center">
          <PageTitle>{t('portal.joinByLink.title')}</PageTitle>
        </div>

        <Card className="p-8">
          {error && (
            <Card className="mb-6 border-red-500/50 bg-red-50 dark:bg-red-950/20 p-4">
              <p className="text-red-600 dark:text-red-400 text-sm font-bold mb-3">{error}</p>
              <div className="flex gap-2">
                {step === 'select' && (
                  <Button
                    variant="secondary"
                    onClick={handleSubmit}
                    disabled={submitting || !selectedChild || !selectedSeason}
                  >
                    {t('common.retry')}
                  </Button>
                )}
                {(step as string) === 'loading' && (
                  <Button
                    variant="secondary"
                    onClick={() => validateToken()}
                    disabled={loading}
                  >
                    {t('common.retry')}
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    setError(null)
                    if (step === 'select') {
                      setStep('signin')
                    } else if ((step as string) === 'loading') {
                      setStep('signin')
                    }
                  }}
                >
                  {t('common.back')}
                </Button>
              </div>
            </Card>
          )}

          {step === 'signin' && (
            <>
              <div className="text-center py-4">
                <p className="text-slate-500 dark:text-slate-400 mb-6">{t('portal.joinByLink.signInToJoin')}</p>
                <div className="space-y-3">
                  <Button variant="primary" onClick={handleSignIn} className="w-full">
                    {t('portal.joinByLink.signIn')}
                  </Button>
                  <Button variant="secondary" onClick={handleSignUp} className="w-full">
                    {t('portal.joinByLink.createAccount')}
                  </Button>
                </div>
              </div>
            </>
          )}

          {step === 'select' && (
            <>
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

                  <Button 
                    variant="primary" 
                    onClick={handleSubmit} 
                    disabled={submitting || !selectedChild || !selectedSeason} 
                    className="w-full"
                  >
                    {submitting ? t('portal.joinByLink.submitting') : t('portal.joinByLink.submitRequest')}
                  </Button>
                </>
              )}
            </>
          )}

          {step === 'success' && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-6">
                <Icon name="check_circle" size="text-4xl" className="text-emerald-500 dark:text-emerald-400" />
              </div>
              <CardTitle className="mb-2">{t('portal.joinByLink.requestApproved')}</CardTitle>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{t('portal.joinByLink.approvedMessage')}</p>
              <Button variant="primary" onClick={() => navigate('/portal/dashboard')}>
                {t('portal.joinTeam.goToDashboard')}
              </Button>
            </div>
          )}

          {step === 'pending' && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full mb-6">
                <Icon name="hourglass_empty" size="text-4xl" className="text-blue-500 dark:text-blue-400" />
              </div>
              <CardTitle className="mb-2">{t('portal.joinByLink.requestSubmitted')}</CardTitle>
              <p className="text-slate-500 dark:text-slate-400 mb-6">{t('portal.joinByLink.pendingMessage')}</p>
              <Button variant="primary" onClick={() => navigate('/portal/dashboard')}>
                {t('portal.joinTeam.goToDashboard')}
              </Button>
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
