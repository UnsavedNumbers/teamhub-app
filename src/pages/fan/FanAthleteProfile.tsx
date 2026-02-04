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
import { useI18n } from '../../i18n/useI18n'
import { followOrg, unfollowOrg } from '../../data/services/fanService'
import { getLink, RouteKeys } from '../../utils/routes'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { showError, showSuccess } from '../../utils/toast'
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
  sport: string
  privacy_level: 'public' | 'private' | 'followers_only'
  is_following: boolean
  follower_count: number
}

export default function FanAthleteProfile() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
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
    if (!id) {
      setError('Athlete not found')
      setLoading(false)
      return
    }

    loadProfile()
  }, [id])

  const loadProfile = async () => {
    if (!id) return

    setLoading(true)
    setError(null)

    // In production: call getAthleteProfile(id)
    // For now, simulate with placeholder
    setTimeout(() => {
      setProfile(null)
      setError('Athlete not found')
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
        showSuccess(`Unfollowed ${profile.first_name} ${profile.last_name}`)
      }
    } else {
      const { error } = await followOrg(profile.id)
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
        <LoadingSpinner size="lg" />
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
    <>
      {/* Back Button */}
      <button 
        className="fan-back-btn"
        onClick={() => navigate(-1)}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back
      </button>

      {/* Athlete Header */}
      <div className="fan-entity-header fan-athlete-header">
        <div className="fan-entity-cover">
          {profile.cover_url ? (
            <img src={profile.cover_url} alt="" />
          ) : (
            <div className="fan-entity-cover-gradient" />
          )}
        </div>
        
        <div className="fan-entity-info">
          <div className="fan-athlete-photo-large">
            {profile.photo_url ? (
              <img src={profile.photo_url} alt={fullName} />
            ) : (
              <span className="material-symbols-outlined">person</span>
            )}
            {profile.jersey_number && (
              <span className="fan-athlete-jersey">#{profile.jersey_number}</span>
            )}
          </div>
          
          <div className="fan-entity-details">
            <h1 className="fan-entity-name">{fullName}</h1>
            <div className="fan-athlete-team-info">
              <button 
                className="fan-entity-parent"
                onClick={() => navigate(getLink(RouteKeys.FAN_TEAM_PROFILE, { id: profile.team_id }))}
              >
                <span className="material-symbols-outlined">groups</span>
                {profile.team_name}
              </button>
              <span className="fan-athlete-separator">•</span>
              <button 
                className="fan-entity-parent"
                onClick={() => profile.org_slug && navigate(getLink(RouteKeys.FAN_ORG_PROFILE, { slug: profile.org_slug }))}
              >
                {profile.org_name}
              </button>
            </div>
            <div className="fan-entity-tags">
              {profile.sport && <span className="fan-entity-tag">{profile.sport}</span>}
              {profile.position && <span className="fan-entity-tag">{profile.position}</span>}
              {profile.graduation_year && <span className="fan-entity-tag">Class of {profile.graduation_year}</span>}
            </div>
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
    </>
  )
}
