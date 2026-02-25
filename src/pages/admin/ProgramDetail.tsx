import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { useOrganization } from '../../contexts/OrganizationContext'
import { useOffline } from '../../hooks/useOffline'
import { USE_FAKE_DATA } from '../../data/config'
import { supabase } from '../../lib/supabase'
import { getProgram, getSports } from '../../data/services/sportsService'
import { getLevels } from '../../data/services/levelsService'
import { getTeams, getActiveSeason, getTeamRoster } from '../../data/services/teamsService'
import { getOrganizationUsers } from '../../data/services/usersService'
import { getVenueById } from '../../data/services/venueService'
import type { Level, Program, Sport, Team } from '../../data/types/organization'
import { getProgramStatus } from '../../utils/programStatus'
import { getRegistrationStatus } from '../../utils/registrationStatus'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { AdminPageHeader, Button, Card, Table, Badge } from '../../components/admin'
import { OrgAdminButton } from '../../components/admin/OrgAdminButton'
import { getLink } from '../../utils/routes'
import { getRandomSportImagePath } from '../../utils/sportImages'
import { cn } from '../../utils/cn'
import { PhotoSection } from '@/components/galleries/PhotoSection'
import { useI18n } from '../../i18n/useI18n'
import { hasAnyRole } from '../../utils/roleHelpers'
import '../../styles/orgAdmin.css'

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

