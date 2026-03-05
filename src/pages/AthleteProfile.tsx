/**
 * AthleteProfilePage - Parent/Guardian View
 * 
 * Comprehensive athlete profile management for parents/guardians.
 * Follows existing TravelDetail and AthleteDetail patterns.
 */

import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { useOrganization } from '../contexts/OrganizationContext'
import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'
import { debug } from '../lib/debug'
import { getAthleteById } from '../data/services/familyService'
import { getAthleteTeamHistory, getAthleteTeamMemberships, type AthleteTeamMembershipDisplay } from '../data/services/teamsService'
import { debouncedUpsertSportFilterPreferenceV2, getUnifiedAthleteProfileV2 } from '../data/services/unifiedAthleteProfileV2Service'
import { getDisplayName } from '../utils/athleteHelpers'
import PortalLayout from '../components/portal/PortalLayout'
import AthleteAvatar from '../components/portal/AthleteAvatar'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import { PhotoSection } from '../components/galleries/PhotoSection'
import { SportProfileCard } from '../components/athleteProfiles/SportProfileCard'
import { UniversalFieldsForm } from '../components/athleteProfiles/UniversalFieldsForm'
import { MedicalInfoForm } from '../components/athleteProfiles/MedicalInfoForm'
import { BasicInfoForm } from '../components/athleteProfiles/BasicInfoForm'
import { SportsInterestsForm } from '../components/athleteProfiles/SportsInterestsForm'
import type { Athlete } from '../types/family'
import { SPORT_CODES, SPORT_NAMES, type SportCode } from '../types/sports'
import { getSystemSports } from '../data/services/sportsService'
import { supabase } from '../lib/supabase'
import { useT } from '../i18n/useI18n'
import { showError } from '../utils/toast'
import { useFeatureGate } from '../lib/featureGate'

