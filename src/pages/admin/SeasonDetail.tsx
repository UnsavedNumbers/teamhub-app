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
import { AdminPageHeader, Card, Button } from '../../components/platformAdmin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'

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
      <div className="pa-content" style={{ maxWidth: '1200px', margin: '0 auto', padding: 'var(--pa-space-5)' }}>
        {/* Hero Header Section */}
        <div
          className="relative mb-8 overflow-hidden rounded-xl shadow-2xl"
          style={{
            background: 'var(--pa-n900)',
            minHeight: '320px',
          }}
        >
          <div
            className="absolute inset-0 opacity-60 bg-cover bg-center"
            style={{
              backgroundImage: 'linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0.2)), url("https://lh3.googleusercontent.com/aida-public/AB6AXuBu4HCQ9PZNmVmyMU9yEUANgUxkHrShObpL2Ih0mcZSgLGn3ygtDw3oDxRxlY8Qi6J88chTLIZVxjMEa1XX5VDrUc9NL99j7yrzHPPCAJ9Is3Krsl_vML3K7iUnbSIuA4ybgQBZKcXiXOHR7p8itgQRn4ZCyxKOul81eWkqPWbqoZtd8gadbsk9f6zQ4uJLoedADEbyPtPBlNkPkhZb1k5Sds1VR2ZRqqgJ6A9dlggpMIzSKfjq3V91X2bXdchA-I4HsQ02gEJbxac")',
          }}
          data-alt="High-contrast abstract autumn field texture"
        />
          <div
            className="relative z-10 flex flex-col md:flex-row justify-between items-end p-8 md:p-12"
            style={{ minHeight: '320px' }}
          >
            <div className="flex flex-col gap-2">
              <div
                className="inline-flex items-center gap-2 rounded-lg px-3 py-1 mb-4 text-xs font-bold text-white uppercase tracking-widest shadow-lg"
                style={{
                  background: 'var(--pa-theme-action-primary, #10b77d)',
                  boxShadow: '0 4px 14px rgba(16, 183, 125, 0.2)',
                  fontSize: '12px',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check_circle</span>
                Status: {season.is_active ? 'Active' : 'Upcoming'}
              </div>
              <h1
                className="text-white font-black leading-none uppercase tracking-tighter"
                style={{
                  fontFamily: 'var(--pa-font-display)',
                  fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
                }}
              >
                {season.name}
              </h1>
              <p
                className="text-lg md:text-xl font-medium tracking-widest mt-2"
                style={{
                  color: 'var(--pa-theme-action-primary, #10b77d)',
                }}
              >
                {dateRange}
              </p>
            </div>
            {/* Side Panel Graphic: Stopwatch */}
            <div
              className="hidden lg:flex items-center justify-center p-6 rounded-2xl border backdrop-blur-md"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
              }}
            >
              <div className="flex flex-col items-center gap-2 text-white">
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
                  className="font-bold uppercase tracking-widest opacity-70"
                  style={{ fontSize: '10px' }}
                >
                  Season Progress
                </span>
                <div
                  className="w-32 h-2 rounded-full mt-2 overflow-hidden"
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
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}
        >
          {/* Card 1: Sports & Programs */}
          <Card className="flex flex-col gap-6" style={{ padding: 'var(--pa-space-8)' }}>
            <div className="flex items-center justify-between">
              <h3
                className="text-sm font-black uppercase tracking-widest"
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
            <div className="space-y-4">
              <div
                className="flex justify-between items-center pb-2"
                style={{ borderBottom: '1px solid var(--pa-n100)' }}
              >
                <span className="font-bold">Varsity</span>
                <span style={{ color: 'var(--pa-n500)' }}>
                  {statsLoading ? '—' : `${stats.sportsPrograms.varsity} Sports`}
                </span>
              </div>
              <div
                className="flex justify-between items-center pb-2"
                style={{ borderBottom: '1px solid var(--pa-n100)' }}
              >
                <span className="font-bold">JV</span>
                <span style={{ color: 'var(--pa-n500)' }}>
                  {statsLoading ? '—' : `${stats.sportsPrograms.jv} Sports`}
                </span>
              </div>
              <div
                className="flex justify-between items-center pb-2"
                style={{ borderBottom: '1px solid var(--pa-n100)' }}
              >
                <span className="font-bold">Freshman</span>
                <span style={{ color: 'var(--pa-n500)' }}>
                  {statsLoading ? '—' : `${stats.sportsPrograms.freshman} Sports`}
                </span>
              </div>
            </div>
            <button
              className="mt-auto text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all"
              style={{
                color: 'var(--pa-theme-action-primary, #10b77d)',
                marginTop: 'auto',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
              }}
              onClick={() => navigate(getLink('admin.organization.structure'))}
            >
              VIEW PROGRAMS{' '}
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
            </button>
          </Card>

          {/* Card 2: Teams */}
          <Card
            className="flex flex-col justify-between"
            style={{
              padding: 'var(--pa-space-8)',
              borderColor: 'rgba(16, 183, 125, 0.3)',
              boxShadow: '0 4px 14px rgba(16, 183, 125, 0.05)',
            }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="text-sm font-black uppercase tracking-widest"
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
            <div className="py-4">
              <span
                className="font-black block tracking-tighter"
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
                className="text-lg font-bold uppercase tracking-tight block mt-2"
                style={{
                  color: 'var(--pa-theme-action-primary, #10b77d)',
                }}
              >
                Active Teams
              </span>
            </div>
            <div className="text-sm" style={{ color: 'var(--pa-n500)' }}>
              {statsLoading ? 'Loading...' : '+4 from Fall 2024'}
            </div>
          </Card>

          {/* Card 3: Season Stats */}
          <Card className="flex flex-col gap-6" style={{ padding: 'var(--pa-space-8)' }}>
            <div className="flex items-center justify-between">
              <h3
                className="text-sm font-black uppercase tracking-widest"
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
            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-4 rounded-lg"
                style={{ background: 'var(--pa-n50)' }}
              >
                <p
                  className="font-bold uppercase mb-1"
                  style={{ color: 'var(--pa-n500)', fontSize: '10px' }}
                >
                  Registered
                </p>
                <p className="text-2xl font-black">
                  {statsLoading ? '—' : stats.registered >= 1000 ? `${(stats.registered / 1000).toFixed(1)}k` : stats.registered}
                </p>
              </div>
              <div
                className="p-4 rounded-lg"
                style={{ background: 'var(--pa-n50)' }}
              >
                <p
                  className="font-bold uppercase mb-1"
                  style={{ color: 'var(--pa-n500)', fontSize: '10px' }}
                >
                  Games
                </p>
                <p className="text-2xl font-black">
                  {statsLoading ? '—' : stats.games}
                </p>
              </div>
              <div
                className="p-4 rounded-lg"
                style={{ background: 'var(--pa-n50)' }}
              >
                <p
                  className="font-bold uppercase mb-1"
                  style={{ color: 'var(--pa-n500)', fontSize: '10px' }}
                >
                  Venues
                </p>
                <p className="text-2xl font-black">
                  {statsLoading ? '—' : stats.venues}
                </p>
              </div>
              <div
                className="p-4 rounded-lg"
                style={{ background: 'var(--pa-n50)' }}
              >
                <p
                  className="font-bold uppercase mb-1"
                  style={{ color: 'var(--pa-n500)', fontSize: '10px' }}
                >
                  Staff
                </p>
                <p className="text-2xl font-black">
                  {statsLoading ? '—' : stats.staff}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Action Bar */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-xl"
          style={{
            background: 'var(--pa-n50)',
          }}
        >
          <div className="flex items-center gap-3" style={{ color: 'var(--pa-n500)' }}>
            <span className="material-symbols-outlined">settings_suggest</span>
            <span className="text-sm font-medium">
              Administrator controls for {season.name} season management
            </span>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <button
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg border-2 font-bold text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              style={{
                borderColor: 'var(--pa-theme-action-primary, #10b77d)',
                color: 'var(--pa-theme-action-primary, #10b77d)',
                background: 'transparent',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--pa-theme-action-primary, #10b77d)'
                e.currentTarget.style.color = 'white'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--pa-theme-action-primary, #10b77d)'
              }}
              onClick={() =>
                navigate(
                  `${getLink('admin.organization.forms')}?edit=season&id=${season.id}&returnUrl=${encodeURIComponent(window.location.pathname)}`
                )
              }
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>edit</span>
              Edit Season
            </button>
            <button
              className="flex-1 sm:flex-none px-6 py-2.5 rounded-lg bg-red-500 text-white font-bold text-sm uppercase tracking-widest hover:bg-red-600 transition-all flex items-center justify-center gap-2 shadow-lg"
              style={{
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.2)',
              }}
              onClick={() => {
                // TODO: Implement archive season functionality
                if (confirm('Are you sure you want to archive this season?')) {
                  console.log('Archive season:', season.id)
                }
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>archive</span>
              Archive Season
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