function formatMetric(value: number | null): string {
  return value === null ? '—' : value.toLocaleString()
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
  const AnyCard = Card as any
  const AnyTable = Table as any
  const { id } = useParams<{ id: string }>()
  const programId = id?.trim() || ''

  const { context, isReady } = useUserContext()
  const { currentOrganization } = useOrganization()
  const { isOffline } = useOffline()
  const location = useLocation()
  const navigate = useNavigate()
  const { t } = useI18n()
  const isOrgAdmin = hasAnyRole(currentOrganization, ['org_admin'])

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
  const [defaultVenueName, setDefaultVenueName] = useState<string | null>(null)

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
  const _updatedLabel = useMemo(() => formatUpdatedRelative(program?.updated_at), [program?.updated_at])
  void _updatedLabel

  const statusLabel = useMemo(() => {
    const activeTeams = teams.filter((t) => t.is_active !== false)
    if (activeTeams.length > 0) return 'In Season'
    if (levels.length > 0) return 'Active'
    return 'Planning'
  }, [levels.length, teams])

  const heroStats = useMemo(
    () => [
      { label: t('admin.programs.stats.levels'), value: levels.length },
      { label: t('admin.programs.stats.teams'), value: teams.length },
      { label: t('admin.programs.stats.athletes'), value: totalAthletes },
      { label: t('admin.programs.stats.coaches'), value: totalCoaches },
    ],
    [levels.length, teams.length, totalAthletes, totalCoaches, t]
  )

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

      // Load default venue name if program has a default_location_id
      if (foundProgram.default_location_id) {
        try {
          const venue = await getVenueById(foundProgram.default_location_id)
          setDefaultVenueName(venue.name)
        } catch (venueErr) {
          console.error('[ProgramDetail] Error loading default venue:', venueErr)
          setDefaultVenueName(null)
        }
      } else {
        setDefaultVenueName(null)
      }
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


  const columns = useMemo<any>(() => {
    return [
      {
        id: 'name',
        label: 'LEVEL NAME',
        cellType: 'primary',
        render: (row: any) => (
          <div className="oa-flex oa-items-center oa-gap-2">
            <span
              className="oa-body-s"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 'var(--oa-space-6)',
                height: 'var(--oa-space-6)',
                borderRadius: 'var(--oa-radius-xs)',
                background: 'var(--oa-surface-panel)',
                color: 'var(--oa-theme-text-accent)',
                fontWeight: 800,
                fontStyle: 'italic',
              }}
              aria-hidden="true"
            >
              {row.name.split(' ')[0]?.slice(0, 4).toUpperCase() || 'LVL'}
            </span>
            <span className="oa-body-m" style={{ fontWeight: 700, color: 'var(--oa-n900)' }}>
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
        render: (row: any) => (row.athletes === null ? '—' : row.athletes),
      },
      {
        id: 'status',
        label: 'STATUS',
        render: (row: any) => (
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
        render: (row: any) => (
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
      <div className="oa-root">
        <OfflineBanner />
        <div style={{ padding: '24px' }}>
          <div className="oa-skeleton" style={{ height: '60px', marginBottom: '24px' }} />
          <div className="oa-skeleton" style={{ height: '300px', borderRadius: '8px', marginBottom: '32px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <div>
              <div className="oa-skeleton" style={{ height: '40px', marginBottom: '16px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="oa-skeleton" style={{ height: '80px' }} />
                ))}
              </div>
            </div>
            <div>
              <div className="oa-skeleton" style={{ height: '40px', marginBottom: '16px' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="oa-skeleton" style={{ height: '100px' }} />
                ))}
              </div>
            </div>
          </div>
        </div>
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
          title={program?.name || 'Program'}
          subtitle="Program details, levels, and structure."
          breadcrumbs={[
            { label: 'Organizations', path: structureRoute },
            { label: 'Programs', path: programsRoute },
            { label: program?.name || 'Program' },
          ]}
          actions={
            <div className="oa-flex oa-flex-col sm:oa-flex-row oa-gap-2">
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
            <div style={{ padding: '0 var(--oa-space-4) var(--oa-space-3)' }}>
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
                height: 'calc(var(--oa-space-9) * 3)',
                borderRadius: 'var(--oa-radius-l)',
                overflow: 'hidden',
                position: 'relative',
                background: 'var(--oa-n900)',
                marginBottom: 'var(--oa-space-6)',
                border: '1px solid var(--oa-n100)',
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
                        {formatMetric(stat.value)}
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
                  <div className="oa-flex oa-flex-col oa-gap-4">
                    <div className="oa-flex oa-justify-between oa-items-center oa-gap-2 oa-flex-wrap">
                      <div className="oa-flex oa-gap-2 oa-flex-wrap">
                        <span className="oa-badge oa-badge--info" style={{ fontWeight: 700 }}>
                          {t('admin.programs.statusCard.statusLabel')}: {statusLabel}
                        </span>
                        {program.is_public && (
                          <Badge variant="info" className="oa-text-[10px] oa-px-2 oa-py-0.5">
                            {t('admin.programs.details.visibilityPublic')}
                          </Badge>
                        )}
                        {(() => {
                          const progStatus = getProgramStatus(program)
                          const statusColors: Record<string, string> = {
                            unpublished: 'var(--oa-n500)',
                            upcoming: 'var(--oa-info)',
                            live: 'var(--oa-success)',
                            completed: 'var(--oa-n400)',
                          }
                          return (
                            <Badge 
                              variant="neutral" 
                              className="oa-text-[10px] oa-px-2 oa-py-0.5 oa-uppercase"
                              style={{ backgroundColor: statusColors[progStatus] || statusColors.unpublished, color: 'white' }}
                            >
                              {progStatus}
                            </Badge>
                          )
                        })()}
                        {program.registration_start_date && (() => {
                          const regStatus = getRegistrationStatus(program)
                          const regStatusColors: Record<string, string> = {
                            opens_soon: 'var(--oa-warning)',
                            accepting: 'var(--oa-success)',
                            closed: 'var(--oa-n400)',
                          }
                          return (
                            <Badge 
                              variant="neutral" 
                              className="oa-text-[10px] oa-px-2 oa-py-0.5 oa-uppercase"
                              style={{ backgroundColor: regStatusColors[regStatus] || regStatusColors.accepting, color: 'white' }}
                            >
                              {regStatus.replace('_', ' ')}
                            </Badge>
                          )
                        })()}
                      </div>
                    </div>
                    <div className="oa-flex oa-justify-between oa-gap-2 oa-flex-wrap">
                      <div className="oa-flex oa-gap-2 oa-flex-wrap">
                        {isOrgAdmin && (
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
                        )}

                        <Link to={levelsRoute} className="w-full sm:w-auto">
                          <Button
                            variant="ghost"
                            disabled={loading}
                            aria-label="Navigate to all levels"
                            className="w-full sm:w-auto min-h-[44px]"
                          >
                            View Levels
                          </Button>
                        </Link>
                      </div>

                      <div className="oa-flex oa-gap-2 oa-flex-wrap">
                        <Link
                          to={`${formsRoute}?type=level&program_id=${programId}&sport_id=${program.sport_id}&returnUrl=${encodeURIComponent(detailRoute)}`}
                          className={cn(isOffline || USE_FAKE_DATA ? 'oa-disabled-link' : '', 'w-full sm:w-auto')}
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

                        {isOrgAdmin && (
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
                        )}
                      </div>
                    </div>
                  </div>
                </Card>

                {/* Program Details */}
                {(program.is_public !== undefined || 
                  program.activity_start_date || 
                  program.activity_end_date || 
                  program.registration_start_date || 
                  program.registration_end_date || 
                  program.program_code || 
                  program.sponsor || 
                  program.default_location_id) && (
                  <Card title={t('admin.programs.details.title')}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--pa-space-4)' }}>
                      {program.is_public !== undefined && (
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            {t('admin.programs.details.visibility')}
                          </label>
                          <p style={{ margin: 0, fontSize: '14px' }}>
                            {program.is_public ? t('admin.programs.details.visibilityPublic') : t('admin.programs.details.visibilityPrivate')}
                          </p>
                        </div>
                      )}
                      {program.program_code && (
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            {t('admin.programs.details.programCode')}
                          </label>
                          <p style={{ margin: 0, fontSize: '14px', fontFamily: 'monospace' }}>
                            {program.program_code}
                          </p>
                        </div>
                      )}
                      {program.sponsor && (
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            {t('admin.programs.details.sponsor')}
                          </label>
                          <p style={{ margin: 0, fontSize: '14px' }}>
                            {program.sponsor}
                          </p>
                        </div>
                      )}
                      {program.default_location_id && (
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            {t('admin.programs.details.defaultLocation')}
                          </label>
                          <p style={{ margin: 0, fontSize: '14px' }}>
                            {defaultVenueName || t('common.loading')}
                          </p>
                        </div>
                      )}
                      {program.activity_start_date && (
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            {t('admin.programs.details.activityStartDate')}
                          </label>
                          <p style={{ margin: 0, fontSize: '14px' }}>
                            {new Date(program.activity_start_date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      )}
                      {program.activity_end_date && (
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            {t('admin.programs.details.activityEndDate')}
                          </label>
                          <p style={{ margin: 0, fontSize: '14px' }}>
                            {new Date(program.activity_end_date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      )}
                      {program.registration_start_date && (
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            {t('admin.programs.details.registrationStartDate')}
                          </label>
                          <p style={{ margin: 0, fontSize: '14px' }}>
                            {new Date(program.registration_start_date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      )}
                      {program.registration_end_date && (
                        <div>
                          <label style={{ fontSize: '12px', color: 'var(--org-text-secondary)', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                            {t('admin.programs.details.registrationEndDate')}
                          </label>
                          <p style={{ margin: 0, fontSize: '14px' }}>
                            {new Date(program.registration_end_date).toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            })}
                          </p>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Levels table */}
                <AnyCard
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
                 
                >
                  <AnyTable
                    columns={columns}
                    data={levelRows}
                    onRowClick={handleNavigateToLevel}
                    emptyState={
                      <div style={{ padding: 'var(--oa-space-8) var(--oa-space-5)' }}>
                        <div className="oa-h3" style={{ textAlign: 'center', marginBottom: 'var(--oa-space-2)' }}>
                          No levels yet
                        </div>
                        <div className="oa-body-m" style={{ textAlign: 'center', color: 'var(--oa-n600)' }}>
                          Add a level to start organizing teams and eligibility.
                        </div>
                      </div>
                    }
                  />
                </AnyCard>

                <Card>
                  <h3 className="oa-card-title" style={{ marginBottom: 'var(--oa-space-3)' }}>Photos</h3>
                  <PhotoSection
                    entityType="program"
                    entityId={programId}
                    title="Program Photos"
                    context="admin"
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


