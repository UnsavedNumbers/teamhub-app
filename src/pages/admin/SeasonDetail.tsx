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
import { AdminPageHeader, Card, Button, Badge, ConfirmDialog } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import { supabase } from '../../lib/supabase'

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
        // Get teams for this season
        const { data: teamSeasons, error: teamSeasonsError } = await supabase
          .from('team_seasons')
          .select(`
            team_id,
            team:teams(
              id,
              program_id,
              program:programs(
                id,
                level_id,
                level:levels(id, name)
              ),
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

        // Count programs by level
        const programsByLevel: Record<string, number> = {}
        const uniqueSports = new Set<string>()

        teams.forEach((ts: any) => {
          const team = ts.team
          if (team?.program?.level) {
            const levelName = team.program.level.name || 'Unknown'
            programsByLevel[levelName] = (programsByLevel[levelName] || 0) + 1
          }
          if (team?.sport?.id) {
            uniqueSports.add(team.sport.id)
          }
        })

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
        // Set default stats on error
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
      <div className="pa-root">
        <div className="pa-skeleton" style={{ height: '500px' }} />
      </div>
    )
  }

  if (error || !season) {
    return (
      <div className="pa-root">
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
    <div className="pa-root">
      <OfflineBanner />
      
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%',
          padding: 'var(--pa-space-6) var(--pa-space-4)',
          paddingBottom: 'var(--pa-space-10)',
        }}
      >
        {/* Hero Header Section */}
        <div
          className="pa-mb-6"
          style={{
            position: 'relative',
            overflow: 'hidden',
            borderRadius: 'var(--pa-radius-m)',
            background: 'var(--pa-n900)',
            boxShadow: 'var(--pa-shadow-3)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: 0.6,
              backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.2))',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          />
          <div
            style={{
              position: 'relative',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--pa-space-2)',
              padding: 'var(--pa-space-6) sm:var(--pa-space-8)',
              minHeight: '280px',
            }}
            className="sm:flex-row sm:justify-between sm:items-end"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-2)' }}>
              <Badge
                variant={season.is_active ? 'success' : 'neutral'}
                style={{
                  alignSelf: 'flex-start',
                  marginBottom: 'var(--pa-space-4)',
                  background: season.is_active
                    ? 'var(--pa-theme-action-primary, var(--pa-n900))'
                    : 'var(--pa-n700)',
                  color: 'var(--pa-n0)',
                  padding: 'var(--pa-space-2) var(--pa-space-3)',
                  borderRadius: 'var(--pa-radius-xs)',
                  fontSize: '12px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 'var(--pa-space-2)',
                }}
                icon="check_circle"
              >
                Status: {season.is_active ? 'Active' : 'Upcoming'}
              </Badge>
              <h1
                style={{
                  fontFamily: 'var(--pa-font-display)',
                  fontSize: 'clamp(36px, 8vw, 72px)',
                  fontWeight: 900,
                  lineHeight: 1,
                  textTransform: 'uppercase',
                  letterSpacing: '-0.05em',
                  color: 'var(--pa-n0)',
                  margin: 0,
                }}
              >
                {season.name}
              </h1>
              <p
                style={{
                  color: 'var(--pa-theme-action-primary, #258cf4)',
                  fontSize: 'clamp(16px, 2vw, 20px)',
                  fontWeight: 500,
                  letterSpacing: '0.1em',
                  marginTop: 'var(--pa-space-2)',
                  textTransform: 'uppercase',
                }}
              >
                {dateRange}
              </p>
            </div>
            {/* Progress Indicator */}
            <div
              className="hidden sm:flex"
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--pa-space-4) sm:var(--pa-space-6)',
                background: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(12px)',
                borderRadius: 'var(--pa-radius-m)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--pa-space-2)' }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '48px',
                    color: 'var(--pa-theme-action-primary, #258cf4)',
                    opacity: 0.8,
                  }}
                >
                  timer
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                    opacity: 0.7,
                    color: 'var(--pa-n0)',
                  }}
                >
                  Season Progress
                </span>
                <div
                  style={{
                    width: '128px',
                    height: '8px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '999px',
                    marginTop: 'var(--pa-space-2)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: 'var(--pa-theme-action-primary, #258cf4)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Athletic Grid Cards */}
        <div
          className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2 lg:pa-grid-cols-3"
          style={{ gap: 'var(--pa-space-6)', marginBottom: 'var(--pa-space-6)' }}
        >
          {/* Sports & Programs Card */}
          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--pa-space-6)',
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--pa-font-body)',
                  fontSize: '12px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--pa-n500)',
                  margin: 0,
                }}
              >
                Sports & Programs
              </h3>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '24px',
                  color: 'var(--pa-theme-action-primary, var(--pa-n900))',
                }}
              >
                sports_football
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--pa-space-4)' }}>
              {statsLoading ? (
                <div className="pa-body-m pa-text-muted">Loading...</div>
              ) : stats && Object.keys(stats.programsByLevel).length > 0 ? (
                Object.entries(stats.programsByLevel).map(([level, count]) => (
                  <div
                    key={level}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      paddingBottom: 'var(--pa-space-2)',
                      borderBottom: '1px solid var(--pa-n100)',
                    }}
                  >
                    <span style={{ fontWeight: 700, color: 'var(--pa-n900)' }}>{level}</span>
                    <span style={{ color: 'var(--pa-n500)' }}>{count} {count === 1 ? 'Sport' : 'Sports'}</span>
                  </div>
                ))
              ) : (
                <div className="pa-body-m pa-text-muted">No programs available</div>
              )}
            </div>
            <button
              onClick={() => navigate(getLink('admin.organization.structure'))}
              style={{
                marginTop: 'auto',
                color: 'var(--pa-theme-action-primary, var(--pa-n900))',
                fontSize: '14px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--pa-space-1)',
                padding: 0,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                transition: 'gap 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.gap = 'var(--pa-space-2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.gap = 'var(--pa-space-1)'
              }}
            >
              VIEW PROGRAMS{' '}
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>
                arrow_forward
              </span>
            </button>
          </Card>

          {/* Teams Card */}
          <Card
            style={{
              borderColor: 'var(--pa-theme-border-accent, var(--pa-n200))',
              boxShadow: 'var(--pa-shadow-2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--pa-space-6)',
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--pa-font-body)',
                  fontSize: '12px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--pa-n500)',
                  margin: 0,
                }}
              >
                Teams
              </h3>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '24px',
                  color: 'var(--pa-theme-action-primary, var(--pa-n900))',
                }}
              >
                groups
              </span>
            </div>
            <div style={{ padding: 'var(--pa-space-4) 0' }}>
              <span
                style={{
                  fontFamily: 'var(--pa-font-display)',
                  fontSize: '72px',
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: '-0.05em',
                  color: 'var(--pa-n900)',
                  display: 'block',
                }}
              >
                {statsLoading ? '—' : stats?.teamsCount || 0}
              </span>
              <span
                style={{
                  fontSize: '18px',
                  fontWeight: 700,
                  color: 'var(--pa-theme-action-primary, var(--pa-n900))',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Active Teams
              </span>
            </div>
            <div style={{ fontSize: '14px', color: 'var(--pa-n500)' }}>
              {statsLoading ? '—' : stats?.teamsCount ? `Active in ${season.name}` : 'No teams yet'}
            </div>
          </Card>

          {/* Season Stats Card */}
          <Card>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--pa-space-6)',
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--pa-font-body)',
                  fontSize: '12px',
                  fontWeight: 900,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--pa-n500)',
                  margin: 0,
                }}
              >
                Season Stats
              </h3>
              <span
                className="material-symbols-outlined"
                style={{
                  fontSize: '24px',
                  color: 'var(--pa-theme-action-primary, var(--pa-n900))',
                }}
              >
                insights
              </span>
            </div>
            <div
              className="pa-grid pa-grid-cols-1 sm:pa-grid-cols-2"
              style={{
                gap: 'var(--pa-space-4)',
              }}
            >
              <div
                className="pa-stat-box"
                style={{
                  background: 'var(--pa-n50)',
                  padding: 'var(--pa-space-4)',
                  borderRadius: 'var(--pa-radius-xs)',
                }}
              >
                <p
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--pa-n500)',
                    textTransform: 'uppercase',
                    margin: '0 0 var(--pa-space-1) 0',
                  }}
                >
                  Registered
                </p>
                <p
                  style={{
                    fontSize: 'clamp(20px, 4vw, 24px)',
                    fontWeight: 900,
                    color: 'var(--pa-n900)',
                    margin: 0,
                    fontFamily: 'var(--pa-font-display)',
                  }}
                >
                  {statsLoading ? '—' : formatNumber(stats?.registeredAthletes || 0)}
                </p>
              </div>
              <div
                className="pa-stat-box"
                style={{
                  background: 'var(--pa-n50)',
                  padding: 'var(--pa-space-4)',
                  borderRadius: 'var(--pa-radius-xs)',
                }}
              >
                <p
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--pa-n500)',
                    textTransform: 'uppercase',
                    margin: '0 0 var(--pa-space-1) 0',
                  }}
                >
                  Games
                </p>
                <p
                  style={{
                    fontSize: 'clamp(20px, 4vw, 24px)',
                    fontWeight: 900,
                    color: 'var(--pa-n900)',
                    margin: 0,
                    fontFamily: 'var(--pa-font-display)',
                  }}
                >
                  {statsLoading ? '—' : stats?.gamesCount || 0}
                </p>
              </div>
              <div
                className="pa-stat-box"
                style={{
                  background: 'var(--pa-n50)',
                  padding: 'var(--pa-space-4)',
                  borderRadius: 'var(--pa-radius-xs)',
                }}
              >
                <p
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--pa-n500)',
                    textTransform: 'uppercase',
                    margin: '0 0 var(--pa-space-1) 0',
                  }}
                >
                  Venues
                </p>
                <p
                  style={{
                    fontSize: 'clamp(20px, 4vw, 24px)',
                    fontWeight: 900,
                    color: 'var(--pa-n900)',
                    margin: 0,
                    fontFamily: 'var(--pa-font-display)',
                  }}
                >
                  {statsLoading ? '—' : stats?.venuesCount || 0}
                </p>
              </div>
              <div
                className="pa-stat-box"
                style={{
                  background: 'var(--pa-n50)',
                  padding: 'var(--pa-space-4)',
                  borderRadius: 'var(--pa-radius-xs)',
                }}
              >
                <p
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    color: 'var(--pa-n500)',
                    textTransform: 'uppercase',
                    margin: '0 0 var(--pa-space-1) 0',
                  }}
                >
                  Staff
                </p>
                <p
                  style={{
                    fontSize: 'clamp(20px, 4vw, 24px)',
                    fontWeight: 900,
                    color: 'var(--pa-n900)',
                    margin: 0,
                    fontFamily: 'var(--pa-font-display)',
                  }}
                >
                  {statsLoading ? '—' : stats?.staffCount || 0}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--pa-space-4)',
            padding: 'var(--pa-space-6)',
            background: 'var(--pa-n50)',
            borderRadius: 'var(--pa-radius-m)',
          }}
          className="sm:flex-row sm:items-center sm:justify-between"
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--pa-space-3)',
              color: 'var(--pa-n500)',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              settings_suggest
            </span>
            <span style={{ fontSize: '14px', fontWeight: 500 }}>
              Administrator controls for {season.name} season management
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--pa-space-4)',
              width: '100%',
            }}
            className="sm:w-auto"
          >
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
              style={{ flex: '1 1 auto' }}
              className="sm:flex-none"
            >
              Edit Season
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowArchiveDialog(true)}
              icon="archive"
              style={{ flex: '1 1 auto' }}
              className="sm:flex-none"
            >
              Archive Season
            </Button>
          </div>
        </div>
      </div>

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
