/**
 * Programs Management
 *
 * View and manage programs with sport filtering.
 */

import { useEffect, useState, useMemo } from 'react'
import { Link, useSearchParams, useLocation } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getSports, getPrograms, deleteProgram } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getTeams } from '../../data/services/teamsService'
import type { Sport, Program, Level, Team } from '../../data/types/organization'
import { AdminPageHeader, Select, ConfirmDialog } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'

export default function Programs() {
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()

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

  useEffect(() => {
    if (!isReady) return

    const load = async () => {
      setLoading(true)
      setError(null)

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
    }

    load()
  }, [context, isReady])

  // Update URL when filter changes
  useEffect(() => {
    if (filterSportId) {
      setSearchParams({ sport_id: filterSportId }, { replace: true })
    } else {
      setSearchParams({}, { replace: true })
    }
  }, [filterSportId, setSearchParams])

  // Filter programs by selected sport
  const filteredPrograms = useMemo(() => {
    if (!filterSportId) return programs
    return programs.filter((p) => p.sport_id === filterSportId)
  }, [programs, filterSportId])

  const sportById = new Map(sports.map((s) => [s.id, s]))

  const programLevels = (programId: string) => levels.filter((l) => l.program_id === programId)
  const levelTeams = (levelId: string) => teams.filter((t) => t.level_id === levelId)

  const handleDeleteProgram = (programId: string, programName: string) => {
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

    setProgramToDelete({ id: programId, name: programName })
  }

  const confirmDeleteProgram = async (_reason: string) => {
    if (!programToDelete) return

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
  }

  const sportsRoute = getLink('admin.organization.sports')
  const programsRoute = getLink('admin.organization.programs')
  const programDetailRoute = (id: string) => getLink('admin.organization.programDetail', { id })
  const formsRoute = getLink('admin.organization.forms')
  const structureRoute = getLink('admin.organization.structure')

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
        <AdminPageHeader
          title="Programs"
          subtitle="Manage programs within your sports."
          breadcrumbs={[
            { label: 'Organizations', path: structureRoute },
            { label: 'Programs' },
          ]}
        />
        <div className="p-6 bg-red-50 text-red-700 rounded-xl border border-red-100">
          {error}
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
              onChange={(e) => setFilterSportId(e.target.value)}
              options={[
                { value: '', label: 'All sports' },
                ...sports.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
          {filterSportId && (
            <Link 
              to={`${formsRoute}?type=program&sport_id=${filterSportId}&returnUrl=${encodeURIComponent(programsRoute)}`}
              className={`w-full md:w-auto ${isOffline || USE_FAKE_DATA ? 'pointer-events-none opacity-50' : ''}`}
            >
              <button className="w-full md:w-auto inline-flex items-center justify-center h-12 md:h-10 px-6 font-medium text-sm text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900">
                {USE_FAKE_DATA ? 'Sign in to Add Program' : 'Add Program'}
              </button>
            </Link>
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
              <Link 
                to={`${formsRoute}?type=program&sport_id=${filterSportId}&returnUrl=${encodeURIComponent(programsRoute)}`}
                className={isOffline || USE_FAKE_DATA ? 'pointer-events-none opacity-50' : ''}
              >
                <button className="inline-flex items-center justify-center h-12 md:h-10 px-6 font-medium text-sm text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900">
                  {USE_FAKE_DATA ? 'Sign in to Add Program' : 'Add Program'}
                </button>
              </Link>
            ) : (
              <Link to={sportsRoute}>
                <button className="inline-flex items-center justify-center h-12 md:h-10 px-6 font-medium text-sm text-white bg-slate-900 rounded-full hover:bg-slate-800 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900">
                  View Sports
                </button>
              </Link>
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
                      <Link to={programDetailRoute(program.id)} className="inline-block">
                        <h3 className="text-lg font-bold text-slate-900 hover:underline">
                          {program.name}
                        </h3>
                      </Link>
                      {sport && (
                        <Link 
                          to={`${sportsRoute}`}
                          className="text-sm font-medium text-slate-500 hover:text-slate-700"
                        >
                          ({sport.name})
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="uppercase tracking-wide font-medium">
                        {program.gender_category}
                      </span>
                      <span>•</span>
                      <span>{levelCount} {levelCount === 1 ? 'level' : 'levels'}</span>
                      <span>•</span>
                      <span>{totalTeams} {totalTeams === 1 ? 'team' : 'teams'}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Link 
                      to={`${formsRoute}?edit=program&id=${program.id}&returnUrl=${encodeURIComponent(programsRoute)}`}
                    >
                      <button className="inline-flex items-center justify-center h-9 px-4 font-medium text-xs text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-200">
                        Edit
                      </button>
                    </Link>
                    <Link 
                      to={`${formsRoute}?type=level&program_id=${program.id}&sport_id=${program.sport_id}&returnUrl=${encodeURIComponent(programsRoute)}`}
                      className={isOffline || USE_FAKE_DATA ? 'pointer-events-none opacity-50' : ''}
                    >
                      <button className="inline-flex items-center justify-center h-9 px-4 font-medium text-xs text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 hover:border-slate-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-200">
                        Add Level
                      </button>
                    </Link>
                    <button
                      onClick={() => handleDeleteProgram(program.id, program.name)}
                      disabled={deletingProgramId === program.id || isOffline || USE_FAKE_DATA || levelCount > 0}
                      className="inline-flex items-center justify-center h-9 px-4 font-medium text-xs text-red-700 bg-white border border-red-200 rounded-md hover:bg-red-50 hover:border-red-300 transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
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
                          <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px', marginRight: '4px' }}>refresh</span>
                          Removing...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined" style={{ fontSize: '16px', marginRight: '4px' }}>delete</span>
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
