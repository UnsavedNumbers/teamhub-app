/**
 * Extended Video Library Hooks
 * 
 * Additional hooks for video library features:
 * - Video sharing with expiration
 * - Video favorites (bookmarks)
 * - Full-text search
 * - Bulk operations
 * - Real-time status updates
 * 
 * NOTE: video_shares and video_favorites tables are created by migration
 * 20260410000020_video_library_features.sql. Run the migration and regenerate
 * types to remove type errors.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { Video } from '@/types/video'
import { useAuth } from './useAuth'

// Type assertion helper for new tables not yet in generated types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any

// ============================================================================
// Types
// ============================================================================

export interface VideoShare {
  id: string
  video_id: string
  org_id: string
  token: string
  created_by: string
  expires_at: string | null
  revoked_at: string | null
  allow_download: boolean
  email_recipients: string[] | null
  access_count: number
  last_accessed_at: string | null
  created_at: string
  updated_at: string
}

export interface VideoFavorite {
  id: string
  video_id: string
  user_id: string
  org_id: string
  created_at: string
}

export type ShareExpiration = '1h' | '24h' | '7d' | '30d' | 'never'

export interface CreateShareOptions {
  videoId: string
  orgId: string
  expiration: ShareExpiration
  allowDownload?: boolean
  emailRecipients?: string[]
}

export interface BulkOperationResult {
  succeeded: string[]
  failed: Array<{ id: string; error: string }>
}

export type SortOption = 
  | 'created_at_desc' 
  | 'created_at_asc'
  | 'most_viewed'
  | 'most_commented'
  | 'most_bookmarked'
  | 'recently_shared'
  | 'status_priority'

// ============================================================================
// Video Share Hooks
// ============================================================================

interface UseVideoSharesOptions {
  videoId?: string
  enabled?: boolean
}

interface UseVideoSharesReturn {
  shares: VideoShare[]
  isLoading: boolean
  error: Error | null
  createShare: (options: Omit<CreateShareOptions, 'videoId' | 'orgId'>) => Promise<VideoShare | null>
  revokeShare: (shareId: string) => Promise<boolean>
  refresh: () => Promise<void>
}

function generateSecureToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

function getExpirationDate(expiration: ShareExpiration): string | null {
  const now = new Date()
  switch (expiration) {
    case '1h':
      return new Date(now.getTime() + 60 * 60 * 1000).toISOString()
    case '24h':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
    case '7d':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    case '30d':
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
    case 'never':
      return null
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString()
  }
}

export function useVideoShares({ videoId, enabled = true }: UseVideoSharesOptions): UseVideoSharesReturn {
  const { user } = useAuth()
  const [shares, setShares] = useState<VideoShare[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchShares = useCallback(async () => {
    if (!videoId || !enabled) return

    setIsLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await db
        .from('video_shares')
        .select('*')
        .eq('video_id', videoId)
        .order('created_at', { ascending: false })

      if (fetchError) throw fetchError

      setShares((data || []) as VideoShare[])
    } catch (err) {
      console.error('Error fetching video shares:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch shares'))
    } finally {
      setIsLoading(false)
    }
  }, [videoId, enabled])

  useEffect(() => {
    fetchShares()
  }, [fetchShares])

  const createShare = useCallback(async (
    options: Omit<CreateShareOptions, 'videoId' | 'orgId'>
  ): Promise<VideoShare | null> => {
    if (!videoId || !user?.id) return null

    try {
      // Get org_id from the video
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('org_id')
        .eq('id', videoId)
        .single()

      if (videoError || !video) throw new Error('Video not found')

      const token = generateSecureToken()
      const expiresAt = getExpirationDate(options.expiration)

      const { data, error: createError } = await db
        .from('video_shares')
        .insert({
          video_id: videoId,
          org_id: video.org_id,
          token,
          created_by: user.id,
          expires_at: expiresAt,
          allow_download: options.allowDownload ?? false,
          email_recipients: options.emailRecipients ?? null,
        })
        .select()
        .single()

      if (createError) throw createError

      const newShare = data as VideoShare
      setShares(prev => [newShare, ...prev])
      return newShare
    } catch (err) {
      console.error('Error creating share:', err)
      return null
    }
  }, [videoId, user?.id])

  const revokeShare = useCallback(async (shareId: string): Promise<boolean> => {
    try {
      const { error: updateError } = await db
        .from('video_shares')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', shareId)

      if (updateError) throw updateError

      setShares(prev => prev.map(s => 
        s.id === shareId ? { ...s, revoked_at: new Date().toISOString() } : s
      ))
      return true
    } catch (err) {
      console.error('Error revoking share:', err)
      return false
    }
  }, [])

  return { shares, isLoading, error, createShare, revokeShare, refresh: fetchShares }
}

// ============================================================================
// Video Favorites Hook
// ============================================================================

interface UseVideoFavoritesOptions {
  orgId?: string
  enabled?: boolean
}

interface UseVideoFavoritesReturn {
  favorites: VideoFavorite[]
  favoriteVideoIds: Set<string>
  isLoading: boolean
  error: Error | null
  toggleFavorite: (videoId: string) => Promise<boolean>
  isFavorite: (videoId: string) => boolean
  refresh: () => Promise<void>
}

export function useVideoFavorites({ orgId, enabled = true }: UseVideoFavoritesOptions): UseVideoFavoritesReturn {
  const { user } = useAuth()
  const [favorites, setFavorites] = useState<VideoFavorite[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const favoriteVideoIds = useMemo(() => 
    new Set(favorites.map(f => f.video_id)),
    [favorites]
  )

  const fetchFavorites = useCallback(async () => {
    if (!user?.id || !enabled) return

    setIsLoading(true)
    setError(null)

    try {
      let query = db
        .from('video_favorites')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (orgId) {
        query = query.eq('org_id', orgId)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      setFavorites((data || []) as VideoFavorite[])
    } catch (err) {
      console.error('Error fetching favorites:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch favorites'))
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, orgId, enabled])

  useEffect(() => {
    fetchFavorites()
  }, [fetchFavorites])

  const toggleFavorite = useCallback(async (videoId: string): Promise<boolean> => {
    if (!user?.id) return false

    const isCurrentlyFavorite = favoriteVideoIds.has(videoId)

    try {
      if (isCurrentlyFavorite) {
        // Remove favorite
        const { error: deleteError } = await db
          .from('video_favorites')
          .delete()
          .eq('video_id', videoId)
          .eq('user_id', user.id)

        if (deleteError) throw deleteError

        setFavorites(prev => prev.filter(f => f.video_id !== videoId))
      } else {
        // Get video's org_id first
        const { data: video, error: videoError } = await supabase
          .from('videos')
          .select('org_id')
          .eq('id', videoId)
          .single()

        if (videoError || !video) throw new Error('Video not found')

        // Add favorite
        const { data, error: insertError } = await db
          .from('video_favorites')
          .insert({
            video_id: videoId,
            user_id: user.id,
            org_id: video.org_id,
          })
          .select()
          .single()

        if (insertError) throw insertError

        setFavorites(prev => [data as VideoFavorite, ...prev])
      }

      return true
    } catch (err) {
      console.error('Error toggling favorite:', err)
      return false
    }
  }, [user?.id, favoriteVideoIds])

  const isFavorite = useCallback((videoId: string) => {
    return favoriteVideoIds.has(videoId)
  }, [favoriteVideoIds])

  return { 
    favorites, 
    favoriteVideoIds, 
    isLoading, 
    error, 
    toggleFavorite, 
    isFavorite, 
    refresh: fetchFavorites 
  }
}

// ============================================================================
// Full-Text Search Hook
// ============================================================================

type VideoFilters = Record<string, any>

interface UseVideoSearchOptions {
  orgId?: string
  query?: string
  filters?: VideoFilters
  limit?: number
  enabled?: boolean
}

interface UseVideoSearchReturn {
  videos: Video[]
  total: number
  isLoading: boolean
  error: Error | null
  search: (query: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useVideoSearch({ 
  orgId, 
  query: initialQuery = '', 
  filters = {},
  limit = 20,
  enabled = true 
}: UseVideoSearchOptions): UseVideoSearchReturn {
  const [videos, setVideos] = useState<Video[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [currentQuery, setCurrentQuery] = useState(initialQuery)

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!orgId || !enabled) return

    setIsLoading(true)
    setError(null)
    setCurrentQuery(searchQuery)

    try {
      let query = supabase
        .from('videos')
        .select(`
          *,
          team:teams!videos_team_id_fkey(id, name),
          video_tag_links(id, tag_id, tag:video_tags(id, name, tag_type, color))
        `, { count: 'exact' })
        .eq('org_id', orgId)
        .neq('status', 'deleted')

      // Full-text search if query provided
      if (searchQuery.trim()) {
        // Use plainto_tsquery for user input
        query = query.textSearch('search_vector', searchQuery.trim(), {
          type: 'websearch',
          config: 'english'
        })
      }

      // Apply filters
      if (filters.category) {
        const categories = Array.isArray(filters.category) ? filters.category : [filters.category]
        query = query.in('category', categories)
      }

      if (filters.team_id) {
        query = query.eq('team_id', filters.team_id)
      }

      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
        query = query.in('status', statuses)
      }

      if (filters.date_from) {
        query = query.gte('recorded_at', filters.date_from)
      }

      if (filters.date_to) {
        query = query.lte('recorded_at', filters.date_to)
      }

      // Note: Tag filtering requires video_tag_links table
      // For now, tag filtering should be done via the main videos hook
      // which already supports tag filtering through video_tags join

      query = query
        .order('created_at', { ascending: false })
        .limit(limit)

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      setVideos((data || []) as unknown as Video[])
      setTotal(count || 0)
    } catch (err) {
      console.error('Error searching videos:', err)
      setError(err instanceof Error ? err : new Error('Failed to search videos'))
    } finally {
      setIsLoading(false)
    }
  }, [orgId, filters, limit, enabled])

  useEffect(() => {
    performSearch(currentQuery)
  }, [performSearch, currentQuery])

  const search = useCallback(async (query: string) => {
    await performSearch(query)
  }, [performSearch])

  return { 
    videos, 
    total, 
    isLoading, 
    error, 
    search, 
    refresh: () => performSearch(currentQuery) 
  }
}

// ============================================================================
// Bulk Operations Hook
// ============================================================================

interface UseBulkVideoOperationsOptions {
  orgId?: string
}

interface UseBulkVideoOperationsReturn {
  isProcessing: boolean
  progress: { current: number; total: number }
  bulkDelete: (videoIds: string[]) => Promise<BulkOperationResult>
  bulkAddTags: (videoIds: string[], tagIds: string[]) => Promise<BulkOperationResult>
  bulkRemoveTags: (videoIds: string[], tagIds: string[]) => Promise<BulkOperationResult>
  bulkMove: (videoIds: string[], teamId: string | null) => Promise<BulkOperationResult>
}

export function useBulkVideoOperations({ orgId: _orgId }: UseBulkVideoOperationsOptions): UseBulkVideoOperationsReturn {
  const { user } = useAuth()
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })

  const bulkDelete = useCallback(async (videoIds: string[]): Promise<BulkOperationResult> => {
    if (!user?.id) return { succeeded: [], failed: videoIds.map(id => ({ id, error: 'Not authenticated' })) }

    setIsProcessing(true)
    setProgress({ current: 0, total: videoIds.length })

    const result: BulkOperationResult = { succeeded: [], failed: [] }

    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i]
      try {
        const { error } = await supabase
          .from('videos')
          .update({ 
            status: 'deleted',
            deleted_at: new Date().toISOString(),
          })
          .eq('id', videoId)

        if (error) throw error

        result.succeeded.push(videoId)
      } catch (err) {
        result.failed.push({ 
          id: videoId, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        })
      }

      setProgress({ current: i + 1, total: videoIds.length })
    }

    setIsProcessing(false)
    return result
  }, [user?.id])

  const bulkAddTags = useCallback(async (videoIds: string[], tagIds: string[]): Promise<BulkOperationResult> => {
    if (!user?.id) return { succeeded: [], failed: videoIds.map(id => ({ id, error: 'Not authenticated' })) }

    setIsProcessing(true)
    setProgress({ current: 0, total: videoIds.length })

    const result: BulkOperationResult = { succeeded: [], failed: [] }

    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i]
      try {
        // Insert all tags for this video
        const { error } = await supabase
          .from('video_tag_links')
          .upsert(
            tagIds.map(tagId => ({
              video_id: videoId,
              tag_id: tagId,
              created_by: user.id,
            })),
            { onConflict: 'video_id,tag_id' }
          )

        if (error) throw error

        result.succeeded.push(videoId)
      } catch (err) {
        result.failed.push({ 
          id: videoId, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        })
      }

      setProgress({ current: i + 1, total: videoIds.length })
    }

    setIsProcessing(false)
    return result
  }, [user?.id])

  const bulkRemoveTags = useCallback(async (videoIds: string[], tagIds: string[]): Promise<BulkOperationResult> => {
    if (!user?.id) return { succeeded: [], failed: videoIds.map(id => ({ id, error: 'Not authenticated' })) }

    setIsProcessing(true)
    setProgress({ current: 0, total: videoIds.length })

    const result: BulkOperationResult = { succeeded: [], failed: [] }

    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i]
      try {
        const { error } = await supabase
          .from('video_tag_links')
          .delete()
          .eq('video_id', videoId)
          .in('tag_id', tagIds)

        if (error) throw error

        result.succeeded.push(videoId)
      } catch (err) {
        result.failed.push({ 
          id: videoId, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        })
      }

      setProgress({ current: i + 1, total: videoIds.length })
    }

    setIsProcessing(false)
    return result
  }, [user?.id])

  const bulkMove = useCallback(async (videoIds: string[], teamId: string | null): Promise<BulkOperationResult> => {
    if (!user?.id) return { succeeded: [], failed: videoIds.map(id => ({ id, error: 'Not authenticated' })) }

    setIsProcessing(true)
    setProgress({ current: 0, total: videoIds.length })

    const result: BulkOperationResult = { succeeded: [], failed: [] }

    for (let i = 0; i < videoIds.length; i++) {
      const videoId = videoIds[i]
      try {
        const { error } = await supabase
          .from('videos')
          .update({ team_id: teamId })
          .eq('id', videoId)

        if (error) throw error

        result.succeeded.push(videoId)
      } catch (err) {
        result.failed.push({ 
          id: videoId, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        })
      }

      setProgress({ current: i + 1, total: videoIds.length })
    }

    setIsProcessing(false)
    return result
  }, [user?.id])

  return { isProcessing, progress, bulkDelete, bulkAddTags, bulkRemoveTags, bulkMove }
}

// ============================================================================
// Real-Time Video Status Hook
// ============================================================================

interface UseVideoStatusRealtimeOptions {
  videoId?: string
  enabled?: boolean
}

interface UseVideoStatusRealtimeReturn {
  status: string | null
  thumbnailUrl: string | null
  isSubscribed: boolean
}

export function useVideoStatusRealtime({ videoId, enabled = true }: UseVideoStatusRealtimeOptions): UseVideoStatusRealtimeReturn {
  const [status, setStatus] = useState<string | null>(null)
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!videoId || !enabled) {
      setIsSubscribed(false)
      return
    }

    // Subscribe to video status changes
    channelRef.current = supabase
      .channel(`video-status-${videoId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'videos',
        filter: `id=eq.${videoId}`,
      }, (payload) => {
        const newData = payload.new as { status?: string; thumbnail_url?: string }
        if (newData.status) {
          setStatus(newData.status)
        }
        if (newData.thumbnail_url) {
          setThumbnailUrl(newData.thumbnail_url)
        }
      })
      .subscribe((status) => {
        setIsSubscribed(status === 'SUBSCRIBED')
      })

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setIsSubscribed(false)
    }
  }, [videoId, enabled])

  return { status, thumbnailUrl, isSubscribed }
}

// ============================================================================
// Download URL Hook
// ============================================================================

interface UseVideoDownloadOptions {
  videoId?: string
}

interface UseVideoDownloadReturn {
  getDownloadUrl: () => Promise<string | null>
  isLoading: boolean
  error: Error | null
}

export function useVideoDownload({ videoId }: UseVideoDownloadOptions): UseVideoDownloadReturn {
  const { session } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const getDownloadUrl = useCallback(async (): Promise<string | null> => {
    if (!videoId || !session?.access_token) {
      setError(new Error('Not authenticated or no video specified'))
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // Get the Mux playback ID
      const { data: video, error: videoError } = await supabase
        .from('videos')
        .select('mux_playback_id, title')
        .eq('id', videoId)
        .single()

      if (videoError || !video?.mux_playback_id) {
        throw new Error('Video not found or not ready for download')
      }

      // Get a signed playback token for download
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const response = await fetch(`${supabaseUrl}/functions/v1/mux-signed-playback`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          video_id: videoId,
          type: 'video',
          expiration: 300, // 5 minutes
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get download URL')
      }

      const data = await response.json()
      return data.stream_url || null
    } catch (err) {
      console.error('Error getting download URL:', err)
      setError(err instanceof Error ? err : new Error('Failed to get download URL'))
      return null
    } finally {
      setIsLoading(false)
    }
  }, [videoId, session?.access_token])

  return { getDownloadUrl, isLoading, error }
}
