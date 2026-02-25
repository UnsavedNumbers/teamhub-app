/**
 * Teams Management
 *
 * Table view with filtering by season, sport, program, level, and status.
 */

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useOffline } from '../../hooks/useOffline'
import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'
import { USE_FAKE_DATA } from '../../data/config'
import { getTeams, deleteTeam } from '../../data/services/teamsService'
import { getSports, getPrograms } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getSeasons } from '../../data/services/seasonsService'
import type { Team, Sport, Program, Level, Season } from '../../data/types/organization'
import { supabase } from '../../lib/supabase'
import { AdminPageHeader, Button, ConfirmDialog, Card, Select, Badge, InlineNotice, OrgDataTable, type ColumnConfig } from '../../components/admin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import { getLink } from '../../utils/routes'
import { hasAnyRole } from '../../utils/roleHelpers'
import '../../styles/orgAdmin.css'

export default function TeamsManagement() {
  // Add lifecycle logging
  useDebugLifecycle('TeamsManagement')

  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  const { isOffline } = useOffline()
  const location = useLocation()
  const navigate = useNavigate()
  const isOrgAdmin = hasAnyRole(currentOrganization, ['org_admin'])
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
  const [teamSeasonsMap, setTeamSeasonsMap] = useState<Map<string, string[]>>(new Map())

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

      // Fetch team_seasons mapping for season filtering
      if (Array.isArray(teamsResult.data) && teamsResult.data.length > 0) {
        try {
          const teamIds = teamsResult.data.map(t => t.id)
          const { data: teamSeasonsData, error: tsError } = await supabase
            .from('team_seasons')
            .select('team_id, season_id')
            .in('team_id', teamIds)

          if (!tsError && teamSeasonsData) {
            const map = new Map<string, string[]>()
            for (const ts of teamSeasonsData) {
              const existing = map.get(ts.team_id) || []
              existing.push(ts.season_id)
              map.set(ts.team_id, existing)
            }
            setTeamSeasonsMap(map)
          }
        } catch (err) {
          console.warn('[TeamsManagement] Error fetching team_seasons:', err)
          // Continue without season filter - teams will still be shown
        }
      }
      
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

  const filteredTeams = useMemo(() => teams.filter((team) => {
    // Filter by season: check if team has team_seasons entry for this season
    if (filterSeasonId) {
      const teamSeasonIds = teamSeasonsMap.get(team.id) || []
      if (!teamSeasonIds.includes(filterSeasonId)) {
        return false
      }
    }
    if (filterSportId && team.sport_id !== filterSportId) return false
    if (filterProgramId && team.program_id !== filterProgramId) return false
    if (filterLevelId && team.level_id !== filterLevelId) return false
    if (filterStatus === 'active' && !team.is_active) return false
    if (filterStatus === 'inactive' && team.is_active) return false
    return true
  }), [teams, filterSeasonId, filterSportId, filterProgramId, filterLevelId, filterStatus, teamSeasonsMap])

  const columns: ColumnConfig<Team>[] = useMemo(() => [
    {
        id: 'name',
        label: 'Team Name',
        sortable: true,
        render: (row) => (
          <div className="oa-font-bold oa-text-slate-900" data-testid="team-row">
            <Link 
              to={getLink('admin.teams.detail', { id: row.id })} 
              data-testid="open-team"
              onClick={(e) => {
                e.preventDefault()
                handleTeamClick(row.id)
              }}
            >
              {row.name}
            </Link>
          </div>
        )
    },
    {
        id: 'details',
        label: 'Details',
        render: (row) => {
            const sport = sportById.get(row.sport_id ?? '')
            const program = programById.get(row.program_id || '')
            return (
                <div className="oa-flex oa-flex-col">
                    <span className="oa-text-sm oa-font-medium oa-text-slate-700">{program?.name || 'â€”'}</span>
                    <span className="oa-text-xs oa-text-slate-400">{sport?.name || 'â€”'}</span>
                </div>
            )
        }
    },
    {
        id: 'level_id',
        label: 'Level',
        sortable: true,
        render: (row) => {
            const level = levelById.get(row.level_id ?? '')
            return (
                <Badge variant="neutral">
                    {level?.name || 'â€”'}
                </Badge>
            )
        }
    },
    {
        id: 'max_roster_size',
        label: 'Size',
        sortable: true,
        render: (row) => (
            <span className="oa-text-sm oa-text-slate-500 oa-font-medium">
                {row.max_roster_size ? `${row.max_roster_size} max` : 'â€”'}
            </span>
        )
    },
    {
        id: 'is_active',
        label: 'Status',
        sortable: true,
        render: (row) => (
            <Badge variant={row.is_active ? 'success' : 'neutral'}>
                {row.is_active ? 'Active' : 'Inactive'}
            </Badge>
        )
    },
    {
        id: 'actions',
        label: 'Action',
        align: 'right',
        render: (row) => (
            <Button
                variant="danger"
                size="dense"
                icon="delete"
                onClick={(e: React.MouseEvent) => handleDeleteTeam(row.id, row.name, e)}
                disabled={deletingTeamId === row.id || isOffline || USE_FAKE_DATA || navigating}
                loading={deletingTeamId === row.id}
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
                {deletingTeamId === row.id ? 'Removing...' : 'Remove'}
            </Button>
        )
    }
  ], [sportById, programById, levelById, deletingTeamId, isOffline, navigating, handleDeleteTeam])

  if (loading) {
    return (
      <div className="oa-root">
        <div className="oa-skeleton oa-mb-4" style={{ width: '25%', height: '32px' }} />
        <div className="oa-skeleton oa-mb-12" style={{ width: '33%', height: '16px' }} />
        <div className="oa-skeleton oa-mb-8" style={{ width: '100%', height: '160px' }} />
        <div className="oa-flex oa-flex-col oa-gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="oa-skeleton" style={{ width: '100%', height: '64px' }} />
          ))}
        </div>
      </div>
    )
  }

  // Show empty state if prerequisites don't exist (check full chain: programs â†’ levels â†’ teams)
  if (programs.length === 0) {
    return (
      <div className="oa-root">
        <OfflineBanner />
        <AdminPageHeader
          title="Teams"
          subtitle="Manage your rostered competition units and their assignments."
          breadcrumbs={[
            { label: 'Organizations', path: getLink('admin.organization.structure') },
            { label: 'Teams' },
          ]}
        />
        <Card className="oa-border-2 oa-border-dashed">
          <div className="oa-flex oa-items-start oa-gap-4 oa-text-left">
            <span className="material-symbols-outlined oa-text-muted oa-shrink-0" style={{ fontSize: '48px' }} aria-hidden>groups</span>
            <div className="oa-flex oa-flex-col oa-gap-2 oa-min-w-0 oa-flex-1">
              <h3 className="oa-h3 oa-mb-0">No programs yet</h3>
              <p className="oa-body-m oa-text-muted oa-mb-4">You need to create at least one program before you can add teams. Teams require levels, and levels require programs.</p>
              <Link to={`${getLink('admin.organization.forms')}?type=program`}>
                <OrgAdminButton variant="primary" className="w-full sm:w-auto">Add a Program</OrgAdminButton>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (levels.length === 0) {
    return (
      <div className="oa-root">
        <OfflineBanner />
        <AdminPageHeader
          title="Teams"
          subtitle="Manage your rostered competition units and their assignments."
          breadcrumbs={[
            { label: 'Organizations', path: getLink('admin.organization.structure') },
            { label: 'Teams' },
          ]}
        />
        <Card className="oa-border-2 oa-border-dashed">
          <div className="oa-flex oa-items-start oa-gap-4 oa-text-left">
            <span className="material-symbols-outlined oa-text-muted oa-shrink-0" style={{ fontSize: '48px' }} aria-hidden>grade</span>
            <div className="oa-flex oa-flex-col oa-gap-2 oa-min-w-0 oa-flex-1">
              <h3 className="oa-h3 oa-mb-0">No levels yet</h3>
              <p className="oa-body-m oa-text-muted oa-mb-4">You need to create at least one level before you can add teams.</p>
              <Link to={`${getLink('admin.organization.forms')}?type=level&returnUrl=${encodeURIComponent(getLink('admin.teams.list'))}`}>
                <OrgAdminButton variant="primary" className="w-full sm:w-auto">Add a Level</OrgAdminButton>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="oa-root">
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
        <InlineNotice
          tone="error"
          title="We couldn't load teams"
          message={error}
          actions={
            <Button
              variant="ghost"
              size="dense"
              icon="refresh"
              onClick={fetchData}
              disabled={loading}
            >
              Retry
            </Button>
          }
          onClose={() => setError(null)}
          className="oa-mb-6"
        />
      )}

      {successMessage && (
        <InlineNotice
          tone="success"
          title={successMessage}
          onClose={handleDismissSuccess}
          className="oa-mb-4"
        />
      )}

      {actionError && (
        <InlineNotice
          tone="error"
          title={actionError}
          onClose={handleDismissError}
          className="oa-mb-4"
        />
      )}

      {/* Filter Bar */}
      <Card className="oa-mb-6 oa-filter-section oa-w-full">
        <div className="oa-filter-row">
          <div className="oa-filter-control">
            <Select
              label="Season"
              value={filterSeasonId}
              onChange={(e) => setFilterSeasonId(e.target.value)}
              disabled={loading || navigating}
              options={[
                { value: '', label: 'All seasons' },
                ...seasons.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
          <div className="oa-filter-control">
            <Select
              label="Sport"
              value={filterSportId}
              onChange={(e) => {
                setFilterSportId(e.target.value)
                setFilterProgramId('')
                setFilterLevelId('')
              }}
              disabled={loading || navigating}
              options={[
                { value: '', label: 'All sports' },
                ...sports.map((s) => ({ value: s.id, label: s.name })),
              ]}
            />
          </div>
          <div className="oa-filter-control">
            <Select
              label="Program"
              value={filterProgramId}
              onChange={(e) => {
                setFilterProgramId(e.target.value)
                setFilterLevelId('')
              }}
              disabled={(!filterSportId && availablePrograms.length === programs.length) || loading || navigating}
              options={[
                { value: '', label: 'All programs' },
                ...availablePrograms.map((p) => ({ value: p.id, label: p.name })),
              ]}
            />
          </div>
          <div className="oa-filter-control">
            <Select
              label="Level"
              value={filterLevelId}
              onChange={(e) => setFilterLevelId(e.target.value)}
              disabled={loading || navigating}
              options={[
                { value: '', label: 'All levels' },
                ...availableLevels.map((l) => ({ value: l.id, label: l.name })),
              ]}
            />
          </div>
          <div className="oa-filter-control">
            <Select
              label="Status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              disabled={loading || navigating}
              options={[
                { value: 'all', label: 'All statuses' },
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
          {isOrgAdmin && (
            <div className="oa-filter-actions">
              <Button
                className="oa-w-full sm:oa-w-auto"
                disabled={!canCreateTeam || navigating || loading}
                title={!canCreateTeam ? 'Add a Level first' : undefined}
                onClick={handleAddTeam}
              >
                Add Team
              </Button>
            </div>
          )}
        </div>
      </Card>

      {/* Teams List */}
      <OrgDataTable
        rows={filteredTeams}
        columns={columns}
        loading={loading}
        onRowClick={(row) => handleTeamClick(row.id)}
        emptyMessage={teams.length === 0 ? 'Start by adding your first team to the organization.' : 'Try adjusting your filters to see more teams.'}
        page={0}
        rowsPerPage={filteredTeams.length || 10}
        totalCount={filteredTeams.length}
        onPageChange={() => {}}
        onRowsPerPageChange={() => {}}
      />

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
