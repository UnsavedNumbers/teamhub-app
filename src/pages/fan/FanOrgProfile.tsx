/**
 * Organization Profile Page (Fan View)
 * 
 * Public profile view for an organization.
 * Shows: About, upcoming events, teams, photos, announcements
 * 
 * URL/ROUTE: /fan/org/:slug
 * Design: FanConnect Minimalist Light
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n/useI18n'
import { getOrgProfile, followOrg, unfollowOrg, type EntityProfile } from '../../data/services/fanService'
import { getLink, RouteKeys } from '../../utils/routes'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { showError, showSuccess } from '../../utils/toast'
import '../../styles/fan.css'

export default function FanOrgProfile() {
  const { slug } = useParams<{ slug: string }>()
  const { t } = useI18n()
  const navigate = useNavigate()
  
  const [profile, setProfile] = useState<EntityProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  
  // Related content
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [teams, setTeams] = useState<any[]>([])
  const [recentPhotos, setRecentPhotos] = useState<any[]>([])
  const [announcements, setAnnouncements] = useState<any[]>([])

  useEffect(() => {
    if (!slug) {
      setError('Organization not found')
      setLoading(false)
      return
    }

    loadProfile()
  }, [slug])

  const loadProfile = async () => {
    if (!slug) return

    setLoading(true)
    setError(null)

    const { data, error: profileError } = await getOrgProfile(slug)

    if (profileError || !data) {
      setError(profileError?.message || 'Failed to load organization')
      setLoading(false)
      return
    }

    setProfile(data)
    setIsFollowing(data.is_following || false)
    
    // Load related content
    // In production these would be separate API calls
    setUpcomingEvents([])
    setTeams([])
    setRecentPhotos([])
    setAnnouncements([])
    
    setLoading(false)
  }

  const handleFollowToggle = async () => {
    if (!profile) return
    
    setFollowLoading(true)
    
    if (isFollowing) {
      const { error } = await unfollowOrg(profile.id)
      if (error) {
        showError('Failed to unfollow')
      } else {
        setIsFollowing(false)
        showSuccess(`Unfollowed ${profile.name}`)
      }
    } else {
      const { error } = await followOrg(profile.id)
      if (error) {
        showError('Failed to follow')
      } else {
        setIsFollowing(true)
        showSuccess(`Now following ${profile.name}`)
      }
    }
    
    setFollowLoading(false)
  }

  if (loading) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="fan-error-page">
        <span className="material-symbols-outlined">error</span>
        <h2>Organization Not Found</h2>
        <p>{error || 'This organization may not exist or is not publicly visible.'}</p>
        <button 
          className="fan-btn fan-btn-primary"
          onClick={() => navigate(getLink(RouteKeys.FAN_HOME))}
        >
          Go Home
        </button>
      </div>
    )
  }

  // Private organization
  if (profile.privacy_level === 'private' && !isFollowing) {
    return (
      <div className="fan-private-page">
        <div className="fan-private-header">
          <div className="fan-org-logo">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt={profile.name} />
            ) : (
              <span className="material-symbols-outlined">business</span>
            )}
          </div>
          <h1>{profile.name}</h1>
          <span className="fan-private-badge">
            <span className="material-symbols-outlined">lock</span>
            Private Organization
          </span>
        </div>
        <p>This organization's content is only visible to approved followers.</p>
        <button 
          className="fan-btn fan-btn-primary"
          onClick={handleFollowToggle}
          disabled={followLoading}
        >
          {followLoading ? <LoadingSpinner size="sm" /> : 'Request to Follow'}
        </button>
      </div>
    )
  }

  return (
    <>
      {/* Back Button */}
      <button 
        className="fan-back-btn"
        onClick={() => navigate(-1)}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back
      </button>

      {/* Organization Header */}
      <div className="fan-entity-header">
        <div className="fan-entity-cover">
          {profile.cover_url ? (
            <img src={profile.cover_url} alt="" />
          ) : (
            <div className="fan-entity-cover-gradient" />
          )}
        </div>
        
        <div className="fan-entity-info">
          <div className="fan-entity-logo">
            {profile.logo_url ? (
              <img src={profile.logo_url} alt={profile.name} />
            ) : (
              <span className="material-symbols-outlined">business</span>
            )}
          </div>
          
          <div className="fan-entity-details">
            <h1 className="fan-entity-name">{profile.name}</h1>
            {profile.location_city && profile.location_state && (
              <p className="fan-entity-location">
                <span className="material-symbols-outlined">location_on</span>
                {profile.location_city}, {profile.location_state}
              </p>
            )}
            {profile.sport && (
              <span className="fan-entity-sport">{profile.sport}</span>
            )}
          </div>
          
          <button 
            className={`fan-follow-btn ${isFollowing ? 'following' : ''}`}
            onClick={handleFollowToggle}
            disabled={followLoading}
          >
            {followLoading ? (
              <LoadingSpinner size="sm" />
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

      {/* Stats Bar */}
      <div className="fan-entity-stats">
        <div className="fan-entity-stat">
          <span className="fan-entity-stat-value">{profile.follower_count || 0}</span>
          <span className="fan-entity-stat-label">Followers</span>
        </div>
        <div className="fan-entity-stat">
          <span className="fan-entity-stat-value">{teams.length}</span>
          <span className="fan-entity-stat-label">Teams</span>
        </div>
        <div className="fan-entity-stat">
          <span className="fan-entity-stat-value">{upcomingEvents.length}</span>
          <span className="fan-entity-stat-label">Upcoming Events</span>
        </div>
      </div>

      {/* About Section */}
      {profile.description && (
        <section className="fan-entity-section">
          <h2 className="fan-entity-section-title">About</h2>
          <p className="fan-entity-description">{profile.description}</p>
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

      {/* Teams */}
      <section className="fan-entity-section">
        <div className="fan-section-header">
          <h2 className="fan-entity-section-title">Teams</h2>
          {teams.length > 0 && (
            <button className="fan-link-btn">View All</button>
          )}
        </div>
        
        {teams.length === 0 ? (
          <div className="fan-entity-empty">
            <span className="material-symbols-outlined">groups</span>
            <p>No public teams</p>
          </div>
        ) : (
          <div className="fan-teams-grid">
            {teams.slice(0, 6).map((team) => (
              <div 
                key={team.id} 
                className="fan-team-card"
                onClick={() => navigate(getLink(RouteKeys.FAN_TEAM_PROFILE, { id: team.id }))}
              >
                <div className="fan-team-logo">
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} />
                  ) : (
                    <span className="material-symbols-outlined">groups</span>
                  )}
                </div>
                <h4>{team.name}</h4>
                <p>{team.sport}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recent Photos */}
      <section className="fan-entity-section">
        <div className="fan-section-header">
          <h2 className="fan-entity-section-title">Recent Photos</h2>
          {recentPhotos.length > 0 && (
            <button className="fan-link-btn">View All</button>
          )}
        </div>
        
        {recentPhotos.length === 0 ? (
          <div className="fan-entity-empty">
            <span className="material-symbols-outlined">photo_library</span>
            <p>No photos shared</p>
          </div>
        ) : (
          <div className="fan-photos-preview">
            {recentPhotos.slice(0, 6).map((photo, index) => (
              <div key={index} className="fan-photo-thumb">
                <img src={photo.thumbnail_url || photo.url} alt="" />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Announcements */}
      {announcements.length > 0 && (
        <section className="fan-entity-section">
          <h2 className="fan-entity-section-title">Announcements</h2>
          <div className="fan-announcements-list">
            {announcements.slice(0, 3).map((announcement) => (
              <div key={announcement.id} className="fan-announcement-card">
                <div className="fan-announcement-header">
                  <span className="material-symbols-outlined">campaign</span>
                  <span className="fan-announcement-date">
                    {new Date(announcement.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h4>{announcement.title}</h4>
                <p>{announcement.content}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Contact Info */}
      {(profile.website || profile.email || profile.phone) && (
        <section className="fan-entity-section">
          <h2 className="fan-entity-section-title">Contact</h2>
          <div className="fan-contact-info">
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="fan-contact-item">
                <span className="material-symbols-outlined">language</span>
                Website
              </a>
            )}
            {profile.email && (
              <a href={`mailto:${profile.email}`} className="fan-contact-item">
                <span className="material-symbols-outlined">mail</span>
                Email
              </a>
            )}
            {profile.phone && (
              <a href={`tel:${profile.phone}`} className="fan-contact-item">
                <span className="material-symbols-outlined">phone</span>
                Call
              </a>
            )}
          </div>
        </section>
      )}
    </>
  )
}
