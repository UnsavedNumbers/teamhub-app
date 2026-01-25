/**
 * Teams Management
 *
 * Table view with filtering by season, sport, program, level, and status.
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import type { ReactNode } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { getTeams, deleteTeam } from '../../data/services/teamsService'
import { getSports, getPrograms } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getSeasons } from '../../data/services/seasonsService'
import type { Team, Sport, Program, Level, Season } from '../../data/types/organization'
import { AdminPageHeader, Button, ConfirmDialog, EmptyState } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'

export default function TeamsManagement() {
  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null)
  const [teamToDelete, setTeamToDelete] = useState<{ id: string; name: string } | null>(null)
  const [navigating, setNavigating] = useState(false)
  const isMountedRef = useRef(true)

  // Check for success message from navigation state
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage)
      // Clear the state to prevent showing it again on refresh
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const [teams, setTeams] = useState<Team[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])

  const [filterSeasonId, setFilterSeasonId] = useState<string>('')
  const [filterSportId, setFilterSportId] = useState<string>('')
  const [filterProgramId, setFilterProgramId] = useState<string>('')
  const [filterLevelId, setFilterLevelId] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const fetchData = useCallback(async () => {
    if (!isReady) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const teamsResult = await getTeams(context)
      const sportsResult = await getSports(context)
      const programsResult = await getPrograms(context)
      const levelsResult = await getLevels(context)
      const seasonsResult = await getSeasons(context)

      if (!isMountedRef.current) {
        return
      }

      // Check for critical errors that should stop the page from loading
      if (teamsResult.error || sportsResult.error || programsResult.error || levelsResult.error || seasonsResult.error) {
        const errors: string[] = []
        
        if (teamsResult.error) {
          errors.push(`Teams: ${teamsResult.error.message || teamsResult.error.toString()}`)
        }
        if (sportsResult.error) {
          errors.push(`Sports: ${sportsResult.error.message || sportsResult.error.toString()}`)
        }
        if (programsResult.error) {
          errors.push(`Programs: ${programsResult.error.message || programsResult.error.toString()}`)
        }
        if (levelsResult.error) {
          errors.push(`Levels: ${levelsResult.error.message || levelsResult.error.toString()}`)
        }
        if (seasonsResult.error) {
          errors.push(`Seasons: ${seasonsResult.error.message || seasonsResult.error.toString()}`)
        }
        
        console.error('[TeamsManagement] Load errors:', { teamsResult, sportsResult, programsResult, levelsResult, seasonsResult })
        setError(errors.join('; ') || 'Failed to load data')
        setLoading(false)
        return
      }

      // Set data if no errors
      setTeams(Array.isArray(teamsResult.data) ? teamsResult.data : [])
      setSports(Array.isArray(sportsResult.data) ? sportsResult.data : [])
      setPrograms(Array.isArray(programsResult.data) ? programsResult.data : [])
      setLevels(Array.isArray(levelsResult.data) ? levelsResult.data : [])
      setSeasons(Array.isArray(seasonsResult.data) ? seasonsResult.data : [])
      
      // Data loaded successfully
    } catch (err) {
      if (isMountedRef.current) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [context, isReady])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const sportById = useMemo(() => new Map(sports.map((s) => [s.id, s])), [sports])
  const programById = useMemo(() => new Map(programs.map((p) => [p.id, p])), [programs])
  const levelById = useMemo(() => new Map(levels.map((l) => [l.id, l])), [levels])

  // Compute prerequisite flag using useMemo for consistency
  const canCreateTeam = useMemo(
    () => !loading && Array.isArray(levels) && levels.length > 0,
    [loading, levels.length]
  )

  const handleDeleteTeam = useCallback(
    (teamId: string, teamName: string, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation()
      }

      // Block if offline
      if (isOffline) {
        setActionError('You appear to be offline. Please reconnect and try again.')
        return
      }

      // Block if in demo mode
      if (USE_FAKE_DATA) {
        setActionError('This action is not available in demo mode. Please sign in to remove teams from your organization.')
        return
      }

      // Block if already deleting
      if (deletingTeamId) {
        return
      }

      setTeamToDelete({ id: teamId, name: teamName })
    },
    [isOffline, deletingTeamId]
  )

  const confirmDeleteTeam = useCallback(
    async () => {
      if (!teamToDelete || deletingTeamId) return

      setDeletingTeamId(teamToDelete.id)
      setActionError(null)
      setSuccessMessage(null)

      try {
        const result = await deleteTeam(context, teamToDelete.id)

        if (!isMountedRef.current) return

        if (result.error) {
          setActionError(result.error.message || 'Failed to remove team. Please try again.')
        } else {
          // Remove from local state
          setTeams((prev) => prev.filter((t) => t.id !== teamToDelete.id))
          setSuccessMessage(`"${teamToDelete.name}" has been removed from your organization.`)

          // Clear success message after 5 seconds
          setTimeout(() => {
            if (isMountedRef.current) {
              setSuccessMessage(null)
            }
          }, 5000)
        }
      } catch (err) {
        console.error('[TeamsManagement] Unexpected error deleting team:', err)
        if (isMountedRef.current) {
          setActionError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')
        }
      } finally {
        if (isMountedRef.current) {
          setDeletingTeamId(null)
          setTeamToDelete(null)
        }
      }
    },
    [teamToDelete, deletingTeamId, context]
  )

  const handleTeamClick = useCallback(
    (teamId: string) => {
      if (!teamId || navigating || deletingTeamId) return

      setNavigating(true)
      navigate(getLink('admin.teams.detail', { id: teamId }))
    },
    [navigate, navigating, deletingTeamId]
  )

  const handleAddTeam = useCallback(() => {
    if (navigating || !canCreateTeam) return

    setNavigating(true)
    navigate(`${getLink('admin.organization.forms')}?type=team&returnUrl=${encodeURIComponent(getLink('admin.teams.list'))}`)
  }, [navigate, navigating, canCreateTeam])

  const handleDismissError = useCallback(() => {
    setActionError(null)
  }, [])

  const handleDismissSuccess = useCallback(() => {
    setSuccessMessage(null)
  }, [])

  // Filter available programs based on selected sport
  const availablePrograms = filterSportId ? programs.filter((p) => p.sport_id === filterSportId) : programs

  // Filter available levels based on selected program
  const availableLevels = filterProgramId ? levels.filter((l) => l.program_id === filterProgramId) : levels

  const filteredTeams = teams.filter((team) => {
    if (filterSeasonId && !team.id.includes(filterSeasonId)) return false // TODO: Check actual season association
    if (filterSportId && team.sport_id !== filterSportId) return false
    if (filterProgramId && team.program_id !== filterProgramId) return false
    if (filterLevelId && team.level_id !== filterLevelId) return false
    if (filterStatus === 'active' && !team.is_active) return false
    if (filterStatus === 'inactive' && team.is_active) return false
    return true
  })

  // --- UI Components ---

  const FilterLabel = ({ children }: { children: ReactNode }) => (
    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{children}</label>
  )

  const SelectInput = ({ ...props }: React.SelectHTMLAttributes<HTMLSelectElement>) => (
    <div className="relative">
      <select
        className="w-full h-12 md:h-11 pl-3 pr-10 text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent transition-all hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
        {...props}
      />
      <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
        <span className="material-symbols-outlined text-lg">expand_more</span>
      </div>
    </div>
  )


  const StatusBadge = ({ active }: { active: boolean }) => (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
        active
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
          : 'bg-slate-100 text-slate-600 border border-slate-200'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  )

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
        <div className="h-4 bg-slate-100 rounded w-1/3 mb-12"></div>
        <div className="h-40 bg-slate-100 rounded-xl mb-8"></div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-slate-100 rounded-lg"></div>
          ))}
        </div>
      </div>
    )
  }

  // Show empty state if prerequisites don't exist (check full chain: programs → levels → teams)
  if (!loading) {
    if (programs.length === 0) {
      return (
        <div className="max-w-7xl mx-auto p-8">
          <OfflineBanner />
          <AdminPageHeader
            title="Teams"
            subtitle="Manage your rostered competition units and their assignments."
            breadcrumbs={[
              { label: 'Organizations', path: getLink('admin.organization.structure') },
              { label: 'Teams' },
            ]}
          />
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-4 block">groups</span>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No programs yet</h3>
            <p className="text-slate-500 mb-6">
              You need to create at least one program before you can add teams. Teams require levels, and levels require programs.
            </p>
            <Link to={`${getLink('admin.organization.forms')}?type=program`}>
              <Button variant="primary">Add a Program</Button>
            </Link>
          </div>
        </div>
      )
    }

    if (levels.length === 0) {
      return (
        <div className="max-w-7xl mx-auto p-8">
          <OfflineBanner />
          <AdminPageHeader
            title="Teams"
            subtitle="Manage your rostered competition units and their assignments."
            breadcrumbs={[
              { label: 'Organizations', path: getLink('admin.organization.structure') },
              { label: 'Teams' },
            ]}
          />
          <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
            <span className="material-symbols-outlined text-5xl text-slate-200 mb-4 block">groups</span>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No levels yet</h3>
            <p className="text-slate-500 mb-6">You need to create at least one level before you can add teams.</p>
            <Link to={`${getLink('admin.organization.forms')}?type=level&returnUrl=${encodeURIComponent(getLink('admin.teams.list'))}`}>
              <Button variant="primary">Add a Level</Button>
            </Link>
          </div>
        </div>
      )
    }
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      <OfflineBanner />
      <AdminPageHeader
        title="Teams"
        subtitle="Manage your rostered competition units and their assignments."
        breadcrumbs={[
          { label: 'Organizations', path: getLink('admin.organization.structure') },
          { label: 'Teams' },
        ]}
      />

      {error && (
        <div className="p-4 mb-6 bg-red-50 text-red-700 rounded-xl border border-red-100 flex items-center justify-between">
          <div>
            <div className="font-medium">{error}</div>
            <button
              onClick={fetchData}
              className="mt-2 text-sm underline hover:no-underline"
              disabled={loading}
            >
              Retry
            </button>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-4 text-red-700 hover:text-red-900"
            aria-label="Dismiss error"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-green-50 text-green-700 rounded-lg border-l-4 border-green-500 mb-4 flex items-center justify-between">
          <div className="text-sm font-medium">{successMessage}</div>
          <button
            onClick={handleDismissSuccess}
            className="ml-4 text-green-700 hover:text-green-900"
            aria-label="Dismiss success message"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>
      )}

      {actionError && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg border-l-4 border-red-500 mb-4 flex items-center justify-between">
          <div className="text-sm font-medium">{actionError}</div>
          <button
            onClick={handleDismissError}
            className="ml-4 text-red-700 hover:text-red-900"
            aria-label="Dismiss error message"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 mb-8 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-6">
          {/* Row 1 */}
          <div>
            <FilterLabel>Season</FilterLabel>
            <SelectInput
              value={filterSeasonId}
              onChange={(e) => setFilterSeasonId(e.target.value)}
              disabled={loading || navigating}
            >
              <option value="">All seasons</option>
              {seasons.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectInput>
          </div>

          <div>
            <FilterLabel>Sport</FilterLabel>
            <SelectInput
              value={filterSportId}
              onChange={(e) => {
                setFilterSportId(e.target.value)
                setFilterProgramId('')
                setFilterLevelId('')
              }}
              disabled={loading || navigating}
            >
              <option value="">All sports</option>
              {sports.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </SelectInput>
          </div>

          <div className="flex items-end justify-end md:col-span-2 lg:col-span-1">
            <Button
              variant="primary"
              className="w-full lg:w-auto"
              disabled={!canCreateTeam || navigating || loading}
              title={!canCreateTeam ? 'Add a Level first' : undefined}
              onClick={handleAddTeam}
            >
              Add Team
            </Button>
          </div>

          {/* Row 2 */}
          <div>
            <FilterLabel>Program</FilterLabel>
            <SelectInput
              value={filterProgramId}
              onChange={(e) => {
                setFilterProgramId(e.target.value)
                setFilterLevelId('')
              }}
              disabled={(!filterSportId && availablePrograms.length === programs.length) || loading || navigating}
            >
              <option value="">All programs</option>
              {availablePrograms.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </SelectInput>
          </div>

          <div>
            <FilterLabel>Level</FilterLabel>
            <SelectInput
              value={filterLevelId}
              onChange={(e) => setFilterLevelId(e.target.value)}
              disabled={loading || navigating}
            >
              <option value="">All levels</option>
              {availableLevels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </SelectInput>
          </div>

          <div>
            <FilterLabel>Status</FilterLabel>
            <SelectInput
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              disabled={loading || navigating}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </SelectInput>
          </div>
        </div>
      </div>

      {/* Teams List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {filteredTeams.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon="groups"
              title={teams.length === 0 ? 'NO TEAMS YET' : 'NO TEAMS MATCH YOUR FILTERS'}
              description={
                teams.length === 0
                  ? 'Start by adding your first team to the organization.'
                  : 'Try adjusting your filters to see more teams.'
              }
              action={
                canCreateTeam
                  ? {
                      label: teams.length === 0 ? 'Add Your First Team' : 'Add Team',
                      onClick: handleAddTeam,
                    }
                  : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Team Name</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Details</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Level</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Size</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeams.map((team) => {
                  const sport = sportById.get(team.sport_id ?? '')
                  const program = programById.get(team.program_id || '')
                  const level = levelById.get(team.level_id ?? '')

                  return (
                    <tr
                      key={team.id}
                      onClick={() => handleTeamClick(team.id)}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      style={{
                        cursor: navigating || deletingTeamId ? 'wait' : 'pointer',
                        opacity: navigating || deletingTeamId ? 0.6 : 1,
                      }}
                    >
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{team.name}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">{program?.name || '—'}</span>
                          <span className="text-xs text-slate-400">{sport?.name || '—'}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-xs font-medium text-slate-600">
                          {level?.name || '—'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-sm text-slate-500 font-medium">
                        {team.max_roster_size ? `${team.max_roster_size} max` : '—'}
                      </td>
                      <td className="py-4 px-6">
                        <StatusBadge active={team.is_active ?? false} />
                      </td>
                      <td className="py-4 px-6 text-right">
                        <Button
                          variant="danger"
                          size="dense"
                          icon="delete"
                          onClick={(e: React.MouseEvent) => handleDeleteTeam(team.id, team.name, e)}
                          disabled={deletingTeamId === team.id || isOffline || USE_FAKE_DATA || navigating}
                          loading={deletingTeamId === team.id}
                          className="invisible group-hover:visible focus:visible"
                          title={
                            USE_FAKE_DATA
                              ? 'Sign in to remove team'
                              : isOffline
                              ? 'Offline - cannot remove team'
                              : navigating
                              ? 'Please wait...'
                              : 'Remove team from organization'
                          }
                        >
                          {deletingTeamId === team.id ? 'Removing...' : 'Remove'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={Boolean(teamToDelete)}
        title="Remove team?"
        description={teamToDelete ? `Are you sure you want to remove "${teamToDelete.name}" from your organization? This action cannot be undone.` : ''}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmDeleteTeam}
        onCancel={() => setTeamToDelete(null)}
      />
    </div>
  )
}
