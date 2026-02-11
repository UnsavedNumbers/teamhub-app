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
import { AdminPageHeader, Card, Button, ConfirmDialog } from '../../components/admin'
import OfflineBanner from '../../components/admin/OfflineBanner'
import { getLink } from '../../utils/routes'
import { supabase } from '../../lib/supabase'
import SeasonTeamsSlideOver from '../../components/admin/SeasonTeamsSlideOver'
import type { SeasonTeamRow } from '../../components/admin/SeasonTeamsSlideOver'
import './SeasonDetail.css'
import { GalleryManagementSection } from '@/components/admin/galleries/GalleryManagementSection'
import { useI18n } from '@/i18n/useI18n'
import type { Gallery } from '@/data/services/galleryService'
import '../../styles/orgAdmin.css'

interface SeasonStats {
  teamsCount: number
  programsByLevel: Record<string, number>
  sportsCount: number
  registeredAthletes: number
  gamesCount: number
  venuesCount: number
  staffCount: number
}

interface GalleryInsights {
  total: number
  photos: number
  pending: number
}

export default function SeasonDetail() {
  const { id } = useParams<{ id: string }>()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const { t } = useI18n()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [season, setSeason] = useState<Season | null>(null)
  const [stats, setStats] = useState<SeasonStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [showArchiveDialog, setShowArchiveDialog] = useState(false)
  const [archiving, setArchiving] = useState(false)
  void archiving
  const [seasonTeams, setSeasonTeams] = useState<SeasonTeamRow[]>([])
  const [teamsSlideOverOpen, setTeamsSlideOverOpen] = useState(false)
  const [galleryInsights, setGalleryInsights] = useState<GalleryInsights>({
    total: 0,
    photos: 0,
    pending: 0,
  })
  const [galleryLoading, setGalleryLoading] = useState(true)

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

  const handleGalleriesLoaded = useCallback((galleries: Gallery[]) => {
    const total = galleries.length
    const photos = galleries.reduce((sum, gallery) => sum + (gallery.photo_count ?? 0), 0)
    const pending = galleries.reduce((sum, gallery) => sum + (gallery.pending_count ?? 0), 0)
    setGalleryInsights({ total, photos, pending })
  }, [])

  const handleGalleryLoading = useCallback((loading: boolean) => {
    setGalleryLoading(loading)
  }, [])

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
      <div className="oa-root season-detail-page">
        <div className="oa-skeleton" style={{ height: '60px', marginBottom: '24px' }} />
        <div className="oa-skeleton" style={{ height: '280px', borderRadius: '8px', marginBottom: '32px' }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="oa-skeleton" style={{ height: '300px' }} />
          ))}
        </div>
        <div className="oa-skeleton" style={{ height: '400px', borderRadius: '8px', marginBottom: '32px' }} />
        <div className="oa-skeleton" style={{ height: '100px', borderRadius: '8px' }} />
      </div>
    )
  }

  if (error || !season) {
    return (
      <div className="oa-root season-detail-page">
        <OfflineBanner />
        <AdminPageHeader
          title={t('admin.seasonDetail.notFoundTitle')}
          subtitle={error || t('admin.seasonDetail.notFoundSubtitle')}
          breadcrumbs={[
            { label: t('admin.seasonDetail.breadcrumbOrganizations'), path: getLink('admin.organization.structure') },
            { label: t('admin.seasonDetail.breadcrumbSeasons'), path: getLink('admin.seasons.list') },
            { label: t('admin.seasonDetail.breadcrumbDetails') },
          ]}
        />
        <Card className="oa-mb-4">
          <div className="oa-text-danger">{error || t('admin.seasonDetail.notFoundTitle')}</div>
        </Card>
        <Button onClick={() => navigate(getLink('admin.seasons.list'))}>
          {t('admin.seasonDetail.backToSeasons')}
        </Button>
      </div>
    )
  }

  const progress = getSeasonProgress()
  const dateRange = formatDateRange()

  return (
    <div className="oa-root season-detail-page">
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
                {t('admin.seasonDetail.statusLabel')} {season.is_active ? t('admin.seasonDetail.statusActive') : t('admin.seasonDetail.statusUpcoming')}
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
                <span className="season-detail-progress-label">{t('admin.seasonDetail.seasonProgress')}</span>
                <div
                  className="season-detail-progress-track"
                  style={{ ['--season-progress' as string]: `${progress}%` }}
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('admin.seasonDetail.seasonProgress')}
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
              <h3 className="season-detail-card-title">{t('admin.seasonDetail.sportsAndPrograms')}</h3>
              <span className="material-symbols-outlined season-detail-card-icon" aria-hidden>
                sports_football
              </span>
            </div>
            <div className="season-detail-programs-list">
              {statsLoading ? (
                <div className="oa-body-m oa-text-muted">{t('admin.seasonDetail.loading')}</div>
              ) : stats && Object.keys(stats.programsByLevel).length > 0 ? (
                Object.entries(stats.programsByLevel).map(([level, count]) => (
                  <div key={level} className="season-detail-programs-row">
                    <span className="season-detail-programs-name">{level}</span>
                    <span className="season-detail-programs-count">
                      {count === 1 ? t('admin.seasonDetail.teamCount', { count }) : t('admin.seasonDetail.teamsCount', { count })}
                    </span>
                  </div>
                ))
              ) : (
                <div className="oa-body-m oa-text-muted">{t('admin.seasonDetail.noPrograms')}</div>
              )}
            </div>
            <button
              type="button"
              onClick={() => navigate(getLink('admin.organization.structure'))}
              className="season-detail-view-programs"
            >
              {t('admin.seasonDetail.viewPrograms')}{' '}
              <span className="material-symbols-outlined" aria-hidden>arrow_forward</span>
            </button>
          </Card>

          {/* Teams Card */}
          <Card className="season-detail-teams-card">
            <div className="season-detail-card-header">
              <h3 className="season-detail-card-title">{t('admin.seasonDetail.teamsTitle')}</h3>
              <span className="material-symbols-outlined season-detail-card-icon" aria-hidden>
                groups
              </span>
            </div>
            <div className="season-detail-teams-value-wrap">
              <span className="season-detail-teams-value">
                {statsLoading ? '—' : stats?.teamsCount ?? 0}
              </span>
              <span className="season-detail-teams-label">{t('admin.seasonDetail.activeTeams')}</span>
            </div>
            <div className="season-detail-teams-sub">
              {statsLoading ? '—' : stats?.teamsCount ? t('admin.seasonDetail.activeInSeason', { season: season.name }) : t('admin.seasonDetail.noTeamsYet')}
            </div>
            <button
              type="button"
              onClick={() => setTeamsSlideOverOpen(true)}
              className="season-detail-view-programs"
            >
              {t('admin.seasonDetail.viewTeams')}{' '}
              <span className="material-symbols-outlined" aria-hidden>arrow_forward</span>
            </button>
          </Card>

          {/* Season Stats Card */}
          <Card>
            <div className="season-detail-card-header">
              <h3 className="season-detail-card-title">{t('admin.seasonDetail.seasonStats')}</h3>
              <span className="material-symbols-outlined season-detail-card-icon" aria-hidden>
                insights
              </span>
            </div>
            <div className="season-detail-stats-grid">
              <div className="season-detail-stat-box">
                <p className="season-detail-stat-label">{t('admin.seasonDetail.statRegistered')}</p>
                <p className="season-detail-stat-value">
                  {statsLoading ? '—' : formatNumber(stats?.registeredAthletes ?? 0)}
                </p>
              </div>
              <div className="season-detail-stat-box">
                <p className="season-detail-stat-label">{t('admin.seasonDetail.statGames')}</p>
                <p className="season-detail-stat-value">
                  {statsLoading ? '—' : stats?.gamesCount ?? 0}
                </p>
              </div>
              <div className="season-detail-stat-box">
                <p className="season-detail-stat-label">{t('admin.seasonDetail.statVenues')}</p>
                <p className="season-detail-stat-value">
                  {statsLoading ? '—' : stats?.venuesCount ?? 0}
                </p>
              </div>
              <div className="season-detail-stat-box">
                <p className="season-detail-stat-label">{t('admin.seasonDetail.statStaff')}</p>
                <p className="season-detail-stat-value">
                  {statsLoading ? '—' : stats?.staffCount ?? 0}
                </p>
              </div>
            </div>
          </Card>

          <Card className="season-detail-galleries-card">
            <div className="season-detail-galleries-hero">
              <div className="season-detail-galleries-hero-text">
                <p className="season-detail-galleries-hero-heading">
                  {t('billing.seasons.galleries.heroTitle')}
                </p>
                <h3 className="season-detail-galleries-title">
                  {season?.name ?? t('billing.seasons.galleries.heroTitle')}
                </h3>
                <p className="season-detail-galleries-subtitle">
                  {t('billing.seasons.galleries.heroSubtitle', {
                    season: season?.name ?? t('billing.seasons.galleries.heroSeasonPlaceholder'),
                  })}
                </p>
                <p className="season-detail-galleries-body-copy">
                  {t('billing.seasons.galleries.heroBody')}
                </p>
              </div>
              <div className="season-detail-galleries-hero-actions">
                <span
                  className="season-detail-galleries-status"
                  data-state={season?.is_active ? 'active' : 'inactive'}
                >
                  {season?.is_active
                    ? t('billing.seasons.galleries.status.active')
                    : t('billing.seasons.galleries.status.inactive')}
                </span>
                <Button variant="secondary" onClick={() => navigate(getLink('admin.photos.list'))}>
                  {t('billing.seasons.galleries.actions.viewAll')}
                </Button>
              </div>
            </div>
            <div className="season-detail-galleries-body">
              <div className="season-detail-galleries-stats">
                {[
                  {
                    label: t('billing.seasons.galleries.stats.galleries'),
                    value: galleryLoading ? '—' : formatNumber(galleryInsights.total),
                    caption: t('billing.seasons.galleries.stats.galleriesSub'),
                  },
                  {
                    label: t('billing.seasons.galleries.stats.photos'),
                    value: galleryLoading ? '—' : formatNumber(galleryInsights.photos),
                    caption: t('billing.seasons.galleries.stats.photosSub'),
                  },
                  {
                    label: t('billing.seasons.galleries.stats.pending'),
                    value: galleryLoading ? '—' : formatNumber(galleryInsights.pending),
                    caption: t('billing.seasons.galleries.stats.pendingSub'),
                  },
                ].map((stat) => (
                  <div key={stat.label} className="season-detail-galleries-stat">
                    <p className="season-detail-galleries-stat-label">{stat.label}</p>
                    <p className="season-detail-galleries-stat-value">{stat.value}</p>
                    <p className="season-detail-galleries-stat-caption">{stat.caption}</p>
                  </div>
                ))}
              </div>
              <GalleryManagementSection
                entityType="season"
                entityId={season?.id}
                orgId={context?.orgId}
                title={t('billing.seasons.galleries.managementTitle')}
                onGalleriesLoaded={handleGalleriesLoaded}
                onLoadingChange={handleGalleryLoading}
              />
            </div>
          </Card>

        </div>

        {/* Action Bar */}
        <div className="season-detail-action-bar">
          <div className="season-detail-action-desc">
            <span className="material-symbols-outlined" aria-hidden>
              settings_suggest
            </span>
            <span>{t('admin.seasonDetail.actionBarDescription', { season: season.name })}</span>
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
              {t('admin.seasonDetail.editSeason')}
            </Button>
            <Button
              variant="danger"
              onClick={() => setShowArchiveDialog(true)}
              icon="archive"
            >
              {t('admin.seasonDetail.archiveSeason')}
            </Button>
          </div>
        </div>
      </div>

      <SeasonTeamsSlideOver
        open={teamsSlideOverOpen}
        onClose={() => setTeamsSlideOverOpen(false)}
        seasonName={season.name}
        teams={seasonTeams}
        seasonId={season.id}
      />

      <ConfirmDialog
        open={showArchiveDialog}
        title={t('admin.seasonDetail.archiveTitle')}
        description={t('admin.seasonDetail.archiveDescription', { name: season.name })}
        confirmLabel={t('admin.seasonDetail.archiveConfirm')}
        cancelLabel={t('admin.seasonDetail.archiveCancel')}
        variant="danger"
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
