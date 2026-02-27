/**
 * Athlete Profile Page (Fan View)
 * 
 * Public profile view for an athlete.
 * Shows: Bio, stats, upcoming events, photos
 * 
 * URL/ROUTE: /fan/athlete/:id
 * Design: FanConnect Minimalist Light
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { followOrg, getAthleteProfile, unfollowOrg } from '../../data/services/fanService'
import { USE_FAKE_DATA } from '../../data/config'
import { getFakeTicketingEvents } from '../../data/fake/fakeTicketingEvents'
import { getMockGalleriesForOrg, getMockPhotosForGallery } from '../../data/fake/mockGalleries'
import { getOrganizationById } from '../../data/fake/fakeOrganizations'
import { getChildById } from '../../data/fake/fakeUsers'
import { getActiveTeamMembershipsForChild, getTeamWithDetails } from '../../data/fake/fakeTeams'
import { getLink, RouteKeys } from '../../utils/routes'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import AthleteAvatar from '../../components/portal/AthleteAvatar'
import { useUserContext } from '../../hooks/useUserContext'
import { showError, showSuccess } from '../../utils/toast'
import type { Athlete } from '../../types/family'
import '../../styles/fan.css'

interface AthleteProfile {
  id: string
  first_name: string
  last_name: string
  photo_url?: string
  cover_url?: string
  jersey_number?: string
  position?: string
  height?: string
  weight?: string
  graduation_year?: number
  bio?: string
  team_id: string
  team_name: string
  org_id: string
  org_name: string
  org_slug?: string
  org_logo_url?: string | null
  sport: string
  privacy_level: 'public' | 'private' | 'followers_only' | 'unlisted'
  is_following: boolean
  follower_count: number
}

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FanAthleteProfile() {
  useDebugLifecycle('FanAthleteProfile')
  
  const { id, athleteId } = useParams<{ id?: string; athleteId?: string }>()
  const resolvedAthleteId = athleteId || id
  const navigate = useNavigate()
  
  const { context } = useUserContext()
  const [profile, setProfile] = useState<AthleteProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  
  // Related content
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [taggedPhotos, setTaggedPhotos] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])

  useEffect(() => {
    if (!resolvedAthleteId) {
      setError('Athlete not found')
      setLoading(false)
      return
    }

    loadProfile()
  }, [resolvedAthleteId])

  const loadProfile = async () => {
    if (!resolvedAthleteId) return

    setLoading(true)
    setError(null)

    const { data, error: profileError } = await getAthleteProfile(resolvedAthleteId)

    if (profileError || !data) {
      setProfile(null)
      setError(profileError?.message || 'Athlete not found')
      setLoading(false)
      return
    }

    const child = USE_FAKE_DATA ? getChildById(resolvedAthleteId) : undefined
    const membership = USE_FAKE_DATA ? getActiveTeamMembershipsForChild(resolvedAthleteId)[0] : undefined
    const team = membership ? getTeamWithDetails(membership.team_id) : undefined
    const org = team ? getOrganizationById(team.org_id) : undefined

    const mappedProfile: AthleteProfile = {
      id: data.id,
      first_name: child?.first_name || data.name.split(' ')[0] || 'Athlete',
      last_name: child?.last_name || data.name.split(' ').slice(1).join(' ') || '',
      photo_url: child?.photo_url || data.logo_url,
      cover_url: data.cover_url,
      jersey_number: data.jersey_number || membership?.jersey_number || child?.jersey_number || undefined,
      position: data.position || membership?.position || undefined,
      height: child?.height_cm ? `${Math.round(child.height_cm / 2.54)} in` : undefined,
      weight: child?.weight_kg ? `${Math.round(child.weight_kg * 2.20462)} lbs` : undefined,
      graduation_year: child?.date_of_birth ? new Date(child.date_of_birth).getFullYear() + 18 : undefined,
      bio: data.description || undefined,
      team_id: team?.id || '',
      team_name: team?.name || 'Team',
      org_id: team?.org_id || '',
      org_name: org?.name || data.parent_org_name || 'Organization',
      org_slug: org?.slug,
      org_logo_url: org?.logo_url || null,
      sport: team?.sport?.name || data.position || 'Sports',
      privacy_level: data.privacy_level === 'unlisted' ? 'followers_only' : data.privacy_level,
      is_following: data.is_following,
      follower_count: data.follower_count || 0,
    }

    setProfile(mappedProfile)
    setIsFollowing(Boolean(data.is_following))

    if (USE_FAKE_DATA && team) {
      const now = Date.now()
      const teamEvents = getFakeTicketingEvents(team.org_id, {
        page: 1,
        perPage: 60,
        fanVisibleOnly: true,
      }).data
        .map((event) => ({
          id: event.id,
          title: event.title,
          start_time: event.starts_at,
          end_time: event.ends_at || event.starts_at,
          location: [event.venue_name, event.venue_city, event.venue_state].filter(Boolean).join(', ') || null,
          event_type: event.event_type,
        }))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

      const nextEvents = teamEvents.filter((event) => new Date(event.start_time).getTime() >= now).slice(0, 8)
      setUpcomingEvents(nextEvents)

      const photos = getMockGalleriesForOrg(team.org_id)
        .filter((gallery) => gallery.fans_can_see)
        .flatMap((gallery) => getMockPhotosForGallery(gallery.id))
        .slice(0, 12)
      setTaggedPhotos(photos)

      setStats([
        { label: 'Games Played', value: String(Math.max(1, Math.min(24, teamEvents.length))) },
        { label: 'Upcoming Events', value: String(nextEvents.length) },
        { label: 'Team', value: team.name },
      ])

      const recentAchievements = teamEvents
        .filter((event) => new Date(event.start_time).getTime() < now)
        .slice(-3)
        .reverse()
        .map((event, index) => ({
          icon: index === 0 ? 'emoji_events' : 'military_tech',
          title: index === 0 ? 'Game Day Recognition' : 'Strong Performance',
          description: `Participated in ${event.title}`,
          date: event.start_time,
        }))
      setAchievements(recentAchievements)
    } else {
      setUpcomingEvents([])
      setTaggedPhotos([])
      setStats([])
      setAchievements([])
    }

    setLoading(false)
  }

  const handleFollowToggle = async () => {
    if (!profile) return
    if (!profile.org_id) {
      showError('Unable to update follow status for this athlete')
      return
    }
    
    setFollowLoading(true)
    
    if (isFollowing) {
      const { error } = await unfollowOrg(profile.org_id)
      if (error) {
        showError('Failed to unfollow')
      } else {
        setIsFollowing(false)
        showSuccess(`Unfollowed ${profile.first_name} ${profile.last_name}`)
      }
    } else {
      const { error } = await followOrg(profile.org_id)
      if (error) {
        showError('Failed to follow')
      } else {
        setIsFollowing(true)
        showSuccess(`Now following ${profile.first_name} ${profile.last_name}`)
      }
    }
    
    setFollowLoading(false)
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
        <h2>Athlete Not Found</h2>
        <p>{error || 'This athlete profile may not exist or is not publicly visible.'}</p>
        <button 
          className="fan-btn fan-btn-primary"
          onClick={() => navigate(getLink(RouteKeys.FAN_HOME))}
        >
          Go Home
        </button>
      </div>
    )
  }

  const fullName = `${profile.first_name} ${profile.last_name}`

  return (
    <div className="fan-athlete-profile-page">
      {/* Back Button */}
      <button 
        className="fan-athlete-back-btn"
        onClick={() => navigate(-1)}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back
      </button>

      {/* Athlete Header */}
      <div className="fan-entity-header fan-athlete-header fan-athlete-hero-card">
        <div className="fan-entity-cover">
          {profile.cover_url ? (
            <img src={profile.cover_url} alt="" />
          ) : (
            <div className="fan-entity-cover-gradient" />
          )}
        </div>
        
        <div className="fan-entity-info fan-athlete-hero-content">
          <div className="fan-athlete-photo-large">
            <AthleteAvatar
              athlete={{ id: profile.id, first_name: profile.first_name, last_name: profile.last_name, org_id: profile.org_id ?? context?.orgId, has_profile_photo: !!profile.photo_url, profile_photo_updated_at: null } as unknown as Athlete}
              photoSize="512"
              className="w-full h-full object-cover"
            />
            {profile.jersey_number && (
              <span className="fan-athlete-jersey">#{profile.jersey_number}</span>
            )}
          </div>
          
          <div className="fan-entity-details fan-athlete-identity">
            <h1 className="fan-entity-name">{fullName}</h1>
            <div className="fan-athlete-team-info fan-athlete-location-row">
              <button 
                className="fan-entity-parent"
                onClick={() => navigate(getLink(RouteKeys.FAN_TEAM_PROFILE, { teamId: profile.team_id }))}
              >
                <span className="material-symbols-outlined">groups</span>
                {profile.team_name}
              </button>
              <span className="fan-athlete-separator">•</span>
              <button 
                className="fan-entity-parent"
                onClick={() => profile.org_slug && navigate(getLink(RouteKeys.FAN_ORG_PROFILE, { orgId: profile.org_slug }))}
              >
                {profile.org_logo_url ? (
                  <img src={profile.org_logo_url} alt={profile.org_name} className="size-4 rounded-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined">business</span>
                )}
                {profile.org_name}
              </button>
            </div>
            <div className="fan-entity-tags fan-athlete-tags">
              {profile.sport && <span className="fan-entity-tag">{profile.sport}</span>}
              {profile.position && <span className="fan-entity-tag">{profile.position}</span>}
              {profile.graduation_year && <span className="fan-entity-tag">Class of {profile.graduation_year}</span>}
            </div>
            <div className="fan-athlete-action-row">
              <button 
                className={`fan-follow-btn fan-athlete-follow-btn ${isFollowing ? 'following' : 'not-following'}`}
                onClick={handleFollowToggle}
                disabled={followLoading}
              >
                {followLoading ? (
                  <LoadingSpinner size="small" />
                ) : isFollowing ? (
                  <>
                    <span className="material-symbols-outlined">check</span>
                    Following
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined">add</span>
                    Follow
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Info */}
      <div className="fan-athlete-quick-info">
        {profile.height && (
          <div className="fan-athlete-info-item">
            <span className="fan-athlete-info-label">Height</span>
            <span className="fan-athlete-info-value">{profile.height}</span>
          </div>
        )}
        {profile.weight && (
          <div className="fan-athlete-info-item">
            <span className="fan-athlete-info-label">Weight</span>
            <span className="fan-athlete-info-value">{profile.weight}</span>
          </div>
        )}
        {profile.position && (
          <div className="fan-athlete-info-item">
            <span className="fan-athlete-info-label">Position</span>
            <span className="fan-athlete-info-value">{profile.position}</span>
          </div>
        )}
        {profile.graduation_year && (
          <div className="fan-athlete-info-item">
            <span className="fan-athlete-info-label">Grad Year</span>
            <span className="fan-athlete-info-value">{profile.graduation_year}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="fan-entity-stats">
        <div className="fan-entity-stat">
          <span className="fan-entity-stat-value">{profile.follower_count || 0}</span>
          <span className="fan-entity-stat-label">Followers</span>
        </div>
        <div className="fan-entity-stat">
          <span className="fan-entity-stat-value">{taggedPhotos.length}</span>
          <span className="fan-entity-stat-label">Photos</span>
        </div>
        <div className="fan-entity-stat">
          <span className="fan-entity-stat-value">{achievements.length}</span>
          <span className="fan-entity-stat-label">Achievements</span>
        </div>
      </div>

      {/* Bio Section */}
      {profile.bio && (
        <section className="fan-entity-section">
          <h2 className="fan-entity-section-title">About</h2>
          <p className="fan-entity-description">{profile.bio}</p>
        </section>
      )}

      {/* Season Stats */}
      {stats.length > 0 && (
        <section className="fan-entity-section">
          <h2 className="fan-entity-section-title">Season Stats</h2>
          <div className="fan-stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className="fan-stat-card">
                <span className="fan-stat-value">{stat.value}</span>
                <span className="fan-stat-label">{stat.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Achievements */}
      {achievements.length > 0 && (
        <section className="fan-entity-section">
          <h2 className="fan-entity-section-title">Achievements</h2>
          <div className="fan-achievements-list">
            {achievements.map((achievement, index) => (
              <div key={index} className="fan-achievement-card">
                <span className="material-symbols-outlined fan-achievement-icon">
                  {achievement.icon || 'emoji_events'}
                </span>
                <div className="fan-achievement-info">
                  <h4>{achievement.title}</h4>
                  <p>{achievement.description}</p>
                  {achievement.date && (
                    <span className="fan-achievement-date">
                      {new Date(achievement.date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Events */}
      <section className="fan-entity-section">
        <div className="fan-section-header">
          <h2 className="fan-entity-section-title">Upcoming Events</h2>
          {upcomingEvents.length > 0 && (
            <button className="fan-link-btn">View All</button>
          )}
        </div>
        
        {upcomingEvents.length === 0 ? (
          <div className="fan-entity-empty">
            <span className="material-symbols-outlined">event</span>
            <p>No upcoming events</p>
          </div>
        ) : (
          <div className="fan-events-list">
            {upcomingEvents.slice(0, 5).map((event) => (
              <div key={event.id} className="fan-event-card-compact">
                <div className="fan-event-date">
                  <span className="fan-event-month">
                    {new Date(event.start_time).toLocaleDateString('en-US', { month: 'short' })}
                  </span>
                  <span className="fan-event-day">
                    {new Date(event.start_time).getDate()}
                  </span>
                </div>
                <div className="fan-event-info">
                  <h4>{event.title}</h4>
                  <p>
                    {new Date(event.start_time).toLocaleTimeString('en-US', { 
                      hour: 'numeric', 
                      minute: '2-digit' 
                    })}
                    {event.location && ` • ${event.location}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Tagged Photos */}
      <section className="fan-entity-section">
        <div className="fan-section-header">
          <h2 className="fan-entity-section-title">Photos</h2>
          {taggedPhotos.length > 0 && (
            <button 
              className="fan-link-btn"
              onClick={() => navigate(getLink(RouteKeys.FAN_PHOTOS_ATHLETE, { athleteId: profile.id }))}
            >
              View All
            </button>
          )}
        </div>
        
        {taggedPhotos.length === 0 ? (
          <div className="fan-entity-empty">
            <span className="material-symbols-outlined">photo_library</span>
            <p>No tagged photos</p>
          </div>
        ) : (
          <div className="fan-photos-preview">
            {taggedPhotos.slice(0, 6).map((photo, index) => (
              <div key={index} className="fan-photo-thumb">
                <img src={photo.thumbnail_url || photo.url} alt="" />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
