import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { getAthletes } from '../data/services/familyService'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { useT } from '../i18n/useI18n'
import AthleteAvatar from '../components/portal/AthleteAvatar'
import type { Athlete } from '../types/family'
import { getDisplayName, calculateAge, getGenderLabel, formatSports } from '../utils/athleteHelpers'
import { showError } from '../utils/toast'

export default function Athletes() {
  const t = useT()
  const navigate = useNavigate()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { context, isReady } = useUserContext()

  // Race condition and memory leak prevention
  const requestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const fetchAthletes = useCallback(async () => {
    if (!isReady) return
    
    const currentRequestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: fetchError } = await getAthletes(context)

      // Only update state if this is the latest request and component is still mounted
      if (currentRequestId === requestIdRef.current && isMountedRef.current) {
        if (fetchError) {
          const errorMessage = fetchError.message || 'Failed to load athletes. Please try again.'
          console.error('[Athletes] Error fetching athletes:', fetchError)
          setError(errorMessage)
          setAthletes([])
          showError(errorMessage)
        } else if (data) {
          setAthletes(data)
          setError(null)
        } else {
          setAthletes([])
          setError(null)
        }
        setLoading(false)
      }
    } catch (err) {
      console.error('[Athletes] Exception fetching athletes:', err)
      if (currentRequestId === requestIdRef.current && isMountedRef.current) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load athletes. Please try again.'
        setError(errorMessage)
        setAthletes([])
        setLoading(false)
        showError(errorMessage)
      }
    }
  }, [context, isReady])

  useEffect(() => {
    if (isReady) {
      fetchAthletes()
    } else {
      setLoading(false)
    }
  }, [isReady, fetchAthletes])

  const handleCardClick = (athleteId: string) => {
    if (loading) return
    navigate(`/portal/athletes/${athleteId}/edit`)
  }

  const handleAddAthlete = () => {
    if (loading) return
    navigate('/portal/athletes/new')
  }

  const handleRetry = () => {
    fetchAthletes()
  }

  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'My Athletes' },
      ]}
    >
      <div className="mb-12 flex items-end justify-between">
        <div>
          <PageTitle>My Athletes</PageTitle>
          <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
            Manage your children's profiles and information.
          </p>
        </div>
        <Button variant="primary" onClick={handleAddAthlete} disabled={loading}>
          Add Athlete
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      ) : error ? (
        <Card className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
            <Icon name="error" size="text-4xl" className="text-red-500" />
          </div>
          <CardTitle className="mb-2 text-red-600 dark:text-red-400">Failed to Load Athletes</CardTitle>
          <p className="text-slate-500 dark:text-slate-400 mb-6">{error}</p>
          <div className="flex gap-4 justify-center">
            <Button variant="primary" onClick={handleRetry} disabled={loading}>
              Retry
            </Button>
            <Button variant="secondary" onClick={handleAddAthlete} disabled={loading}>
              Add Athlete
            </Button>
          </div>
        </Card>
      ) : athletes.length === 0 ? (
        <Card className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
            <Icon name="group" size="text-4xl" className="text-slate-400" />
          </div>
          <CardTitle className="mb-2">{t('portal.children.noChildren')}</CardTitle>
          <p className="text-slate-500 dark:text-slate-400 mb-6">{t('portal.children.addChildren')}</p>
          <Button variant="primary" onClick={handleAddAthlete} disabled={loading}>
            {t('portal.children.add')}
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {athletes.map((athlete) => {
            const displayName = getDisplayName(athlete)
            const age = calculateAge(athlete.date_of_birth)
            const genderLabel = getGenderLabel(athlete.gender)
            const { plays, interested } = formatSports(athlete.sports)

            return (
              <Card
                key={athlete.id}
                className="relative overflow-hidden rounded-xl hover:shadow-2xl hover:shadow-[var(--org-btn-primary-bg, #137fec)]/20 transition-all duration-300 cursor-pointer group"
                onClick={() => handleCardClick(athlete.id)}
              >
                {/* Image/Avatar Section */}
                <div className="w-full aspect-square relative bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden">
                  <AthleteAvatar athlete={athlete} size="xl" className="w-full h-full rounded-none object-cover" />
                  {/* Gradient overlay for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-0 flex flex-col justify-end p-4">
                  <div className="text-white">
                    <CardTitle className="text-xl font-bold mb-1 text-white drop-shadow-lg">{displayName}</CardTitle>
                    
                    <div className="flex flex-wrap gap-2 text-sm font-medium text-white/95 mb-3 drop-shadow">
                      {age !== null && (
                        <span>Age {age}</span>
                      )}
                      {genderLabel !== 'Not specified' && (
                        <>
                          {age !== null && <span>•</span>}
                          <span>{genderLabel}</span>
                        </>
                      )}
                      {athlete.jersey_number && (
                        <>
                          {(age !== null || genderLabel !== 'Not specified') && <span>•</span>}
                          <span>#{athlete.jersey_number}</span>
                        </>
                      )}
                    </div>

                    {/* Sports */}
                    {(plays.length > 0 || interested.length > 0) && (
                      <div className="mb-3 text-sm space-y-1">
                        {plays.length > 0 && (
                          <div>
                            <span className="font-semibold text-white/90">Plays: </span>
                            <span className="text-white/85">{plays.join(', ')}</span>
                          </div>
                        )}
                        {interested.length > 0 && (
                          <div>
                            <span className="font-semibold text-white/90">Interested: </span>
                            <span className="text-white/85">{interested.join(', ')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Edit Button */}
                    <Button
                      variant="secondary"
                      className="w-full text-sm px-4 py-2 bg-white/95 hover:bg-white text-slate-900 font-semibold border-0 shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCardClick(athlete.id)
                      }}
                      disabled={loading}
                    >
                      Edit Profile
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </PortalLayout>
  )
}
