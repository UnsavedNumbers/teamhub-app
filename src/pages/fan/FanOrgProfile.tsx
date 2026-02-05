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
  followOrg, 
  unfollowOrg, 
  type EntityProfile 
} from '../../data/services/fanService'
import { getLink, RouteKeys } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { showError, showSuccess, showInfo } from '../../utils/toast'
import '../../styles/fan.css'
import '../../styles/fan-layouts.css'

type TabType = 'overview' | 'schedule' | 'roster' | 'media' | 'shop'
type FeedFilter = 'highlights' | 'press'

export default function FanOrgProfile() {
  const t = useT()
  const { slug: orgId } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  
  const [profile, setProfile] = useState<EntityProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('highlights')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

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
    if (tab === 'shop') {
      showInfo(t('portal.fan.orgProfile.shopComingSoon'))
    }
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

  const handleReportProfile = () => {
    setMoreMenuOpen(false)
    showInfo(t('portal.fan.orgProfile.reportComingSoon'))
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
            <button 
              className={`fan-org-profile-tab ${activeTab === 'shop' ? 'active' : ''}`}
              onClick={() => handleTabChange('shop')}
            >
              {t('portal.fan.orgProfile.tabs.shop')}
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

              {/* Empty State */}
              <div className="fan-empty-state">
                <span className="material-symbols-outlined">article</span>
                <p>{t('portal.fan.orgProfile.noPosts')}</p>
              </div>
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="fan-empty-state">
              <span className="material-symbols-outlined">calendar_month</span>
              <p>{t('portal.fan.orgProfile.noUpcomingEvents')}</p>
            </div>
          )}

          {activeTab === 'roster' && (
            <div className="fan-empty-state">
              <span className="material-symbols-outlined">groups</span>
              <p>{t('portal.fan.orgProfile.noTeams')}</p>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="fan-empty-state">
              <span className="material-symbols-outlined">photo_library</span>
              <p>{t('portal.fan.orgProfile.noMedia')}</p>
            </div>
          )}

          {activeTab === 'shop' && (
            <div className="fan-empty-state">
              <span className="material-symbols-outlined">shopping_bag</span>
              <p>{t('portal.fan.orgProfile.shopComingSoon')}</p>
              <p style={{ fontSize: '14px', marginTop: '8px', color: '#71717a' }}>
                {t('portal.fan.orgProfile.shopDescription')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
