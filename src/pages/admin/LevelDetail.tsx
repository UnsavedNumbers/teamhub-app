import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { supabase } from '../../lib/supabase'
import { getLevel } from '../../data/services/levelsService'
import { getProgram, getSports } from '../../data/services/sportsService'
import { getTeams, getActiveSeason, getTeamRoster } from '../../data/services/teamsService'
import type { Level, Program, Sport, Team } from '../../data/types/organization'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { AdminPageHeader, Button, Card, Table, type TableColumn } from '../../components/admin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import { getLink } from '../../utils/routes'
import { getRandomSportImagePath } from '../../utils/sportImages'
import '../../styles/orgAdmin.css'

type TeamRow = {
  id: string
  name: string
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

function formatEligibility(level: Level): string {
  if (level.level_type === 'age_based' && level.age_min !== null && level.age_max !== null) {
    return `${level.age_min}-${level.age_max} years old`
  }
  if (level.level_type === 'grade_based' && level.grade_min !== null && level.grade_max !== null) {
    return `Grades ${level.grade_min}-${level.grade_max}`
  }
  if (level.level_type === 'skill_based' && level.skill_min !== null && level.skill_max !== null) {
    return `Skill level ${level.skill_min}-${level.skill_max}`
  }
  return level.description || 'No eligibility criteria specified'
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      if (rows.length === 0) {
        reject(new Error('No data to export'))
        return
      }
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
      resolve()
    } catch (err) {
      reject(err)
    }
  })
}

