/**
 * Programs Management
 *
 * View and manage programs with sport filtering.
 */

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getSports, getPrograms, deleteProgram } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getTeams } from '../../data/services/teamsService'
import type { Sport, Program, Level, Team } from '../../data/types/organization'
import { AdminPageHeader, Select, ConfirmDialog, Button } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'

export default function Programs() {
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()

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
  const [filterSportId, setFilterSportId] = useState<string>(searchParams.get('sport_id') || '')

  const loadProgramsData = useCallback(async () => {
    if (!isReady) return

    setLoading(true)
    setError(null)
    setActionError(null)

    try {
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
    } catch (err) {
      console.error('[Programs] Error loading data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [context, isReady])

  useEffect(() => {
    loadProgramsData()
  }, [loadProgramsData])

  // Update URL when filter changes
  useEffect(() => {
    if (filterSportId && filterSportId.trim()) {
      // Validate that the sport exists
      const sportExists = !filterSportId || sports.some((s) => s.id === filterSportId)
      if (sportExists) {
        setSearchParams({ sport_id: filterSportId }, { replace: true })
      } else {
        // Invalid sport ID, reset filter
        setFilterSportId('')
        setSearchParams({}, { replace: true })
      }
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [filterSportId, setSearchParams, sports])

  // Filter programs by selected sport
  const filteredPrograms = useMemo(() => {
    if (!filterSportId) return programs
    return programs.filter((p) => p.sport_id === filterSportId)
  }, [programs, filterSportId])

  const sportById = new Map(sports.map((s) => [s.id, s]))

  const programLevels = (programId: string) => levels.filter((l) => l.program_id === programId)
  const levelTeams = (levelId: string) => teams.filter((t) => t.level_id === levelId)

  // Route definitions (must be before handlers that use them)
  const sportsRoute = getLink('admin.sports.list')
  const programsRoute = getLink('admin.programs.list')
  const formsRoute = getLink('admin.organization.forms')
  const structureRoute = getLink('admin.organization.structure')
  const levelsRoute = getLink('admin.levels.list')
  const teamsRoute = getLink('admin.teams.list')

  // Navigation handlers with validation
  const handleNavigateToProgramDetail = useCallback(
    (programId: string) => {
      if (!programId || !programId.trim()) {
        setActionError('Program ID is required to view program details.')
        return
      }
      const route = getLink('admin.programs.detail', { id: programId.trim() })
      navigate(route)
    },
    [navigate]
  )

  const handleNavigateToSports = useCallback(() => {
    navigate(sportsRoute)
  }, [navigate])

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
      const route = `${formsRoute}?type=program&sport_id=${encodeURIComponent(sportId.trim())}&returnUrl=${encodeURIComponent(programsRoute)}`
      navigate(route)
    },
    [navigate, isOffline, formsRoute, programsRoute]
  )

  const handleNavigateToEditProgram = useCallback(
    (programId: string) => {
      if (!programId || !programId.trim()) {
        setActionError('Program ID is required to edit program.')
        return
      }
      const route = `${formsRoute}?edit=program&id=${encodeURIComponent(programId.trim())}&returnUrl=${encodeURIComponent(programsRoute)}`
      navigate(route)
    },
    [navigate, formsRoute, programsRoute]
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
      const route = `${formsRoute}?type=level&program_id=${encodeURIComponent(programId.trim())}&sport_id=${encodeURIComponent(sportId.trim())}&returnUrl=${encodeURIComponent(programsRoute)}`
      navigate(route)
    },
    [navigate, isOffline, formsRoute, programsRoute]
  )

  const handleNavigateToLevels = useCallback(
    (programId: string) => {
      if (!programId || !programId.trim()) {
        setActionError('Program ID is required to view levels.')
        return
      }
      const route = `${levelsRoute}?program_id=${encodeURIComponent(programId.trim())}`
      navigate(route)
    },
    [navigate, levelsRoute]
  )

  const handleNavigateToTeams = useCallback(
    (programId: string) => {
      if (!programId || !programId.trim()) {
        setActionError('Program ID is required to view teams.')
        return
      }
      const route = `${teamsRoute}?program_id=${encodeURIComponent(programId.trim())}`
      navigate(route)
    },
    [navigate, teamsRoute]
  )

  const handleDeleteProgram = useCallback(
    (programId: string, programName: string) => {
      if (!programId || !programId.trim()) {
        setActionError('Program ID is required to remove program.')
        return
      }

      // Block if offline
      if (isOffline) {
        setActionError('You appear to be offline. Please reconnect and try again.')
        return
      }

      // Block if in demo mode
      if (USE_FAKE_DATA) {
        setActionError('This action is not available in demo mode. Please sign in to remove programs from your organization.')
        return
      }

      setProgramToDelete({ id: programId.trim(), name: programName })
    },
    [isOffline]
  )

  const confirmDeleteProgram = useCallback(
    async (_reason: string) => {
      if (!programToDelete || !programToDelete.id) {
        setActionError('Program information is missing. Please try again.')
        setProgramToDelete(null)
        return
      }

      setDeletingProgramId(programToDelete.id)
      setActionError(null)
      setSuccessMessage(null)

      try {
        const result = await deleteProgram(context, programToDelete.id)

        if (result.error) {
          setActionError(result.error.message || 'Failed to remove program. Please try again.')
        } else {
          // Remove from local state
          setPrograms((prev) => prev.filter((p) => p.id !== programToDelete.id))
          setSuccessMessage(`"${programToDelete.name}" has been removed from your organization.`)

          // Clear success message after 5 seconds
          setTimeout(() => {
            setSuccessMessage(null)
          }, 5000)
        }
      } catch (err) {
        console.error('[Programs] Unexpected error deleting program:', err)
        setActionError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
      } finally {
        setDeletingProgramId(null)
        setProgramToDelete(null)
      }
    },
    [context, programToDelete]
  )

  const handleFilterChange = useCallback(
    (value: string) => {
      setFilterSportId(value)
      setActionError(null)
    },
    []
  )

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-100 rounded w-1/2 mb-12"></div>
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-slate-100 rounded-xl"></div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <OfflineBanner />
        <AdminPageHeader
          title="Programs"
          subtitle="Manage programs within your sports."
          breadcrumbs={[
            { label: 'Organizations', path: structureRoute },
            { label: 'Programs' },
          ]}
        />
        <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-100 mb-4">
          <div className="font-medium mb-2">{error}</div>
          <Button variant="ghost" size="dense" onClick={loadProgramsData} disabled={loading}>
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <OfflineBanner />
      <AdminPageHeader
        title="Programs"
        subtitle="Manage programs within your sports."
        breadcrumbs={[
          { label: 'Organizations', path: structureRoute },
          { label: 'Programs' },
        ]}
      />

      {successMessage && (
        <div className="p-3 bg-green-50 text-green-700 rounded-lg border-l-4 border-green-500 mb-4">
          <div className="text-sm font-medium">{successMessage}</div>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg border-l-4 border-red-500 mb-4">
          <div className="text-sm font-medium">{actionError}</div>
        </div>
      )}

      <div className="mb-6 p-4 bg-white border border-slate-200 rounded-xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="w-full md:w-auto md:min-w-[200px]">
            <Select
              label="Filter by sport"
              value={filterSportId}
              onChange={(e) => handleFilterChange(e.target.value)}
              options={[
                { value: '', label: 'All sports' },
                ...sports.map((s) => ({ value: s.id, label: s.name })),
              ]}
              disabled={loading}
              aria-label="Filter programs by sport"
            />
          </div>
          {filterSportId && (
            <button
              onClick={() => handleNavigateToAddProgram(filterSportId)}
              disabled={loading || isOffline || USE_FAKE_DATA || !filterSportId}
              className="w-full md:w-auto inline-flex items-center justify-center h-12 md:h-10 px-6 font-medium text-sm text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={USE_FAKE_DATA ? 'Sign in to add program' : `Add program for ${sportById.get(filterSportId)?.name || 'selected sport'}`}
              title={
                isOffline
                  ? 'Offline - cannot add programs'
                  : USE_FAKE_DATA
                    ? 'Sign in to add programs'
                    : !filterSportId
                      ? 'Select a sport first'
                      : undefined
              }
            >
              {USE_FAKE_DATA ? 'Sign in to Add Program' : 'Add Program'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {filteredPrograms.length === 0 ? (
          <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
            <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">category</span>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              {filterSportId ? 'No programs for this sport' : 'No programs yet'}
            </h3>
            <p className="text-slate-500 mb-6">
              {filterSportId 
                ? `Create a program for ${sportById.get(filterSportId)?.name || 'this sport'}.`
                : 'Start by selecting a sport or create a program from the Sports page.'}
            </p>
            {filterSportId ? (
              <button
                onClick={() => handleNavigateToAddProgram(filterSportId)}
                disabled={loading || isOffline || USE_FAKE_DATA || !filterSportId}
                className="inline-flex items-center justify-center h-12 md:h-10 px-6 font-medium text-sm text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label={USE_FAKE_DATA ? 'Sign in to add program' : `Add program for ${sportById.get(filterSportId)?.name || 'selected sport'}`}
                title={
                  isOffline
                    ? 'Offline - cannot add programs'
                    : USE_FAKE_DATA
                      ? 'Sign in to add programs'
                      : !filterSportId
                        ? 'Select a sport first'
                        : undefined
                }
              >
                {USE_FAKE_DATA ? 'Sign in to Add Program' : 'Add Program'}
              </button>
            ) : (
              <button
                onClick={handleNavigateToSports}
                disabled={loading}
                className="inline-flex items-center justify-center h-12 md:h-10 px-6 font-medium text-sm text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Navigate to sports list"
              >
                View Sports
              </button>
            )}
          </div>
        ) : (
          filteredPrograms.map((program) => {
            const sport = sportById.get(program.sport_id)
            const programLevelsList = programLevels(program.id)
            const totalTeams = programLevelsList.reduce((sum, level) => sum + levelTeams(level.id).length, 0)
            const levelCount = programLevelsList.length

            return (
              <div 
                key={program.id} 
                className="group bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md p-6"
              >
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <button
                        onClick={() => handleNavigateToProgramDetail(program.id)}
                        disabled={loading || !program.id}
                        className="text-left text-lg font-bold text-slate-900 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label={`View details for ${program.name}`}
                      >
                        {program.name}
                      </button>
                      {sport && (
                        <button
                          onClick={handleNavigateToSports}
                          disabled={loading}
                          className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label={`View ${sport.name} sport details`}
                        >
                          ({sport.name})
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="uppercase tracking-wide font-medium">
                        {program.gender_category}
                      </span>
                      <span>•</span>
                      <button
                        onClick={() => handleNavigateToLevels(program.id)}
                        disabled={loading || !program.id}
                        className="hover:text-slate-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label={`View ${levelCount} ${levelCount === 1 ? 'level' : 'levels'} for ${program.name}`}
                      >
                        {levelCount} {levelCount === 1 ? 'level' : 'levels'}
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleNavigateToTeams(program.id)}
                        disabled={loading || !program.id}
                        className="hover:text-slate-700 hover:underline disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        aria-label={`View ${totalTeams} ${totalTeams === 1 ? 'team' : 'teams'} for ${program.name}`}
                      >
                        {totalTeams} {totalTeams === 1 ? 'team' : 'teams'}
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleNavigateToEditProgram(program.id)}
                      disabled={loading || !program.id || deletingProgramId === program.id}
                      className="inline-flex items-center justify-center h-9 px-4 font-medium text-xs text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Edit ${program.name}`}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleNavigateToAddLevel(program.id, program.sport_id)}
                      disabled={loading || isOffline || USE_FAKE_DATA || !program.id || !program.sport_id || deletingProgramId === program.id}
                      className="inline-flex items-center justify-center h-9 px-4 font-medium text-xs text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Add level to ${program.name}`}
                      title={
                        isOffline
                          ? 'Offline - cannot add levels'
                          : USE_FAKE_DATA
                            ? 'Sign in to add levels'
                            : !program.id || !program.sport_id
                              ? 'Missing required information'
                              : undefined
                      }
                    >
                      Add Level
                    </button>
                    <button
                      onClick={() => handleDeleteProgram(program.id, program.name)}
                      disabled={deletingProgramId === program.id || loading || isOffline || USE_FAKE_DATA || levelCount > 0 || !program.id}
                      className="inline-flex items-center justify-center h-9 px-4 font-medium text-xs text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      aria-label={`Remove ${program.name} from organization`}
                      title={
                        USE_FAKE_DATA 
                          ? 'Sign in to remove program' 
                          : isOffline 
                          ? 'Offline - cannot remove program' 
                          : levelCount > 0
                          ? `Cannot remove: This program contains ${levelCount} ${levelCount === 1 ? 'level' : 'levels'} and cannot be removed.`
                          : 'Remove program from organization'
                      }
                    >
                      {deletingProgramId === program.id ? (
                        <>
                          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px', marginRight: '4px' }} aria-hidden="true">refresh</span>
                          Removing...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '4px' }} aria-hidden="true">delete</span>
                          Remove
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
      <ConfirmDialog
        open={Boolean(programToDelete)}
        title="Remove program?"
        description={
          programToDelete
            ? `Are you sure you want to remove "${programToDelete.name}" from your organization? This action cannot be undone.`
            : ''
        }
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmDeleteProgram}
        onCancel={() => setProgramToDelete(null)}
      />
    </div>
  )
}
