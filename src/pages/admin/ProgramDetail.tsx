import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { supabase } from '../../lib/supabase'
import { getProgram, getSports } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getTeams, getActiveSeason, getTeamRoster } from '../../data/services/teamsService'
import { getOrganizationUsers } from '../../data/services/usersService'
import type { Level, Program, Sport, Team } from '../../data/types/organization'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { AdminPageHeader, Button, Card, Table, type TableColumn } from '../../components/platformAdmin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import { getLink } from '../../utils/routes'
import { getRandomSportImagePath } from '../../utils/sportImages'
import { cn } from '../../utils/cn'

type LevelRow = {
  id: string
  name: string
  teams: number
  athletes: number | null
  status: 'active' | 'inactive'
}

function formatUpdatedRelative(iso: string | null | undefined): string {
  if (!iso) return 'Updated recently'
  const dt = new Date(iso)
  if (Number.isNaN(dt.valueOf())) return 'Updated recently'

  const diffMs = Date.now() - dt.valueOf()
  const diffSec = Math.floor(diffMs / 1000)
  const absSec = Math.abs(diffSec)

  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (absSec < 60) return `Updated ${rtf.format(-diffSec, 'second')}`
  const diffMin = Math.floor(diffSec / 60)
  const absMin = Math.abs(diffMin)
  if (absMin < 60) return `Updated ${rtf.format(-diffMin, 'minute')}`
  const diffHr = Math.floor(diffMin / 60)
  const absHr = Math.abs(diffHr)
  if (absHr < 24) return `Updated ${rtf.format(-diffHr, 'hour')}`
  const diffDay = Math.floor(diffHr / 24)
  return `Updated ${rtf.format(-diffDay, 'day')}`
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>): boolean {
  if (rows.length === 0) return false
  try {
    const headers = Object.keys(rows[0])
    const escape = (value: unknown) => {
      const s = value === null || value === undefined ? '' : String(value)
      if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
      return s
    }
    const csv = [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    return true
  } catch (err) {
    console.error('[ProgramDetail] CSV export failed:', err)
    return false
  }
}

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>()
  const programId = id?.trim() || ''

  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()
  const location = useLocation()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [exportingCsv, setExportingCsv] = useState(false)

  const [program, setProgram] = useState<Program | null>(null)
  const [sport, setSport] = useState<Sport | null>(null)
  const [levels, setLevels] = useState<Level[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [athleteCountByLevel, setAthleteCountByLevel] = useState<Record<string, number> | null>(null)
  const [totalAthletes, setTotalAthletes] = useState<number | null>(null)
  const [totalCoaches, setTotalCoaches] = useState<number | null>(null)

  // Navigation state success message (e.g. returning from forms)
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage)
      window.history.replaceState({}, document.title)
    }
  }, [location.state])

  const programsRoute = getLink('admin.programs.list')
  const sportsRoute = getLink('admin.sports.list')
  const levelsRoute = getLink('admin.levels.list')
  const formsRoute = getLink('admin.organization.forms')
  const structureRoute = getLink('admin.organization.structure')
  const detailRoute = getLink('admin.programs.detail', { id: programId })

  const heroImage = useMemo(() => getRandomSportImagePath(sport?.name ?? null, 'hero'), [sport?.name])
  const updatedLabel = useMemo(() => formatUpdatedRelative(program?.updated_at), [program?.updated_at])

  const statusLabel = useMemo(() => {
    const activeTeams = teams.filter((t) => t.is_active !== false)
    if (activeTeams.length > 0) return 'In Season'
    if (levels.length > 0) return 'Active'
    return 'Planning'
  }, [levels.length, teams])

  const loadProgramData = useCallback(async () => {
    if (!isReady) return
    if (!programId) {
      setError('Program ID is required.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setActionError(null)

    try {
      const [programRes, sportsRes, levelsRes, teamsRes] = await Promise.all([
        getProgram(context, programId),
        getSports(context),
        getLevels(context, programId),
        getTeams(context, { programId }),
      ])

      if (programRes.error) throw programRes.error
      if (sportsRes.error) throw sportsRes.error
      if (levelsRes.error) throw levelsRes.error
      if (teamsRes.error) throw teamsRes.error

      const foundProgram = programRes.data as Program | null
      if (!foundProgram) {
        setProgram(null)
        setSport(null)
        setLevels([])
        setTeams([])
        setError('Program not found (or you may not have access).')
        return
      }

      const allSports = Array.isArray(sportsRes.data) ? (sportsRes.data as Sport[]) : []
      const foundSport = allSports.find((s) => s.id === foundProgram.sport_id) ?? null

      setProgram(foundProgram)
      setSport(foundSport)
      setLevels(Array.isArray(levelsRes.data) ? levelsRes.data : [])
      setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load program.')
    } finally {
      setLoading(false)
    }
  }, [context, isReady, programId])

  useEffect(() => {
    loadProgramData()
  }, [loadProgramData])

  // Compute athlete counts (best effort). If offline, show as unavailable.
  useEffect(() => {
    const compute = async () => {
      setAthleteCountByLevel(null)
      setTotalAthletes(null)
      setTotalCoaches(null)

      if (!program || !programId) return
      if (isOffline) return

      // Coaches count: org coaches (program-specific assignments are not modeled in schema yet)
      try {
        const usersRes = await getOrganizationUsers(context)
        if (usersRes.error) throw usersRes.error
        const coaches = usersRes.data.filter((u) => u.roles.includes('coach')).length
        setTotalCoaches(coaches)
      } catch {
        setTotalCoaches(null)
      }

      if (teams.length === 0) {
        setAthleteCountByLevel({})
        setTotalAthletes(0)
        return
      }

      const teamsById = new Map(teams.map((t) => [t.id, t]))
      const teamIds = teams.map((t) => t.id)

      // Fake data: derive counts from active season + roster per team
      if (USE_FAKE_DATA) {
        const countsByLevel: Record<string, number> = {}
        let total = 0

        for (const team of teams) {
          const seasonRes = await getActiveSeason(context, team.id)
          if (seasonRes.error || !seasonRes.data) continue
          const rosterRes = await getTeamRoster(context, team.id, seasonRes.data.id)
          if (rosterRes.error) continue
          const count = rosterRes.data.length
          const levelId = team.level_id ?? ''
          if (levelId) countsByLevel[levelId] = (countsByLevel[levelId] || 0) + count
          total += count
        }

        setAthleteCountByLevel(countsByLevel)
        setTotalAthletes(total)
        return
      }

      // Real data: count active memberships for teams in this program.
      try {
        const { data: memberships, error: memErr } = await supabase
          .from('team_memberships' as any)
          .select('team_id, athlete_id')
          .in('team_id', teamIds as any)
          .eq('status', 'active')

        if (memErr) throw memErr

        const countsByLevel: Record<string, number> = {}
        const distinctAthletes = new Set<string>()

        for (const row of (memberships as any[]) ?? []) {
          const teamId = row.team_id as string | undefined
          const athleteId = row.athlete_id as string | undefined
          if (!teamId) continue
          const team = teamsById.get(teamId)
          const levelId = team?.level_id ?? null
          if (levelId) countsByLevel[levelId] = (countsByLevel[levelId] || 0) + 1
          if (athleteId) distinctAthletes.add(athleteId)
        }

        setAthleteCountByLevel(countsByLevel)
        setTotalAthletes(distinctAthletes.size)
      } catch {
        // Keep counts unavailable if query fails
        setAthleteCountByLevel(null)
        setTotalAthletes(null)
      }
    }

    void compute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program, programId, teams, isOffline])

  const levelRows: LevelRow[] = useMemo(() => {
    const teamsByLevel = new Map<string, number>()
    for (const t of teams) {
      if (!t.level_id) continue
      teamsByLevel.set(t.level_id, (teamsByLevel.get(t.level_id) || 0) + 1)
    }

    return levels.map((l) => {
      const teamCount = teamsByLevel.get(l.id) || 0
      const athleteCount = athleteCountByLevel ? athleteCountByLevel[l.id] ?? 0 : null
      return {
        id: l.id,
        name: l.name,
        teams: teamCount,
        athletes: athleteCount,
        status: teamCount > 0 ? 'active' : 'inactive',
      }
    })
  }, [athleteCountByLevel, levels, teams])

  // Navigation handlers with validation
  const handleNavigateToLevel = useCallback(
    (levelIdOrRow: string | LevelRow) => {
      const levelId = typeof levelIdOrRow === 'string' ? levelIdOrRow : levelIdOrRow.id
      if (!levelId || !levelId.trim()) {
        setActionError('Level ID is required to view level details.')
        return
      }
      const levelDetailRoute = getLink('admin.levels.detail', { id: levelId.trim() })
      navigate(levelDetailRoute)
    },
    [navigate]
  )

  const handleExportCsv = useCallback(() => {
    if (levelRows.length === 0) {
      setActionError('No levels to export.')
      return
    }

    setExportingCsv(true)
    setActionError(null)
    setSuccessMessage(null)

    try {
      const rows = levelRows.map((r) => ({
        level_id: r.id,
        level_name: r.name,
        teams: r.teams,
        athletes: r.athletes ?? '',
        status: r.status,
      }))
      const filename = `${program?.name || 'program'}-levels.csv`.replace(/[^a-z0-9.-]/gi, '_')
      const success = downloadCsv(filename, rows)
      if (success) {
        setSuccessMessage(`Exported ${levelRows.length} level(s) to ${filename}`)
        setTimeout(() => setSuccessMessage(null), 5000)
      } else {
        setActionError('Failed to export CSV. Please try again.')
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to export CSV.')
    } finally {
      setExportingCsv(false)
    }
  }, [levelRows, program?.name])


  const columns: TableColumn<LevelRow>[] = useMemo(() => {
    return [
      {
        id: 'name',
        label: 'LEVEL NAME',
        cellType: 'primary',
        render: (row) => (
          <div className="pa-flex pa-items-center pa-gap-2">
            <span
              className="pa-body-s"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'var(--pa-space-6)',
                height: 'var(--pa-space-6)',
                borderRadius: 'var(--pa-radius-xs)',
                background: 'var(--pa-surface-panel)',
                color: 'var(--pa-theme-text-accent)',
                fontWeight: 800,
                fontStyle: 'italic',
              }}
              aria-hidden="true"
            >
              {row.name.split(' ')[0]?.slice(0, 4).toUpperCase() || 'LVL'}
            </span>
            <span className="pa-body-m" style={{ fontWeight: 700, color: 'var(--pa-n900)' }}>
              {row.name}
            </span>
          </div>
        ),
      },
      { id: 'teams', label: 'TEAMS', align: 'center', cellType: 'numeric' },
      {
        id: 'athletes',
        label: 'ATHLETES',
        align: 'center',
        cellType: 'numeric',
        render: (row) => (row.athletes === null ? '—' : row.athletes),
      },
      {
        id: 'status',
        label: 'STATUS',
        render: (row) => (
          <span
            className="pa-body-s"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: 'calc(var(--pa-space-1) + 1px) var(--pa-space-2)',
              borderRadius: 'var(--pa-radius-pill)',
              background: row.status === 'active' ? 'var(--pa-theme-surface-highlight)' : 'var(--pa-surface-panel)',
              color: row.status === 'active' ? 'var(--pa-theme-text-accent)' : 'var(--pa-n500)',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            {row.status}
          </span>
        ),
      },
      {
        id: 'action',
        label: 'ACTION',
        align: 'right',
        render: (row) => (
          <Button
            variant="ghost"
            size="dense"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation()
              handleNavigateToLevel(row.id)
            }}
            aria-label={`View details for ${row.name}`}
          >
            View
          </Button>
        ),
      },
    ]
  }, [handleNavigateToLevel])

  if (loading) {
    return (
      <div className="pa-root">
        <OfflineBanner />
        <div className="pa-skeleton" style={{ height: 'calc(var(--pa-space-9) * 9)' }} />
      </div>
    )
  }

  return (
    <div className="pa-root">
      <OfflineBanner />

      <div
        style={{
          maxWidth: 'calc(var(--pa-space-9) * 22.5)',
          margin: '0 auto',
          padding: 'var(--pa-space-6) var(--pa-space-4)',
        }}
      >
        <AdminPageHeader
          title={program?.name || 'Program'}
          subtitle="Program details, levels, and structure."
          breadcrumbs={[
            { label: 'Organizations', path: structureRoute },
            { label: 'Programs', path: programsRoute },
            { label: program?.name || 'Program' },
          ]}
          actions={
            <div className="pa-flex pa-flex-col sm:pa-flex-row pa-gap-2">
              <Link to={programsRoute} className="w-full sm:w-auto">
                <Button variant="ghost" disabled={loading} aria-label="Navigate back to programs list" className="w-full sm:w-auto min-h-[44px]">
                  Back to Programs
                </Button>
              </Link>
              {sport?.id ? (
                <Link
                  to={getLink('admin.sports.detail', { sport_slug: sport.slug ?? sport.id })}
                  onClick={(e: React.MouseEvent) => {
                    if (!sport.id) {
                      e.preventDefault()
                      setActionError('Sport ID is required to view sport details.')
                    }
                  }}
                  className="w-full sm:w-auto"
                >
                  <Button variant="secondary" disabled={loading || !sport.id} aria-label={`View ${sport.name} sport details`} className="w-full sm:w-auto min-h-[44px]">
                    View {sport.name}
                  </Button>
                </Link>
              ) : (
                <Link to={sportsRoute} className="w-full sm:w-auto">
                  <Button variant="secondary" disabled={loading} aria-label="Navigate to sports list" className="w-full sm:w-auto min-h-[44px]">
                    View Sports
                  </Button>
                </Link>
              )}
            </div>
          }
        />

        {successMessage && (
          <Card className="pa-mb-6" style={{ borderLeft: '3px solid var(--pa-success)' }}>
            <div className="pa-body-m" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)', color: 'var(--pa-n900)' }}>
              {successMessage}
            </div>
          </Card>
        )}

        {actionError && (
          <Card className="pa-mb-6" style={{ borderLeft: '3px solid var(--pa-danger)' }}>
            <div className="pa-body-m pa-text-danger" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)' }}>
              {actionError}
            </div>
          </Card>
        )}

        {error && (
          <Card className="pa-mb-6" style={{ borderLeft: '3px solid var(--pa-danger)' }}>
            <div className="pa-body-m pa-text-danger" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)' }}>
              {error}
            </div>
            <div style={{ padding: '0 var(--pa-space-4) var(--pa-space-3)' }}>
              <Button variant="ghost" size="dense" onClick={loadProgramData} disabled={loading}>
                Retry
              </Button>
            </div>
          </Card>
        )}

        {!program ? null : (
          <>
            {/* Hero band */}
            <div
              style={{
                height: 'calc(var(--pa-space-9) * 3)',
                borderRadius: 'var(--pa-radius-l)',
                overflow: 'hidden',
                position: 'relative',
                background: 'var(--pa-n900)',
                marginBottom: 'var(--pa-space-6)',
                border: '1px solid var(--pa-n100)',
              }}
              aria-label="Program hero"
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundImage: `url(${heroImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  opacity: 0.35,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, var(--pa-n900), transparent)',
                  opacity: 0.9,
                }}
              />
              <div
                className="pa-flex pa-items-center"
                style={{
                  position: 'absolute',
                  inset: 0,
                  padding: '0 var(--pa-space-6)',
                }}
              >
                <div
                  className="pa-flex pa-items-center"
                  style={{ gap: 'var(--pa-space-8)', flexShrink: 0 }}
                >
                  {[
                    { label: 'Athletes', value: totalAthletes },
                    { label: 'Coaches', value: totalCoaches },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="pa-display-xl"
                      style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        color: 'var(--pa-white)',
                        fontWeight: 900,
                        letterSpacing: '-0.03em',
                        lineHeight: 1,
                        gap: '0.4em',
                      }}
                    >
                      <span style={{ textAlign: 'right' }}>
                        {stat.value === null ? '—' : stat.value.toLocaleString()}
                      </span>
                      <span style={{ fontWeight: 400, opacity: 0.7 }}>{stat.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Main grid */}
            <div
              className="pa-grid"
              style={{
                gridTemplateColumns: 'minmax(0, 1fr)',
                alignItems: 'start',
              }}
            >
              <div
                className="pa-grid"
                style={{
                  gridTemplateColumns: 'minmax(0, 1fr)',
                  gap: 'var(--pa-space-6)',
                }}
              >
                {/* Action bar */}
                <Card className="oa-card">
                  <div className="pa-flex pa-justify-between pa-items-center" style={{ gap: 'var(--pa-space-4)' }}>
                    <div className="pa-flex pa-items-center" style={{ gap: 'var(--pa-space-3)' }}>
                      <span className="pa-badge pa-badge--info pa-body-s" style={{ fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
                        Status: {statusLabel}
                      </span>
                      <span className="pa-body-m pa-text-muted">
                        {updatedLabel}
                      </span>
                    </div>

                    <div className="pa-flex pa-flex-col sm:pa-flex-row pa-items-stretch sm:pa-items-center pa-gap-2" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Link
                        to={`${getLink('admin.programs.update', { id: programId })}?returnUrl=${encodeURIComponent(detailRoute)}`}
                        onClick={(e) => {
                          if (!programId) {
                            e.preventDefault()
                            setActionError('Program ID is required to edit program.')
                          }
                        }}
                        className="w-full sm:w-auto"
                      >
                        <Button
                          variant="ghost"
                          icon="edit"
                          disabled={loading || !programId}
                          aria-label={`Edit ${program?.name || 'program'}`}
                          className="w-full sm:w-auto min-h-[44px]"
                        >
                          Edit Program
                        </Button>
                      </Link>

                      <Link to={levelsRoute} className="w-full sm:w-auto">
                        <Button variant="ghost" disabled={loading} aria-label="Navigate to all levels" className="w-full sm:w-auto min-h-[44px]">
                          View Levels
                        </Button>
                      </Link>

                      <Link
                        to={`${formsRoute}?type=level&program_id=${programId}&sport_id=${program.sport_id}&returnUrl=${encodeURIComponent(detailRoute)}`}
                        className={cn(isOffline || USE_FAKE_DATA ? 'pa-disabled-link' : '', 'w-full sm:w-auto')}
                        onClick={(e) => {
                          if (isOffline || USE_FAKE_DATA) {
                            e.preventDefault()
                            setActionError(
                              isOffline
                                ? 'You appear to be offline. Please reconnect and try again.'
                                : 'This action is not available in demo mode. Please sign in to add levels.'
                            )
                          } else if (!programId || !program.sport_id) {
                            e.preventDefault()
                            setActionError('Program and sport information is required to add a level.')
                          }
                        }}
                      >
                        <OrgAdminButton
                          variant="primary"
                          icon="add_circle"
                          disabled={loading || isOffline || USE_FAKE_DATA || !programId || !program.sport_id}
                          title={
                            isOffline
                              ? 'Offline - cannot add levels'
                              : USE_FAKE_DATA
                                ? 'Sign in to add levels'
                                : !programId || !program.sport_id
                                  ? 'Missing required information'
                                  : undefined
                          }
                          aria-label="Add a new level to this program"
                          className="w-full sm:w-auto min-h-[44px]"
                        >
                          Add Level
                        </OrgAdminButton>
                      </Link>

                      <Link
                        to={`${formsRoute}?type=team&program_id=${programId}&sport_id=${program.sport_id}&returnUrl=${encodeURIComponent(detailRoute)}`}
                        className="w-full sm:w-auto"
                        onClick={(e) => {
                          if (isOffline || USE_FAKE_DATA) {
                            e.preventDefault()
                            setActionError(
                              isOffline
                                ? 'You appear to be offline. Please reconnect and try again.'
                                : 'This action is not available in demo mode. Please sign in to add teams.'
                            )
                          } else if (!programId || !program.sport_id) {
                            e.preventDefault()
                            setActionError('Program and sport information is required to add a team.')
                          }
                        }}
                      >
                        <Button
                          variant="secondary"
                          disabled={loading || isOffline || USE_FAKE_DATA || !programId || !program.sport_id}
                          title={
                            isOffline
                              ? 'Offline - cannot add teams'
                              : USE_FAKE_DATA
                                ? 'Sign in to add teams'
                                : !programId || !program.sport_id
                                  ? 'Missing required information'
                                  : undefined
                          }
                          aria-label="Add a new team to this program"
                          className="w-full sm:w-auto min-h-[44px]"
                        >
                          Add Team
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>

                {/* Levels table */}
                <Card
                  title="Program Levels"
                  className="oa-card oa-card--no-padding"
                  actions={
                    <Button
                      variant="ghost"
                      size="dense"
                      onClick={handleExportCsv}
                      disabled={levelRows.length === 0 || exportingCsv}
                      loading={exportingCsv}
                      title={levelRows.length === 0 ? 'No levels to export' : 'Export levels data as CSV'}
                    >
                      Export CSV
                    </Button>
                  }
                  noPadding
                >
                  <Table
                    columns={columns}
                    data={levelRows}
                    onRowClick={handleNavigateToLevel}
                    emptyState={
                      <div style={{ padding: 'var(--pa-space-8) var(--pa-space-5)' }}>
                        <div className="pa-h3" style={{ textAlign: 'center', marginBottom: 'var(--pa-space-2)' }}>
                          No levels yet
                        </div>
                        <div className="pa-body-m" style={{ textAlign: 'center', color: 'var(--pa-n600)' }}>
                          Add a level to start organizing teams and eligibility.
                        </div>
                      </div>
                    }
                  />
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

