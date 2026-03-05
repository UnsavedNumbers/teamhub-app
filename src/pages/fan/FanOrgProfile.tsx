/**
 * Organization Profile Page (Fan View)
 * 
 * Public profile view for an organization.
 * Shows: About, upcoming events, teams, photos, announcements
 * 
 * URL/ROUTE: /fan/org/:slug
 * Design: FanConnect Minimalist Light - organization_profile
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  getOrgProfile, 
  getOrgProfileBySlug,
  followOrg, 
  unfollowOrg,
  getFanCalendar,
  type EntityProfile 
} from '../../data/services/fanService'
import { USE_FAKE_DATA } from '../../data/config'
import { getFakeTicketingEvents } from '../../data/fake/fakeTicketingEvents'
import { getMockGalleriesForOrg } from '../../data/fake/mockGalleries'
import { getTeamsForOrg, getTeamWithDetails } from '../../data/fake/fakeTeams'
import type { CalendarEvent } from '../../types/staffAndFan'
import { getLink, RouteKeys } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { showError, showSuccess, showInfo } from '../../utils/toast'
import '../../styles/fan.css'
import '../../styles/fan-layouts.css'

type TabType = 'overview' | 'schedule' | 'roster' | 'media'
type FeedFilter = 'highlights' | 'press'

interface OrgHighlightItem {
  id: string
  title: string
  summary: string
  date: string
}

interface OrgTeamItem {
  id: string
  name: string
  sport: string
  level: string
}

interface OrgMediaItem {
  id: string
  name: string
  cover_url: string | null
  photo_count: number
}

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FanOrgProfile() {
  useDebugLifecycle('FanOrgProfile')
  
  const t = useT()
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  
  const [profile, setProfile] = useState<EntityProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('highlights')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  
  // Schedule tab state
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(false)
  const [eventsLoaded, setEventsLoaded] = useState(false)
  const [highlights, setHighlights] = useState<OrgHighlightItem[]>([])
  const [orgTeams, setOrgTeams] = useState<OrgTeamItem[]>([])
  const [mediaItems, setMediaItems] = useState<OrgMediaItem[]>([])

  useEffect(() => {
    if (!slug) {
      setError(t('portal.fan.entityProfile.orgNotFound'))
      setLoading(false)
      return
    }
    loadProfile()
  }, [slug])

  const loadProfile = async () => {
    if (!slug) return

    setLoading(true)
    setError(null)

    // Try treating the param as an org ID first, then fallback to slug lookup
    let res = await getOrgProfile(slug)
    if (res.error || !res.data) {
      res = await getOrgProfileBySlug(slug)
    }

    const { data, error: profileError } = res

    if (profileError || !data) {
      setError(profileError?.message || t('portal.fan.entityProfile.orgNotFound'))
      setLoading(false)
      return
    }

    if (data && typeof data === 'object' && 'error' in data) {
      setError((data as any).message || t('portal.fan.entityProfile.orgNotFound'))
      setLoading(false)
      return
    }

    setProfile(data)
    setIsFollowing(data.is_following || false)
    loadFakeContent(data.id)
    setLoading(false)
  }

  const loadFakeContent = (orgId: string) => {
    if (!USE_FAKE_DATA) {
      setHighlights([])
      setOrgTeams([])
      setMediaItems([])
      return
    }

    const teams = getTeamsForOrg(orgId)
      .filter((team) => team.is_active)
      .slice(0, 12)
      .map((team) => {
        const details = getTeamWithDetails(team.id)
        return {
          id: team.id,
          name: team.name,
          sport: details?.sport?.name || 'Sports',
          level: details?.level?.name || team.age_group || 'All Levels',
        }
      })
    setOrgTeams(teams)

    const eventHighlights = getFakeTicketingEvents(orgId, {
      page: 1,
      perPage: 12,
      fanVisibleOnly: true,
      sortBy: 'created_at',
    }).data
      .slice(0, 8)
      .map((event) => ({
        id: event.id,
        title: event.title,
        summary: event.venue_name || event.event_type || 'Ticketed event update',
        date: event.starts_at,
      }))
    setHighlights(eventHighlights)

    const media = getMockGalleriesForOrg(orgId)
      .filter((gallery) => gallery.fans_can_see)
      .slice(0, 10)
      .map((gallery) => ({
        id: gallery.id,
        name: gallery.name,
        cover_url: gallery.cover_url || null,
        photo_count: gallery.photo_count || 0,
      }))
    setMediaItems(media)
  }

  const handleFollowToggle = async () => {
    if (!profile) return
    
    setFollowLoading(true)
    
    try {
      if (isFollowing) {
        const { error } = await unfollowOrg(profile.id)
        if (error) throw error
        
        setIsFollowing(false)
        showSuccess(t('portal.fan.followedOrgs.unfollowSuccess'))
        
        if (profile) {
          setProfile({
            ...profile,
            follower_count: (profile.follower_count || 0) - 1
          })
        }
      } else {
        const { error } = await followOrg(profile.id)
        if (error) throw error
        
        setIsFollowing(true)
        showSuccess(t('portal.fan.followedOrgs.followSuccess'))
        
        if (profile) {
          setProfile({
            ...profile,
            follower_count: (profile.follower_count || 0) + 1
          })
        }
      }
    } catch (err) {
      showError(
        isFollowing 
          ? t('portal.fan.errors.unfollowOrgFailed')
          : t('portal.fan.errors.followOrgFailed')
      )
    } finally {
      setFollowLoading(false)
    }
  }

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    if (tab === 'schedule' && !eventsLoaded && profile?.id) {
      loadEvents(profile.id)
    }
  }

  const loadEvents = async (profileId: string) => {
    setEventsLoading(true)
    
    // Get events for next 60 days
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 60)
    
    const { data, error } = await getFanCalendar({
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      org_ids: [profileId],
    })
    
    if (!error && data?.events) {
      setEvents(data.events)
    }
    
    setEventsLoaded(true)
    setEventsLoading(false)
  }

  const formatEventTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit'
    })
  }

  const handleShareProfile = async () => {
    setMoreMenuOpen(false)
    const shareUrl = window.location.href
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: profile?.name,
          url: shareUrl
        })
      } else {
        await navigator.clipboard.writeText(shareUrl)
        showSuccess(t('common.copiedToClipboard'))
      }
    } catch (err) {
      console.error('Share failed', err)
    }
  }

  const handleReportProfile = async () => {
    setMoreMenuOpen(false)
    // TODO: Implement report functionality
    showInfo('Report functionality coming soon')
  }

  if (loading) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="fan-error-page">
        <span className="material-symbols-outlined">error</span>
        <h2>{t('portal.fan.entityProfile.notFound')}</h2>
        <p>{error || t('portal.fan.entityProfile.orgNotFound')}</p>
        <button 
          className="fan-btn fan-btn-primary"
          onClick={() => navigate(getLink(RouteKeys.FAN_HOME))}
        >
          {t('common.goHome')}
        </button>
      </div>
    )
  }

  // Private organization
  if (profile.privacy_level === 'private' && !isFollowing) {
    return (
      <div className="fan-private-page">
        <div className="fan-private-header">
          <div className="fan-org-profile-logo">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt={profile.name} />
            ) : (
              <span className="material-symbols-outlined">business</span>
            )}
          </div>
          <h1>{profile.name}</h1>
          <span className="fan-private-badge">
            <span className="material-symbols-outlined">lock</span>
            {t('portal.fan.entityProfile.private')}
          </span>
        </div>
        <p>{t('portal.fan.orgProfile.privateDescription')}</p>
        <button 
          className="fan-btn fan-btn-primary"
          onClick={handleFollowToggle}
          disabled={followLoading}
        >
          {followLoading ? <LoadingSpinner size="small" /> : t('portal.fan.entityProfile.requestToFollow')}
        </button>
      </div>
    )
  }

  return (
    <div className="fan-org-profile">
      {/* Hero Section */}
      <section className="fan-org-profile-hero">
        <div className="fan-org-profile-hero-inner">
          <div className="fan-org-profile-hero-main">
            <div className="fan-org-profile-hero-left">
              {/* Logo */}
              <div className="fan-org-profile-logo">
                {profile.logo_url ? (
                  <img src={profile.logo_url} alt={profile.name} />
                ) : (
                  <span className="material-symbols-outlined">business</span>
                )}
              </div>

              {/* Info */}
              <div className="fan-org-profile-info">
                <span className="fan-org-profile-badge">
                  {profile.sport || 'Youth Sports Organization'}
                </span>
                <h2 className="fan-org-profile-name">{profile.name}</h2>
                {profile.location_visible !== false && (profile.location_city || profile.location_state) && (
                  <div className="fan-org-profile-meta">
                    {profile.location_city && profile.location_state ? (
                      <span>{profile.location_city}, {profile.location_state}</span>
                    ) : (
                      <span>{profile.location_city || profile.location_state}</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="fan-org-profile-actions">
              <button 
                className={`fan-org-profile-follow-btn ${isFollowing ? 'following' : ''}`}
                onClick={handleFollowToggle}
                disabled={followLoading}
              >
                {followLoading ? (
                  <LoadingSpinner size="small" />
                ) : isFollowing ? (
                  t('portal.fan.followedOrgs.following')
                ) : (
                  t('portal.fan.orgProfile.followTeam')
                )}
              </button>
              <div style={{ position: 'relative' }}>
                <button 
                  className="fan-org-profile-more-btn"
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                >
                  <span className="material-symbols-outlined">more_horiz</span>
                </button>
                {moreMenuOpen && (
                  <div className="fan-org-profile-more-dropdown">
                    <button onClick={handleShareProfile}>
                      <span className="material-symbols-outlined">share</span>
                      {t('common.share')}
                    </button>
                    <button onClick={handleReportProfile}>
                      <span className="material-symbols-outlined">flag</span>
                      {t('common.report')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="fan-org-profile-tabs">
            <button 
              className={`fan-org-profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => handleTabChange('overview')}
            >
              {t('portal.fan.orgProfile.tabs.overview')}
            </button>
            <button 
              className={`fan-org-profile-tab ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => handleTabChange('schedule')}
            >
              {t('portal.fan.orgProfile.tabs.schedule')}
            </button>
            <button 
              className={`fan-org-profile-tab ${activeTab === 'roster' ? 'active' : ''}`}
              onClick={() => handleTabChange('roster')}
            >
              {t('portal.fan.orgProfile.tabs.roster')}
            </button>
            <button 
              className={`fan-org-profile-tab ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => handleTabChange('media')}
            >
              {t('portal.fan.orgProfile.tabs.media')}
            </button>
          </nav>
        </div>
      </section>

      {/* Main Content */}
      <div className="fan-org-profile-content">
        <div className="fan-org-profile-content-inner">
          {activeTab === 'overview' && (
            <div className="fan-org-profile-overview">
              {/* Feed Filters */}
              <div className="fan-org-profile-feed-filters">
                <button 
                  className={`fan-feed-filter ${feedFilter === 'highlights' ? 'active' : ''}`}
                  onClick={() => setFeedFilter('highlights')}
                >
                  {t('portal.fan.orgProfile.recentHighlights')}
                </button>
                <button 
                  className={`fan-feed-filter ${feedFilter === 'press' ? 'active' : ''}`}
                  onClick={() => setFeedFilter('press')}
                >
                  {t('portal.fan.orgProfile.pressReleases')}
                </button>
              </div>

              {highlights.length === 0 ? (
                <div className="fan-empty-state">
                  <span className="material-symbols-outlined">article</span>
                  <p>{t('portal.fan.orgProfile.noPosts')}</p>
                </div>
              ) : (
                <div className="fan-org-events-list">
                  {highlights.map((item) => (
                    <div key={item.id} className="fan-org-event-card">
                      <div className="fan-org-event-date">
                        <span className="fan-org-event-day">{new Date(item.date).getDate()}</span>
                        <span className="fan-org-event-month">
                          {new Date(item.date).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </div>
                      <div className="fan-org-event-details">
                        <h4 className="fan-org-event-title">{item.title}</h4>
                        <div className="fan-org-event-meta">
                          <span>
                            <span className="material-symbols-outlined">info</span>
                            {item.summary}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="fan-org-schedule-tab">
              {eventsLoading ? (
                <div className="fan-loading">
                  <LoadingSpinner size="medium" />
                </div>
              ) : events.length === 0 ? (
                <div className="fan-empty-state">
                  <span className="material-symbols-outlined">calendar_month</span>
                  <p>{t('portal.fan.orgProfile.noUpcomingEvents')}</p>
                </div>
              ) : (
                <div className="fan-org-events-list">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="fan-org-event-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => navigate(getLink(RouteKeys.FAN_EVENT_DETAIL, { eventId: event.id }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') navigate(getLink(RouteKeys.FAN_EVENT_DETAIL, { eventId: event.id })) }}
                    >
                      <div className="fan-org-event-date">
                        <span className="fan-org-event-day">
                          {new Date(event.start_time).getDate()}
                        </span>
                        <span className="fan-org-event-month">
                          {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                      </div>
                      <div className="fan-org-event-details">
                        <h4 className="fan-org-event-title">{event.title}</h4>
                        <div className="fan-org-event-meta">
                          <span>
                            <span className="material-symbols-outlined">schedule</span>
                            {formatEventTime(event.start_time)}
                          </span>
                          {event.location && (
                            <span>
                              <span className="material-symbols-outlined">location_on</span>
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="fan-org-event-type">
                        <span className={`fan-event-type-badge ${event.event_type || 'event'}`}>
                          {event.event_type || 'Event'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'roster' && (
            orgTeams.length === 0 ? (
              <div className="fan-empty-state">
                <span className="material-symbols-outlined">groups</span>
                <p>{t('portal.fan.orgProfile.noTeams')}</p>
              </div>
            ) : (
              <div className="fan-org-events-list">
                {orgTeams.map((team) => (
                  <div
                    key={team.id}
                    className="fan-org-event-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(getLink(RouteKeys.FAN_TEAM_PROFILE, { teamId: team.id }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(getLink(RouteKeys.FAN_TEAM_PROFILE, { teamId: team.id })) }}
                  >
                    <div className="fan-org-event-date">
                      <span className="material-symbols-outlined">groups</span>
                    </div>
                    <div className="fan-org-event-details">
                      <h4 className="fan-org-event-title">{team.name}</h4>
                      <div className="fan-org-event-meta">
                        <span>
                          <span className="material-symbols-outlined">sports</span>
                          {team.sport}
                        </span>
                        <span>
                          <span className="material-symbols-outlined">military_tech</span>
                          {team.level}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'media' && (
            mediaItems.length === 0 ? (
              <div className="fan-empty-state">
                <span className="material-symbols-outlined">photo_library</span>
                <p>{t('portal.fan.orgProfile.noMedia')}</p>
              </div>
            ) : (
              <div className="fan-org-events-list">
                {mediaItems.map((media) => (
                  <div
                    key={media.id}
                    className="fan-org-event-card"
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(getLink(RouteKeys.FAN_PHOTOS_GALLERY, { id: media.id }))}
                    onKeyDown={(e) => { if (e.key === 'Enter') navigate(getLink(RouteKeys.FAN_PHOTOS_GALLERY, { id: media.id })) }}
                  >
                    <div className="fan-org-event-date">
                      {media.cover_url ? (
                        <img src={media.cover_url} alt={media.name} style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
                      ) : (
                        <span className="material-symbols-outlined">photo_library</span>
                      )}
                    </div>
                    <div className="fan-org-event-details">
                      <h4 className="fan-org-event-title">{media.name}</h4>
                      <div className="fan-org-event-meta">
                        <span>
                          <span className="material-symbols-outlined">photo</span>
                          {media.photo_count} photos
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