export default function AthleteProfilePage() {
  const { id: athleteId } = useParams<{ id: string }>()

  // Add lifecycle logging
  useDebugLifecycle('AthleteProfilePage', { athleteId })

  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  const t = useT()
  const isMountedRef = useRef(true)
  const medicalGate = useFeatureGate('medical_enabled')
  
  // Check if user is an athlete
  const isAthlete = currentOrganization?.roles?.includes('athlete') ?? false

  const [athlete, setAthlete] = useState<Athlete | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [activeTab, setActiveTab] = useState<'universal' | 'physical' | 'sports' | 'medical' | 'teams'>('universal')
  const [teamMemberships, setTeamMemberships] = useState<AthleteTeamMembershipDisplay[]>([])
  const [teamsLoading, setTeamsLoading] = useState(false)
  const [selectedSport, setSelectedSport] = useState<SportCode | null>(null)
  const [sportIdToCode, setSportIdToCode] = useState<Record<string, SportCode>>({})
  const [activeTeamSports, setActiveTeamSports] = useState<SportCode[]>([])
  const [customSportNames, setCustomSportNames] = useState<Record<string, string>>({})
  const [sportPreferenceLoaded, setSportPreferenceLoaded] = useState(false)
  const lastSportPreferenceWriteAtRef = useRef<string | null>(null)
  const sportPreferenceContextKey = useMemo(
    () => (athleteId ? `portal-athlete-profile:${context.orgId}:${athleteId}` : ''),
    [athleteId, context.orgId]
  )

  const refreshAthlete = async () => {
    if (!athleteId || !isReady) return

    debug.flow('AthleteProfile', 'Refreshing athlete data', { athleteId })
    debug.perf.start('athleteProfile.refreshAthlete')

    try {
      const { data, error } = await getAthleteById(context, athleteId)
      debug.perf.end('athleteProfile.refreshAthlete')

      if (data && !error) {
        debug.data('AthleteProfile', 'Athlete data loaded', { athleteId, athleteName: `${data.first_name} ${data.last_name}` })
        setAthlete(data)
      } else if (error) {
        debug.error('AthleteProfile', 'Failed to load athlete data', { athleteId, error: error.message })
        setError(error)
      }
    } catch (err) {
      debug.error('AthleteProfile', 'Exception loading athlete data', { athleteId, error: err })
      console.error('Error refreshing athlete:', err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    setSportPreferenceLoaded(false)
    lastSportPreferenceWriteAtRef.current = null
  }, [athleteId, sportPreferenceContextKey])

  // Redirect away from medical tab if feature is disabled
  useEffect(() => {
    if (!medicalGate.loading && activeTab === 'medical' && !medicalGate.allowed) {
      setActiveTab('universal')
    }
  }, [medicalGate.allowed, medicalGate.loading, activeTab])

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

        // For athletes, verify they can only view their own profile
        if (isAthlete) {
          const { data: athleteCheck, error: checkError } = await supabase
            .from('athletes')
            .select('id')
            .eq('user_id', context.userId)
            .eq('id', athleteId!)
            .eq('org_id', context.orgId)
            .single()

          if (checkError || !athleteCheck) {
            if (!isMountedRef.current) return
            const errorMsg = t('portal.athletes.errors.cannotViewOtherProfile')
            setError(new Error(errorMsg))
            showError(errorMsg)
            setLoading(false)
            // Redirect to athletes list (team roster)
            setTimeout(() => {
              navigate('/portal/athletes')
            }, 2000)
            return
          }
        }

        const { data, error: fetchError } = await getAthleteById(context, athleteId!)

        if (!isMountedRef.current) return

        if (fetchError || !data) {
          setError(fetchError || new Error('Athlete not found'))
          setLoading(false)
          return
        }

        setAthlete(data)

        setLoading(false)
      } catch (err) {
        if (!isMountedRef.current) return
        setError(err instanceof Error ? err : new Error('Failed to load athlete'))
        setLoading(false)
      }
    }

    fetchAthlete()
  }, [athleteId, context, isReady, isAthlete, navigate, t])

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

  // Load team memberships for Teams tab
  useEffect(() => {
    if (!athleteId || !isReady) return

    const loadTeams = async () => {
      setTeamsLoading(true)
      const { data, error } = await getAthleteTeamMemberships(context, athleteId)
      if (!error && data) {
        setTeamMemberships(data)
      } else {
        setTeamMemberships([])
      }
      setTeamsLoading(false)
    }
    loadTeams()
  }, [athleteId, context, isReady])

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

  // Load persisted sport filter preference once sports are known.
  useEffect(() => {
    if (!isReady || !athleteId || selectedSportCodes.length === 0 || sportPreferenceLoaded || !sportPreferenceContextKey) {
      return
    }

    let cancelled = false
    const loadPreference = async () => {
      const { data } = await getUnifiedAthleteProfileV2({
        athlete_id: athleteId,
        org_id: context.orgId,
        role_scope: 'parent',
        context_key: sportPreferenceContextKey,
      })

      if (cancelled) return

      const preference = (data?.user_preference as Record<string, unknown> | undefined)?.sport_filter
      if (typeof preference === 'string' && preference !== 'all' && selectedSportCodes.includes(preference as SportCode)) {
        setSelectedSport(preference as SportCode)
      }
      setSportPreferenceLoaded(true)
    }

    void loadPreference()
    return () => {
      cancelled = true
    }
  }, [
    athleteId,
    context.orgId,
    isReady,
    selectedSportCodes,
    sportPreferenceContextKey,
    sportPreferenceLoaded,
  ])

  // Debounced preference persistence for multi-sport athletes.
  useEffect(() => {
    if (!isReady || !athleteId || !context.userId || !sportPreferenceLoaded || !sportPreferenceContextKey) {
      return
    }
    if (selectedSportCodes.length <= 1 || !selectedSport) return

    const idempotencyKey = `${sportPreferenceContextKey}:${selectedSport}`
    void debouncedUpsertSportFilterPreferenceV2(
      context.userId,
      {
        athlete_id: athleteId,
        org_id: context.orgId,
        role_scope: 'parent',
        context_key: sportPreferenceContextKey,
      },
      selectedSport,
      {
        idempotencyKey,
        clientUpdatedAt: lastSportPreferenceWriteAtRef.current,
      }
    ).then(({ data }) => {
      const updatedAt = (data?.updated_at ?? null) as string | null
      if (typeof updatedAt === 'string') {
        lastSportPreferenceWriteAtRef.current = updatedAt
      }
    })
  }, [
    athleteId,
    context.orgId,
    context.userId,
    isReady,
    selectedSport,
    selectedSportCodes.length,
    sportPreferenceContextKey,
    sportPreferenceLoaded,
  ])

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
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
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
          <p className="text-gray-500 dark:text-gray-400 mb-4">
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
  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'Athletes', path: '/portal/athletes' },
        { label: displayName },
      ]}
    >
      {/* Page Header */}
      <div className="mb-8 space-y-4">
        <div className="flex items-start gap-6">
          {/* Athlete Photo with upload/replace affordance */}
          <button
            type="button"
            onClick={() => setActiveTab('universal')}
            className="flex-shrink-0 relative w-24 h-24 rounded-full overflow-hidden border-4 border-[var(--org-btn-primary-bg, #137fec)] group focus:outline-none focus:ring-2 focus:ring-[var(--org-btn-primary-bg, #137fec)] focus:ring-offset-2"
            title={t('portal.athleteProfile.uploadOrReplacePhoto' as import('../i18n').TranslationKey)}
            aria-label={t('portal.athleteProfile.uploadOrReplacePhoto' as import('../i18n').TranslationKey)}
          >
            <AthleteAvatar athlete={athlete} photoSize="512" className="w-full h-full rounded-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
              <Icon name="add_photo_alternate" size="text-2xl" className="text-white" />
            </span>
          </button>

          {/* Title */}
          <div className="flex-1">
            <PageTitle>{displayName}</PageTitle>
            <p className="text-gray-500 dark:text-gray-400 text-lg font-light tracking-wide mt-2">
              Athlete Profile
            </p>
          </div>
        </div>
        {athleteId && (
          <PhotoSection
            entityType="athlete"
            entityId={athleteId}
            orgId={athlete?.org_id}
            title="Athlete Photos"
            canUpload
          />
        )}
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex gap-8">
          <button
            onClick={() => setActiveTab('universal')}
            className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === 'universal'
                ? 'border-[var(--org-btn-primary-bg, #137fec)] text-[var(--org-btn-primary-bg, #137fec)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon name="person" size="text-sm" className="mr-2 inline-block" />
            Basic Info
          </button>
          <button            onClick={() => setActiveTab('physical')}
            className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === 'physical'
                ? 'border-[var(--org-btn-primary-bg, #137fec)] text-[var(--org-btn-primary-bg, #137fec)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon name="fitness_center" size="text-sm" className="mr-2 inline-block" />
            Physical Info
          </button>
          <button            onClick={() => setActiveTab('sports')}
            className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === 'sports'
                ? 'border-[var(--org-btn-primary-bg, #137fec)] text-[var(--org-btn-primary-bg, #137fec)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon name="sports" size="text-sm" className="mr-2 inline-block" />
            Sport Profiles
          </button>
          {medicalGate.allowed && !medicalGate.loading && (
            <button
              onClick={() => setActiveTab('medical')}
              className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${
                activeTab === 'medical'
                  ? 'border-[var(--org-btn-primary-bg, #137fec)] text-[var(--org-btn-primary-bg, #137fec)]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Icon name="medical_services" size="text-sm" className="mr-2 inline-block" />
              Medical Info
            </button>
          )}
          <button
            onClick={() => setActiveTab('teams')}
            className={`pb-4 px-2 font-bold text-sm uppercase tracking-widest border-b-2 transition-colors ${
              activeTab === 'teams'
                ? 'border-[var(--org-btn-primary-bg, #137fec)] text-[var(--org-btn-primary-bg, #137fec)]'
                : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >
            <Icon name="groups" size="text-sm" className="mr-2 inline-block" />
            {t('portal.athleteProfile.tabs.teams' as any)}
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
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
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Emergency contact information for this athlete.
              </p>
              
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Contact Name
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {athlete.emergency_contact_name || 'Not set'}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">
                    Contact Phone
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {athlete.emergency_contact_phone || 'Not set'}
                  </p>
                </div>
              </div>

              {medicalGate.allowed && !medicalGate.loading && (
                <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                  <Button
                    variant="secondary"
                    onClick={() => setActiveTab('medical')}
                  >
                    <Icon name="edit" size="text-sm" className="mr-2" />
                    Edit in Medical Info
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {activeTab === 'physical' && (
          <div className="space-y-6">
            <Card className="p-6">
              <CardTitle className="mb-6">Physical Information</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Basic measurements and sizes for {athlete.first_name}
              </p>
              <UniversalFieldsForm
                athlete={athlete}
                onSave={(updatedAthlete) => setAthlete(updatedAthlete)}
              />
            </Card>
          </div>
        )}

        {activeTab === 'sports' && (
          <div className="space-y-6">
            {selectedSportCodes.length === 0 && (
              <Card className="p-6">
                <CardTitle className="mb-4">Sport Profiles</CardTitle>
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-6 text-center">
                  <Icon name="info" size="text-3xl" className="text-gray-400 mb-2" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    No sports selected yet. Add sports in <strong>Basic Info &gt; Sports Interests</strong> to enable sport-specific profiles.
                  </p>
                </div>
              </Card>
            )}

            {selectedSportCodes.length > 1 && (
              <Card className="p-6">
                <CardTitle className="mb-4">Select Sport</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Choose a sport to view and edit profile and equipment information.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {selectedSportCodes.map((sport) => (
                    <button
                      key={sport}
                      onClick={() => setSelectedSport(sport)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedSport === sport
                          ? 'border-[var(--org-btn-primary-bg, #137fec)] bg-[var(--org-btn-primary-bg, #137fec)]/10'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <Icon name="sports" size="text-2xl" className="mb-2" />
                      <p className="text-sm font-bold">{customSportNames[sport] || SPORT_NAMES[sport] || sport}</p>
                    </button>
                  ))}
                </div>
              </Card>
            )}

            {/* Sport Profile Card */}
            {selectedSport && (
              <SportProfileCard
                athleteId={athlete.id}
                sportCode={selectedSport}
              />
            )}
          </div>
        )}

        {activeTab === 'medical' && medicalGate.allowed && !medicalGate.loading && (
          <div className="space-y-6">
            <Card className="p-6">
              <CardTitle className="mb-6">Medical Information</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                Confidential health information for {displayName}
              </p>
              <MedicalInfoForm
                athleteId={athlete.id}
                athleteName={displayName}
              />
            </Card>
          </div>
        )}

        {activeTab === 'teams' && (
          <div className="space-y-6">
            <Card className="p-6">
              <CardTitle className="mb-6">{t('portal.athleteProfile.teams.title' as any)}</CardTitle>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t('portal.athleteProfile.teams.description' as any)}
              </p>
              {teamsLoading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-white" />
                </div>
              ) : teamMemberships.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 p-8 text-center">
                  <Icon name="groups" size="text-4xl" className="text-gray-400 mb-4" />
                  <p className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t('portal.athleteProfile.teams.emptyTitle' as any)}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    {t('portal.athleteProfile.teams.emptyDescription' as any)}
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-4"
                    onClick={() => navigate('/portal/join')}
                  >
                    <Icon name="group_add" size="text-sm" className="mr-2" />
                    {t('portal.athleteProfile.teams.joinTeamCta' as any)}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {teamMemberships.map((m) => (
                    <div
                      key={m.id}
                      className="flex flex-wrap items-center gap-4 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/30"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                          {m.team_name}
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-gray-500 dark:text-gray-400">
                          <span>{t('portal.athleteProfile.teams.season' as import('../i18n').TranslationKey)}: {m.season_name}</span>
                          {m.program_name && (
                            <span>{t('portal.athleteProfile.teams.program' as import('../i18n').TranslationKey)}: {m.program_name}</span>
                          )}
                          {m.sport_name && (
                            <span>{t('portal.athleteProfile.teams.sport' as import('../i18n').TranslationKey)}: {m.sport_name}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-400 dark:text-gray-500">
                          {m.jersey_number && (
                            <span>{t('portal.athleteProfile.teams.jerseyNumber' as import('../i18n').TranslationKey)}: {m.jersey_number}</span>
                          )}
                          {m.position && (
                            <span>{t('portal.athleteProfile.teams.position' as import('../i18n').TranslationKey)}: {m.position}</span>
                          )}
                          {m.joined_at && (
                            <span>
                              {t('portal.athleteProfile.teams.joinedAt' as import('../i18n').TranslationKey)}: {new Date(m.joined_at).toLocaleDateString()}
                            </span>
                          )}
                          <span>{t('portal.athleteProfile.teams.status' as import('../i18n').TranslationKey)}: {m.status}</span>
                        </div>
                      </div>
                      <div className="flex gap-4 flex-shrink-0">
                        <Button
                          variant="secondary"
                          onClick={() => navigate('/portal/calendar')}
                        >
                          <Icon name="calendar_month" size="text-sm" className="mr-1" />
                          {t('portal.athleteProfile.teams.viewSchedule' as import('../i18n').TranslationKey)}
                        </Button>
                        <Button
                          variant="secondary"
                          onClick={() => navigate('/portal/huddles')}
                        >
                          <Icon name="forum" size="text-sm" className="mr-1" />
                          {t('portal.athleteProfile.teams.viewMessages' as import('../i18n').TranslationKey)}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </PortalLayout>
  )
}

