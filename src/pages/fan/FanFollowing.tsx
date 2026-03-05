/**
 * Fan Following Page
 * 
 * Two tabs:
 * 1. My Following - Organizations, Teams, Athletes being followed
 * 2. Discover - Search and discover new entities
 * 
 * URL/ROUTE: /fan/following
 * Design: FanConnect Minimalist Light
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { 
  getFollowedOrgs,
  searchEntities,
  followOrg,
  unfollowOrg,
  type SearchEntityResult 
} from '../../data/services/fanService'
import type { FanOrgFollow } from '../../types/staffAndFan'
import { USE_FAKE_DATA } from '../../data/config'
import { getTeamsForOrg, getTeamMembersForSeason, getTeamWithDetails } from '../../data/fake/fakeTeams'
import { getChildById } from '../../data/fake/fakeUsers'
import { getLink, RouteKeys } from '../../utils/routes'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import AthleteAvatar from '../../components/portal/AthleteAvatar'
import { useUserContext } from '../../hooks/useUserContext'
import { showError, showSuccess } from '../../utils/toast'
import type { Athlete } from '../../types/family'
import '../../styles/fan.css'
import '../../styles/fan-layouts.css'

type TabType = 'following' | 'discover'
type EntityType = 'org' | 'team' | 'athlete'

interface FollowedTeam {
  id: string
  org_id: string
  name: string
  org_name?: string
  sport?: string
  logo_url?: string
  season_id?: string | null
}

interface FollowedAthlete {
  id: string
  first_name: string
  last_name: string
  org_id: string
  photo_url?: string | null
  team_name?: string
  sport?: string
}

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FanFollowing() {
  useDebugLifecycle('FanFollowing')
  
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState<TabType>(
    (searchParams.get('tab') as TabType) || 'following'
  )

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab)
    setSearchParams({ tab })
  }

  return (
    <div className="fan-following-page">
      {/* Page Header - Matching Design */}
      <div className="fan-following-header">
        <div className="fan-following-header-row">
          <div>
            <span className="fan-following-label">Community Hub</span>
            <h1 className="fan-following-title">Following</h1>
            <p className="fan-following-subtitle">Manage your followed organizations, teams, and athletes</p>
          </div>
          
          {/* Search */}
          <div className="fan-following-search">
            <span className="material-symbols-outlined">search</span>
            <input
              type="text"
              placeholder="Search teams, organizations..."
              className="fan-following-search-input"
            />
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="fan-tab-content">
        {activeTab === 'following' ? (
          <MyFollowingTab onSwitchToDiscover={() => handleTabChange('discover')} />
        ) : (
          <DiscoverTab />
        )}
      </div>
    </div>
  )
}

/**
 * My Following Tab
 */
interface MyFollowingTabProps {
  onSwitchToDiscover: () => void
}

