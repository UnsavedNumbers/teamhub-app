/**
 * Fan Videos Page
 * 
 * Dedicated video gallery for fan users to browse athlete videos.
 * Shows videos where:
 * - User follows the organization/team
 * - Video is marked as visible to fans
 * - Or user follows an athlete tagged in the video
 * 
 * URL/ROUTE: /fan/videos
 * Design: FanConnect Minimalist Light
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { USE_FAKE_DATA, DEMO_ORG_A_ID } from '@/data/config'
import { getFollowedOrgs } from '@/data/services/fanService'
import { getMockVideosForOrg } from '@/data/fake/mockVideos'
import { getMockVideoAthleteLinks } from '@/data/fake/mockVideoInteractions'
import { getOrganizationById } from '@/data/fake/fakeOrganizations'
import { getChildById } from '@/data/fake/fakeUsers'
import { getTeamById } from '@/data/fake/fakeTeams'
import { getLink, RouteKeys } from '@/utils/routes'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { showError } from '@/utils/toast'
import { useI18n } from '@/i18n/useI18n'
import Icon from '@/components/portal/Icon'
import '@/styles/fan.css'
import '@/styles/fan-layouts.css'

interface FanVideo {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  duration_seconds: number | null
  created_at: string
  org_id: string
  team_id: string | null
  category: string | null
  view_count: number
  mux_playback_id: string | null
  org_name?: string
  org_logo_url?: string | null
  team_name?: string
  tagged_athletes?: Array<{
    id: string
    name: string
    avatar_url?: string
  }>
}

interface FanVideoGroup {
  org_id: string
  org_name: string
  org_logo_url?: string | null
  videos: FanVideo[]
}

type TaggedAthlete = NonNullable<FanVideo['tagged_athletes']>[number]

const PAGE_SIZE = 24

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FanVideos() {
  useDebugLifecycle('FanVideos')
  
  const navigate = useNavigate()
  const { t } = useI18n()
  const tAny = t as unknown as (key: string, params?: any) => string
  const { user } = useAuth()
  
  const [videos, setVideos] = useState<FanVideo[]>([])
  const [grouped, setGrouped] = useState<FanVideoGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [cursor, setCursor] = useState<string | null>(null)
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<'recent' | 'oldest' | 'popular'>('recent')
  
  const mountedRef = useRef(true)
  const loadingRef = useRef(false)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Load videos
  const loadVideos = useCallback(async (reset: boolean) => {
    if (loadingRef.current || !user?.id) return
    loadingRef.current = true
    
    if (reset) {
      setLoading(true)
      setCursor(null)
      setHasMore(true)
    } else {
      setLoadingMore(true)
    }

    try {
      if (USE_FAKE_DATA) {
        const followsResult = await getFollowedOrgs()
        const followedOrgIds = (followsResult.data || []).map((follow) => follow.org_id)
        const scopedOrgIds = selectedOrgId
          ? [selectedOrgId]
          : (followedOrgIds.length > 0 ? followedOrgIds : [DEMO_ORG_A_ID])

        let scopedVideos: FanVideo[] = scopedOrgIds
          .flatMap((orgId) => getMockVideosForOrg(orgId))
          .filter((video) => video.status === 'ready')
          .map((video) => ({
            id: video.id,
            title: video.title,
            description: video.description || null,
            thumbnail_url: video.thumbnail_url || null,
            duration_seconds: video.duration_seconds || null,
            created_at: video.created_at,
            org_id: video.org_id,
            team_id: video.team_id || null,
            category: video.category || null,
            view_count: video.view_count || 0,
            mux_playback_id: video.mux_playback_id || null,
            org_name: getOrganizationById(video.org_id)?.name || 'Organization',
            org_logo_url: getOrganizationById(video.org_id)?.logo_url || null,
            team_name: video.team_id ? getTeamById(video.team_id)?.name : undefined,
            tagged_athletes: getMockVideoAthleteLinks(video.id).reduce<TaggedAthlete[]>(
              (acc, link) => {
                const child = getChildById(link.athlete_id)
                if (!child) return acc
                acc.push({
                  id: child.id,
                  name: `${child.first_name} ${child.last_name}`.trim(),
                  ...(child.photo_url ? { avatar_url: child.photo_url } : {}),
                })
                return acc
              },
              [],
            ),
          }))

        if (searchQuery) {
          const search = searchQuery.toLowerCase()
          scopedVideos = scopedVideos.filter((video) =>
            video.title.toLowerCase().includes(search) ||
            (video.description || '').toLowerCase().includes(search)
          )
        }

        scopedVideos.sort((a, b) => {
          if (sortOrder === 'popular') return b.view_count - a.view_count
          if (sortOrder === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

        const startIndex = reset ? 0 : videos.length
        const nextSlice = scopedVideos.slice(startIndex, startIndex + PAGE_SIZE)
        const mergedVideos = reset ? nextSlice : [...videos, ...nextSlice]

        setVideos(mergedVideos)

        const groupMap = new Map<string, FanVideoGroup>()
        mergedVideos.forEach((video) => {
          if (!groupMap.has(video.org_id)) {
            groupMap.set(video.org_id, {
              org_id: video.org_id,
              org_name: video.org_name || 'Organization',
              org_logo_url: video.org_logo_url || null,
              videos: [],
            })
          }
          groupMap.get(video.org_id)?.videos.push(video)
        })
        setGrouped(Array.from(groupMap.values()))

        setCursor(nextSlice[nextSlice.length - 1]?.created_at || null)
        setHasMore(startIndex + nextSlice.length < scopedVideos.length)
        return
      }

      // Get fan's followed entities
      const { data: follows, error: followsError } = await (supabase as any)
        .from('fan_follows')
        .select('org_id, team_id, athlete_id')
        .eq('follower_id', user.id)

      if (followsError) throw followsError

      const orgIds = [...new Set(follows?.filter((f: any) => f.org_id).map((f: any) => f.org_id) || [])]
      const teamIds = [...new Set(follows?.filter((f: any) => f.team_id).map((f: any) => f.team_id) || [])]
      const athleteIds = [...new Set(follows?.filter((f: any) => f.athlete_id).map((f: any) => f.athlete_id) || [])]

      if (orgIds.length === 0 && teamIds.length === 0 && athleteIds.length === 0) {
        setVideos([])
        setGrouped([])
        setHasMore(false)
        setLoading(false)
        setLoadingMore(false)
        loadingRef.current = false
        return
      }

      // Build query for fan-visible videos
      let query = (supabase as any)
        .from('videos')
        .select(`
          id,
          title,
          description,
          thumbnail_url,
          duration_seconds,
          created_at,
          org_id,
          team_id,
          category,
          view_count,
          mux_playback_id,
          organizations!inner(name, logo_url),
          teams(name),
          video_athlete_links(
            athletes(
              id,
              profiles(first_name, last_name, avatar_url)
            )
          )
        `)
        .eq('status', 'ready')
        .eq('fan_visible', true) // Only show videos marked visible to fans

      // Filter by followed orgs/teams
      if (selectedOrgId) {
        query = query.eq('org_id', selectedOrgId)
      } else {
        // Show videos from followed orgs or teams
        const conditions: string[] = []
        if (orgIds.length > 0) {
          conditions.push(`org_id.in.(${orgIds.join(',')})`)
        }
        if (teamIds.length > 0) {
          conditions.push(`team_id.in.(${teamIds.join(',')})`)
        }
        if (conditions.length > 0) {
          query = query.or(conditions.join(','))
        }
      }

      // Search filter
      if (searchQuery) {
        query = query.ilike('title', `%${searchQuery}%`)
      }

      // Sorting
      switch (sortOrder) {
        case 'oldest':
          query = query.order('created_at', { ascending: true })
          break
        case 'popular':
          query = query.order('view_count', { ascending: false })
          break
        default:
          query = query.order('created_at', { ascending: false })
      }

      // Pagination
      if (!reset && cursor) {
        query = query.lt('created_at', cursor)
      }
      query = query.limit(PAGE_SIZE)

      const { data, error } = await query

      if (!mountedRef.current) return
      if (error) throw error

      // Transform data
      const transformedVideos: FanVideo[] = ((data as any[]) || []).map((v: any) => ({
        id: v.id,
        title: v.title,
        description: v.description,
        thumbnail_url: v.thumbnail_url,
        duration_seconds: v.duration_seconds,
        created_at: v.created_at,
        org_id: v.org_id,
        team_id: v.team_id,
        category: v.category,
        view_count: v.view_count || 0,
        mux_playback_id: v.mux_playback_id,
        org_name: (v.organizations as Record<string, unknown>)?.name as string | undefined,
        org_logo_url: (v.organizations as Record<string, unknown>)?.logo_url as string | undefined,
        team_name: (v.teams as Record<string, unknown>)?.name as string | undefined,
        tagged_athletes:
          ((v.video_athlete_links as unknown[]) || [])
            .map((va: unknown) => {
              const videoAthlete = va as {
                athletes?: { id?: string; profiles?: { first_name?: string; last_name?: string; avatar_url?: string } }
              }
              const id = videoAthlete.athletes?.id
              if (!id) return null
              return {
                id,
                name: `${videoAthlete.athletes?.profiles?.first_name || ''} ${videoAthlete.athletes?.profiles?.last_name || ''}`.trim(),
                ...(videoAthlete.athletes?.profiles?.avatar_url
                  ? { avatar_url: videoAthlete.athletes.profiles.avatar_url }
                  : {}),
              }
            })
            .filter((a): a is { id: string; name: string; avatar_url?: string } => Boolean(a)) || [],
      }))

      if (reset) {
        setVideos(transformedVideos)
      } else {
        setVideos(prev => [...prev, ...transformedVideos])
      }

      // Group by org
      const groupMap = new Map<string, FanVideoGroup>()
      const allVideos = reset ? transformedVideos : [...videos, ...transformedVideos]
      
      allVideos.forEach(video => {
        if (!groupMap.has(video.org_id)) {
          groupMap.set(video.org_id, {
            org_id: video.org_id,
            org_name: video.org_name || 'Unknown',
            org_logo_url: video.org_logo_url || null,
            videos: []
          })
        }
        // Avoid duplicates
        const group = groupMap.get(video.org_id)!
        if (!group.videos.find(v => v.id === video.id)) {
          group.videos.push(video)
        }
      })
      
      setGrouped(Array.from(groupMap.values()))

      // Update pagination
      const lastVideo = transformedVideos[transformedVideos.length - 1]
      setCursor(lastVideo?.created_at || null)
      setHasMore(transformedVideos.length === PAGE_SIZE)

    } catch (err) {
      console.error('Error loading videos:', err)
      showError('Failed to load videos')
    } finally {
      setLoading(false)
      setLoadingMore(false)
      loadingRef.current = false
    }
  }, [user?.id, searchQuery, selectedOrgId, sortOrder, cursor, videos])

  // Initial load
  useEffect(() => {
    loadVideos(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, selectedOrgId, sortOrder])

  // Infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (loadingRef.current || !hasMore) return
      
      const scrolledToBottom = 
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 500

      if (scrolledToBottom) {
        loadVideos(false)
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, loadVideos])

  // Org filter options
  const orgOptions = useMemo(() => {
    return grouped.map(g => ({
      value: g.org_id,
      label: g.org_name
    }))
  }, [grouped])

  const handleVideoClick = (videoId: string) => {
    navigate(getLink(RouteKeys.FAN_VIDEO_DETAIL, { id: videoId }))
  }

  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const hasResults = videos.length > 0

  if (loading && videos.length === 0) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="fan-photos-page">
      {/* Page Header */}
      <div className="fan-photos-header">
        <div>
          <span className="fan-photos-label">{tAny('fan.photos.officialLabel')}</span>
          <h1 className="fan-photos-title">{t('videoLibrary.title')}</h1>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mobile-stack-controls mb-6 sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] max-w-md">
          <Icon 
            name="search" 
            size="text-lg" 
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
          />
          <input
            type="text"
            placeholder={t('common.search')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white focus:border-[var(--fan-primary)] focus:ring-2 focus:ring-[var(--fan-primary)]/20 outline-none transition-all"
          />
        </div>

        {/* Org Filter */}
        {orgOptions.length > 1 && (
          <select
            value={selectedOrgId || ''}
            onChange={(e) => setSelectedOrgId(e.target.value || null)}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 bg-white min-w-0 sm:min-w-[160px]"
          >
            <option value="">All Organizations</option>
            {orgOptions.map(org => (
              <option key={org.value} value={org.value}>{org.label}</option>
            ))}
          </select>
        )}

        {/* Sort */}
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'recent' | 'oldest' | 'popular')}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-gray-200 bg-white min-w-0 sm:min-w-[140px]"
        >
          <option value="recent">{t('common.mostRecent')}</option>
          <option value="oldest">{t('photos.filters.oldest')}</option>
          <option value="popular">{tAny('common.mostPopular')}</option>
        </select>
      </div>

      {/* Empty State */}
      {!hasResults && !loading ? (
        <div className="fan-photos-empty">
          <div className="fan-photos-empty-icon">
            <Icon name={searchQuery ? 'search_off' : 'videocam_off'} size="text-5xl" />
          </div>
          <h3 className="fan-photos-empty-title">
            {searchQuery ? t('photos.filters.noResults') : tAny('videoLibrary.noVideos')}
          </h3>
          <p className="fan-photos-empty-text">
            {searchQuery 
              ? t('emptyStates.tryAdjusting') 
              : 'Follow teams and athletes to see their videos here.'}
          </p>
        </div>
      ) : (
        /* Video Grid - Grouped by Org */
        <div className="space-y-8">
          {grouped.map((group) => (
            <div key={group.org_id} className="space-y-4">
              {/* Group Header */}
              {!selectedOrgId && (
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <span className="size-7 rounded-full bg-gray-100 border border-gray-200 overflow-hidden inline-flex items-center justify-center">
                      {group.org_logo_url ? (
                        <img src={group.org_logo_url} alt={group.org_name} className="w-full h-full object-cover" />
                      ) : (
                        <Icon name="business" size="text-base" className="text-gray-500" />
                      )}
                    </span>
                    {group.org_name}
                  </h2>
                  <button
                    onClick={() => setSelectedOrgId(group.org_id)}
                    className="text-sm font-medium text-[var(--fan-primary)] hover:underline"
                  >
                    {t('photos.browse.viewAll')}
                  </button>
                </div>
              )}

              {/* Video Cards Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {group.videos.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    onClick={() => handleVideoClick(video.id)}
                    formatDuration={formatDuration}
                    formatDate={formatDate}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Loading More Indicator */}
      {loadingMore && (
        <div className="fan-photos-load-more py-8">
          <LoadingSpinner size="small" />
        </div>
      )}

      {/* End of Results */}
      {!hasMore && hasResults && (
        <div className="text-center py-8 text-gray-500">
          {tAny('common.endOfResults')}
        </div>
      )}
    </div>
  )
}

/**
 * Video Card Component
 */
interface VideoCardProps {
  video: FanVideo
  onClick: () => void
  formatDuration: (seconds: number | null) => string
  formatDate: (dateStr: string) => string
}

function VideoCard({ video, onClick, formatDuration, formatDate }: VideoCardProps) {
  return (
    <div
      className="group cursor-pointer rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100 hover:shadow-lg transition-all duration-200"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gray-100 overflow-hidden">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-200">
            <Icon name="videocam" size="text-4xl" className="text-gray-400" />
          </div>
        )}

        {/* Duration Badge */}
        {video.duration_seconds && (
          <div className="absolute bottom-2 right-2 bg-black/75 text-white px-2 py-0.5 rounded text-xs font-mono">
            {formatDuration(video.duration_seconds)}
          </div>
        )}

        {/* Play Overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
          <div className="size-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
            <Icon name="play_arrow" size="text-3xl" className="text-gray-900 ml-1" />
          </div>
        </div>

        {/* Category Badge */}
        {video.category && (
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs font-medium capitalize">
            {video.category}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-[var(--fan-primary)] transition-colors">
          {video.title}
        </h3>

        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
          {video.team_name && (
            <>
              <span>{video.team_name}</span>
              <span>•</span>
            </>
          )}
          <span>{formatDate(video.created_at)}</span>
        </div>

        {/* View count */}
        {video.view_count > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
            <Icon name="visibility" size="text-sm" />
            <span>{video.view_count.toLocaleString()} views</span>
          </div>
        )}

        {/* Tagged Athletes */}
        {video.tagged_athletes && video.tagged_athletes.length > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-2">
              {video.tagged_athletes.slice(0, 3).map((athlete) => (
                <div
                  key={athlete.id}
                  className="size-6 rounded-full bg-gray-200 border-2 border-white overflow-hidden"
                  title={athlete.name}
                >
                  {athlete.avatar_url ? (
                    <img
                      src={athlete.avatar_url}
                      alt={athlete.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs font-bold text-gray-500">
                      {athlete.name.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {video.tagged_athletes.length > 3 && (
              <span className="text-xs text-gray-500">
                +{video.tagged_athletes.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