export default function LevelDetail() {
  const { id } = useParams<{ id: string }>()
  const levelId = id?.trim() || ''

  const { context, isReady } = useUserContext()
  const { isOffline } = useOffline()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [level, setLevel] = useState<Level | null>(null)
  const [program, setProgram] = useState<Program | null>(null)
  const [sport, setSport] = useState<Sport | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [totalAthletes, setTotalAthletes] = useState<number | null>(null)

  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Navigation state success message (e.g. returning from forms)
  useEffect(() => {
    if (location.state?.successMessage) {
      setSuccessMessage(location.state.successMessage)
      window.history.replaceState({}, document.title)
      // Refresh data after successful form submission
      if (levelId && isReady) {
        setRefreshing(true)
        loadData()
      }
    }
  }, [location.state, levelId, isReady])

  const levelsRoute = getLink('admin.levels.list')
  const programsRoute = getLink('admin.programs.list')
  const structureRoute = getLink('admin.organization.structure')
  const formsRoute = getLink('admin.organization.forms')
  const detailRoute = getLink('admin.levels.detail', { id: levelId })

  const heroImage = useMemo(() => getRandomSportImagePath(sport?.name ?? null, 'hero'), [sport?.name])
  const updatedLabel = useMemo(() => formatUpdatedRelative(level?.updated_at), [level?.updated_at])

  const statusLabel = useMemo(() => {
    const activeTeams = teams.filter((t) => t.is_active !== false)
    if (activeTeams.length > 0) return 'In Season'
    if (teams.length > 0) return 'Active'
    return 'Planning'
  }, [teams])

  const heroStats = useMemo(
    () => [
      { label: 'Total Teams', value: teams.length },
      { label: 'Total Athletes', value: totalAthletes },
    ],
    [teams.length, totalAthletes]
  )

  const loadData = useCallback(async () => {
    if (!isReady || !levelId) {
      if (!levelId && isReady) {
        setError('Level ID is required.')
        setLoading(false)
      }
      return
    }

    if (!refreshing) {
      setLoading(true)
    }
    setError(null)
    setActionError(null)

    try {
      const [levelRes, sportsRes, teamsRes] = await Promise.all([
        getLevel(context, levelId),
        getSports(context),
        getTeams(context, { levelId }),
      ])

      if (!isMountedRef.current) return

      if (levelRes.error) throw levelRes.error
      if (sportsRes.error) throw sportsRes.error
      if (teamsRes.error) throw teamsRes.error

      const foundLevel = levelRes.data as Level | null
      if (!foundLevel) {
        setLevel(null)
        setProgram(null)
        setSport(null)
        setTeams([])
        setError('Level not found (or you may not have access).')
        return
      }

      setLevel(foundLevel)

      // Load program if we have a program_id
      if (foundLevel.program_id) {
        const programRes = await getProgram(context, foundLevel.program_id)
        if (!isMountedRef.current) return
        if (!programRes.error && programRes.data) {
          const foundProgram = programRes.data as Program
          setProgram(foundProgram)

          // Load sport if we have a sport_id
          if (foundProgram.sport_id) {
            const allSports = Array.isArray(sportsRes.data) ? (sportsRes.data as Sport[]) : []
            const foundSport = allSports.find((s) => s.id === foundProgram.sport_id) ?? null
            setSport(foundSport)
          }
        }
      }

      setTeams(Array.isArray(teamsRes.data) ? teamsRes.data : [])
    } catch (err) {
      if (!isMountedRef.current) return
      setError(err instanceof Error ? err.message : 'Failed to load level.')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
    }
  }, [context, isReady, levelId, refreshing])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Compute athlete counts (best effort). If offline, show as unavailable.
  useEffect(() => {
    const compute = async () => {
      setTotalAthletes(null)

      if (!level || !levelId) return
      if (isOffline) return

      if (teams.length === 0) {
        setTotalAthletes(0)
        return
      }

      const teamIds = teams.map((t) => t.id)

      // Fake data: derive counts from active season + roster per team
      if (USE_FAKE_DATA) {
        let total = 0

        for (const team of teams) {
          const seasonRes = await getActiveSeason(context, team.id)
          if (seasonRes.error || !seasonRes.data) continue
          const rosterRes = await getTeamRoster(context, team.id, seasonRes.data.id)
          if (rosterRes.error) continue
          total += rosterRes.data.length
        }

        setTotalAthletes(total)
        return
      }

      // Real data: count active memberships for teams in this level.
      try {
        const { data: memberships, error: memErr } = await supabase
          .from('team_memberships' as any)
          .select('athlete_id')
          .in('team_id', teamIds as any)
          .eq('status', 'active')

        if (memErr) throw memErr

        const distinctAthletes = new Set<string>()

        for (const row of (memberships as any[]) ?? []) {
          const athleteId = row.athlete_id as string | undefined
          if (athleteId) distinctAthletes.add(athleteId)
        }

        setTotalAthletes(distinctAthletes.size)
      } catch {
        // Keep counts unavailable if query fails
        setTotalAthletes(null)
      }
    }

    void compute()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level, levelId, teams, isOffline])

  const teamRows: TeamRow[] = useMemo(() => {
    return teams.map((t) => ({
      id: t.id,
      name: t.name,
      athletes: null, // Will be computed per team if needed
      status: t.is_active !== false ? 'active' : 'inactive',
    }))
  }, [teams])

  const columns: TableColumn<TeamRow>[] = useMemo(() => {
    return [
      {
        id: 'name',
        label: 'TEAM NAME',
        cellType: 'primary',
        render: (row) => {
          if (!row.id) {
            return <span className="oa-body-m" style={{ fontWeight: 700, color: 'var(--oa-n900)' }}>{row.name}</span>
          }
          return (
            <Link
              to={getLink('admin.teams.detail', { id: row.id })}
              className="oa-body-m"
              style={{ fontWeight: 700, color: 'var(--oa-n900)', textDecoration: 'none' }}
              onClick={(e) => {
                if (!row.id) {
                  e.preventDefault()
                  setActionError('Invalid team ID')
                }
              }}
            >
              {row.name}
            </Link>
          )
        },
      },
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
            className="oa-body-s"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: 'calc(var(--oa-space-1) + 1px) var(--oa-space-2)',
              borderRadius: 'var(--oa-radius-pill)',
              background: row.status === 'active' ? 'var(--oa-theme-surface-highlight)' : 'var(--oa-surface-panel)',
              color: row.status === 'active' ? 'var(--oa-theme-text-accent)' : 'var(--oa-n500)',
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
        render: (row) => {
          if (!row.id) {
            return (
              <Button variant="ghost" size="dense" disabled title="Invalid team ID">
                View
              </Button>
            )
          }
          return (
            <Link to={getLink('admin.teams.detail', { id: row.id })}>
              <Button variant="ghost" size="dense">
                View
              </Button>
            </Link>
          )
        },
      },
    ]
  }, [])

  if (loading) {
    return (
      <div className="oa-root">
        <OfflineBanner />
        <div style={{ padding: '24px' }}>
          <div className="oa-skeleton" style={{ height: '60px', marginBottom: '24px' }} />
          <div className="oa-skeleton" style={{ height: '280px', borderRadius: '8px', marginBottom: '32px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="oa-skeleton" style={{ height: '160px' }} />
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i}>
                <div className="oa-skeleton" style={{ height: '40px', marginBottom: '16px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="oa-skeleton" style={{ height: '60px' }} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!level) {
    return (
      <div className="oa-root">
        <OfflineBanner />
        <AdminPageHeader
          title="Level Not Found"
          breadcrumbs={[
            { label: 'Organizations', path: structureRoute },
            { label: 'Levels', path: levelsRoute },
            { label: 'Not Found' },
          ]}
        />
        {error && (
          <Card className="oa-mb-4" style={{ borderLeft: '3px solid var(--oa-danger)' }}>
            <div className="oa-body-m oa-text-danger" style={{ padding: 'var(--oa-space-3) var(--oa-space-4)' }}>
              {error}
            </div>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="oa-root">
      <OfflineBanner />

      <div
        style={{
          maxWidth: 'calc(var(--oa-space-9) * 22.5)',
          margin: '0 auto',
          padding: 'var(--oa-space-6) var(--oa-space-4)',
        }}
      >
        <AdminPageHeader
          title={level.name}
          subtitle="Level details, teams, and eligibility."
          breadcrumbs={[
            { label: 'Organizations', path: structureRoute },
            { label: 'Levels', path: levelsRoute },
            { label: level.name },
          ]}
          actions={
            <div className="oa-flex oa-flex-col sm:oa-flex-row oa-gap-2">
              <Link to={levelsRoute} className="w-full sm:w-auto">
                <Button variant="ghost" disabled={loading} className="w-full sm:w-auto min-h-[44px]">
                  Back to Levels
                </Button>
              </Link>
              {program && program.id ? (
                <Link
                  to={getLink('admin.programs.detail', { id: program.id })}
                  onClick={(e) => {
                    if (!program.id) {
                      e.preventDefault()
                      setActionError('Program ID is required')
                    }
                  }}
                  className="w-full sm:w-auto"
                >
                  <Button variant="secondary" disabled={!program.id || loading} className="w-full sm:w-auto min-h-[44px]">
                    View Program
                  </Button>
                </Link>
              ) : (
                <Link to={programsRoute} className="w-full sm:w-auto">
                  <Button variant="secondary" disabled={loading} className="w-full sm:w-auto min-h-[44px]">
                    View Programs
                  </Button>
                </Link>
              )}
            </div>
          }
        />

        {successMessage && (
          <Card className="oa-mb-6" style={{ borderLeft: '3px solid var(--oa-success)' }}>
            <div className="oa-body-m" style={{ padding: 'var(--oa-space-3) var(--oa-space-4)', color: 'var(--oa-n900)' }}>
              {successMessage}
            </div>
          </Card>
        )}

        {actionError && (
          <Card className="oa-mb-6" style={{ borderLeft: '3px solid var(--oa-danger)' }}>
            <div className="oa-body-m oa-text-danger" style={{ padding: 'var(--oa-space-3) var(--oa-space-4)' }}>
              {actionError}
            </div>
          </Card>
        )}

        {error && (
          <Card className="oa-mb-6" style={{ borderLeft: '3px solid var(--oa-danger)' }}>
            <div className="oa-body-m oa-text-danger" style={{ padding: 'var(--oa-space-3) var(--oa-space-4)' }}>
              {error}
            </div>
          </Card>
        )}

        {/* Hero band */}
        <div
          style={{
            height: 'calc(var(--oa-space-9) * 3)',
            borderRadius: 'var(--oa-radius-l)',
            overflow: 'hidden',
            position: 'relative',
            background: 'var(--oa-n900)',
            marginBottom: 'var(--oa-space-6)',
            border: '1px solid var(--oa-n100)',
          }}
          aria-label="Level hero"
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
              background: 'linear-gradient(to top, var(--oa-n900), transparent)',
              opacity: 0.9,
            }}
          />
          <div
            className="oa-flex oa-items-center"
            style={{
              position: 'absolute',
              inset: 0,
              padding: '0 var(--oa-space-6)',
            }}
          >
            <div
              className="oa-grid"
              style={{
                width: '100%',
                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                gap: 'var(--oa-space-6)',
              }}
            >
              {heroStats.map((stat) => (
                <div
                  key={stat.label}
                  className="oa-display-xl"
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    color: 'var(--oa-white)',
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
          className="oa-grid"
          style={{
            gridTemplateColumns: 'minmax(0, 1fr)',
            alignItems: 'start',
          }}
        >
          <div
            className="oa-grid"
            style={{
              gridTemplateColumns: 'minmax(0, 1fr)',
              gap: 'var(--oa-space-6)',
            }}
          >
            {/* Action bar */}
            <Card className="oa-card">
              <div className="oa-flex oa-justify-between oa-items-center" style={{ gap: 'var(--oa-space-4)' }}>
                <div className="oa-flex oa-items-center" style={{ gap: 'var(--oa-space-3)' }}>
                  <span
                    className="oa-body-s"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      padding: 'var(--oa-space-2) var(--oa-space-3)',
                      borderRadius: 'var(--oa-radius-pill)',
                      background: 'var(--oa-theme-action-primary)',
                      color: 'var(--oa-theme-text-on-action)',
                      fontWeight: 900,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Status: {statusLabel}
                  </span>
                  <span className="oa-body-m" style={{ color: 'var(--oa-n500)' }}>
                    {updatedLabel}
                  </span>
                </div>

                <div className="oa-flex oa-items-center oa-gap-2" style={{ flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {levelId ? (
                    <Link
                      to={`${getLink('admin.levels.update', { id: levelId })}?returnUrl=${encodeURIComponent(detailRoute)}`}
                      onClick={(e) => {
                        if (!levelId) {
                          e.preventDefault()
                          setActionError('Level ID is required to edit')
                        }
                      }}
                    >
                      <Button
                        variant="ghost"
                        icon="edit"
                        disabled={!levelId || loading}
                        style={{
                          border: '2px solid var(--oa-theme-action-primary)',
                          color: 'var(--oa-theme-text-accent)',
                          background: 'transparent',
                        }}
                        title={!levelId ? 'Level ID is required' : undefined}
                      >
                        Edit Level
                      </Button>
                    </Link>
                  ) : (
                    <Button
                      variant="ghost"
                      icon="edit"
                      disabled
                      style={{
                        border: '2px solid var(--oa-theme-action-primary)',
                        color: 'var(--oa-theme-text-accent)',
                        background: 'transparent',
                      }}
                      title="Level ID is required"
                    >
                      Edit Level
                    </Button>
                  )}
                  {program && program.id && program.sport_id ? (
                    <Link
                      to={`${formsRoute}?type=team&program_id=${program.id}&level_id=${levelId}&sport_id=${program.sport_id}&returnUrl=${encodeURIComponent(detailRoute)}`}
                      className={isOffline || USE_FAKE_DATA ? 'oa-disabled-link' : ''}
                      onClick={(e) => {
                        if (isOffline || USE_FAKE_DATA) {
                          e.preventDefault()
                        } else if (!program.id || !program.sport_id || !levelId) {
                          e.preventDefault()
                          setActionError('Missing required information to add team')
                        }
                      }}
                    >
                      <OrgAdminButton
                        variant="primary"
                        icon="add_circle"
                        disabled={isOffline || USE_FAKE_DATA || !program.id || !program.sport_id || !levelId || loading}
                        title={
                          !levelId
                            ? 'Level ID is required'
                            : !program.id
                              ? 'Program ID is required'
                              : !program.sport_id
                                ? 'Sport ID is required'
                                : isOffline
                                  ? 'Offline - cannot add teams'
                                  : USE_FAKE_DATA
                                    ? 'Sign in to add teams'
                                    : undefined
                        }
                      >
                        Add Team
                      </OrgAdminButton>
                    </Link>
                  ) : (
                    <OrgAdminButton
                      variant="primary"
                      icon="add_circle"
                      disabled
                      title="Program information is required to add teams"
                    >
                      Add Team
                    </OrgAdminButton>
                  )}
                </div>
              </div>
            </Card>

            {/* Level details */}
            <Card title="Level Information" className="oa-card">
              <div style={{ display: 'grid', gap: 'var(--oa-space-4)' }}>
                <div>
                  <div className="oa-overline" style={{ color: 'var(--oa-n500)', marginBottom: 'var(--oa-space-1)' }}>
                    Level Type
                  </div>
                  <div className="oa-body-m" style={{ fontWeight: 700, color: 'var(--oa-n900)' }}>
                    {level.level_type === 'age_based'
                      ? 'Age-based'
                      : level.level_type === 'grade_based'
                        ? 'Grade-based'
                        : level.level_type === 'skill_based'
                          ? 'Skill-based'
                          : level.level_type}
                  </div>
                </div>

                <div>
                  <div className="oa-overline" style={{ color: 'var(--oa-n500)', marginBottom: 'var(--oa-space-1)' }}>
                    Eligibility Criteria
                  </div>
                  <div className="oa-body-m" style={{ color: 'var(--oa-n900)' }}>
                    {formatEligibility(level)}
                  </div>
                </div>

                {level.description && (
                  <div>
                    <div className="oa-overline" style={{ color: 'var(--oa-n500)', marginBottom: 'var(--oa-space-1)' }}>
                      Description
                    </div>
                    <div className="oa-body-m" style={{ color: 'var(--oa-n700)' }}>
                      {level.description}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* Teams table */}
            <Card
              title="Teams in This Level"
              className="oa-card oa-card--no-padding"
              actions={
                <Button
                  variant="ghost"
                  size="dense"
                  onClick={() => {
                    const rows = teamRows.map((r) => ({
                      team_id: r.id,
                      team_name: r.name,
                      athletes: r.athletes ?? '',
                      status: r.status,
                    }))
                    downloadCsv(`${level.name}-teams.csv`, rows)
                  }}
                  disabled={teamRows.length === 0}
                >
                  Export CSV
                </Button>
              }
             
            >
              <Table
                columns={columns}
                data={teamRows}
                emptyState={
                  <div style={{ padding: 'var(--oa-space-8) var(--oa-space-5)' }}>
                    <div className="oa-h3" style={{ textAlign: 'center', marginBottom: 'var(--oa-space-2)' }}>
                      No teams yet
                    </div>
                    <div className="oa-body-m" style={{ textAlign: 'center', color: 'var(--oa-n600)' }}>
                      Add a team to this level to start organizing rosters.
                    </div>
                  </div>
                }
              />
            </Card>
          </div>

          {/* Right panel (stacks below on small screens) */}
          <div
            className="oa-grid"
            style={{
              gridTemplateColumns: 'minmax(0, 1fr)',
              gap: 'var(--oa-space-6)',
            }}
          >
            {/* Totals */}
            <Card
              className="oa-card"
              style={{
                background: 'var(--oa-theme-action-primary)',
                color: 'var(--oa-theme-text-on-action)',
                borderColor: 'var(--oa-theme-border-accent)',
              }}
            >
              <div
                className="oa-overline"
                style={{
                  color: 'rgba(255,255,255,0.75)',
                  letterSpacing: '0.18em',
                  marginBottom: 'var(--oa-space-4)',
                }}
              >
                Level Totals
              </div>

              <div style={{ display: 'grid', gap: 'var(--oa-space-4)' }}>
                <div>
                  <div className="oa-display-xl" style={{ color: 'var(--oa-theme-text-on-action)' }}>
                    {teams.length.toLocaleString()}
                  </div>
                  <div className="oa-overline" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    Total Teams
                  </div>
                </div>

                <div style={{ height: '1px', background: 'rgba(255,255,255,0.18)' }} />

                <div>
                  <div className="oa-display-xl" style={{ color: 'var(--oa-theme-text-on-action)' }}>
                    {totalAthletes === null ? '—' : totalAthletes.toLocaleString()}
                  </div>
                  <div className="oa-overline" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    Total Athletes
                  </div>
                </div>

                {isOffline && (
                  <div className="oa-body-s" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    Offline: roster totals may be unavailable.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

