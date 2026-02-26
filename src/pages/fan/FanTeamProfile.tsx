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
import { followOrg, getTeamProfile, unfollowOrg } from '../../data/services/fanService'
import { USE_FAKE_DATA } from '../../data/config'
import { fakeEvents } from '../../data/fake/fakeEvents'
import { getMockGalleriesForOrg, getMockPhotosForGallery } from '../../data/fake/mockGalleries'
import { getOrganizationById } from '../../data/fake/fakeOrganizations'
import { getTeamMembersForSeason, getTeamWithDetails } from '../../data/fake/fakeTeams'
import { getChildById } from '../../data/fake/fakeUsers'
import { getLink, RouteKeys } from '../../utils/routes'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import AthleteAvatar from '../../components/portal/AthleteAvatar'
import { useUserContext } from '../../hooks/useUserContext'
import { showError, showSuccess } from '../../utils/toast'
import type { Athlete } from '../../types/family'
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
  privacy_level: 'public' | 'private' | 'followers_only' | 'unlisted'
  is_following: boolean
  follower_count: number
  athlete_count: number
}

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FanTeamProfile() {
  useDebugLifecycle('FanTeamProfile')
  
  const { id, teamId } = useParams<{ id?: string; teamId?: string }>()
  const resolvedTeamId = teamId || id
  const navigate = useNavigate()
  
  const { context } = useUserContext()
  const [profile, setProfile] = useState<TeamProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  
  // Related content
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [roster, setRoster] = useState<any[]>([])
  const [recentPhotos, setRecentPhotos] = useState<any[]>([])
  const [recentResults, setRecentResults] = useState<any[]>([])

  useEffect(() => {
    if (!resolvedTeamId) {
      setError('Team not found')
      setLoading(false)
      return
    }

    loadProfile()
  }, [resolvedTeamId])

  const loadProfile = async () => {
    if (!resolvedTeamId) return

    setLoading(true)
    setError(null)

    const { data, error: profileError } = await getTeamProfile(resolvedTeamId)

    if (profileError || !data) {
      setProfile(null)
      setError(profileError?.message || 'Team not found')
      setLoading(false)
      return
    }

    const fakeTeam = USE_FAKE_DATA ? getTeamWithDetails(resolvedTeamId) : undefined
    const fallbackOrg = fakeTeam ? getOrganizationById(fakeTeam.org_id) : undefined

    const mappedProfile: TeamProfile = {
      id: data.id,
      name: data.name,
      slug: undefined,
      logo_url: data.logo_url,
      cover_url: data.cover_url,
      org_id: fakeTeam?.org_id || '',
      org_name: data.parent_org_name || fallbackOrg?.name || 'Organization',
      org_slug: fallbackOrg?.slug,
      sport: data.sport || fakeTeam?.sport?.name || 'Sports',
      season: data.season || fakeTeam?.activeSeason?.name,
      level: fakeTeam?.level?.name || undefined,
      age_group: fakeTeam?.age_group || undefined,
      description: data.description || undefined,
      privacy_level: data.privacy_level,
      is_following: data.is_following,
      follower_count: data.follower_count || 0,
      athlete_count: 0,
    }

    setProfile(mappedProfile)
    setIsFollowing(Boolean(data.is_following))

    if (USE_FAKE_DATA && fakeTeam) {
      const now = Date.now()
      const teamEvents = fakeEvents
        .filter((event) => event.team_id === fakeTeam.id)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

      const nextEvents = teamEvents.filter((event) => new Date(event.start_time).getTime() >= now).slice(0, 8)
      setUpcomingEvents(nextEvents)

      const pastResults = teamEvents
        .filter((event) => new Date(event.start_time).getTime() < now && ['game', 'tournament'].includes(String((event as any).type || '')))
        .slice(-5)
        .reverse()
        .map((event, index) => ({
          id: `${event.id}-result`,
          date: event.start_time,
          opponent: `Opponent ${index + 1}`,
          our_score: 2 + (index % 3),
          their_score: 1 + ((index + 1) % 3),
          outcome: index % 3 === 2 ? 'loss' : 'win',
        }))
      setRecentResults(pastResults)

      const activeSeasonId = fakeTeam.activeSeason?.id
      const rosterEntries = activeSeasonId
        ? getTeamMembersForSeason(fakeTeam.id, activeSeasonId).filter((member) => member.status === 'active')
        : []
      const mappedRoster = rosterEntries
        .map((member) => {
          const child = getChildById(member.athlete_id)
          if (!child) return null
          return {
            id: child.id,
            first_name: child.first_name,
            last_name: child.last_name,
            jersey_number: member.jersey_number || child.jersey_number,
            position: member.position,
            org_id: fakeTeam.org_id,
            photo_url: child.photo_url,
          }
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
      setRoster(mappedRoster)

      setProfile((prev) => prev ? { ...prev, athlete_count: mappedRoster.length } : prev)

      const photos = getMockGalleriesForOrg(fakeTeam.org_id)
        .filter((gallery) => gallery.fans_can_see)
        .flatMap((gallery) => getMockPhotosForGallery(gallery.id))
        .slice(0, 12)
      setRecentPhotos(photos)
    } else {
      setUpcomingEvents([])
      setRecentResults([])
      setRoster([])
      setRecentPhotos([])
    }

    setLoading(false)
  }

  const handleFollowToggle = async () => {
    if (!profile) return
    if (!profile.org_id) {
      showError('Unable to update follow status for this team')
      return
    }
    
    setFollowLoading(true)
    
    if (isFollowing) {
      const { error } = await unfollowOrg(profile.org_id)
      if (error) {
        showError('Failed to unfollow')
      } else {
        setIsFollowing(false)
        showSuccess(`Unfollowed ${profile.name}`)
      }
    } else {
      const { error } = await followOrg(profile.org_id)
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
              onClick={() => profile.org_slug && navigate(getLink(RouteKeys.FAN_ORG_PROFILE, { orgId: profile.org_slug }))}
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
                onClick={() => navigate(getLink(RouteKeys.FAN_ATHLETE_PROFILE, { athleteId: athlete.id }))}
              >
                <div className="fan-athlete-photo">
                  <AthleteAvatar
                    athlete={{ id: athlete.id, first_name: athlete.first_name, last_name: athlete.last_name, org_id: athlete.org_id ?? profile?.org_id ?? context?.orgId, has_profile_photo: !!athlete.photo_url, profile_photo_updated_at: null } as unknown as Athlete}
                    photoSize="256"
                    className="w-full h-full object-cover"
                  />
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
