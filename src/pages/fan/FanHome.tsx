/**
 * Fan Home Page
 * 
 * Central feed showing aggregated updates from all followed entities.
 * Uses exact CSS classes from fan.css (FanConnect Minimalist Light design).
 * 
 * URL/ROUTE: /fan or /fan/home
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  getFanCalendar, 
  getFanFeed, 
  getFollowedOrgs,
  searchEntities,
  type FanFeedItem,
} from '../../data/services/fanService'
import type { FanOrgFollow, CalendarEvent } from '../../types/staffAndFan'
import { getLink, RouteKeys } from '../../utils/routes'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { showError } from '../../utils/toast'
import '../../styles/fan.css'

// Search result type
interface SearchResult {
  id: string
  entity_type: 'org' | 'team' | 'athlete'
  name: string
  slug?: string
  description?: string
  logo_url?: string
}

// Organization data within follow
interface OrgData {
  name: string
  logo_url?: string
  slug?: string
}

export default function FanHome() {
  const navigate = useNavigate()
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  // Data state
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [feedItems, setFeedItems] = useState<FanFeedItem[]>([])
  const [followedOrgs, setFollowedOrgs] = useState<FanOrgFollow[]>([])
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [feedFilter, setFeedFilter] = useState<'latest' | 'popular'>('latest')
  const eventsScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAllData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadAllData = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadUpcomingEvents(),
        loadFeed(),
        loadFollows(),
      ])
    } catch (_err) {
      showError('Failed to load feed')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadUpcomingEvents = async (): Promise<CalendarEvent[]> => {
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + 14)
    
    const { data, error } = await getFanCalendar({
      start_date: new Date().toISOString(),
      end_date: endDate.toISOString(),
    })

    if (!error && data) {
      const events = (data.events || []).slice(0, 6)
      setUpcomingEvents(events)
      return events
    }
    return []
  }

  const loadFeed = async (): Promise<FanFeedItem[]> => {
    const { data, error } = await getFanFeed()
    if (!error && data) {
      setFeedItems(data)
      return data
    }
    return []
  }

  const loadFollows = async () => {
    const { data, error } = await getFollowedOrgs()
    if (!error && data) {
      setFollowedOrgs(data)
    }
  }

  // Search functionality with debounce
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    if (value.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true)
        const { data, error } = await searchEntities(value.trim())
        if (!error && data) {
          setSearchResults(data.slice(0, 5))
        }
        setIsSearching(false)
      }, 300)
    } else {
      setSearchResults([])
    }
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`${getLink(RouteKeys.FAN_DISCOVER)}?q=${encodeURIComponent(searchQuery)}`)
    }
  }

  const handleSearchResultClick = (result: SearchResult) => {
    setSearchQuery('')
    setSearchResults([])
    
    if (result.entity_type === 'org' && result.slug) {
      navigate(getLink(RouteKeys.FAN_ORG_PROFILE, { slug: result.slug }))
    } else if (result.entity_type === 'team') {
      navigate(getLink(RouteKeys.FAN_TEAM_PROFILE, { id: result.id }))
    } else if (result.entity_type === 'athlete') {
      navigate(getLink(RouteKeys.FAN_ATHLETE_PROFILE, { id: result.id }))
    }
  }

  // Event scroll navigation
  const scrollEvents = (direction: 'left' | 'right') => {
    if (eventsScrollRef.current) {
      const scrollAmount = 340 // card width + gap
      eventsScrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      })
    }
  }

  // Date/time formatting
  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffHours = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (diffHours > 0 && diffHours <= 24) {
      return `Live in ${diffHours}h`
    }
    
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const isLiveSoon = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffHours = (date.getTime() - now.getTime()) / (1000 * 60 * 60)
    return diffHours > 0 && diffHours <= 24
  }

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins} Minutes Ago`
    if (diffHours < 24) return `${diffHours} Hours Ago`
    return `${diffDays} Days Ago`
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  if (loading) {
    return (
      <div className="fan-loading">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="fan-page">
      <main className="fan-main">
        <div className="fan-container">
          {/* Search Section */}
          <section className="fan-search-section">
            <div className="fan-search-wrapper">
              <span className="material-symbols-outlined fan-search-icon">search</span>
              <form onSubmit={handleSearchSubmit}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className="fan-search-input"
                  placeholder="Search athletes, teams, or moments..."
                />
              </form>
              {isSearching && (
                <div style={{ position: 'absolute', right: '1.5rem', top: '50%', transform: 'translateY(-50%)' }}>
                  <LoadingSpinner size="small" />
                </div>
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="fan-following-list" style={{ marginTop: '0.5rem', padding: '1rem', background: 'var(--color-zinc-50)', border: '1px solid var(--color-border)' }}>
                {searchResults.map((result) => (
                  <button
                    key={`${result.entity_type}-${result.id}`}
                    className="fan-following-item"
                    onClick={() => handleSearchResultClick(result)}
                    style={{ width: '100%', textAlign: 'left' }}
                  >
                    <div className="fan-following-avatar">
                      {result.name?.[0] || '?'}
                    </div>
                    <span className="fan-following-name">{result.name}</span>
                  </button>
                ))}
              </div>
            )}
            
            {/* Trending Tags */}
            <div className="fan-trending">
              <span className="fan-trending-label">Trending:</span>
              <button 
                className="fan-trending-link"
                onClick={() => navigate(`${getLink(RouteKeys.FAN_DISCOVER)}?q=championship`)}
              >
                Championship Finals
              </button>
              <button 
                className="fan-trending-link"
                onClick={() => navigate(`${getLink(RouteKeys.FAN_DISCOVER)}?q=playoffs`)}
              >
                Playoffs
              </button>
              <button 
                className="fan-trending-link"
                onClick={() => navigate(`${getLink(RouteKeys.FAN_DISCOVER)}?q=mvp`)}
              >
                MVP Race
              </button>
            </div>
          </section>

          {/* Upcoming Events Section */}
          <section className="fan-events-section">
            <div className="fan-section-header">
              <div className="fan-section-header-left">
                <h2>Upcoming Moments</h2>
                <p className="fan-section-title">Schedule & Live Events</p>
              </div>
              <div className="fan-section-nav">
                <button 
                  className="fan-nav-arrow"
                  onClick={() => scrollEvents('left')}
                >
                  <span className="material-symbols-outlined">west</span>
                </button>
                <button 
                  className="fan-nav-arrow"
                  onClick={() => scrollEvents('right')}
                >
                  <span className="material-symbols-outlined">east</span>
                </button>
              </div>
            </div>

            <div className="fan-events-scroll" ref={eventsScrollRef}>
              {upcomingEvents.length === 0 ? (
                <div className="fan-event-card">
                  <div className="fan-event-header">
                    <span className="fan-event-badge fan-event-badge-date">No Events</span>
                    <span className="material-symbols-outlined fan-event-icon">calendar_today</span>
                  </div>
                  <div>
                    <p className="fan-event-venue">Start following teams</p>
                    <h4 className="fan-event-title">No Upcoming Events</h4>
                    <div className="fan-event-footer">
                      <button 
                        className="fan-event-link"
                        onClick={() => navigate(getLink(RouteKeys.FAN_DISCOVER))}
                      >
                        Discover Teams
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                upcomingEvents.map((event) => (
                  <div 
                    key={event.id} 
                    className="fan-event-card"
                    onClick={() => navigate(getLink(RouteKeys.FAN_SCHEDULE))}
                  >
                    <div className="fan-event-header">
                      <span className={`fan-event-badge ${isLiveSoon(event.start_time) ? 'fan-event-badge-live' : 'fan-event-badge-date'}`}>
                        {formatEventDate(event.start_time)}
                      </span>
                      <span className="material-symbols-outlined fan-event-icon">calendar_today</span>
                    </div>
                    <div>
                      <p className="fan-event-venue">{event.location || 'Location TBD'}</p>
                      <h4 className="fan-event-title">{event.title}</h4>
                      <div className="fan-event-footer">
                        {isLiveSoon(event.start_time) && (
                          <>
                            <span className="fan-event-countdown">
                              <span className="fan-event-countdown-dot"></span>
                              Starting Soon
                            </span>
                            <span className="fan-event-divider">|</span>
                          </>
                        )}
                        <button 
                          className="fan-event-link"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigate(getLink(RouteKeys.FAN_TICKETS))
                          }}
                        >
                          Get Access
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          {/* Main Content Grid */}
          <div className="fan-grid">
            {/* Feed Section */}
            <section className="fan-feed-section">
              <div className="fan-feed-header">
                <h2 className="fan-feed-title">Community Feed</h2>
                <div className="fan-feed-tabs">
                  <button 
                    className={`fan-feed-tab ${feedFilter === 'latest' ? 'active' : ''}`}
                    onClick={() => setFeedFilter('latest')}
                  >
                    Latest
                  </button>
                  <button 
                    className={`fan-feed-tab ${feedFilter === 'popular' ? 'active' : ''}`}
                    onClick={() => setFeedFilter('popular')}
                  >
                    Popular
                  </button>
                </div>
              </div>

              {/* Feed Items */}
              <div className="fan-posts">
                {feedItems.length === 0 ? (
                  <div className="fan-empty-state">
                    <span className="material-symbols-outlined fan-empty-icon">feed</span>
                    <h3 className="fan-empty-title">No updates yet</h3>
                    <p className="fan-empty-text">Follow teams and athletes to see their updates here</p>
                    <button 
                      className="fan-btn fan-btn-primary"
                      onClick={() => navigate(getLink(RouteKeys.FAN_DISCOVER))}
                    >
                      Discover
                    </button>
                  </div>
                ) : (
                  feedItems.map((item, index) => (
                    <article key={item.id} className="fan-post">
                      <div className="fan-post-header">
                        <div className="fan-post-avatar">
                          {item.source_entity_name?.[0] || 'F'}
                        </div>
                        <div className="fan-post-meta">
                          <h4>{item.source_entity_name}</h4>
                          <p>{formatRelativeTime(item.created_at)}</p>
                        </div>
                      </div>
                      <div className="fan-post-body">
                        <p className="fan-post-text">
                          New {item.content_type} from {item.source_entity_name}
                        </p>
                      </div>
                      <div className="fan-post-actions">
                        <button className="fan-post-action">
                          <span className="material-symbols-outlined">favorite</span>
                          <span>Like</span>
                        </button>
                        <button className="fan-post-action">
                          <span className="material-symbols-outlined">mode_comment</span>
                          <span>Comment</span>
                        </button>
                        <button className="fan-post-action fan-post-action-share">
                          <span className="material-symbols-outlined">ios_share</span>
                        </button>
                      </div>
                      {index < feedItems.length - 1 && <div className="fan-post-divider"></div>}
                    </article>
                  ))
                )}
              </div>
            </section>

            {/* Sidebar */}
            <aside className="fan-sidebar">
              <div className="fan-sidebar-inner">
                {/* Navigation */}
                <div className="fan-sidebar-section">
                  <h2 className="fan-sidebar-title">Navigation</h2>
                  <nav className="fan-sidebar-nav">
                    <button 
                      className="fan-sidebar-link active"
                      onClick={() => navigate(getLink(RouteKeys.FAN_HOME))}
                    >
                      <span className="material-symbols-outlined">grid_view</span>
                      Dashboard
                    </button>
                    <button 
                      className="fan-sidebar-link"
                      onClick={() => navigate(getLink(RouteKeys.FAN_TICKETS))}
                    >
                      <span className="material-symbols-outlined">confirmation_number</span>
                      Tickets
                    </button>
                    <button 
                      className="fan-sidebar-link"
                      onClick={() => navigate(getLink(RouteKeys.FAN_PHOTOS))}
                    >
                      <span className="material-symbols-outlined">photo_library</span>
                      Gallery
                    </button>
                    <button 
                      className="fan-sidebar-link"
                      onClick={() => navigate(getLink(RouteKeys.FAN_SCHEDULE))}
                    >
                      <span className="material-symbols-outlined">calendar_month</span>
                      Schedule
                    </button>
                  </nav>
                </div>

                {/* Following */}
                <div className="fan-sidebar-section">
                  <h2 className="fan-sidebar-title">Following</h2>
                  <div className="fan-following-list">
                    {followedOrgs.length === 0 ? (
                      <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Not following anyone yet</p>
                    ) : (
                      followedOrgs.slice(0, 5).map((follow) => {
                        const org = follow.org as OrgData | undefined
                        return (
                          <button
                            key={follow.id}
                            className="fan-following-item"
                            onClick={() => org?.slug && navigate(getLink(RouteKeys.FAN_ORG_PROFILE, { slug: org.slug }))}
                          >
                            <div className="fan-following-avatar">
                              {org?.name?.[0] || 'O'}
                            </div>
                            <span className="fan-following-name">
                              {org?.name || 'Organization'}
                            </span>
                          </button>
                        )
                      })
                    )}
                    {followedOrgs.length > 5 && (
                      <button 
                        className="fan-btn fan-btn-outline"
                        style={{ marginTop: 'var(--spacing-4)', width: '100%' }}
                        onClick={() => navigate(getLink(RouteKeys.FAN_FOLLOWING))}
                      >
                        View All ({followedOrgs.length})
                      </button>
                    )}
                  </div>
                </div>

                {/* Promo Card */}
                <div className="fan-promo-card">
                  <h3 className="fan-promo-title">Discover More</h3>
                  <p className="fan-promo-text">
                    Find new teams and athletes to follow and never miss a moment.
                  </p>
                  <button 
                    className="fan-promo-button"
                    onClick={() => navigate(getLink(RouteKeys.FAN_DISCOVER))}
                  >
                    Explore
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}
