/**
 * Season Detail
 *
 * Detail view for a specific season.
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getSeason, deleteSeason } from '../../data/services/seasonsService'
import type { Season } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, ConfirmDialog } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import { supabase } from '../../lib/supabase'
import SeasonTeamsSlideOver from '../../components/admin/SeasonTeamsSlideOver'
import type { SeasonTeamRow } from '../../components/admin/SeasonTeamsSlideOver'
import './SeasonDetail.css'

interface SeasonStats {
  teamsCount: number
  programsByLevel: Record<string, number>
  sportsCount: number
  registeredAthletes: number
  gamesCount: number
  venuesCount: number
  staffCount: number
}

export default function SeasonDetail() {
  const { id } = useParams<{ id: string }>()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [season, setSeason] = useState<Season | null>(null)
  const [stats, setStats] = useState<SeasonStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [archiving, setArchiving] = useState(false)
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeamRow[]>([])
  const [teamsSlideOverOpen, setTeamsSlideOverOpen] = useState(false)

  // Load season data
  useEffect(() => {
    if (!isReady || !id) return

    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const result = await getSeason(context, id)
        if (result.error) {
          setError(result.error.message)
        } else if (result.data) {
          setSeason(result.data)
        } else {
          setError('Season not found')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load season')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [context, isReady, id])

  // Load season statistics
  useEffect(() => {
    if (!isReady || !id || !season) return

    const loadStats = async () => {
      setStatsLoading(true)

      try {
        // Get teams for this season (level is on team, not on program)
        const { data: teamSeasons, error: teamSeasonsError } = await supabase
          .from('team_seasons')
          .select(`
            team_id,
            team:teams(
              id,
              name,
              program_id,
              level_id,
              program:programs(id, name),
              level:levels(id, name),
              sport_id,
              sport:sports(id, name)
            )
          `)
          .eq('season_id', id)

        if (teamSeasonsError) {
          console.error('Error loading team seasons:', teamSeasonsError)
        }

        const teams = teamSeasons || []
        const teamsCount = teams.length

        // Count by level when present, otherwise by program name (so teams in programs with no level still show)
        const programsByLevel: Record<string, number> = {}
        const uniqueSports = new Set<string>()
        const teamRows: SeasonTeamRow[] = []

        type TeamSeasonRow = {
          team_id?: string
          team?: {
            id: string
            name?: string
            program?: { id?: string; name?: string } | null
            level?: { id?: string; name?: string } | null
            sport?: { id?: string; name?: string } | null
          }
        }
        teams.forEach((ts: TeamSeasonRow) => {
          const team = ts.team
          const program = team?.program
          const level = team?.level
          const sport = team?.sport
          const label = level
            ? (level.name || 'Unknown level')
            : program
              ? (program.name || 'Unknown program')
              : 'No program'
          programsByLevel[label] = (programsByLevel[label] || 0) + 1
          if (team?.sport?.id) {
            uniqueSports.add(team.sport.id)
          }
          if (team?.id) {
            teamRows.push({
              id: team.id,
              name: team.name ?? 'Unnamed team',
              programName: program?.name,
              levelName: level?.name,
              sportName: sport?.name,
            })
          }
        })

        setSeasonTeams(teamRows)

        // Get registered athletes count
        const { count: athletesCount } = await supabase
          .from('team_memberships')
          .select('*', { count: 'exact', head: true })
          .eq('season_id', id)
          .eq('status', 'active')

        // Get games/events count (if events table exists and has season_id)
        let gamesCount = 0
        try {
          const { count: eventsCount } = await supabase
            .from('events')
            .select('*', { count: 'exact', head: true })
            .eq('season_id', id)
          gamesCount = eventsCount || 0
        } catch {
          // Events table might not exist or have season_id
        }

        // Get venues count (distinct venues from events)
        let venuesCount = 0
        try {
          const { data: venuesData } = await supabase
            .from('events')
            .select('venue_id')
            .eq('season_id', id)
            .not('venue_id', 'is', null)
          
          if (venuesData) {
            const uniqueVenues = new Set(venuesData.map((e: any) => e.venue_id).filter(Boolean))
            venuesCount = uniqueVenues.size
          }
        } catch {
          // Venues might not be available
        }

        // Get staff count (users with coach/admin roles in org)
        let staffCount = 0
        try {
          const { data: usersData } = await supabase
            .from('users')
            .select('id')
            .eq('org_id', context.orgId)
          
          if (usersData) {
            // Get user roles
            const userIds = usersData.map((u: any) => u.id)
            const { data: rolesData } = await (supabase as any)
              .from('user_roles')
              .select('user_id')
              .in('user_id', userIds)
              .in('role', ['coach', 'admin', 'staff'])
            
            if (rolesData) {
              const uniqueStaff = new Set(rolesData.map((r: any) => r.user_id))
              staffCount = uniqueStaff.size
            }
          }
        } catch {
          // Staff count might not be available
        }

        setStats({
          teamsCount,
          programsByLevel,
          sportsCount: uniqueSports.size,
          registeredAthletes: athletesCount || 0,
          gamesCount,
          venuesCount,
          staffCount,
        })
      } catch (err) {
        console.error('Error loading season stats:', err)
        setSeasonTeams([])
        setStats({
          teamsCount: 0,
          programsByLevel: {},
          sportsCount: 0,
          registeredAthletes: 0,
          gamesCount: 0,
          venuesCount: 0,
          staffCount: 0,
        })
      } finally {
        setStatsLoading(false)
      }
    }

    loadStats()
  }, [context, isReady, id, season])

  const handleArchive = useCallback(async () => {
    if (!season || !id) return

    setArchiving(true)
    try {
      const result = await deleteSeason(context, id)
      if (result.error) {
        setError(result.error.message)
        setShowArchiveDialog(false)
      } else {
        // Navigate to seasons list after successful archive
        navigate(getLink('admin.seasons.list'))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive season')
      setShowArchiveDialog(false)
    } finally {
      setArchiving(false)
    }
  }, [context, id, season, navigate])

  // Calculate season progress
  const getSeasonProgress = () => {
    if (!season?.start_date || !season?.end_date) return 0

    const start = new Date(season.start_date).getTime()
    const end = new Date(season.end_date).getTime()
    const now = new Date().getTime()

    if (now < start) return 0
    if (now > end) return 100

    return Math.round(((now - start) / (end - start)) * 100)
  }

  // Format date range
  const formatDateRange = () => {
    if (!season?.start_date || !season?.end_date) return '—'

    const start = new Date(season.start_date)
    const end = new Date(season.end_date)

    const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toUpperCase()
    const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()

    return `${startStr} — ${endStr}`
  }

  if (loading) {
    return (
      <div className="pa-root season-detail-page">
        <div className="pa-skeleton season-detail-skeleton" />
      </div>
    )
  }

  if (error || !season) {
    return (
      <div className="pa-root season-detail-page">
        <OfflineBanner />
        <AdminPageHeader
          title="Season Not Found"
          subtitle={error || 'The season you are looking for does not exist'}
          breadcrumbs={[
            { label: 'Organizations', path: getLink('admin.organization.structure') },
            { label: 'Seasons', path: getLink('admin.seasons.list') },
            { label: 'Details' },
          ]}
        />
        <Card className="pa-mb-4">
          <div className="pa-text-danger">{error || 'Season not found'}</div>
        </Card>
        <Button onClick={() => navigate(getLink('admin.seasons.list'))}>
          Back to Seasons
        </Button>
      </div>
    )
  }

  const progress = getSeasonProgress()
  const dateRange = formatDateRange()

  return (
    <div className="pa-root season-detail-page">
      <OfflineBanner />

      <div className="season-detail-content">
        {/* Hero Header Section */}
        <div className="season-detail-hero">
          <div className="season-detail-hero-overlay" aria-hidden />
          <div className="season-detail-hero-inner">
            <div className="season-detail-hero-text">
              <span
                className={`season-detail-hero-badge ${season.is_active ? '' : 'neutral'}`}
                role="status"
              >
                <span className="material-symbols-outlined" aria-hidden>check_circle</span>
                Status: {season.is_active ? 'Active' : 'Upcoming'}
              </span>
              <h1 className="season-detail-hero-title">{season.name}</h1>
              <p className="season-detail-hero-dates">{dateRange}</p>
            </div>
            {/* Progress Indicator */}
            <div className="season-detail-progress-panel">
              <div className="season-detail-progress-inner">
                <span className="material-symbols-outlined season-detail-progress-icon" aria-hidden>
                  timer
                </span>
                <span className="season-detail-progress-label">Season Progress</span>
                <div
                  className="season-detail-progress-track"
                  style={{ ['--season-progress' as string]: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Season progress"
                >
                  <div className="season-detail-progress-fill" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Athletic Grid Cards */}
        <div className="season-detail-cards">
          {/* Sports & Programs Card */}
          <Card className="season-detail-programs-card">
            <div className="season-detail-card-header">
              <h3 className="season-detail-card-title">Sports & Programs</h3>
              <span className="material-symbols-outlined season-detail-card-icon" aria-hidden>
                sports_football
              </span>
            </div>
            <div className="season-detail-programs-list">
              {statsLoading ? (
                <div className="pa-body-m pa-text-muted">Loading...</div>
              ) : stats && Object.keys(stats.programsByLevel).length > 0 ? (
                Object.entries(stats.programsByLevel).map(([level, count]) => (
                  <div key={level} className="season-detail-programs-row">
                    <span className="season-detail-programs-name">{level}</span>
                    <span className="season-detail-programs-count">
                      {count} {count === 1 ? 'team' : 'teams'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="pa-body-m pa-text-muted">No programs available</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate(getLink('admin.organization.structure'))}
              className="season-detail-view-programs"
            >
              VIEW PROGRAMS{' '}
              <span className="material-symbols-outlined" aria-hidden>arrow_forward</span>
            </button>
          </Card>

          {/* Teams Card */}
          <Card className="season-detail-teams-card">
            <div className="season-detail-card-header">
              <h3 className="season-detail-card-title">Teams</h3>
              <span className="material-symbols-outlined season-detail-card-icon" aria-hidden>
                groups
              </span>
            </div>
            <div className="season-detail-teams-value-wrap">
              <span className="season-detail-teams-value">
                {statsLoading ? '—' : stats?.teamsCount ?? 0}
              </span>
              <span className="season-detail-teams-label">Active Teams</span>
            </div>
            <div className="season-detail-teams-sub">
              {statsLoading ? '—' : stats?.teamsCount ? `Active in ${season.name}` : 'No teams yet'}
            </div>
            <button
              type="button"
              onClick={() => setTeamsSlideOverOpen(true)}
              className="season-detail-view-programs"
            >
              VIEW TEAMS{' '}
              <span className="material-symbols-outlined" aria-hidden>arrow_forward</span>
            </button>
          </Card>

          {/* Season Stats Card */}
          <Card>
            <div className="season-detail-card-header">
              <h3 className="season-detail-card-title">Season Stats</h3>
              <span className="material-symbols-outlined season-detail-card-icon" aria-hidden>
                insights
              </span>
            </div>
            <div className="season-detail-stats-grid">
              <div className="season-detail-stat-box">
                <p className="season-detail-stat-label">Registered</p>
                <p className="season-detail-stat-value">
                  {statsLoading ? '—' : formatNumber(stats?.registeredAthletes ?? 0)}
                </p>
              </div>
              <div className="season-detail-stat-box">
                <p className="season-detail-stat-label">Games</p>
                <p className="season-detail-stat-value">
                  {statsLoading ? '—' : stats?.gamesCount ?? 0}
                </p>
              </div>
              <div className="season-detail-stat-box">
                <p className="season-detail-stat-label">Venues</p>
                <p className="season-detail-stat-value">
                  {statsLoading ? '—' : stats?.venuesCount ?? 0}
                </p>
              </div>
              <div className="season-detail-stat-box">
                <p className="season-detail-stat-label">Staff</p>
                <p className="season-detail-stat-value">
                  {statsLoading ? '—' : stats?.staffCount ?? 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Bar */}
        <div className="season-detail-action-bar">
          <div className="season-detail-action-desc">
            <span className="material-symbols-outlined" aria-hidden>
              settings_suggest
            </span>
            <span>Administrator controls for {season.name} season management</span>
          </div>
          <div className="season-detail-action-buttons">
            <Button
              variant="secondary"
              onClick={() =>
                navigate(
                  `${getLink('admin.seasons.update', { id: season.id })}?returnUrl=${encodeURIComponent(
                    window.location.pathname
                  )}`
                )
              }
              icon="edit"
            >
              Edit Season
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowArchiveDialog(true)}
              icon="archive"
            >
              Archive Season
            </Button>
          </div>
        </div>
      </div>

      <SeasonTeamsSlideOver
        open={teamsSlideOverOpen}
        onClose={() => setTeamsSlideOverOpen(false)}
        seasonName={season.name}
        teams={seasonTeams}
      />

      <ConfirmDialog
        open={showArchiveDialog}
        title="Archive Season"
        description={`Are you sure you want to archive "${season.name}"? This action cannot be undone.`}
        confirmLabel="Archive"
        cancelLabel="Cancel"
        variant="danger"
        loading={archiving}
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveDialog(false)}
      />
    </div>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}k`
  }
  return num.toString()
}
