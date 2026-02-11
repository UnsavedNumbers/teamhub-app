/**
 * Programs Management
 *
 * View and manage programs with sport filtering.
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getSports, getPrograms, deleteProgram, getSportBySlug } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getTeams } from '../../data/services/teamsService'
import type { Sport, Program, Level, Team } from '../../data/types/organization'
import { AdminPageHeader, Select, ConfirmDialog, Button, Card, EmptyState, Badge, InlineNotice } from '../../components/admin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import './Programs.css'
import '../../styles/orgAdmin.css'

export default function Programs() {
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const params = useParams<{ sport_slug?: string }>()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deletingProgramId, setDeletingProgramId] = useState<string | null>(null)
  const [programToDelete, setProgramToDelete] = useState<{ id: string; name: string } | null>(null)

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage)
      // Clear the state to prevent showing it again on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  
  // Get sport slug from route param (new way) or fallback to query param (backward compatibility)
  const sportSlugFromRoute = params.sport_slug
  const sportIdFromQuery = searchParams.get('sport_id') || ''
  
  // State for the filtered sport ID (derived from slug or query param)
  const [filterSportId, setFilterSportId] = useState<string>('')

  const loadProgramsData = useCallback(async () => {
    if (!isReady) return

    setLoading(true)
    setError(null)
    setActionError(null)

    try {
      // If we have a sport slug from route, load that sport first
      let sportFromSlug: Sport | null = null
      if (sportSlugFromRoute) {
        const sportResult = await getSportBySlug(context, sportSlugFromRoute)
        if (sportResult.error) {
          setError(`Failed to load sport: ${sportResult.error.message}`)
          setLoading(false)
          return
        }
        sportFromSlug = sportResult.data
      }

      const [sportsResult, programsResult, levelsResult, teamsResult] = await Promise.all([
        getSports(context), 
        getPrograms(context),
        getLevels(context),
        getTeams(context)
      ])

      // Check for errors in results
      if (sportsResult.error || programsResult.error || levelsResult.error || teamsResult.error) {
        const errors: string[] = []
        
        if (sportsResult.error) {
          errors.push(`Sports: ${sportsResult.error.message || sportsResult.error.toString()}`)
        }
        if (programsResult.error) {
          errors.push(`Programs: ${programsResult.error.message || programsResult.error.toString()}`)
        }
        if (levelsResult.error) {
          errors.push(`Levels: ${levelsResult.error.message || levelsResult.error.toString()}`)
        }
        if (teamsResult.error) {
          errors.push(`Teams: ${teamsResult.error.message || teamsResult.error.toString()}`)
        }
        
        console.error('[Programs] Load errors:', { sportsResult, programsResult, levelsResult, teamsResult })
        setError(errors.join('; ') || 'Failed to load data')
        return
      }

      setSports(sportsResult.data as Sport[])
      setPrograms(programsResult.data as Program[])
      setLevels(levelsResult.data as Level[])
      setTeams(teamsResult.data as Team[])

      // Set filter based on route slug or query param
      if (sportFromSlug) {
        setFilterSportId(sportFromSlug.id)
      } else if (sportIdFromQuery) {
        // Backward compatibility: check if sport exists
        const sportExists = (sportsResult.data as Sport[]).some((s) => s.id === sportIdFromQuery)
        if (sportExists) {
          setFilterSportId(sportIdFromQuery)
        }
      }
    } catch (err) {
      console.error('[Programs] Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [context, isReady, sportSlugFromRoute, sportIdFromQuery])

  useEffect(() => {
    loadProgramsData()
  }, [loadProgramsData])

  // Update URL when filter changes
  useEffect(() => {
    if (filterSportId && filterSportId.trim()) {
      const sport = sports.find((s) => s.id === filterSportId)
      if (sport && sport.slug) {
        // Prefer slug-based route
        if (!sportSlugFromRoute || sportSlugFromRoute !== sport.slug) {
          navigate(getLink('admin.programs.bySport', { sport_slug: sport.slug }), { replace: true })
        }
      } else if (sport && !sportSlugFromRoute) {
        setSearchParams({ sport_id: filterSportId }, { replace: true })
      } else if (!sport) {
        setFilterSportId('')
        if (!sportSlugFromRoute) setSearchParams({}, { replace: true })
      }
    } else {
      // "All sports" selected
      if (sportSlugFromRoute) {
        navigate(getLink('admin.programs.list'), { replace: true })
      } else {
        setSearchParams({}, { replace: true })
      }
    }
  }, [filterSportId, setSearchParams, sports, sportSlugFromRoute, navigate])

  // Filter programs by selected sport
  const filteredPrograms = useMemo(() => {
    if (!filterSportId) return programs
    return programs.filter((p) => p.sport_id === filterSportId)
  }, [programs, filterSportId])

  const sportById = useMemo(() => new Map(sports.map((s) => [s.id, s])), [sports])

  const programLevels = (programId: string) => levels.filter((l) => l.program_id === programId)
  const levelTeams = (levelId: string) => teams.filter((t) => t.level_id === levelId)

  // Route definitions
  const sportsRoute = getLink('admin.sports.list')
  const programsRoute = getLink('admin.programs.list')
  const formsRoute = getLink('admin.organization.forms')
  const structureRoute = getLink('admin.organization.structure')
  const levelsRoute = getLink('admin.levels.list')
  const teamsRoute = getLink('admin.teams.list')

  const handleNavigateToProgramDetail = useCallback(
    (programId: string) => {
      if (!programId || !programId.trim()) {
        setActionError('Program ID is required to view program details.')
        return
      }
      navigate(getLink('admin.programs.detail', { id: programId.trim() }))
    },
    [navigate]
  )

  const handleNavigateToSports = useCallback(() => {
    navigate(sportsRoute)
  }, [navigate, sportsRoute])

  const handleNavigateToAddProgram = useCallback(
    (sportId: string) => {
      if (isOffline) {
        setActionError('You appear to be offline. Please reconnect and try again.')
        return
      }
      if (USE_FAKE_DATA) {
        setActionError('This action is not available in demo mode. Please sign in to add programs.')
        return
      }
      if (!sportId || !sportId.trim()) {
        setActionError('Sport ID is required to add a program.')
        return
      }
      navigate(`${formsRoute}?type=program&sport_id=${encodeURIComponent(sportId.trim())}&returnUrl=${encodeURIComponent(programsRoute)}`)
    },
    [navigate, isOffline, formsRoute, programsRoute]
  )

  const handleNavigateToEditProgram = useCallback(
    (programId: string) => {
      if (!programId || !programId.trim()) {
        setActionError('Program ID is required to edit program.')
        return
      }
      navigate(`${getLink('admin.programs.update', { id: programId.trim() })}?returnUrl=${encodeURIComponent(programsRoute)}`)
    },
    [navigate, programsRoute]
  )

  const handleNavigateToAddLevel = useCallback(
    (programId: string, sportId: string | null | undefined) => {
      if (isOffline) {
        setActionError('You appear to be offline. Please reconnect and try again.')
        return
      }
      if (USE_FAKE_DATA) {
        setActionError('This action is not available in demo mode. Please sign in to add levels.')
        return
      }
      if (!programId || !programId.trim()) {
        setActionError('Program ID is required to add a level.')
        return
      }
      if (!sportId || !sportId.trim()) {
        setActionError('Sport ID is required to add a level.')
        return
      }
      navigate(`${formsRoute}?type=level&program_id=${encodeURIComponent(programId.trim())}&sport_id=${encodeURIComponent(sportId.trim())}&returnUrl=${encodeURIComponent(programsRoute)}`)
    },
    [navigate, isOffline, formsRoute, programsRoute]
  )

  const handleNavigateToLevels = useCallback(
    (programId: string) => {
      if (!programId || !programId.trim()) {
        setActionError('Program ID is required to view levels.')
        return
      }
      navigate(`${levelsRoute}?program_id=${encodeURIComponent(programId.trim())}`)
    },
    [navigate, levelsRoute]
  )

  const handleNavigateToTeams = useCallback(
    (programId: string) => {
      if (!programId || !programId.trim()) {
        setActionError('Program ID is required to view teams.')
        return
      }
      navigate(`${teamsRoute}?program_id=${encodeURIComponent(programId.trim())}`)
    },
    [navigate, teamsRoute]
  )

  const handleDeleteProgram = useCallback(
    (programId: string, programName: string) => {
      if (!programId || !programId.trim()) {
        setActionError('Program ID is required to remove program.')
        return
      }
      if (isOffline) {
        setActionError('You appear to be offline. Please reconnect and try again.')
        return
      }
      if (USE_FAKE_DATA) {
        setActionError('This action is not available in demo mode. Please sign in to remove programs.')
        return
      }
      setProgramToDelete({ id: programId.trim(), name: programName })
    },
    [isOffline]
  )

  const confirmDeleteProgram = useCallback(
    async () => {
      if (!programToDelete || !programToDelete.id) {
        setActionError('Program information is missing.')
        setProgramToDelete(null)
        return
      }

      setDeletingProgramId(programToDelete.id)
      setActionError(null)
      setSuccessMessage(null)

      try {
        const result = await deleteProgram(context, programToDelete.id)
        if (result.error) {
          setActionError(result.error.message || 'Failed to remove program.')
        } else {
          setPrograms((prev) => prev.filter((p) => p.id !== programToDelete.id))
          setSuccessMessage(`"${programToDelete.name}" has been removed.`)
          setTimeout(() => setSuccessMessage(null), 5000)
        }
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'An unexpected error occurred.')
      } finally {
        setDeletingProgramId(null)
        setProgramToDelete(null)
      }
    },
    [context, programToDelete]
  )

  if (loading) {
    return (
      <div className="oa-root">
        <div className="oa-skeleton oa-mb-8" style={{ width: '40%', height: '40px' }} />
        <div className="oa-skeleton" style={{ width: '100%', height: '400px' }} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="oa-root programs-page">
        <AdminPageHeader
          title="Programs"
          breadcrumbs={[{ label: 'Organizations', path: structureRoute }, { label: 'Programs' }]}
        />
        <Card className="oa-mb-4">
          <div className="oa-p-6 oa-text-center">
            <div className="oa-text-danger oa-mb-4">{error}</div>
            <Button variant="ghost" onClick={loadProgramsData}>Retry</Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="oa-root programs-page">
      <OfflineBanner />
      <AdminPageHeader
        title="Programs"
        subtitle="Manage programs within your sports."
        breadcrumbs={[
          { label: 'Organizations', path: structureRoute },
          { label: 'Programs' },
        ]}
      />

      {error && (
        <InlineNotice
          tone="error"
          title="We couldn't load programs"
          message={error}
          actions={
            <Button
              variant="ghost"
              size="dense"
              icon="refresh"
              onClick={loadProgramsData}
              disabled={loading}
            >
              Retry
            </Button>
          }
          onClose={() => setError(null)}
          className="oa-mb-4"
        />
      )}

      {successMessage && (
        <InlineNotice
          tone="success"
          title={successMessage}
          onClose={() => setSuccessMessage(null)}
          className="oa-mb-4"
        />
      )}

      {actionError && (
        <InlineNotice
          tone="error"
          title={actionError}
          onClose={() => setActionError(null)}
          className="oa-mb-4"
        />
      )}

      <Card className="oa-mb-6 oa-filter-section">
        <div className="oa-filter-row">
          <div className="oa-filter-control">
            <Select
              label="Filter by sport"
              value={filterSportId}
              onChange={(e) => setFilterSportId(e.target.value)}
              options={[
                { value: '', label: 'All sports' },
                ...sports.map((s) => ({ value: s.id, label: s.name })),
              ]}
              disabled={loading}
            />
          </div>
          {filterSportId && (
            <div className="oa-filter-actions">
              <Button
                onClick={() => handleNavigateToAddProgram(filterSportId)}
                disabled={loading || isOffline || USE_FAKE_DATA || !filterSportId}
                icon="add"
              >
                {USE_FAKE_DATA ? 'Sign in to Add Program' : 'Add Program'}
              </Button>
            </div>
          )}
        </div>
      </Card>

      <div className="oa-flex oa-flex-col oa-gap-4">
        {filteredPrograms.length === 0 ? (
          <Card>
            <EmptyState
              icon="category"
              title={filterSportId ? 'No programs for this sport' : 'No programs yet'}
              description={
                filterSportId 
                  ? `Create a program for ${sportById.get(filterSportId)?.name || 'this sport'}.`
                  : 'Start by selecting a sport or create a program from the Sports page.'
              }
              noCard
            >
              {filterSportId ? (
                <Button onClick={() => handleNavigateToAddProgram(filterSportId)} icon="add">Add Program</Button>
              ) : (
                <Button onClick={handleNavigateToSports}>View Sports</Button>
              )}
            </EmptyState>
          </Card>
        ) : (
          <Card className="oa-stacked-list">
            {filteredPrograms.map((program) => {
              const sport = sportById.get(program.sport_id)
              const levelsList = programLevels(program.id)
              const totalTeams = levelsList.reduce((sum, level) => sum + levelTeams(level.id).length, 0)
              const levelCount = levelsList.length

              return (
                <div key={program.id} className="oa-stacked-list-row programs-list-row">
                  <div className="oa-stacked-list-row-content">
                    <div className="oa-flex-1">
                      {sport && (
                        <div className="oa-mb-1">
                          <Badge variant="neutral" className="oa-uppercase oa-text-[10px] oa-font-bold oa-px-2 oa-py-0.5">
                            {sport.name}
                          </Badge>
                        </div>
                      )}
                      <div className="oa-flex oa-items-baseline oa-gap-2 oa-mb-2">
                        <span
                          className="oa-stacked-list-row-title programs-program-name oa-cursor-pointer hover:oa-underline oa-block"
                          onClick={() => handleNavigateToProgramDetail(program.id)}
                        >
                          {program.name}
                        </span>
                      </div>

                      <div className="programs-meta">
                        <span className="oa-text-xs oa-font-semibold oa-text-slate-500 oa-capitalize">
                          {program.gender_category}
                        </span>
                        <span
                          className="oa-text-xs oa-font-semibold oa-text-slate-500 hover:oa-text-primary oa-cursor-pointer"
                          onClick={() => handleNavigateToLevels(program.id)}
                        >
                          {levelCount} {levelCount === 1 ? 'LEVEL' : 'LEVELS'}
                        </span>
                        <span
                          className="oa-text-xs oa-font-semibold oa-text-slate-500 hover:oa-text-primary oa-cursor-pointer"
                          onClick={() => handleNavigateToTeams(program.id)}
                        >
                          {totalTeams} {totalTeams === 1 ? 'TEAM' : 'TEAMS'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="oa-stacked-list-row-actions">
                      <Button
                        variant="ghost"
                        size="dense"
                        onClick={() => handleNavigateToEditProgram(program.id)}
                        disabled={loading || deletingProgramId === program.id}
                        icon="edit"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="dense"
                        onClick={() => handleNavigateToAddLevel(program.id, program.sport_id)}
                        disabled={loading || isOffline || USE_FAKE_DATA || deletingProgramId === program.id}
                        icon="add"
                      >
                        Add Level
                      </Button>
                      <Button
                        variant="ghost"
                        size="dense"
                        onClick={() => handleDeleteProgram(program.id, program.name)}
                        disabled={deletingProgramId === program.id || loading || isOffline || USE_FAKE_DATA || levelCount > 0}
                        loading={deletingProgramId === program.id}
                        icon="delete"
                        className="oa-text-danger hover:oa-bg-danger-surface"
                      >
                         Delete
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </Card>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(programToDelete)}
        title="Remove program?"
        description={programToDelete ? `Are you sure you want to remove "${programToDelete.name}"? This action cannot be undone.` : ''}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmDeleteProgram}
        onCancel={() => setProgramToDelete(null)}
      />
    </div>
  )
}

