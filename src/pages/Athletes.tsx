import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { useOrganization } from '../contexts/OrganizationContext'
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
import { supabase } from '../lib/supabase'
import { USE_FAKE_DATA } from '../data/config'
import { UserPlus, Link2, X } from 'lucide-react'
import { createPortal } from 'react-dom'

import { useDebugLifecycle } from '../lib/debug/integrations/useDebugLifecycle'

export default function Athletes() {
  useDebugLifecycle('Athletes')
  
  const t = useT()
  const navigate = useNavigate()
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddAthleteDialog, setShowAddAthleteDialog] = useState(false)

  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  
  // Check if user is an athlete
  const isAthlete = currentOrganization?.roles?.includes('athlete') ?? false

  // Race condition and memory leak prevention
  const requestIdRef = useRef(0)
  const isMountedRef = useRef(true)

  // Fetch athletes when ready - using useEffect directly to avoid callback re-creation issues
  useEffect(() => {
    console.log('[Athletes] Effect running, isReady:', isReady, 'mounted:', isMountedRef.current, 'isAthlete:', isAthlete)
    if (!isReady) {
      setLoading(false)
      return
    }
    
    // Set mounted to true at the start of the effect
    isMountedRef.current = true
    
    const currentRequestId = ++requestIdRef.current
    console.log('[Athletes] Starting fetch, requestId:', currentRequestId)
    setLoading(true)
    setError(null)
    
    // For athletes, fetch team roster instead of all athletes
    // In fake data mode, use getAthletes() which returns appropriate fake data
    if (isAthlete && !USE_FAKE_DATA) {
      // Real Supabase: Get athlete's own athlete_id
      supabase
        .from('athletes')
        .select('id')
        .eq('user_id', context.userId)
        .eq('org_id', context.orgId)
        .single()
        .then(({ data: athleteData, error: athleteError }) => {
          if (athleteError || !athleteData) {
            if (currentRequestId === requestIdRef.current && isMountedRef.current) {
              setError('Unable to find your athlete profile.')
              setAthletes([])
              setLoading(false)
            }
            return
          }
          
          const athleteId = athleteData.id
          
          // Get athlete's team memberships
          supabase
            .from('team_memberships')
            .select('team_id')
            .eq('athlete_id', athleteId)
            .eq('status', 'active')
            .then(({ data: memberships, error: memError }) => {
              if (memError || !memberships || memberships.length === 0) {
                if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                  setAthletes([])
                  setLoading(false)
                }
                return
              }
              
              const teamIds = [...new Set(memberships.map(m => m.team_id))]
              
              // Get all athletes in those teams
              supabase
                .from('team_memberships')
                .select(`
                  athlete_id,
                  athletes!inner(
                    id,
                    first_name,
                    last_name,
                    birthdate,
                    gender,
                    preferred_name,
                    jersey_number,
                    medical_notes,
                    allergies,
                    emergency_contact_name,
                    emergency_contact_phone,
                    phone,
                    email,
                    profile_photo_updated_at,
                    has_profile_photo,
                    org_id,
                    created_at,
                    updated_at,
                    deleted_at
                  )
                `)
                .in('team_id', teamIds)
                .eq('status', 'active')
                .eq('athletes.org_id', context.orgId)
                .is('athletes.deleted_at', null)
                .then(({ data: rosterData, error: rosterError }) => {
                  if (currentRequestId === requestIdRef.current && isMountedRef.current) {
                    if (rosterError) {
                      const errorMessage = rosterError.message || t('portal.athletes.errors.teamRosterLoadFailed')
                      setError(errorMessage)
                      setAthletes([])
                      showError(errorMessage)
                    } else if (rosterData) {
                      // Transform to Athlete[] format
                      const uniqueAthletes = new Map<string, Athlete>()
                      rosterData.forEach((row: any) => {
                        const athlete = row.athletes
                        if (athlete && !uniqueAthletes.has(athlete.id)) {
                          uniqueAthletes.set(athlete.id, {
                            id: athlete.id,
                            family_id: null,
                            first_name: athlete.first_name,
                            last_name: athlete.last_name,
                            date_of_birth: athlete.birthdate ? new Date(athlete.birthdate).toISOString().split('T')[0] : '',
                            gender: athlete.gender,
                            preferred_name: athlete.preferred_name ?? null,
                            jersey_number: athlete.jersey_number ?? null,
                            medical_notes: athlete.medical_notes ?? null,
                            allergies: athlete.allergies ?? null,
                            emergency_contact_name: athlete.emergency_contact_name ?? null,
                            emergency_contact_phone: athlete.emergency_contact_phone ?? null,
                            phone: athlete.phone ?? null,
                            email: athlete.email ?? null,
                            photo_url: null,
                            profile_photo_updated_at: athlete.profile_photo_updated_at ?? null,
                            has_profile_photo: athlete.has_profile_photo ?? false,
                            org_id: athlete.org_id,
                            created_at: athlete.created_at ?? new Date().toISOString(),
                            updated_at: athlete.updated_at ?? new Date().toISOString(),
                            deleted_at: athlete.deleted_at,
                            sports: [],
                            has_active_guardian: false,
                          } as unknown as Athlete)
                        }
                      })
                      setAthletes(Array.from(uniqueAthletes.values()))
                      setError(null)
                    } else {
                      setAthletes([])
                      setError(null)
                    }
                    setLoading(false)
                  }
                })
            })
        })
    } else {
      // For parents/coaches, or athletes in fake data mode, use existing logic
      // Note: In fake data mode, athletes will see fake athlete data (realistic team view)
      getAthletes(context)
        .then(({ data, error: fetchError }) => {
          console.log('[Athletes] Promise resolved, requestId:', currentRequestId, 'current:', requestIdRef.current, 'mounted:', isMountedRef.current)
          // Only update state if this is the latest request and component is still mounted
          if (currentRequestId === requestIdRef.current && isMountedRef.current) {
            console.log('[Athletes] Updating state with data:', data?.length)
            if (fetchError) {
              const errorMessage = fetchError.message || 'Failed to load athletes. Please try again.'
              console.error('[Athletes] Error fetching athletes:', fetchError)
              setError(errorMessage)
              setAthletes([])
              showError(errorMessage)
            } else if (data) {
              console.log('[Athletes] Setting athletes:', data.length)
              setAthletes(data)
              setError(null)
            } else {
              console.log('[Athletes] No data, setting empty')
              setAthletes([])
              setError(null)
            }
            console.log('[Athletes] Setting loading to false')
            setLoading(false)
          } else {
            console.log('[Athletes] Skipping update - stale or unmounted')
          }
        })
        .catch((err) => {
          console.error('[Athletes] Exception fetching athletes:', err)
          if (currentRequestId === requestIdRef.current && isMountedRef.current) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load athletes. Please try again.'
            setError(errorMessage)
            setAthletes([])
            setLoading(false)
            showError(errorMessage)
          }
        })
    }
    
    // Cleanup function to mark as unmounted when effect re-runs or component unmounts
    return () => {
      console.log('[Athletes] Effect cleanup, setting mounted to false')
      isMountedRef.current = false
    }
  }, [context.userId, context.orgId, isReady, isAthlete])

  const fetchAthletes = () => {
    if (!isReady) return
    
    const currentRequestId = ++requestIdRef.current
    setLoading(true)
    setError(null)
    
    getAthletes(context)
      .then(({ data, error: fetchError }) => {
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
      })
      .catch((err) => {
        console.error('[Athletes] Exception fetching athletes:', err)
        if (currentRequestId === requestIdRef.current && isMountedRef.current) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to load athletes. Please try again.'
          setError(errorMessage)
          setAthletes([])
          setLoading(false)
          showError(errorMessage)
        }
      })
  }

  const handleCardClick = (athleteId: string) => {
    if (loading) return
    // For athletes, navigate to profile page; for parents, navigate to edit page
    if (isAthlete) {
      navigate(`/portal/athletes/${athleteId}/profile`)
    } else {
      navigate(`/portal/athletes/${athleteId}/edit`)
    }
  }

  const handleAddAthleteClick = () => {
    if (loading) return
    setShowAddAthleteDialog(true)
  }

  const handleClaimAthlete = () => {
    setShowAddAthleteDialog(false)
    navigate('/portal/athletes/request-attachment')
  }

  const handleAddNewAthlete = () => {
    setShowAddAthleteDialog(false)
    navigate('/portal/athletes/new')
  }

  const handleRetry = () => {
    fetchAthletes()
  }

  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: isAthlete ? 'My Team' : 'My Athletes' },
      ]}
    >
      <div className="mb-8 sm:mb-12 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6">
        <div className="flex-1">
          <PageTitle>{isAthlete ? 'My Team' : 'My Athletes'}</PageTitle>
          <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-light tracking-wide">
            {isAthlete ? 'View your team members and their profiles.' : 'Manage your children\'s profiles and information.'}
          </p>
        </div>
        {!isAthlete && (
          <Button variant="primary" onClick={handleAddAthleteClick} disabled={loading} className="w-full sm:w-auto">
            Add Athlete
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900 dark:border-white"></div>
        </div>
      ) : error ? (
        <Card className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full mb-4">
            <Icon name="error" size="text-4xl" className="text-red-500" />
          </div>
          <CardTitle className="mb-2 text-red-600 dark:text-red-400">Failed to Load Athletes</CardTitle>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{error}</p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button variant="primary" onClick={handleRetry} disabled={loading} className="w-full sm:w-auto">
              Retry
            </Button>
            {!isAthlete && (
              <Button variant="secondary" onClick={handleAddAthleteClick} disabled={loading} className="w-full sm:w-auto">
                Add Athlete
              </Button>
            )}
          </div>
        </Card>
      ) : athletes.length === 0 ? (
        <Card className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-neutral-900 rounded-full mb-4">
            <Icon name="group" size="text-4xl" className="text-gray-400" />
          </div>
          <CardTitle className="mb-2">{isAthlete ? t('portal.athletes.noTeamMembers') : t('portal.children.noChildren')}</CardTitle>
          <p className="text-gray-500 dark:text-gray-400 mb-6">{isAthlete ? t('portal.athletes.noTeamMembersDescription') : t('portal.children.addChildren')}</p>
          {!isAthlete && (
            <Button variant="primary" onClick={handleAddAthleteClick} disabled={loading}>
              {t('portal.children.add')}
            </Button>
          )}
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
                noPadding
                className="relative overflow-hidden rounded-xl hover:shadow-2xl hover:shadow-[var(--org-btn-primary-bg, #137fec)]/20 transition-all duration-300 cursor-pointer group"
                onClick={() => handleCardClick(athlete.id)}
              >
                {/* Image spans full card */}
                <div className="w-full aspect-[4/3] relative bg-gray-100 dark:bg-neutral-900 flex items-center justify-center overflow-hidden">
                  <AthleteAvatar athlete={athlete} size="xl" className="w-full h-full rounded-none object-cover" />
                  {/* Gradient overlay for better text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                </div>

                {/* Content Overlay - enough bottom padding so full name is visible */}
                <div className="absolute inset-0 flex flex-col justify-end pb-6 pt-4 px-4">
                  <div className="text-white">
                    <CardTitle className="text-xl font-bold mb-1 text-white drop-shadow-lg break-words">{displayName}</CardTitle>
                    
                    <div className="flex flex-wrap gap-2 text-sm font-medium text-white/95 mb-3 drop-shadow">
                      {age !== null && (
                        <span>Age {age}</span>
                      )}
                      {genderLabel !== 'Not specified' && (
                        <>
                          {age !== null && <span>&bull;</span>}
                          <span>{genderLabel}</span>
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

                    {/* Action Button */}
                    <Button
                      variant="secondary"
                      className="w-full text-sm px-4 py-2 bg-white/95 hover:bg-white text-gray-900 dark:text-gray-900 font-semibold border-0 shadow-lg opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleCardClick(athlete.id)
                      }}
                      disabled={loading}
                    >
                      {isAthlete ? 'View Profile' : 'Edit Profile'}
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Add Athlete Choice Dialog */}
      {showAddAthleteDialog && typeof document !== 'undefined' && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-athlete-dialog-title"
          onClick={() => setShowAddAthleteDialog(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-xl border-2 border-gray-200 bg-white p-6 dark:border-neutral-700 dark:bg-black"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="add-athlete-dialog-title" className="text-xl font-black uppercase tracking-wide text-gray-900 dark:text-gray-100">
                Add Athlete
              </h2>
              <button
                type="button"
                onClick={() => setShowAddAthleteDialog(false)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="mb-6 text-sm font-medium text-gray-600 dark:text-gray-400">
              Choose how you want to add an athlete to your account.
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={handleClaimAthlete}
                className="flex items-center gap-4 rounded-lg border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-[var(--org-link-color)]/30 hover:bg-gray-50 dark:border-neutral-700 dark:bg-black dark:hover:bg-neutral-900"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--org-btn-primary-bg)]/10">
                  <Link2 className="h-6 w-6 text-[var(--org-link-color)]" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">Claim an Athlete</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Request to attach to an existing athlete profile
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={handleAddNewAthlete}
                className="flex items-center gap-4 rounded-lg border-2 border-gray-200 bg-white p-4 text-left transition-all hover:border-[var(--org-link-color)]/30 hover:bg-gray-50 dark:border-neutral-700 dark:bg-black dark:hover:bg-neutral-900"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--org-btn-primary-bg)]/10">
                  <UserPlus className="h-6 w-6 text-[var(--org-link-color)]" />
                </div>
                <div className="flex-1">
                  <p className="text-base font-bold text-gray-900 dark:text-gray-100">Add New Athlete</p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Create a new athlete profile from scratch
                  </p>
                </div>
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAddAthleteDialog(false)}
                className="rounded-lg border-2 border-gray-200 bg-white px-4 py-2 text-sm font-bold uppercase tracking-wide text-gray-700 transition-colors hover:bg-gray-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-gray-200 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </PortalLayout>
  )
}

