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

export default function Athletes() {
  const t = useT()
  const navigate = useNavigate()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)

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
    
    try {
      const { data, error } = await getAthletes(context)

      // Only update state if this is the latest request and component is still mounted
      if (currentRequestId === requestIdRef.current && isMountedRef.current) {
        if (error) {
          console.error('[Athletes] Error fetching athletes:', error)
          setAthletes([])
        } else if (data) {
          setAthletes(data)
        } else {
          setAthletes([])
        }
        setLoading(false)
      }
    } catch (err) {
      console.error('[Athletes] Exception fetching athletes:', err)
      if (currentRequestId === requestIdRef.current && isMountedRef.current) {
        setAthletes([])
        setLoading(false)
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
    navigate(`/portal/athletes/${athleteId}/edit`)
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
        <Button variant="primary" onClick={() => navigate('/portal/athletes/new')}>
          Add Athlete
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      ) : athletes.length === 0 ? (
        <Card className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
            <Icon name="group" size="text-4xl" className="text-slate-400" />
          </div>
          <CardTitle className="mb-2">{t('portal.children.noChildren')}</CardTitle>
          <p className="text-slate-500 dark:text-slate-400 mb-6">{t('portal.children.addChildren')}</p>
          <Button variant="primary" onClick={() => navigate('/portal/athletes/new')}>
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
                className="aspect-[4/3] relative overflow-hidden rounded-xl hover:shadow-2xl hover:shadow-[#137fec]/5 transition-all duration-300 cursor-pointer group"
                onClick={() => handleCardClick(athlete.id)}
              >
                {/* Square Image/Avatar Section */}
                <div className="w-full aspect-square relative bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <AthleteAvatar athlete={athlete} size="xl" className="w-full h-full rounded-none" />
                </div>

                {/* Content Overlay */}
                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/70 to-transparent">
                  <div className="text-white">
                    <CardTitle className="text-lg mb-1 text-white">{displayName}</CardTitle>
                    
                    <div className="flex flex-wrap gap-2 text-xs font-medium text-white/90 mb-2">
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
                    {plays.length > 0 && (
                      <div className="mb-1">
                        <span className="text-xs font-bold text-white/80">Plays: </span>
                        <span className="text-xs text-white/90">{plays.join(', ')}</span>
                      </div>
                    )}
                    {interested.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs font-bold text-white/80">Interested: </span>
                        <span className="text-xs text-white/90">{interested.join(', ')}</span>
                      </div>
                    )}

                    {/* Edit Button */}
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2 w-full opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCardClick(athlete.id)
                      }}
                    >
                      Edit
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
