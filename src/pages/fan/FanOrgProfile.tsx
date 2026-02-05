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
import { getOrgProfile, followOrg, unfollowOrg, type EntityProfile } from '../../data/services/fanService'
import { getLink, RouteKeys } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { showError, showSuccess } from '../../utils/toast'
import '../../styles/fan.css'
import '../../styles/fan-layouts.css'

type TabType = 'overview' | 'schedule' | 'roster' | 'media' | 'shop'

export default function FanOrgProfile() {
  const t = useT()
  // Route param is :slug but can be UUID or slug - we use it as orgId
  const { slug: orgId } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  
  const [profile, setProfile] = useState<EntityProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')

  useEffect(() => {
    if (!orgId) {
      setError(t('portal.fan.entityProfile.orgNotFound'))
      setLoading(false)
      return
    }

    loadProfile()
  }, [orgId])

  const loadProfile = async () => {
    if (!orgId) return

    setLoading(true)
    setError(null)

    const { data, error: profileError } = await getOrgProfile(orgId)

    if (profileError || !data) {
      setError(profileError?.message || t('portal.fan.entityProfile.orgNotFound'))
      setLoading(false)
      return
    }

    // Check if the RPC returned an error object instead of profile data
    if (data && typeof data === 'object' && 'error' in data) {
      setError((data as any).message || t('portal.fan.entityProfile.orgNotFound'))
      setLoading(false)
      return
    }

    setProfile(data)
    setIsFollowing(data.is_following || false)
    setLoading(false)
  }

  const handleFollowToggle = async () => {
    if (!profile) return
    
    setFollowLoading(true)
    
    if (isFollowing) {
      const { error } = await unfollowOrg(profile.id)
      if (error) {
        showError(t('portal.fan.errors.unfollowOrgFailed'))
      } else {
        setIsFollowing(false)
        showSuccess(t('portal.fan.followedOrgs.unfollowSuccess'))
      }
    } else {
      const { error } = await followOrg(profile.id)
      if (error) {
        showError(t('portal.fan.errors.followOrgFailed'))
      } else {
        setIsFollowing(true)
        showSuccess(t('portal.fan.followedOrgs.followSuccess'))
      }
    }
    
    setFollowLoading(false)
  }

  // Get initials from name
  const getInitials = (name: string) => {
    return name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase()
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
                {(profile.location_city || profile.location_state) && (
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
              <button className="fan-org-profile-more-btn">
                <span className="material-symbols-outlined">more_horiz</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="fan-org-profile-tabs">
            <button 
              className={`fan-org-profile-tab ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              {t('portal.fan.orgProfile.tabs.overview')}
            </button>
            <button 
              className={`fan-org-profile-tab ${activeTab === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedule')}
            >
              {t('portal.fan.orgProfile.tabs.schedule')}
            </button>
            <button 
              className={`fan-org-profile-tab ${activeTab === 'roster' ? 'active' : ''}`}
              onClick={() => setActiveTab('roster')}
            >
              {t('portal.fan.orgProfile.tabs.roster')}
            </button>
            <button 
              className={`fan-org-profile-tab ${activeTab === 'media' ? 'active' : ''}`}
              onClick={() => setActiveTab('media')}
            >
              {t('portal.fan.orgProfile.tabs.media')}
            </button>
            <button 
              className={`fan-org-profile-tab ${activeTab === 'shop' ? 'active' : ''}`}
              onClick={() => setActiveTab('shop')}
            >
              {t('portal.fan.orgProfile.tabs.shop')}
            </button>
          </nav>
        </div>
      </section>

      {/* Main Content */}
      <div className="fan-org-profile-content">
        <div className="fan-org-profile-content-inner">
          <div className="fan-org-profile-grid">
            {/* Feed Section */}
            <section className="fan-org-profile-feed">
            <div className="fan-org-profile-feed-header">
              <h3 className="fan-org-profile-feed-title">{t('portal.fan.orgProfile.teamFeed')}</h3>
              <div className="fan-org-profile-feed-filters">
                <button className="fan-org-profile-feed-filter active">{t('portal.fan.orgProfile.recentHighlights')}</button>
                <button className="fan-org-profile-feed-filter">{t('portal.fan.orgProfile.pressReleases')}</button>
              </div>
            </div>

            <div className="fan-org-profile-posts">
              {/* Welcome Post */}
              <article className="fan-org-profile-post">
                <div className="fan-org-profile-post-header">
                  <div className="fan-org-profile-post-avatar">
                    {profile.logo_url ? (
                      <img src={profile.logo_url} alt={profile.name} />
                    ) : (
                      <span className="fan-org-profile-post-initials">{getInitials(profile.name)}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="fan-org-profile-post-author">{profile.name}</h4>
                    <p className="fan-org-profile-post-time">{t('portal.fan.orgProfile.teamNews')}</p>
                  </div>
                </div>

                <div className="fan-org-profile-post-body">
                  <h3 className="fan-org-profile-post-title">
                    {t('portal.fan.orgProfile.welcomeTo', { name: profile.name })}
                  </h3>
                  <p className="fan-org-profile-post-text">
                    {profile.description || t('portal.fan.orgProfile.stayTuned')}
                  </p>
                  
                  <div className="fan-org-profile-post-actions">
                    <button className="fan-org-profile-post-action">
                      <span className="material-symbols-outlined">favorite</span>
                      <span>0</span>
                    </button>
                    <button className="fan-org-profile-post-action">
                      <span className="material-symbols-outlined">mode_comment</span>
                      <span>0</span>
                    </button>
                    <button className="fan-org-profile-post-action fan-org-profile-post-action-share">
                      <span className="material-symbols-outlined">ios_share</span>
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="fan-org-profile-sidebar">
            {/* Next Game - Placeholder */}
            <div className="fan-org-profile-sidebar-section">
              <h2 className="fan-org-profile-sidebar-title">{t('portal.fan.orgProfile.nextGame')}</h2>
              <div className="fan-org-profile-next-game">
                <div className="fan-org-profile-next-game-empty">
                  <span>{t('portal.fan.orgProfile.noUpcomingGames')}</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="fan-org-profile-sidebar-section">
              <h2 className="fan-org-profile-sidebar-title">{t('portal.fan.orgProfile.stats')}</h2>
              <div className="fan-org-profile-stats">
                <div className="fan-org-profile-stat">
                  <span className="fan-org-profile-stat-label">{t('portal.fan.entityProfile.followers')}</span>
                  <span className="fan-org-profile-stat-value">{profile.follower_count || 0}</span>
                </div>
                <div className="fan-org-profile-stat">
                  <span className="fan-org-profile-stat-label">{t('portal.fan.entityProfile.teams')}</span>
                  <span className="fan-org-profile-stat-value">0</span>
                </div>
                <div className="fan-org-profile-stat">
                  <span className="fan-org-profile-stat-label">{t('portal.fan.entityProfile.upcomingEvents')}</span>
                  <span className="fan-org-profile-stat-value">0</span>
                </div>
              </div>
            </div>

            {/* Club Member Access CTA */}
            <div className="fan-org-profile-promo">
              <h3 className="fan-org-profile-promo-title">{t('portal.fan.orgProfile.clubMemberAccess')}</h3>
              <p className="fan-org-profile-promo-text">{t('portal.fan.orgProfile.clubMemberDescription')}</p>
              <button className="fan-org-profile-promo-btn">{t('portal.fan.orgProfile.joinTheClub')}</button>
            </div>
          </aside>
          </div>
        </div>
      </div>
    </div>
  )
}
