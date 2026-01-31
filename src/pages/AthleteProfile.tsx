/**
 * AthleteProfilePage - Parent/Guardian View
 * 
 * Comprehensive athlete profile management for parents/guardians.
 * Follows existing TravelDetail and AthleteDetail patterns.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { getAthleteById } from '../data/services/familyService'
import { getAthleteTeamHistory } from '../data/services/teamsService'
import { getAthletePhotoUrl } from '../data/services/athletePhotoService'
import { getDisplayName, getAthleteInitials } from '../utils/athleteHelpers'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { GalleryLink } from '../components/gallery/GalleryLink'
import { SportProfileCard } from '../components/athleteProfiles/SportProfileCard'
import { UniversalFieldsForm } from '../components/athleteProfiles/UniversalFieldsForm'
import { MedicalInfoForm } from '../components/athleteProfiles/MedicalInfoForm'
import { BasicInfoForm } from '../components/athleteProfiles/BasicInfoForm'
import { SportsInterestsForm } from '../components/athleteProfiles/SportsInterestsForm'
import type { Athlete } from '../types/family'
import { SPORT_CODES, SPORT_NAMES, type SportCode } from '../types/sports'
import { getSystemSports } from '../data/services/sportsService'

export default function AthleteProfilePage() {
  const { id: athleteId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const isMountedRef = useRef(true)

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [activeTab, setActiveTab] = useState<'universal' | 'physical' | 'sports' | 'medical'>('universal')
  const [selectedSport, setSelectedSport] = useState<SportCode | null>(null)
  const [sportIdToCode, setSportIdToCode] = useState<Record<string, SportCode>>({})
  const [activeTeamSports, setActiveTeamSports] = useState<SportCode[]>([])
  const [customSportNames, setCustomSportNames] = useState<Record<string, string>>({})

  const refreshAthlete = async () => {
    if (!athleteId || !isReady) return
    try {
      const { data, error } = await getAthleteById(context, athleteId)
      if (data && !error) {
        setAthlete(data)
        // Also update photo if needed, but photoUrl is separate state?
        // Actually photoUrl state update logic is inside the initial fetch.
        // BasicInfoForm handles its own visual update or we reload everything.
        // Let's reload photo url too just in case.
         if (data.has_profile_photo && data.org_id && data.id) {
            const url = getAthletePhotoUrl(data.org_id, data.id, '512')
            if (url) setPhotoUrl(url)
         }
      }
    } catch (err) {
      console.error('Error refreshing athlete:', err)
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Load system sports to map sport_id -> sport_code
  useEffect(() => {
    const loadSports = async () => {
      try {
        const { data, error } = await getSystemSports()
        if (error || !data) return

        const mapping: Record<string, SportCode> = {}
        const names: Record<string, string> = {}

        data.forEach((sport) => {
          // Prefer slug when valid, but accept dynamic slugs from DB
          if (sport.slug) {
            mapping[sport.id] = sport.slug as SportCode
            names[sport.slug] = sport.name
            return
          }
          // Fallback: map by normalized name
          const matched = (SPORT_CODES as SportCode[]).find(
            (code) => SPORT_NAMES[code].toLowerCase() === (sport.name || '').toLowerCase()
          )
          if (matched) {
            mapping[sport.id] = matched
          }
        })
        setSportIdToCode(mapping)
        setCustomSportNames(names)
      } catch (err) {
        console.warn('Failed to load sports for mapping:', err)
      }
    }
    loadSports()
  }, [])

  useEffect(() => {
    if (!isReady || !athleteId) {
      setLoading(false)
      return
    }

    async function fetchAthlete() {
      try {
        setLoading(true)
        setError(null)

        const { data, error: fetchError } = await getAthleteById(context, athleteId!)

        if (!isMountedRef.current) return

        if (fetchError || !data) {
          setError(fetchError || new Error('Athlete not found'))
          setLoading(false)
          return
        }

        setAthlete(data)

        // Load photo
        if (data.has_profile_photo && data.org_id && data.id) {
          const url = getAthletePhotoUrl(data.org_id, data.id, '512')
          if (isMountedRef.current && url) {
            setPhotoUrl(url)
          }
        }

        setLoading(false)
      } catch (err) {
        if (!isMountedRef.current) return
        setError(err instanceof Error ? err : new Error('Failed to load athlete'))
        setLoading(false)
      }
    }

    fetchAthlete()
  }, [athleteId, context, isReady])

  // Load enrolled sports (team history)
  useEffect(() => {
    if (!athleteId || Object.keys(sportIdToCode).length === 0) return

    const loadTeamSports = async () => {
        const { data } = await getAthleteTeamHistory(context, athleteId)
        if (data) {
            const teamCodes: SportCode[] = []
            data.forEach(id => {
                const mapped = sportIdToCode[id]
                if (mapped && !teamCodes.includes(mapped)) {
                    teamCodes.push(mapped)
                }
            })
            setActiveTeamSports(teamCodes)
        }
    }
    loadTeamSports()
  }, [athleteId, context, sportIdToCode])

  // Determine which sports the athlete has selected (plays or interested)
  const selectedSportCodes = useMemo(() => {
    const codes: SportCode[] = []
    
    // Add explicitly selected sports
    if (athlete?.sports) {
        athlete.sports.forEach((s) => {
          // Map by id -> SportCode when possible
          const mapped = sportIdToCode[s.sport_id]
          if (mapped && !codes.includes(mapped)) {
            codes.push(mapped)
            return
          }

          // Fallback: map by sport_name to SPORT_NAMES
          const fallback = (SPORT_CODES as SportCode[]).find(
            (code) => SPORT_NAMES[code].toLowerCase() === (s.sport_name || '').toLowerCase()
          )
          if (fallback && !codes.includes(fallback)) {
            codes.push(fallback)
          }
        })
    }
    
    // Add active team sports (force include)
    activeTeamSports.forEach(code => {
        if (!codes.includes(code)) {
            codes.push(code)
        }
    })

    // Sort by SPORT_CODES order to keep consistency
    return codes.sort(
      (a, b) => SPORT_CODES.indexOf(a) - SPORT_CODES.indexOf(b)
    )
  }, [athlete?.sports, sportIdToCode, activeTeamSports])

  // Keep selected sport in sync with available selections
  useEffect(() => {
    if (selectedSport && selectedSportCodes.includes(selectedSport)) return
    setSelectedSport(selectedSportCodes[0] ?? null)
  }, [selectedSport, selectedSportCodes])

  if (loading) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Athletes', path: '/portal/athletes' },
          { label: 'Loading...' },
        ]}
      >
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </PortalLayout>
    )
  }

  if (error || !athlete) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Athletes', path: '/portal/athletes' },
          { label: 'Error' },
        ]}
      >
        <Card className="text-center py-12">
          <Icon name="error" size="text-6xl" className="text-red-400 mb-4" />
          <CardTitle className="mb-2">Error loading athlete profile</CardTitle>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            {error?.message || 'Athlete not found'}
          </p>
          <div className="flex gap-4 justify-center">
            <Button variant="primary" onClick={() => navigate('/portal/athletes')}>
              <Icon name="arrow_back" size="text-sm" className="mr-2" />
              Back to Athletes
            </Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              <Icon name="refresh" size="text-sm" className="mr-2" />
              Retry
            </Button>
          </div>
        </Card>
      </PortalLayout>
    )
  }

  const displayName = getDisplayName(athlete)
  const initials = getAthleteInitials(athlete.first_name, athlete.last_name)





  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'Athletes', path: '/portal/athletes' },
        { label: displayName },
      ]}
    >
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-start gap-6 mb-6">
          {/* Athlete Photo */}
          <div className="flex-shrink-0">
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-4 border-[var(--org-btn-primary-bg, #137fec)]"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--org-btn-primary-bg, #137fec)] to-slate-600 flex items-center justify-center text-white text-3xl font-black">
                {initials}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="flex-1">
            <PageTitle>{displayName}</PageTitle>
            <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide mt-2">
              Athlete Profile
            </p>
            {athleteId && (
              <div className="mt-4">
                <GalleryLink
                  galleryType="athlete"
                  entityId={athleteId}
                  entityName={displayName}
                  variant="link"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('universal')}
            className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === 'universal'
                ? 'border-[var(--org-btn-primary-bg, #137fec)] text-[var(--org-btn-primary-bg, #137fec)]'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Icon name="person" size="text-sm" className="mr-2 inline-block" />
            Basic Info
          </button>
          <button            onClick={() => setActiveTab('physical')}
            className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === 'physical'
                ? 'border-[var(--org-btn-primary-bg, #137fec)] text-[var(--org-btn-primary-bg, #137fec)]'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Icon name="fitness_center" size="text-sm" className="mr-2 inline-block" />
            Physical Info
          </button>
          <button            onClick={() => setActiveTab('sports')}
            className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === 'sports'
                ? 'border-[var(--org-btn-primary-bg, #137fec)] text-[var(--org-btn-primary-bg, #137fec)]'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Icon name="sports" size="text-sm" className="mr-2 inline-block" />
            Sport Profiles
          </button>
          <button
            onClick={() => setActiveTab('medical')}
            className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === 'medical'
                ? 'border-[var(--org-btn-primary-bg, #137fec)] text-[var(--org-btn-primary-bg, #137fec)]'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Icon name="medical_services" size="text-sm" className="mr-2 inline-block" />
            Medical Info
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="grid lg:grid-cols-1 gap-6">
        {activeTab === 'universal' && (
          <div className="space-y-6">
            {/* Basic Information Card */}
            <Card className="p-6">
              <CardTitle className="mb-6">Basic Information</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Core athlete information. Updates are saved immediately.
              </p>
              
              <BasicInfoForm 
                athlete={athlete} 
                onSave={(updated) => {
                  setAthlete(updated)
                  refreshAthlete() // Refresh to update photo/header if needed
                }} 
              />
            </Card>


            {/* Sports Interests */}
            <Card className="p-6">
              <CardTitle className="mb-6">Sports Interests</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Sports this athlete plays or is interested in playing.
              </p>
              
              <SportsInterestsForm 
                athlete={athlete} 
                onSave={refreshAthlete} 
              />
            </Card>

            {/* Emergency Contact */}
            <Card className="p-6">
              <CardTitle className="mb-6">Emergency Contact</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
                Emergency contact information for this athlete.
              </p>
              
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Contact Name
                  </label>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {athlete.emergency_contact_name || 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Contact Phone
                  </label>
                  <p className="text-sm text-slate-900 dark:text-white">
                    {athlete.emergency_contact_phone || 'Not set'}
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700 mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setActiveTab('medical')}
                >
                  <Icon name="edit" size="text-sm" className="mr-2" />
                  Edit in Medical Info
                </Button>
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'physical' && (
          <Card className="p-6">
            <CardTitle className="mb-6">Physical Information</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Basic measurements and sizes for {athlete.first_name}
            </p>
            <UniversalFieldsForm
              athlete={athlete}
              onSave={(updatedAthlete) => setAthlete(updatedAthlete)}
            />
          </Card>
        )}

        {activeTab === 'sports' && (
          <div className="space-y-6">
            {/* Sport Selector */}
            <Card className="p-6">
              <CardTitle className="mb-4">Select Sport</CardTitle>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                Choose a sport to view and edit profile and equipment information
              </p>
              {selectedSportCodes.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center">
                  <Icon name="info" size="text-3xl" className="text-slate-400 mb-2" />
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    No sports selected yet. Add sports in <strong>Basic Info &gt; Sports Interests</strong> to enable sport-specific profiles.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {selectedSportCodes.map((sport) => (
                    <button
                      key={sport}
                      onClick={() => setSelectedSport(sport)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedSport === sport
                          ? 'border-[var(--org-btn-primary-bg, #137fec)] bg-[var(--org-btn-primary-bg, #137fec)]/10'
                          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      <Icon name="sports" size="text-2xl" className="mb-2" />
                      <p className="text-sm font-bold">{customSportNames[sport] || SPORT_NAMES[sport] || sport}</p>
                    </button>
                  ))}
                </div>
              )}
            </Card>

            {/* Sport Profile Card */}
            {selectedSport && (
              <SportProfileCard
                athleteId={athlete.id}
                sportCode={selectedSport}
              />
            )}
          </div>
        )}

        {activeTab === 'medical' && (
          <Card className="p-6">
            <CardTitle className="mb-2">Medical Information</CardTitle>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              Confidential health information for {displayName}
            </p>
            <MedicalInfoForm
              athleteId={athlete.id}
              athleteName={displayName}
            />
          </Card>
        )}
      </div>
    </PortalLayout>
  )
}
