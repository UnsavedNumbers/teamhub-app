/**
 * Season Detail
 *
 * Detail view for a specific season.
 */

import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getSeason } from '../../data/services/seasonsService'
import { getEvents } from '../../data/services/eventsService'
import { getOrganizationUsers } from '../../data/services/usersService'
import { supabase } from '../../lib/supabase'
import type { Season } from '../../data/types/organization'
import { AdminPageHeader, Card, Button, ConfirmDialog } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import { cn } from '../../utils/cn'

interface SeasonStats {
  teams: number
  sportsPrograms: {
    varsity: number
    jv: number
    freshman: number
  }
  registered: number
  games: number
  venues: number
  staff: number
}

export default function SeasonDetail() {
  const { id } = useParams<{ id: string }>()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [season, setSeason] = useState<Season | null>(null)
  const [stats, setStats] = useState<SeasonStats>({
    teams: 0,
    sportsPrograms: { varsity: 0, jv: 0, freshman: 0 },
    registered: 0,
    games: 0,
    venues: 0,
    staff: 0,
  })
  const [statsLoading, setStatsLoading] = useState(true)

  const calculateSeasonProgress = useCallback((season: Season): number => {
    if (!season.start_date || !season.end_date) return 0
    const start = new Date(season.start_date).getTime()
    const end = new Date(season.end_date).getTime()
    const now = Date.now()
    if (now < start) return 0
    if (now > end) return 100
    return Math.round(((now - start) / (end - start)) * 100)
  }, [])

  const formatDateRange = useCallback((season: Season): string => {
    if (!season.start_date || !season.end_date) return ''
    const start = new Date(season.start_date)
    const end = new Date(season.end_date)
    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']
    const startStr = `${months[start.getMonth()]} ${String(start.getDate()).padStart(2, '0')}`
    const endStr = `${months[end.getMonth()]} ${String(end.getDate()).padStart(2, '0')}, ${end.getFullYear()}`
    return `${startStr} — ${endStr}`
  }, [])

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

  useEffect(() => {
    if (!isReady || !id || !season) return

    const loadStats = async () => {
      setStatsLoading(true)
      try {
        // Get teams for this season
        const { data: teamSeasons, error: teamSeasonsError } = await supabase
          .from('team_seasons')
          .select('team_id')
          .eq('season_id', id)

        if (teamSeasonsError) throw teamSeasonsError

        const teamIds = (teamSeasons || []).map((ts: any) => ts.team_id)
        const teamsCount = teamIds.length

        // Get teams with their programs/levels for sports breakdown
        let sportsPrograms = { varsity: 0, jv: 0, freshman: 0 }
        let registeredCount = 0
        let venuesSet = new Set<string>()

        if (teamIds.length > 0) {
          // Get teams with program/level info
          const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select(`
              id,
              program_id,
              level:levels(name, level_type)
            `)
            .in('id', teamIds)

          if (!teamsError && teamsData) {
            // Count by level type (simplified - map level names to varsity/jv/freshman)
            teamsData.forEach((team: any) => {
              const levelName = team.level?.name?.toLowerCase() || ''
              if (levelName.includes('varsity')) sportsPrograms.varsity++
              else if (levelName.includes('jv') || levelName.includes('junior')) sportsPrograms.jv++
              else if (levelName.includes('freshman') || levelName.includes('fresh')) sportsPrograms.freshman++
            })

            // Count registered athletes (team memberships)
            const { count: membershipsCount } = await supabase
              .from('team_memberships')
              .select('*', { count: 'exact', head: true })
              .in('team_id', teamIds)
              .eq('season_id', id)
              .eq('status', 'active')

            registeredCount = membershipsCount || 0
          }
        }

        // Get events for this season
        const startDate = season.start_date ? new Date(season.start_date) : null
        const endDate = season.end_date ? new Date(season.end_date) : null

        let gamesCount = 0
        if (startDate && endDate) {
          const { data: eventsData, error: eventsError } = await getEvents(context, {
            startDate,
            endDate,
            seasonId: id,
            includeCancelled: false,
          })

          if (!eventsError && eventsData) {
            gamesCount = eventsData.filter((e) => e.type === 'game').length

            // Get unique venues from events
            const eventIds = eventsData.map((e) => e.id)
            if (eventIds.length > 0) {
              const { data: locationsData } = await supabase
                .from('event_locations')
                .select('place_id, venue_name')
                .in('event_id', eventIds)
                .not('place_id', 'is', null)

              if (locationsData) {
                locationsData.forEach((loc: any) => {
                  if (loc.place_id) venuesSet.add(loc.place_id)
                })
              }
            }
          }
        }

        // Get staff count (coaches)
        const { data: usersData, error: usersError } = await getOrganizationUsers(context)
        const staffCount = usersError
          ? 0
          : usersData.filter((u) => u.roles.includes('coach')).length

        setStats({
          teams: teamsCount,
          sportsPrograms,
          registered: registeredCount,
          games: gamesCount,
          venues: venuesSet.size,
          staff: staffCount,
        })
      } catch (err) {
        console.error('Error loading season stats:', err)
        // Don't set error state, just show zeros
      } finally {
        setStatsLoading(false)
      }
    }

    loadStats()
  }, [context, isReady, id, season])

  if (loading) {
    return <div className="pa-skeleton" style={{ height: '500px' }} />
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

  const progress = calculateSeasonProgress(season)
  const dateRange = formatDateRange(season)

  return (
    <div className="pa-root">
      <OfflineBanner />
      <div className={cn('pa-content', 'pa-w-full', 'pa-mx-auto', 'pa-p-5')} style={{ maxWidth: '1200px' }}>
        {/* Hero Header Section */}
        <div
          className={cn('pa-relative', 'pa-mb-8', 'pa-overflow-hidden', 'pa-rounded-xl', 'pa-shadow-xl')}
          style={{
            background: 'var(--pa-n900)',
            minHeight: '320px',
          }}
        >
          <div
            className={cn('pa-absolute', 'pa-inset-0', 'pa-bg-cover', 'pa-bg-center')}
            style={{
              opacity: 0.6,
              backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.2)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuBu4HCQ9PZNmVmyMU9yEUANgUxkHrShObpL2Ih0mcZSgLGn3ygtDw3oDxRxlY8Qi6J88chTLIZVxjMEa1XX5VDrUc9NL99j7yrzHPPCAJ9Is3Krsl_vML3K7iUnbSIuA4ybgQBZKcXiXOHR7p8itgQRn4ZCyxKOul81eWkqPWbqoZtd8gadbsk9f6zQ4uJLoedADEbyPtPBlNkPkhZb1k5Sds1VR2ZRqqgJ6A9dlggpMIzSKfjq3V91X2bXdchA-I4HsQ02gEJbxac")',
            }}
            data-alt="High-contrast abstract autumn field texture"
          />
          <div
            className={cn('pa-relative', 'pa-z-10', 'pa-flex', 'pa-flex-col', 'md:pa-flex-row', 'pa-justify-between', 'pa-items-end', 'pa-p-8', 'md:pa-p-12')}
            style={{ minHeight: '320px' }}
          >
            <div className={cn('pa-flex', 'pa-flex-col', 'pa-gap-2')}>
              <div
                className={cn('pa-inline-flex', 'pa-items-center', 'pa-gap-2', 'pa-rounded-lg', 'pa-px-3', 'pa-py-1', 'pa-mb-4', 'pa-text-xs', 'pa-font-bold', 'pa-uppercase', 'pa-tracking-widest', 'pa-shadow-lg', 'pa-badge', 'pa-badge--success')}
                style={{ color: 'white' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                Status: {season.is_active ? 'Active' : 'Upcoming'}
              </div>
              <h1
                className={cn('pa-font-black', 'pa-leading-none', 'pa-uppercase', 'pa-tracking-tighter')}
                style={{
                  color: 'white',
                  fontFamily: 'var(--pa-font-display)',
                  fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
                }}
              >
                {season.name}
              </h1>
              <p
                className={cn('pa-text-lg', 'md:pa-text-xl', 'pa-font-medium', 'pa-tracking-widest', 'pa-mt-2')}
                style={{
                  color: 'var(--pa-theme-action-primary, #10b77d)',
                }}
              >
                {dateRange}
              </p>
            </div>
            {/* Side Panel Graphic: Stopwatch */}
            <div
              className={cn('pa-hidden', 'lg:pa-flex', 'pa-items-center', 'pa-justify-center', 'pa-p-6', 'pa-rounded-xl', 'pa-border')}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(12px)',
              }}
            >
              <div className={cn('pa-flex', 'pa-flex-col', 'pa-items-center', 'pa-gap-2')} style={{ color: 'white' }}>
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '4rem',
                    color: 'rgba(16, 183, 125, 0.8)',
                  }}
                >
                  timer
                </span>
                <span
                  className={cn('pa-font-bold', 'pa-uppercase', 'pa-tracking-widest', 'pa-opacity-70')}
                  style={{ fontSize: '10px' }}
                >
                  Season Progress
                </span>
                <div
                  className={cn('pa-w-32', 'pa-h-2', 'pa-rounded-full', 'pa-mt-2', 'pa-overflow-hidden')}
                  style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                >
                  <div
                    style={{
                      background: 'var(--pa-theme-action-primary, #10b77d)',
                      height: '100%',
                      width: `${progress}%`,
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
          className={cn('pa-grid', 'pa-grid-cols-1', 'md:pa-grid-cols-3', 'pa-gap-6', 'pa-mb-12')}
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
        >
          {/* Card 1: Sports & Programs */}
          <Card className={cn('pa-flex', 'pa-flex-col', 'pa-gap-6')} style={{ padding: 'var(--pa-space-8)' }}>
            <div className={cn('pa-flex', 'pa-items-center', 'pa-justify-between')}>
              <h3
                className={cn('pa-text-sm', 'pa-font-black', 'pa-uppercase', 'pa-tracking-widest')}
                style={{ color: 'var(--pa-n500)' }}
              >
                Sports & Programs
              </h3>
              <span
                className="material-symbols-outlined"
                style={{ color: 'var(--pa-theme-action-primary, #10b77d)' }}
              >
                sports_football
              </span>
            </div>
            <div className="pa-space-y-4">
              <div
                className={cn('pa-flex', 'pa-justify-between', 'pa-items-center', 'pa-pb-2')}
                style={{ borderBottom: '1px solid var(--pa-n100)' }}
              >
                <span className="pa-font-bold">Varsity</span>
                <span style={{ color: 'var(--pa-n500)' }}>
                  {statsLoading ? '—' : `${stats.sportsPrograms.varsity} Sports`}
                </span>
              </div>
              <div
                className={cn('pa-flex', 'pa-justify-between', 'pa-items-center', 'pa-pb-2')}
                style={{ borderBottom: '1px solid var(--pa-n100)' }}
              >
                <span className="pa-font-bold">JV</span>
                <span style={{ color: 'var(--pa-n500)' }}>
                  {statsLoading ? '—' : `${stats.sportsPrograms.jv} Sports`}
                </span>
              </div>
              <div
                className={cn('pa-flex', 'pa-justify-between', 'pa-items-center', 'pa-pb-2')}
                style={{ borderBottom: '1px solid var(--pa-n100)' }}
              >
                <span className="pa-font-bold">Freshman</span>
                <span style={{ color: 'var(--pa-n500)' }}>
                  {statsLoading ? '—' : `${stats.sportsPrograms.freshman} Sports`}
                </span>
              </div>
            </div>
            <Button
              variant="ghost"
              iconRight="arrow_forward"
              onClick={() => navigate(getLink('admin.organization.structure'))}
              style={{ marginTop: 'auto' }}
            >
              VIEW PROGRAMS
            </Button>
          </Card>

          {/* Card 2: Teams */}
          <Card
            className={cn('pa-flex', 'pa-flex-col', 'pa-justify-between')}
            style={{
              padding: 'var(--pa-space-8)',
              borderColor: 'rgba(16, 183, 125, 0.3)',
              boxShadow: '0 4px 14px rgba(16, 183, 125, 0.05)',
            }}
          >
            <div className={cn('pa-flex', 'pa-items-center', 'pa-justify-between')}>
              <h3
                className={cn('pa-text-sm', 'pa-font-black', 'pa-uppercase', 'pa-tracking-widest')}
                style={{ color: 'var(--pa-n500)' }}
              >
                Teams
              </h3>
              <span
                className="material-symbols-outlined"
                style={{ color: 'var(--pa-theme-action-primary, #10b77d)' }}
              >
                groups
              </span>
            </div>
            <div className="pa-py-4">
              <span
                className={cn('pa-font-black', 'pa-block', 'pa-tracking-tighter')}
                style={{
                  fontFamily: 'var(--pa-font-display)',
                  fontSize: '4.5rem',
                  lineHeight: 1,
                  color: 'var(--pa-n900)',
                }}
              >
                {statsLoading ? '—' : stats.teams}
              </span>
              <span
                className={cn('pa-text-lg', 'pa-font-bold', 'pa-uppercase', 'pa-tracking-tight', 'pa-block', 'pa-mt-2')}
                style={{
                  color: 'var(--pa-theme-action-primary, #10b77d)',
                }}
              >
                Active Teams
              </span>
            </div>
            <div className="pa-text-sm" style={{ color: 'var(--pa-n500)' }}>
              {statsLoading ? 'Loading...' : '+4 from Fall 2024'}
            </div>
          </Card>

          {/* Card 3: Season Stats */}
          <Card className={cn('pa-flex', 'pa-flex-col', 'pa-gap-6')} style={{ padding: 'var(--pa-space-8)' }}>
            <div className={cn('pa-flex', 'pa-items-center', 'pa-justify-between')}>
              <h3
                className={cn('pa-text-sm', 'pa-font-black', 'pa-uppercase', 'pa-tracking-widest')}
                style={{ color: 'var(--pa-n500)' }}
              >
                Season Stats
              </h3>
              <span
                className="material-symbols-outlined"
                style={{ color: 'var(--pa-theme-action-primary, #10b77d)' }}
              >
                insights
              </span>
            </div>
            <div className={cn('pa-grid', 'pa-grid-cols-2', 'pa-gap-4')}>
              <div
                className={cn('pa-p-4', 'pa-rounded-lg')}
                style={{ background: 'var(--pa-n50)' }}
              >
                <p
                  className={cn('pa-font-bold', 'pa-uppercase', 'pa-mb-1')}
                  style={{ color: 'var(--pa-n500)', fontSize: '10px' }}
                >
                  Registered
                </p>
                <p className={cn('pa-text-2xl', 'pa-font-black')}>
                  {statsLoading ? '—' : stats.registered >= 1000 ? `${(stats.registered / 1000).toFixed(1)}k` : stats.registered}
                </p>
              </div>
              <div
                className={cn('pa-p-4', 'pa-rounded-lg')}
                style={{ background: 'var(--pa-n50)' }}
              >
                <p
                  className={cn('pa-font-bold', 'pa-uppercase', 'pa-mb-1')}
                  style={{ color: 'var(--pa-n500)', fontSize: '10px' }}
                >
                  Games
                </p>
                <p className={cn('pa-text-2xl', 'pa-font-black')}>
                  {statsLoading ? '—' : stats.games}
                </p>
              </div>
              <div
                className={cn('pa-p-4', 'pa-rounded-lg')}
                style={{ background: 'var(--pa-n50)' }}
              >
                <p
                  className={cn('pa-font-bold', 'pa-uppercase', 'pa-mb-1')}
                  style={{ color: 'var(--pa-n500)', fontSize: '10px' }}
                >
                  Venues
                </p>
                <p className={cn('pa-text-2xl', 'pa-font-black')}>
                  {statsLoading ? '—' : stats.venues}
                </p>
              </div>
              <div
                className={cn('pa-p-4', 'pa-rounded-lg')}
                style={{ background: 'var(--pa-n50)' }}
              >
                <p
                  className={cn('pa-font-bold', 'pa-uppercase', 'pa-mb-1')}
                  style={{ color: 'var(--pa-n500)', fontSize: '10px' }}
                >
                  Staff
                </p>
                <p className={cn('pa-text-2xl', 'pa-font-black')}>
                  {statsLoading ? '—' : stats.staff}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Bar */}
        <div
          className={cn('pa-flex', 'pa-flex-col', 'sm:pa-flex-row', 'pa-items-center', 'pa-justify-between', 'pa-gap-4', 'pa-p-6', 'pa-rounded-xl')}
          style={{
            background: 'var(--pa-n50)',
          }}
        >
          <div className={cn('pa-flex', 'pa-items-center', 'pa-gap-3')} style={{ color: 'var(--pa-n500)' }}>
            <span className="material-symbols-outlined">settings_suggest</span>
            <span className={cn('pa-text-sm', 'pa-font-medium')}>
              Administrator controls for {season.name} season management
            </span>
          </div>
          <div className={cn('pa-flex', 'pa-items-center', 'pa-gap-4', 'pa-w-full', 'sm:pa-w-auto')}>
            <Button
              variant="ghost"
              icon="edit"
              onClick={() =>
                navigate(
                  `${getLink('admin.organization.forms')}?edit=season&id=${season.id}&returnUrl=${encodeURIComponent(window.location.pathname)}`
                )
              }
            >
              Edit Season
            </Button>
            <Button
              variant="danger"
              icon="archive"
              onClick={() => setShowArchiveDialog(true)}
            >
              Archive Season
            </Button>
          </div>
        </div>
      </div>

      {/* Archive Season Confirmation Dialog */}
      <ConfirmDialog
        open={showArchiveDialog}
        title="Archive Season"
        description="Are you sure you want to archive this season?"
        confirmLabel="Archive"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={() => {
          // TODO: Implement archive season functionality
          console.log('Archive season:', season.id)
          setShowArchiveDialog(false)
        }}
        onCancel={() => setShowArchiveDialog(false)}
      />
    </div>
  )
}
