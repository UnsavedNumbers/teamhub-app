/**
 * Team Profile Page (Fan View)
 * 
 * Public profile view for a team.
 * Shows: About, upcoming events, roster, photos
 * 
 * URL/ROUTE: /fan/team/:id
 * Design: FanConnect Minimalist Light
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { followOrg, unfollowOrg } from '../../data/services/fanService'
import { getLink, RouteKeys } from '../../utils/routes'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { showError, showSuccess } from '../../utils/toast'
import '../../styles/fan.css'

interface TeamProfile {
  id: string
  name: string
  slug?: string
  logo_url?: string
  cover_url?: string
  org_id: string
  org_name: string
  org_slug?: string
  sport: string
  season?: string
  level?: string
  age_group?: string
  description?: string
  privacy_level: 'public' | 'private' | 'followers_only'
  is_following: boolean
  follower_count: number
  athlete_count: number
}

export default function FanTeamProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  const [profile, setProfile] = useState<TeamProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  
  // Related content
  const [upcomingEvents] = useState<any[]>([])
  const [roster] = useState<any[]>([])
  const [recentPhotos] = useState<any[]>([])
  const [recentResults] = useState<any[]>([])

  useEffect(() => {
    if (!id) {
      setError('Team not found')
      setLoading(false)
      return
    }

    loadProfile()
  }, [id])

  const loadProfile = async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    // In production: call getTeamProfile(id)
    // For now, simulate with placeholder
    setTimeout(() => {
      setProfile(null)
      setError('Team not found')
      setLoading(false)
    }, 500)
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
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="fan-error-page">
        <span className="material-symbols-outlined">error</span>
        <h2>Team Not Found</h2>
        <p>{error || 'This team may not exist or is not publicly visible.'}</p>
        <button 
          className="fan-btn fan-btn-primary"
          onClick={() => navigate(getLink(RouteKeys.FAN_HOME))}
        >
          Go Home
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

      {/* Team Header */}
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
              <span className="material-symbols-outlined">groups</span>
            )}
          </div>
          
          <div className="fan-entity-details">
            <h1 className="fan-entity-name">{profile.name}</h1>
            <button 
              className="fan-entity-parent"
              onClick={() => profile.org_slug && navigate(getLink(RouteKeys.FAN_ORG_PROFILE, { slug: profile.org_slug }))}
            >
              <span className="material-symbols-outlined">business</span>
              {profile.org_name}
            </button>
            <div className="fan-entity-tags">
              {profile.sport && <span className="fan-entity-tag">{profile.sport}</span>}
              {profile.level && <span className="fan-entity-tag">{profile.level}</span>}
              {profile.age_group && <span className="fan-entity-tag">{profile.age_group}</span>}
            </div>
          </div>
          
          <button 
            className={`fan-follow-btn ${isFollowing ? 'following' : ''}`}
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

      {/* Stats Bar */}
      <div className="fan-entity-stats">
        <div className="fan-entity-stat">
          <span className="fan-entity-stat-value">{profile.follower_count || 0}</span>
          <span className="fan-entity-stat-label">Followers</span>
        </div>
        <div className="fan-entity-stat">
          <span className="fan-entity-stat-value">{profile.athlete_count || roster.length}</span>
          <span className="fan-entity-stat-label">Athletes</span>
        </div>
        <div className="fan-entity-stat">
          <span className="fan-entity-stat-value">{upcomingEvents.length}</span>
          <span className="fan-entity-stat-label">Upcoming</span>
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

      {/* Recent Results */}
      {recentResults.length > 0 && (
        <section className="fan-entity-section">
          <h2 className="fan-entity-section-title">Recent Results</h2>
          <div className="fan-results-list">
            {recentResults.slice(0, 5).map((result) => (
              <div key={result.id} className="fan-result-card">
                <div className="fan-result-date">
                  {new Date(result.date).toLocaleDateString('en-US', { 
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
                <div className="fan-result-matchup">
                  <span className="fan-result-team">{profile.name}</span>
                  <span className="fan-result-score">{result.our_score} - {result.their_score}</span>
                  <span className="fan-result-opponent">{result.opponent}</span>
                </div>
                <span className={`fan-result-outcome ${result.outcome}`}>
                  {result.outcome === 'win' ? 'W' : result.outcome === 'loss' ? 'L' : 'T'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Roster */}
      <section className="fan-entity-section">
        <div className="fan-section-header">
          <h2 className="fan-entity-section-title">Roster</h2>
          {roster.length > 0 && (
            <button className="fan-link-btn">View All</button>
          )}
        </div>
        
        {roster.length === 0 ? (
          <div className="fan-entity-empty">
            <span className="material-symbols-outlined">person</span>
            <p>Roster not available</p>
          </div>
        ) : (
          <div className="fan-roster-grid">
            {roster.slice(0, 12).map((athlete) => (
              <div 
                key={athlete.id} 
                className="fan-athlete-card"
                onClick={() => navigate(getLink(RouteKeys.FAN_ATHLETE_PROFILE, { id: athlete.id }))}
              >
                <div className="fan-athlete-photo">
                  {athlete.photo_url ? (
                    <img src={athlete.photo_url} alt={`${athlete.first_name} ${athlete.last_name}`} />
                  ) : (
                    <span className="material-symbols-outlined">person</span>
                  )}
                </div>
                <div className="fan-athlete-info">
                  <h4>{athlete.first_name} {athlete.last_name}</h4>
                  {athlete.jersey_number && <span>#{athlete.jersey_number}</span>}
                  {athlete.position && <span>{athlete.position}</span>}
                </div>
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
    </>
  )
}
