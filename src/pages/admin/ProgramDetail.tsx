import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
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
import { getLink } from '../../utils/routes'
import { getRandomSportImagePath } from '../../utils/sportImages'

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

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  if (rows.length === 0) return
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
}

export default function ProgramDetail() {
  const { id } = useParams<{ id: string }>()
  const programId = id?.trim() || ''

  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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

  const programsRoute = getLink('admin.organization.programs')
  const sportsRoute = getLink('admin.organization.sports')
  const levelsRoute = getLink('admin.organization.levels')
  const formsRoute = getLink('admin.organization.forms')
  const structureRoute = getLink('admin.organization.structure')
  const detailRoute = getLink('admin.organization.programDetail', { id: programId })

  const heroImage = useMemo(() => getRandomSportImagePath(sport?.name ?? null, 'hero'), [sport?.name])
  const updatedLabel = useMemo(() => formatUpdatedRelative(program?.updated_at), [program?.updated_at])

  const statusLabel = useMemo(() => {
    const activeTeams = teams.filter((t) => t.is_active !== false)
    if (activeTeams.length > 0) return 'In Season'
    if (levels.length > 0) return 'Active'
    return 'Planning'
  }, [levels.length, teams])

  useEffect(() => {
    if (!isReady) return
    if (!programId) {
      setError('Program ID is required.')
      setLoading(false)
      return
    }

    const load = async () => {
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
    }

    load()
  }, [context, isReady, programId])

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
          <Link to={`${formsRoute}?edit=level&id=${row.id}&returnUrl=${encodeURIComponent(detailRoute)}`}>
            <Button variant="ghost" size="dense">
              View
            </Button>
          </Link>
        ),
      },
    ]
  }, [detailRoute, formsRoute])

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
            <div className="pa-flex pa-gap-2">
              <Link to={programsRoute}>
                <Button variant="ghost">Back to Programs</Button>
              </Link>
              {sport ? (
                <Link to={getLink('admin.organization.sportDetail', { id: sport.id })}>
                  <Button variant="secondary">View Sport</Button>
                </Link>
              ) : (
                <Link to={sportsRoute}>
                  <Button variant="secondary">View Sports</Button>
                </Link>
              )}
            </div>
          }
        />

        {successMessage && (
          <Card className="pa-mb-4" style={{ borderLeft: '3px solid var(--pa-success)' }}>
            <div className="pa-body-m" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)', color: 'var(--pa-n900)' }}>
              {successMessage}
            </div>
          </Card>
        )}

        {actionError && (
          <Card className="pa-mb-4" style={{ borderLeft: '3px solid var(--pa-danger)' }}>
            <div className="pa-body-m pa-text-danger" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)' }}>
              {actionError}
            </div>
          </Card>
        )}

        {error && (
          <Card className="pa-mb-4" style={{ borderLeft: '3px solid var(--pa-danger)' }}>
            <div className="pa-body-m pa-text-danger" style={{ padding: 'var(--pa-space-3) var(--pa-space-4)' }}>
              {error}
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
                marginBottom: 'var(--pa-space-5)',
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
                style={{
                  position: 'absolute',
                  left: 'var(--pa-space-6)',
                  bottom: 'var(--pa-space-6)',
                  right: 'var(--pa-space-6)',
                }}
              >
                <div
                  className="pa-overline"
                  style={{
                    color: 'rgba(255,255,255,0.75)',
                    marginBottom: 'var(--pa-space-2)',
                    letterSpacing: '0.16em',
                  }}
                >
                  Parent Sport: {sport?.name || '—'}
                </div>
                <div
                  className="pa-display-xl"
                  style={{
                    color: 'var(--pa-white)',
                    fontWeight: 900,
                    letterSpacing: '-0.03em',
                    lineHeight: 1,
                  }}
                >
                  {program.name}
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
                  gap: 'var(--pa-space-5)',
                }}
              >
                {/* Action bar */}
                <Card>
                  <div className="pa-flex pa-justify-between pa-items-center" style={{ gap: 'var(--pa-space-4)' }}>
                    <div className="pa-flex pa-items-center" style={{ gap: 'var(--pa-space-3)' }}>
                      <span
                        className="pa-body-s"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: 'var(--pa-space-2) var(--pa-space-3)',
                          borderRadius: 'var(--pa-radius-pill)',
                          background: 'var(--pa-theme-action-primary)',
                          color: 'var(--pa-theme-text-on-action)',
                          fontWeight: 900,
                          letterSpacing: '0.14em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Status: {statusLabel}
                      </span>
                      <span className="pa-body-m" style={{ color: 'var(--pa-n500)' }}>
                        {updatedLabel}
                      </span>
                    </div>

                    <div className="pa-flex pa-items-center pa-gap-2" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <Link to={`${formsRoute}?edit=program&id=${programId}&returnUrl=${encodeURIComponent(detailRoute)}`}>
                        <Button
                          variant="ghost"
                          icon="edit"
                          style={{
                            border: '2px solid var(--pa-theme-action-primary)',
                            color: 'var(--pa-theme-text-accent)',
                            background: 'transparent',
                          }}
                        >
                          Edit Program
                        </Button>
                      </Link>
                      <Link
                        to={`${formsRoute}?type=level&program_id=${programId}&sport_id=${program.sport_id}&returnUrl=${encodeURIComponent(detailRoute)}`}
                        className={isOffline || USE_FAKE_DATA ? 'pa-disabled-link' : ''}
                      >
                        <Button
                          variant="blue"
                          icon="add_circle"
                          disabled={isOffline || USE_FAKE_DATA}
                          title={
                            isOffline
                              ? 'Offline - cannot add levels'
                              : USE_FAKE_DATA
                                ? 'Sign in to add levels'
                                : undefined
                          }
                        >
                          Add Level
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>

                {/* Levels table */}
                <Card
                  title="Program Levels"
                  actions={
                    <Button
                      variant="ghost"
                      size="dense"
                      onClick={() => {
                        const rows = levelRows.map((r) => ({
                          level_id: r.id,
                          level_name: r.name,
                          teams: r.teams,
                          athletes: r.athletes ?? '',
                          status: r.status,
                        }))
                        downloadCsv(`${program.name}-levels.csv`, rows)
                      }}
                      disabled={levelRows.length === 0}
                    >
                      Export CSV
                    </Button>
                  }
                  noPadding
                >
                  <Table
                    columns={columns}
                    data={levelRows}
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

              {/* Right panel (stacks below on small screens) */}
              <div
                className="pa-grid"
                style={{
                  gridTemplateColumns: 'minmax(0, 1fr)',
                  gap: 'var(--pa-space-5)',
                }}
              >
                {/* Tactical overview */}
                <Card
                  title="Tactical Overview"
                  actions={
                    <button
                      type="button"
                      aria-label="More options"
                      className="pa-btn pa-btn--ghost pa-btn--dense"
                      style={{ padding: 0, width: 'var(--pa-space-6)', justifyContent: 'center' }}
                      onClick={() => {
                        setSuccessMessage(null)
                        setActionError('No actions available here yet.')
                      }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>
                        more_horiz
                      </span>
                    </button>
                  }
                >
                  <div
                    style={{
                      borderRadius: 'var(--pa-radius-s)',
                      border: '1px solid var(--pa-n200)',
                      overflow: 'hidden',
                      background: 'var(--pa-theme-action-primary)',
                      position: 'relative',
                      aspectRatio: '3 / 4',
                    }}
                    aria-label="Tactical board"
                  >
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0.18,
                        backgroundImage: 'radial-gradient(var(--pa-white) 1px, transparent 1px)',
                        backgroundSize: 'calc(var(--pa-space-5) - var(--pa-space-1)) calc(var(--pa-space-5) - var(--pa-space-1))',
                      }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.18)',
                      }}
                    />
                    <div style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: '1px', background: 'rgba(255,255,255,0.25)' }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '1px', background: 'rgba(255,255,255,0.18)' }} />
                    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '1px', background: 'rgba(255,255,255,0.18)' }} />
                    <div
                      style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: 'calc(var(--pa-space-9) + var(--pa-space-1))',
                        height: 'calc(var(--pa-space-9) + var(--pa-space-1))',
                        transform: 'translate(-50%, -50%)',
                        borderRadius: '999px',
                        border: '2px solid rgba(255,255,255,0.22)',
                      }}
                    />

                    {/* Dots */}
                    <div style={{ position: 'absolute', inset: 0 }}>
                      {[
                        { x: '35%', y: '22%', label: '7', filled: true },
                        { x: '65%', y: '22%', label: '10', filled: true },
                        { x: '50%', y: '50%', label: '4', filled: false },
                        { x: '32%', y: '72%', label: '2', filled: false },
                        { x: '68%', y: '72%', label: '5', filled: false },
                      ].map((p) => (
                        <div
                          key={p.label}
                          style={{
                            position: 'absolute',
                            left: p.x,
                            top: p.y,
                            width: 'var(--pa-space-5)',
                            height: 'var(--pa-space-5)',
                            transform: 'translate(-50%, -50%)',
                            borderRadius: '999px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: 900,
                            background: p.filled ? 'var(--pa-theme-action-active)' : 'var(--pa-white)',
                            color: p.filled ? 'var(--pa-theme-text-on-action)' : 'var(--pa-theme-text-accent)',
                            border: `2px solid ${p.filled ? 'var(--pa-white)' : 'var(--pa-theme-action-active)'}`,
                          }}
                          aria-hidden="true"
                        >
                          {p.label}
                        </div>
                      ))}
                    </div>

                    {/* Legend */}
                    <div
                      style={{
                        position: 'absolute',
                        left: 'var(--pa-space-3)',
                        bottom: 'var(--pa-space-3)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 'var(--pa-space-1)',
                      }}
                    >
                      {[
                        { label: 'Offense', dot: 'var(--pa-theme-action-active)' },
                        { label: 'Defense', dot: 'var(--pa-white)' },
                      ].map((l) => (
                        <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--pa-space-2)' }}>
                          <span style={{ width: 'var(--pa-space-2)', height: 'var(--pa-space-2)', borderRadius: '999px', background: l.dot }} />
                          <span
                            style={{
                              fontSize: '10px',
                              fontWeight: 800,
                              color: 'rgba(255,255,255,0.9)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                            }}
                          >
                            {l.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 'var(--pa-space-4)',
                      padding: 'var(--pa-space-3)',
                      borderRadius: 'var(--pa-radius-s)',
                      background: 'var(--pa-surface-panel)',
                      color: 'var(--pa-n600)',
                      fontStyle: 'italic',
                      fontSize: '11px',
                      lineHeight: 1.4,
                    }}
                  >
                    “The tactical board provides a visual representation of team formations and age-group progression across the program.”
                  </div>
                </Card>

                {/* Totals */}
                <Card
                  className="pa-card"
                  style={{
                    background: 'var(--pa-theme-action-primary)',
                    color: 'var(--pa-theme-text-on-action)',
                    borderColor: 'var(--pa-theme-border-accent)',
                  }}
                >
                  <div
                    className="pa-overline"
                    style={{
                      color: 'rgba(255,255,255,0.75)',
                      letterSpacing: '0.18em',
                      marginBottom: 'var(--pa-space-4)',
                    }}
                  >
                    Program Totals
                  </div>

                  <div style={{ display: 'grid', gap: 'var(--pa-space-4)' }}>
                    <div>
                      <div className="pa-display-xl" style={{ color: 'var(--pa-theme-text-on-action)' }}>
                        {totalAthletes === null ? '—' : totalAthletes.toLocaleString()}
                      </div>
                      <div className="pa-overline" style={{ color: 'rgba(255,255,255,0.75)' }}>
                        Total Athletes
                      </div>
                    </div>

                    <div style={{ height: '1px', background: 'rgba(255,255,255,0.18)' }} />

                    <div>
                      <div className="pa-display-xl" style={{ color: 'var(--pa-theme-text-on-action)' }}>
                        {totalCoaches === null ? '—' : totalCoaches.toLocaleString()}
                      </div>
                      <div className="pa-overline" style={{ color: 'rgba(255,255,255,0.75)' }}>
                        Total Coaches
                      </div>
                    </div>

                    {isOffline && (
                      <div className="pa-body-s" style={{ color: 'rgba(255,255,255,0.75)' }}>
                        Offline: roster totals may be unavailable.
                      </div>
                    )}
                  </div>
                </Card>

                {/* Helper links */}
                <Card>
                  <div className="pa-flex pa-flex-col pa-gap-2">
                    <div className="pa-body-m" style={{ fontWeight: 700, color: 'var(--pa-n900)' }}>
                      Quick Actions
                    </div>
                    <div className="pa-flex pa-gap-2" style={{ flexWrap: 'wrap' }}>
                      <Link to={levelsRoute}>
                        <Button variant="ghost">Open Levels</Button>
                      </Link>
                      <Link to={`${formsRoute}?type=team&program_id=${programId}&sport_id=${program.sport_id}&returnUrl=${encodeURIComponent(detailRoute)}`}>
                        <Button variant="secondary" disabled={isOffline || USE_FAKE_DATA} title={isOffline ? 'Offline' : USE_FAKE_DATA ? 'Sign in' : undefined}>
                          Add Team
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