function MyFollowingTab({ onSwitchToDiscover }: MyFollowingTabProps) {
  const navigate = useNavigate()
  
  // Data state
  const [organizations, setOrganizations] = useState<FanOrgFollow[]>([])
  const [teams, setTeams] = useState<FollowedTeam[]>([])
  const [athletes, setAthletes] = useState<FollowedAthlete[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filter state
  const [filterType] = useState<'all' | EntityType>('all')

  useEffect(() => {
    loadFollowedEntities()
  }, [])

  const loadFollowedEntities = async () => {
    setLoading(true)
    
    const { data, error } = await getFollowedOrgs()
    
    if (error) {
      showError(error.message)
    } else if (data) {
      setOrganizations(data)
    }
    
    if (USE_FAKE_DATA && data) {
      const teamMap = new Map<string, FollowedTeam>()
      const athleteMap = new Map<string, FollowedAthlete>()

      for (const follow of data) {
        const org = follow.org as { name?: string } | undefined
        const orgName = org?.name || 'Organization'
        const orgTeams = getTeamsForOrg(follow.org_id).filter((team) => team.is_active).slice(0, 10)

        for (const team of orgTeams) {
          if (!teamMap.has(team.id)) {
            const teamDetails = getTeamWithDetails(team.id)
            teamMap.set(team.id, {
              id: team.id,
              org_id: follow.org_id,
              name: team.name,
              org_name: orgName,
              sport: teamDetails?.sport?.name,
              season_id: teamDetails?.activeSeason?.id ?? null,
            })
          }

          const activeSeasonId = getTeamWithDetails(team.id)?.activeSeason?.id
          if (!activeSeasonId) continue
          const members = getTeamMembersForSeason(team.id, activeSeasonId)
            .filter((member) => member.status === 'active')
            .slice(0, 8)

          for (const member of members) {
            const athlete = getChildById(member.athlete_id)
            if (!athlete || athleteMap.has(athlete.id)) continue
            const teamDetails = getTeamWithDetails(team.id)
            athleteMap.set(athlete.id, {
              id: athlete.id,
              first_name: athlete.first_name,
              last_name: athlete.last_name,
              org_id: follow.org_id,
              photo_url: athlete.photo_url,
              team_name: team.name,
              sport: teamDetails?.sport?.name,
            })
          }
        }
      }

      setTeams(Array.from(teamMap.values()))
      setAthletes(Array.from(athleteMap.values()))
    } else {
      setTeams([])
      setAthletes([])
    }
    
    setLoading(false)
  }

  const handleUnfollow = async (type: EntityType, id: string, orgId?: string) => {
    const targetOrgId = type === 'org' ? id : (orgId || id)

    // Optimistic update
    if (type === 'org') {
      setOrganizations(prev => prev.filter(o => o.org_id !== id))
      setTeams(prev => prev.filter(t => t.org_id !== id))
      setAthletes(prev => prev.filter(a => a.org_id !== id))
    } else if (type === 'team') {
      setTeams(prev => prev.filter(t => t.id !== id))
    } else {
      setAthletes(prev => prev.filter(a => a.id !== id))
    }

    const { error } = await unfollowOrg(targetOrgId)
    
    if (error) {
      showError('Failed to unfollow')
      // Revert on error
      loadFollowedEntities()
    } else {
      showSuccess('Unfollowed successfully')
    }
  }

  const handleEntityClick = (type: EntityType, id: string, slug?: string) => {
    if (type === 'org') {
      navigate(getLink(RouteKeys.FAN_ORG_PROFILE, { orgId: slug || id }))
    } else if (type === 'team') {
      navigate(getLink(RouteKeys.FAN_TEAM_PROFILE, { teamId: id }))
    } else if (type === 'athlete') {
      navigate(getLink(RouteKeys.FAN_ATHLETE_PROFILE, { athleteId: id }))
    }
  }

  const totalCount = organizations.length + teams.length + athletes.length

  if (loading) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (totalCount === 0) {
    return (
      <div className="fan-empty-state">
        <span className="material-symbols-outlined">favorite_border</span>
        <h3>Not following anyone yet</h3>
        <p>Start following organizations, teams, and athletes to see their updates in your feed</p>
        <button className="fan-btn fan-btn-primary" onClick={onSwitchToDiscover}>
          <span className="material-symbols-outlined">explore</span>
          Discover
        </button>
      </div>
    )
  }

  return (
    <div className="fan-following-content">
      {/* Organizations Section */}
      {(filterType === 'all' || filterType === 'org') && organizations.length > 0 && (
        <section className="fan-following-section">
          <div className="fan-section-header">
            <div className="fan-section-header-left">
              <h2 className="fan-section-title">Followed Organizations</h2>
              <span className="fan-count-badge">{organizations.length} Total</span>
            </div>
          </div>
          <div className="fan-following-grid">
            {organizations.map((follow) => {
              const org = follow.org as any
              return (
                <FollowingCard
                  key={follow.id}
                  type="org"
                  id={follow.org_id}
                  name={org?.name || 'Organization'}
                  slug={org?.slug}
                  logoUrl={org?.logo_url}
                  subtitle={org?.location_city && org?.location_state 
                    ? `${org.location_city}, ${org.location_state}` 
                    : undefined}
                  onUnfollow={() => handleUnfollow('org', follow.org_id)}
                  onClick={() => handleEntityClick('org', follow.org_id, org?.slug)}
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Teams Section */}
      {(filterType === 'all' || filterType === 'team') && teams.length > 0 && (
        <section className="fan-following-section">
          <div className="fan-section-header">
            <div className="fan-section-header-left">
              <h2 className="fan-section-title">Followed Teams</h2>
              <span className="fan-count-badge">{teams.length} Total</span>
            </div>
          </div>
          <div className="fan-following-grid">
            {teams.map((team) => (
              <FollowingCard
                key={team.id}
                type="team"
                id={team.id}
                name={team.name}
                logoUrl={team.logo_url}
                subtitle={team.org_name}
                sport={team.sport}
                onUnfollow={() => handleUnfollow('team', team.id, team.org_id)}
                onClick={() => handleEntityClick('team', team.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Teams Empty State (when filter is team-only) */}
      {filterType === 'team' && teams.length === 0 && (
        <div className="fan-empty-section">
          <p>Not following any teams yet</p>
        </div>
      )}

      {/* Athletes Section */}
      {(filterType === 'all' || filterType === 'athlete') && athletes.length > 0 && (
        <section className="fan-following-section">
          <div className="fan-section-header">
            <div className="fan-section-header-left">
              <h2 className="fan-section-title">Followed Athletes</h2>
              <span className="fan-count-badge">{athletes.length} Total</span>
            </div>
          </div>
          <div className="fan-following-grid">
            {athletes.map((athlete) => (
              <FollowingCard
                key={athlete.id}
                type="athlete"
                id={athlete.id}
                name={`${athlete.first_name} ${athlete.last_name}`}
                logoUrl={athlete.photo_url || undefined}
                athlete={athlete}
                subtitle={athlete.team_name}
                sport={athlete.sport}
                onUnfollow={() => handleUnfollow('athlete', athlete.id, athlete.org_id)}
                onClick={() => handleEntityClick('athlete', athlete.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Athletes Empty State (when filter is athlete-only) */}
      {filterType === 'athlete' && athletes.length === 0 && (
        <div className="fan-empty-section">
          <p>Not following any athletes yet</p>
        </div>
      )}
    </div>
  )
}

/**
 * Following Card Component
 */
interface FollowingCardProps {
  type: EntityType
  id: string
  name: string
  slug?: string
  logoUrl?: string
  athlete?: { id: string; first_name: string; last_name: string; org_id?: string; photo_url?: string | null }
  subtitle?: string
  sport?: string
  onUnfollow: () => void
  onClick: () => void
}

function FollowingCard({ type, name, logoUrl, athlete, subtitle, sport, onUnfollow, onClick }: FollowingCardProps) {
  const { context } = useUserContext()
  const [isUnfollowing, setIsUnfollowing] = useState(false)

  const handleUnfollow = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsUnfollowing(true)
    await onUnfollow()
    setIsUnfollowing(false)
  }

  const getIcon = () => {
    switch (type) {
      case 'org': return 'business'
      case 'team': return 'groups'
      case 'athlete': return 'person'
    }
  }

  return (
    <div className="fan-following-card" onClick={onClick}>
      <div className="fan-following-card-avatar overflow-hidden">
        {type === 'athlete' && athlete ? (
          <AthleteAvatar
            athlete={{ id: athlete.id, first_name: athlete.first_name, last_name: athlete.last_name, org_id: athlete.org_id ?? context?.orgId, has_profile_photo: !!athlete.photo_url, profile_photo_updated_at: null } as unknown as Athlete}
            photoSize="256"
            className="w-full h-full object-cover"
          />
        ) : logoUrl ? (
          <img src={logoUrl} alt={name} />
        ) : (
          <span className="material-symbols-outlined">{getIcon()}</span>
        )}
      </div>
      <div className="fan-following-card-info">
        <h3 className="fan-following-card-name">{name}</h3>
        {subtitle && <p className="fan-following-card-subtitle">{subtitle}</p>}
        {sport && <span className="fan-following-card-sport">{sport}</span>}
      </div>
      <button 
        className="fan-following-card-btn"
        onClick={handleUnfollow}
        disabled={isUnfollowing}
      >
        {isUnfollowing ? (
          <LoadingSpinner size="small" />
        ) : (
          <>
            <span className="material-symbols-outlined">check</span>
            Following
          </>
        )}
      </button>
    </div>
  )
}

/**
 * Discover Tab
 */
function DiscoverTab() {
  const navigate = useNavigate()
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchEntityResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  
  // Debounce ref
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([])
      setHasSearched(false)
      return
    }

    setLoading(true)
    setHasSearched(true)

    const { data, error } = await searchEntities(query.trim())

    if (error) {
      showError(error.message)
      setSearchResults([])
    } else if (data) {
      setSearchResults(data)
    }

    setLoading(false)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Debounce search (300ms)
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value)
    }, 300)
  }

  const handleFollow = async (entity: SearchEntityResult) => {
    // Optimistic update
    setSearchResults(prev =>
      prev.map(e => e.id === entity.id ? { ...e, isFollowing: true } : e)
    )

    const targetOrgId = entity.entity_type === 'org' ? entity.id : (entity.parent_org_id || entity.id)
    const { error } = await followOrg(targetOrgId)

    if (error) {
      showError('Failed to follow')
      // Revert on error
      setSearchResults(prev =>
        prev.map(e => e.id === entity.id ? { ...e, isFollowing: false } : e)
      )
    } else {
      showSuccess(`Now following ${entity.name}`)
    }
  }

  const handleUnfollow = async (entity: SearchEntityResult) => {
    // Optimistic update
    setSearchResults(prev =>
      prev.map(e => e.id === entity.id ? { ...e, isFollowing: false } : e)
    )

    const targetOrgId = entity.entity_type === 'org' ? entity.id : (entity.parent_org_id || entity.id)
    const { error } = await unfollowOrg(targetOrgId)

    if (error) {
      showError('Failed to unfollow')
      // Revert on error
      setSearchResults(prev =>
        prev.map(e => e.id === entity.id ? { ...e, isFollowing: true } : e)
      )
    }
  }

  const handleEntityClick = (entity: SearchEntityResult) => {
    if (entity.entity_type === 'org') {
      navigate(getLink(RouteKeys.FAN_ORG_PROFILE, { orgId: entity.slug || entity.id }))
    } else if (entity.entity_type === 'team') {
      navigate(getLink(RouteKeys.FAN_TEAM_PROFILE, { teamId: entity.id }))
    } else if (entity.entity_type === 'athlete') {
      navigate(getLink(RouteKeys.FAN_ATHLETE_PROFILE, { athleteId: entity.id }))
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="fan-discover-content">
      {/* Search Bar */}
      <div className="fan-search-bar fan-search-bar-large">
        <span className="material-symbols-outlined">search</span>
        <input
          type="text"
          value={searchQuery}
          onChange={handleInputChange}
          placeholder="Search organizations, teams, or athletes..."
          className="fan-search-input"
          autoFocus
        />
        {searchQuery && (
          <button 
            className="fan-search-clear"
            onClick={() => {
              setSearchQuery('')
              setSearchResults([])
              setHasSearched(false)
            }}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="fan-loading-section">
          <LoadingSpinner size="medium" />
        </div>
      )}

      {/* Search Results */}
      {!loading && hasSearched && searchResults.length > 0 && (
        <div className="fan-search-results">
          <p className="fan-search-results-count">
            {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
          </p>
          <div className="fan-search-results-grid">
            {searchResults.map((entity) => (
              <SearchResultCard
                key={`${entity.entity_type}-${entity.id}`}
                entity={entity}
                onFollow={() => handleFollow(entity)}
                onUnfollow={() => handleUnfollow(entity)}
                onClick={() => handleEntityClick(entity)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {!loading && hasSearched && searchResults.length === 0 && (
        <div className="fan-empty-state">
          <span className="material-symbols-outlined">search_off</span>
          <h3>No results found</h3>
          <p>Try searching with different keywords</p>
        </div>
      )}

      {/* Initial State (before search) */}
      {!loading && !hasSearched && (
        <div className="fan-discover-initial">
          <div className="fan-discover-hero">
            <span className="material-symbols-outlined">explore</span>
            <h3>Discover</h3>
            <p>Search for organizations, teams, or athletes to follow and get their updates in your feed</p>
          </div>

          {/* Popular / Suggested section would go here */}
          {/* This would show featured orgs or location-based suggestions */}
        </div>
      )}
    </div>
  )
}

/**
 * Search Result Card Component
 */
interface SearchResultCardProps {
  entity: SearchEntityResult
  onFollow: () => void
  onUnfollow: () => void
  onClick: () => void
}

function SearchResultCard({ entity, onFollow, onUnfollow, onClick }: SearchResultCardProps) {
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFollowClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsProcessing(true)
    
    if (entity.isFollowing) {
      await onUnfollow()
    } else {
      await onFollow()
    }
    
    setIsProcessing(false)
  }

  const getIcon = () => {
    switch (entity.entity_type) {
      case 'org': return 'business'
      case 'team': return 'groups'
      case 'athlete': return 'person'
      default: return 'star'
    }
  }

  const getTypeLabel = () => {
    switch (entity.entity_type) {
      case 'org': return 'Organization'
      case 'team': return 'Team'
      case 'athlete': return 'Athlete'
      default: return ''
    }
  }

  return (
    <div className="fan-search-result-card" onClick={onClick}>
      <div className="fan-search-result-avatar">
        {entity.logo_url ? (
          <img src={entity.logo_url} alt={entity.name} />
        ) : (
          <span className="material-symbols-outlined">{getIcon()}</span>
        )}
      </div>
      <div className="fan-search-result-info">
        <span className="fan-search-result-type">{getTypeLabel()}</span>
        <h3 className="fan-search-result-name">{entity.name}</h3>
        {entity.location_city && entity.location_state && (
          <p className="fan-search-result-location">
            <span className="material-symbols-outlined">location_on</span>
            {entity.location_city}, {entity.location_state}
          </p>
        )}
        {entity.sport && (
          <span className="fan-search-result-sport">{entity.sport}</span>
        )}
        {entity.parent_org_name && (
          <p className="fan-search-result-parent">{entity.parent_org_name}</p>
        )}
      </div>
      <button 
        className={`fan-follow-btn ${entity.isFollowing ? 'following' : ''}`}
        onClick={handleFollowClick}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <LoadingSpinner size="small" />
        ) : entity.isFollowing ? (
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
  )
}
