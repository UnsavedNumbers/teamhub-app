/**
 * Video Library Hooks
 * 
 * React hooks for video data access, upload management, and playback.
 * Uses Supabase for data persistence and Mux Edge Functions for video operations.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type {
  Video,
  VideoFilters,
  VideoPagination,
  VideoTag,
  VideoNote,
  VideoBookmark,
  VideoComment,
  CreateVideoUploadRequest,
  CreateVideoUploadResponse,
  GetPlaybackTokenResponse,
  UploadProgress,
  VideoNoteScope,
  VideoLinkType,
} from '@/types/video'
import type { Database, Json } from '@/lib/supabase.extended.types'
import { useAuth } from './useAuth'
import { DEMO_ORG_A_ID, USE_FAKE_DATA } from '@/data/config'
import { getMockVideosForOrg, getMockVideoById } from '@/data/fake/mockVideos'
import {
  createMockVideoBookmark,
  createMockVideoComment,
  createMockVideoNote,
  deleteMockVideoBookmark,
  deleteMockVideoComment,
  deleteMockVideoNote,
  getMockVideoAthleteLinks,
  getMockVideoBookmarks,
  getMockVideoComments,
  getMockVideoInteractionCounts,
  getMockVideoNotes,
  updateMockVideoBookmark,
  updateMockVideoComment,
  updateMockVideoNote,
} from '@/data/fake/mockVideoInteractions'

// ============================================================================
// Edge Function URL Configuration
// ============================================================================

const getEdgeFunctionUrl = (functionName: string): string => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('VITE_SUPABASE_URL not configured')
  }
  return `${supabaseUrl}/functions/v1/${functionName}`
}

const TOKEN_REFRESH_SKEW_SECONDS = 30
const DEFAULT_THUMBNAIL_TOKEN_EXPIRATION = 7200

type ViewerRole = 'parent' | 'athlete' | 'coach' | 'org_admin' | 'staff'

function getViewerRoles(profile: { organizations?: Array<{ roles?: string[] }> } | null): ViewerRole[] {
  const next = new Set<ViewerRole>()
  const orgs = profile?.organizations ?? []
  for (const org of orgs) {
    const roles = org.roles ?? []
    for (const role of roles) {
      if (role === 'parent' || role === 'athlete' || role === 'coach' || role === 'org_admin' || role === 'staff') {
        next.add(role)
      }
    }
  }
  return Array.from(next)
}

async function getFreshAccessToken(preferredToken?: string): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const now = Math.floor(Date.now() / 1000)
    const expiresSoon = !!session?.expires_at && session.expires_at <= (now + TOKEN_REFRESH_SKEW_SECONDS)

    if (expiresSoon) {
      const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
      if (!refreshError && refreshed.session?.access_token) {
        return refreshed.session.access_token
      }
    }

    return session?.access_token || preferredToken || null
  } catch {
    return preferredToken || null
  }
}

async function callMuxSignedPlayback(
  payload: Record<string, unknown>,
  preferredToken?: string
): Promise<Response | null> {
  const sendRequest = async (token: string): Promise<Response> =>
    fetch(getEdgeFunctionUrl('mux-signed-playback'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

  const accessToken = await getFreshAccessToken(preferredToken)
  if (!accessToken) return null

  let response = await sendRequest(accessToken)
  if (response.status !== 401) return response

  const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
  const refreshedToken = !refreshError ? refreshed.session?.access_token : null
  if (!refreshedToken || refreshedToken === accessToken) return response

  response = await sendRequest(refreshedToken)
  return response
}

/**
 * Fetches a signed thumbnail URL from the mux-signed-playback edge function.
 * Database thumbnail_url is unsigned; Mux requires a signed token for image access.
 */
async function getSignedThumbnailUrl(
  accessToken: string,
  options: { video_id: string } | { playback_id: string },
  expiration = DEFAULT_THUMBNAIL_TOKEN_EXPIRATION
): Promise<string | null> {
  try {
    const response = await callMuxSignedPlayback({
      ...options,
      type: 'thumbnail',
      expiration,
    }, accessToken)
    if (!response || !response.ok) return null
    const data: GetPlaybackTokenResponse = await response.json()
    return data.thumbnail_url ?? null
  } catch {
    return null
  }
}

// ============================================================================
// Video List Hook
// ============================================================================

interface UseVideosOptions {
  orgId?: string
  filters?: VideoFilters
  pagination?: VideoPagination
  enabled?: boolean
}

interface UseVideosReturn {
  videos: Video[]
  total: number
  isLoading: boolean
  error: Error | null
  hasMore: boolean
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
}

export function useVideos(options: UseVideosOptions = {}): UseVideosReturn {
  const { orgId, filters = {}, pagination = {}, enabled = true } = options
  const { user } = useAuth()
  const [videos, setVideos] = useState<Video[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [page, setPage] = useState(pagination.page || 1)
  
  const limit = pagination.limit || 20
  const sortBy = pagination.sort_by || 'created_at'
  const sortOrder = pagination.sort_order || 'desc'
  
  const fetchVideos = useCallback(async (isLoadMore = false) => {
    if (!orgId || !enabled) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Fake data mode: use mock videos
      if (USE_FAKE_DATA) {
        await new Promise(resolve => setTimeout(resolve, 300)) // Simulate delay
        
        let mockVideos = getMockVideosForOrg(orgId).map((video) => {
          const counts = getMockVideoInteractionCounts(video.id, user?.id)
          return {
            ...video,
            athlete_links: getMockVideoAthleteLinks(video.id),
            notes_count: counts.notes,
            comments_count: counts.comments,
            bookmarks_count: counts.bookmarks,
          } as Video
        })
        
        // Apply filters
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          mockVideos = mockVideos.filter(v => 
            v.title.toLowerCase().includes(searchLower) ||
            (v.description?.toLowerCase().includes(searchLower) ?? false)
          )
        }
        
        if (filters.category) {
          const categories = Array.isArray(filters.category) ? filters.category : [filters.category]
          mockVideos = mockVideos.filter(v => categories.includes(v.category))
        }
        
        if (filters.visibility) {
          const visibilities = Array.isArray(filters.visibility) ? filters.visibility : [filters.visibility]
          mockVideos = mockVideos.filter(v => visibilities.includes(v.visibility))
        }
        
        if (filters.status) {
          const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
          mockVideos = mockVideos.filter(v => statuses.includes(v.status))
        }
        
        if (filters.team_id) {
          mockVideos = mockVideos.filter(v => v.team_id === filters.team_id)
        }
        
        if (filters.event_id) {
          mockVideos = mockVideos.filter(v => v.event_id === filters.event_id)
        }
        
        if (filters.date_from) {
          mockVideos = mockVideos.filter(v => v.recorded_at && v.recorded_at >= filters.date_from!)
        }
        
        if (filters.date_to) {
          mockVideos = mockVideos.filter(v => v.recorded_at && v.recorded_at <= filters.date_to!)
        }
        
        // Apply sorting
        mockVideos.sort((a, b) => {
          let aVal: string | number, bVal: string | number
          switch (sortBy) {
            case 'title':
              aVal = a.title.toLowerCase()
              bVal = b.title.toLowerCase()
              break
            case 'duration_seconds':
              aVal = a.duration_seconds ?? 0
              bVal = b.duration_seconds ?? 0
              break
            case 'recorded_at':
              aVal = new Date(a.recorded_at || a.created_at).getTime()
              bVal = new Date(b.recorded_at || b.created_at).getTime()
              break
            case 'created_at':
            default:
              aVal = new Date(a.created_at).getTime()
              bVal = new Date(b.created_at).getTime()
              break
          }
          
          if (sortOrder === 'asc') {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0
          } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0
          }
        })
        
        // Apply pagination
        const currentPage = isLoadMore ? page + 1 : 1
        const offset = (currentPage - 1) * limit
        const paginatedVideos = mockVideos.slice(offset, offset + limit)
        
        if (isLoadMore) {
          setVideos(prev => [...prev, ...paginatedVideos])
          setPage(currentPage)
        } else {
          setVideos(paginatedVideos)
          setPage(1)
        }
        
        setTotal(mockVideos.length)
        setIsLoading(false)
        return
      }
      
      // Real data mode
      let query = supabase
        .from('videos')
        .select(`
          *,
          team:teams!videos_team_id_fkey(id, name),
          event:events!videos_event_id_fkey(id, title, type),
          video_athlete_links(id, athlete_id, link_type),
          video_tag_links(id, tag_id, tag:video_tags(id, name, tag_type, color))
        `, { count: 'exact' })
        .eq('org_id', orgId)
        .neq('status', 'deleted')
      
      // Apply filters
      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }
      
      if (filters.category) {
        const categories = Array.isArray(filters.category) ? filters.category : [filters.category]
        query = query.in('category', categories)
      }
      
      if (filters.visibility) {
        const visibilities = Array.isArray(filters.visibility) ? filters.visibility : [filters.visibility]
        query = query.in('visibility', visibilities)
      }
      
      if (filters.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status]
        query = query.in('status', statuses)
      }
      
      if (filters.team_id) {
        query = query.eq('team_id', filters.team_id)
      }
      
      if (filters.season_id) {
        query = query.eq('season_id', filters.season_id)
      }
      
      if (filters.event_id) {
        query = query.eq('event_id', filters.event_id)
      }
      
      if (filters.sport_id) {
        query = query.eq('sport_id', filters.sport_id)
      }
      
      if (filters.uploaded_by) {
        query = query.eq('uploaded_by', filters.uploaded_by)
      }
      
      if (filters.date_from) {
        query = query.gte('recorded_at', filters.date_from)
      }
      
      if (filters.date_to) {
        query = query.lte('recorded_at', filters.date_to)
      }
      
      // Apply sorting
      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
      
      // Apply pagination
      const currentPage = isLoadMore ? page + 1 : 1
      const offset = (currentPage - 1) * limit
      query = query.range(offset, offset + limit - 1)
      
      const { data, error: fetchError, count } = await query
      
      if (fetchError) throw fetchError
      
      let fetchedVideos = (data || []) as unknown as Video[]
      
      // Attach signed thumbnail URLs: DB thumbnail_url has no token; Mux requires signed URLs.
      const accessToken = await getFreshAccessToken()
      if (accessToken) {
        const withSignedThumbnails = await Promise.all(
          fetchedVideos.map(async (video): Promise<Video> => {
            if (!video.mux_playback_id) return video
            const signedUrl = await getSignedThumbnailUrl(accessToken, { video_id: video.id })
            return signedUrl ? { ...video, thumbnail_url: signedUrl } : video
          })
        )
        fetchedVideos = withSignedThumbnails
      }
      
      if (isLoadMore) {
        setVideos(prev => [...prev, ...fetchedVideos])
        setPage(currentPage)
      } else {
        setVideos(fetchedVideos)
        setPage(1)
      }
      
      setTotal(count || 0)
    } catch (err) {
      console.error('Error fetching videos:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch videos'))
    } finally {
      setIsLoading(false)
    }
  }, [orgId, JSON.stringify(filters), limit, sortBy, sortOrder, page, enabled, user?.id])
  
  useEffect(() => {
    fetchVideos(false)
  }, [fetchVideos])
  
  const refresh = useCallback(() => fetchVideos(false), [fetchVideos])
  const loadMore = useCallback(() => fetchVideos(true), [fetchVideos])
  
  const hasMore = useMemo(() => videos.length < total, [videos.length, total])
  
  return { videos, total, isLoading, error, hasMore, refresh, loadMore }
}

// ============================================================================
// Portal Video Library Hook (Guardian / Athlete)
// ============================================================================
// Same as useVideos but scoped to status = 'ready' only. RLS (can_view_video)
// restricts rows to what the current user (guardian/athlete) can see.
// Use for /portal/videos list and detail.

interface UsePortalVideoLibraryOptions {
  orgId?: string
  filters?: VideoFilters
  pagination?: VideoPagination
  enabled?: boolean
}

interface UsePortalVideoLibraryReturn {
  videos: Video[]
  total: number
  isLoading: boolean
  error: Error | null
  hasMore: boolean
  refresh: () => Promise<void>
  loadMore: () => Promise<void>
}

export function usePortalVideoLibrary(options: UsePortalVideoLibraryOptions = {}): UsePortalVideoLibraryReturn {
  const { orgId, filters = {}, pagination = {}, enabled = true } = options
  const { user } = useAuth()
  const [videos, setVideos] = useState<Video[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [page, setPage] = useState(pagination.page || 1)

  const limit = pagination.limit || 20
  const sortBy = pagination.sort_by || 'recorded_at'
  const sortOrder = pagination.sort_order || 'desc'

  const fetchVideos = useCallback(async (isLoadMore = false) => {
    if (!orgId || !enabled) return

    setIsLoading(true)
    setError(null)

    try {
      // Fake data mode: use mock videos (only ready status)
      if (USE_FAKE_DATA) {
        await new Promise(resolve => setTimeout(resolve, 300)) // Simulate delay
        
        let mockVideos = getMockVideosForOrg(orgId)
          .filter(v => v.status === 'ready')
          .map((video) => {
            const counts = getMockVideoInteractionCounts(video.id, user?.id)
            return {
              ...video,
              athlete_links: getMockVideoAthleteLinks(video.id),
              notes_count: counts.notes,
              comments_count: counts.comments,
              bookmarks_count: counts.bookmarks,
            } as Video
          })
        
        // Apply filters
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          mockVideos = mockVideos.filter(v => 
            v.title.toLowerCase().includes(searchLower) ||
            (v.description?.toLowerCase().includes(searchLower) ?? false)
          )
        }
        
        if (filters.team_id) {
          mockVideos = mockVideos.filter(v => v.team_id === filters.team_id)
        }
        
        if (filters.date_from) {
          mockVideos = mockVideos.filter(v => v.recorded_at && v.recorded_at >= filters.date_from!)
        }
        
        if (filters.date_to) {
          mockVideos = mockVideos.filter(v => v.recorded_at && v.recorded_at <= filters.date_to!)
        }
        
        // Apply sorting
        mockVideos.sort((a, b) => {
          const aVal = new Date(a.recorded_at || a.created_at).getTime()
          const bVal = new Date(b.recorded_at || b.created_at).getTime()
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal
        })
        
        // Apply pagination
        const currentPage = isLoadMore ? page + 1 : 1
        const offset = (currentPage - 1) * limit
        const paginatedVideos = mockVideos.slice(offset, offset + limit)
        
        if (isLoadMore) {
          setVideos((prev) => [...prev, ...paginatedVideos])
          setPage(currentPage)
        } else {
          setVideos(paginatedVideos)
          setPage(1)
        }
        setTotal(mockVideos.length)
        setIsLoading(false)
        return
      }
      
      // Real data mode
      let query = supabase
        .from('videos')
        .select(
          `
          *,
          team:teams!videos_team_id_fkey(id, name),
          event:events!videos_event_id_fkey(id, title, type),
          video_athlete_links(id, athlete_id, link_type),
          video_tag_links(id, tag_id, tag:video_tags(id, name, tag_type, color))
        `,
          { count: 'exact' }
        )
        .eq('org_id', orgId)
        .eq('status', 'ready')

      if (filters.search) {
        query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`)
      }
      if (filters.team_id) {
        query = query.eq('team_id', filters.team_id)
      }
      if (filters.date_from) {
        query = query.gte('recorded_at', filters.date_from)
      }
      if (filters.date_to) {
        query = query.lte('recorded_at', filters.date_to)
      }

      query = query.order(sortBy, { ascending: sortOrder === 'asc' })
      const currentPage = isLoadMore ? page + 1 : 1
      const offset = (currentPage - 1) * limit
      query = query.range(offset, offset + limit - 1)

      const { data, error: fetchError, count } = await query

      if (fetchError) throw fetchError

      let fetchedVideos = (data || []) as unknown as Video[]
      const accessToken = await getFreshAccessToken()
      if (accessToken) {
        const withSignedThumbnails = await Promise.all(
          fetchedVideos.map(async (video): Promise<Video> => {
            if (!video.mux_playback_id) return video
            const signedUrl = await getSignedThumbnailUrl(accessToken, { video_id: video.id })
            return signedUrl ? { ...video, thumbnail_url: signedUrl } : video
          })
        )
        fetchedVideos = withSignedThumbnails
      }

      if (isLoadMore) {
        setVideos((prev) => [...prev, ...fetchedVideos])
        setPage(currentPage)
      } else {
        setVideos(fetchedVideos)
        setPage(1)
      }
      setTotal(count || 0)
    } catch (err) {
      console.error('Error fetching portal videos:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch videos'))
    } finally {
      setIsLoading(false)
    }
  }, [orgId, JSON.stringify(filters), limit, sortBy, sortOrder, page, enabled, user?.id])

  useEffect(() => {
    fetchVideos(false)
  }, [fetchVideos])

  const refresh = useCallback(() => fetchVideos(false), [fetchVideos])
  const loadMore = useCallback(() => fetchVideos(true), [fetchVideos])
  const hasMore = useMemo(() => videos.length < total, [videos.length, total])

  return { videos, total, isLoading, error, hasMore, refresh, loadMore }
}

// ============================================================================
// Single Video Hook
// ============================================================================

interface UseVideoOptions {
  videoId?: string
  enabled?: boolean
}

interface UseVideoReturn {
  video: Video | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useVideo({ videoId, enabled = true }: UseVideoOptions): UseVideoReturn {
  const { user } = useAuth()
  const [video, setVideo] = useState<Video | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchVideo = useCallback(async () => {
    if (!videoId || !enabled) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      // Fake data mode: use mock video
      if (USE_FAKE_DATA) {
        await new Promise(resolve => setTimeout(resolve, 300)) // Simulate delay
        
        const mockVideo = getMockVideoById(videoId)
        if (mockVideo) {
          const counts = getMockVideoInteractionCounts(mockVideo.id, user?.id)
          setVideo({
            ...mockVideo,
            athlete_links: getMockVideoAthleteLinks(mockVideo.id),
            notes_count: counts.notes,
            comments_count: counts.comments,
            bookmarks_count: counts.bookmarks,
          } as Video)
        } else {
          setError(new Error('Video not found'))
        }
        setIsLoading(false)
        return
      }
      
      // Real data mode
      const { data, error: fetchError } = await supabase
        .from('videos')
        .select(`
          *,
          team:teams!videos_team_id_fkey(id, name),
          event:events!videos_event_id_fkey(id, title, type),
          uploader:users!videos_uploaded_by_fkey(id, display_name, first_name, last_name),
          video_athlete_links(
            id, athlete_id, link_type, start_time_seconds, end_time_seconds,
            athlete:athletes(id, first_name, last_name, jersey_number, has_profile_photo, profile_photo_updated_at)
          ),
          video_tag_links(
            id, tag_id,
            tag:video_tags(id, name, tag_type, color)
          ),
          video_notes(
            id, content, timestamp_seconds, duration_seconds, scope, author_id, created_at,
            video_note_targets(id, athlete_id, athlete:athletes(id, first_name, last_name))
          ),
          video_comments(
            id, content, timestamp_seconds, parent_comment_id, author_id, created_at
          )
        `)
        .eq('id', videoId)
        .neq('status', 'deleted')
        .single()
      
      if (fetchError) throw fetchError
      
      const raw = data as Record<string, unknown>
      const videoData: Video = {
        ...raw,
        athlete_links: (raw.video_athlete_links as Video['athlete_links']) ?? [],
        tags: (raw.video_tag_links as Video['tags']) ?? [],
      } as Video
      delete (videoData as unknown as Record<string, unknown>).video_athlete_links
      delete (videoData as unknown as Record<string, unknown>).video_tag_links

      let result: Video = videoData
      if (result.mux_playback_id) {
        const accessToken = await getFreshAccessToken()
        if (accessToken) {
          const signedUrl = await getSignedThumbnailUrl(accessToken, { video_id: result.id })
          if (signedUrl) result = { ...result, thumbnail_url: signedUrl }
        }
      }
      setVideo(result)
    } catch (err) {
      console.error('Error fetching video:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch video'))
    } finally {
      setIsLoading(false)
    }
  }, [videoId, enabled, user?.id])
  
  useEffect(() => {
    fetchVideo()
  }, [fetchVideo])
  
  return { video, isLoading, error, refresh: fetchVideo }
}

// ============================================================================
// Video Upload Hook
// ============================================================================

interface UseVideoUploadOptions {
  orgId: string
  onUploadComplete?: (videoId: string) => void
  onUploadError?: (error: Error) => void
}

interface UseVideoUploadReturn {
  createUpload: (metadata: CreateVideoUploadRequest) => Promise<CreateVideoUploadResponse | null>
  uploadProgress: UploadProgress | null
  isUploading: boolean
  error: Error | null
  reset: () => void
}

export function useVideoUpload(options: UseVideoUploadOptions): UseVideoUploadReturn {
  const { orgId, onUploadComplete, onUploadError } = options
  const { session } = useAuth()
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  
  const createUpload = useCallback(async (
    metadata: CreateVideoUploadRequest
  ): Promise<CreateVideoUploadResponse | null> => {
    if (!session?.access_token) {
      const err = new Error('Not authenticated')
      setError(err)
      onUploadError?.(err)
      return null
    }
    
    setIsUploading(true)
    setError(null)
    
    try {
      const response = await fetch(getEdgeFunctionUrl('mux-create-direct-upload'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          org_id: orgId,
          ...metadata,
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create upload')
      }
      
      const data: CreateVideoUploadResponse = await response.json()
      
      // Initialize upload progress
      setUploadProgress({
        videoId: data.video_id,
        uploadId: data.upload_id,
        status: 'pending',
        progress: 0,
        bytesUploaded: 0,
        totalBytes: 0,
        startedAt: new Date().toISOString(),
      })
      
      // Subscribe to video status changes via realtime
      subscriptionRef.current = supabase
        .channel(`video-status-${data.video_id}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'videos',
          filter: `id=eq.${data.video_id}`,
        }, (payload) => {
          const newStatus = payload.new.status
          
          setUploadProgress(prev => {
            if (!prev) return prev
            
            if (newStatus === 'processing') {
              return { ...prev, status: 'processing', progress: 100 }
            }
            if (newStatus === 'ready') {
              onUploadComplete?.(data.video_id)
              return { 
                ...prev, 
                status: 'complete', 
                progress: 100,
                completedAt: new Date().toISOString(),
              }
            }
            if (newStatus === 'errored') {
              const err = new Error(payload.new.error_message || 'Processing failed')
              onUploadError?.(err)
              return { ...prev, status: 'error', error: err.message }
            }
            
            return prev
          })
        })
        .subscribe()
      
      return data
    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error('Upload failed')
      setError(uploadError)
      onUploadError?.(uploadError)
      setIsUploading(false)
      return null
    }
  }, [orgId, session, onUploadComplete, onUploadError])
  
  const reset = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current)
      subscriptionRef.current = null
    }
    setUploadProgress(null)
    setIsUploading(false)
    setError(null)
  }, [])
  
  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current)
      }
    }
  }, [])
  
  return { createUpload, uploadProgress, isUploading, error, reset }
}

// ============================================================================
// Video Playback Token Hook
// ============================================================================

interface UsePlaybackTokenOptions {
  videoId?: string
  playbackId?: string
  type?: 'video' | 'thumbnail' | 'gif' | 'storyboard'
  expiration?: number
  enabled?: boolean
}

interface UsePlaybackTokenReturn {
  playbackData: GetPlaybackTokenResponse | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function usePlaybackToken(options: UsePlaybackTokenOptions): UsePlaybackTokenReturn {
  const { videoId, playbackId, type = 'video', expiration = 7200, enabled = true } = options
  const { session } = useAuth()
  const [playbackData, setPlaybackData] = useState<GetPlaybackTokenResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchToken = useCallback(async () => {
    if ((!videoId && !playbackId) || !enabled) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      if (USE_FAKE_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 80))
        const mockVideo = videoId ? getMockVideoById(videoId) : undefined
        const localStream = (mockVideo as (Video & { video_url?: string | null }) | undefined)?.video_url

        if (!localStream) {
          throw new Error('Video not available')
        }

        setPlaybackData({
          playback_id: `local-${mockVideo?.id ?? playbackId ?? 'video'}`,
          stream_url: localStream,
          thumbnail_url: mockVideo?.thumbnail_url || '/demo-assets/photos/tournament-field.jpg',
          animated_gif_url: mockVideo?.thumbnail_url || '/demo-assets/photos/tournament-field.jpg',
          storyboard_url: '',
          token: '',
          thumbnail_token: '',
          storyboard_token: '',
          expires_in: expiration,
          video: {
            id: mockVideo?.id || videoId || 'local-video',
            status: mockVideo?.status || 'ready',
          },
        })
        return
      }

      if (!session?.access_token) {
        throw new Error('Not authenticated')
      }

      const response = await callMuxSignedPlayback({
        video_id: videoId,
        playback_id: playbackId,
        type,
        expiration,
      }, session.access_token)

      if (!response) {
        throw new Error('Not authenticated')
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to get playback token')
      }
      
      const data: GetPlaybackTokenResponse = await response.json()
      setPlaybackData(data)
    } catch (err) {
      console.error('Error fetching playback token:', err)
      setError(err instanceof Error ? err : new Error('Failed to get playback token'))
    } finally {
      setIsLoading(false)
    }
  }, [videoId, playbackId, type, expiration, enabled, session])
  
  useEffect(() => {
    fetchToken()
  }, [fetchToken])
  
  return { playbackData, isLoading, error, refresh: fetchToken }
}

// ============================================================================
// Video Tags Hook
// ============================================================================

interface UseVideoTagsOptions {
  orgId?: string
  enabled?: boolean
}

interface UseVideoTagsReturn {
  tags: VideoTag[]
  isLoading: boolean
  error: Error | null
  createTag: (tag: Omit<VideoTag, 'id' | 'org_id' | 'usage_count' | 'created_by' | 'created_at' | 'updated_at'>) => Promise<VideoTag | null>
  updateTag: (tagId: string, updates: Partial<VideoTag>) => Promise<boolean>
  deleteTag: (tagId: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useVideoTags({ orgId, enabled = true }: UseVideoTagsOptions): UseVideoTagsReturn {
  const { user } = useAuth()
  const [tags, setTags] = useState<VideoTag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchTags = useCallback(async () => {
    if (!orgId || !enabled) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      const { data, error: fetchError } = await supabase
        .from('video_tags')
        .select('*')
        .eq('org_id', orgId)
        .order('usage_count', { ascending: false })
      
      if (fetchError) throw fetchError
      
      setTags((data || []) as VideoTag[])
    } catch (err) {
      console.error('Error fetching video tags:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch tags'))
    } finally {
      setIsLoading(false)
    }
  }, [orgId, enabled])
  
  useEffect(() => {
    fetchTags()
  }, [fetchTags])
  
  const createTag = useCallback(async (
    tag: Omit<VideoTag, 'id' | 'org_id' | 'usage_count' | 'created_by' | 'created_at' | 'updated_at'>
  ): Promise<VideoTag | null> => {
    if (!orgId || !user?.id) return null
    
    try {
      const { data, error: createError } = await supabase
        .from('video_tags')
        .insert({
          ...tag,
          org_id: orgId,
          created_by: user.id,
        })
        .select()
        .single()
      
      if (createError) throw createError
      
      setTags(prev => [data as VideoTag, ...prev])
      return data as VideoTag
    } catch (err) {
      console.error('Error creating tag:', err)
      return null
    }
  }, [orgId, user?.id])
  
  const updateTag = useCallback(async (
    tagId: string,
    updates: Partial<VideoTag>
  ): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('video_tags')
        .update(updates)
        .eq('id', tagId)
      
      if (updateError) throw updateError
      
      setTags(prev => prev.map(t => t.id === tagId ? { ...t, ...updates } : t))
      return true
    } catch (err) {
      console.error('Error updating tag:', err)
      return false
    }
  }, [])
  
  const deleteTag = useCallback(async (tagId: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('video_tags')
        .delete()
        .eq('id', tagId)
      
      if (deleteError) throw deleteError
      
      setTags(prev => prev.filter(t => t.id !== tagId))
      return true
    } catch (err) {
      console.error('Error deleting tag:', err)
      return false
    }
  }, [])
  
  return { tags, isLoading, error, createTag, updateTag, deleteTag, refresh: fetchTags }
}

// ============================================================================
// Video Notes Hook
// ============================================================================

interface UseVideoNotesOptions {
  videoId?: string
  enabled?: boolean
}

interface UseVideoNotesReturn {
  notes: VideoNote[]
  isLoading: boolean
  error: Error | null
  createNote: (note: {
    title?: string
    content: string
    timestamp_start?: number
    timestamp_end?: number
    scope?: VideoNoteScope
    is_pinned?: boolean
    drawing_data?: Record<string, unknown>
    target_athlete_ids?: string[]
  }) => Promise<VideoNote | null>
  updateNote: (noteId: string, updates: Partial<VideoNote>) => Promise<boolean>
  deleteNote: (noteId: string) => Promise<boolean>
  refresh: () => Promise<void>
}

type VideoNoteInsert = Database['public']['Tables']['video_notes']['Insert']
type VideoNoteUpdate = Database['public']['Tables']['video_notes']['Update']

export function useVideoNotes({ videoId, enabled = true }: UseVideoNotesOptions): UseVideoNotesReturn {
  const { user, profile } = useAuth()
  const [notes, setNotes] = useState<VideoNote[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const viewerRoles = useMemo(() => getViewerRoles(profile), [profile])
  
  const fetchNotes = useCallback(async () => {
    if (!videoId || !enabled) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      if (USE_FAKE_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 80))
        setNotes(
          getMockVideoNotes(videoId, {
            userId: user?.id,
            roles: viewerRoles,
          })
        )
        return
      }

      const { data, error: fetchError } = await supabase
        .from('video_notes')
        .select(`
          *,
          author:users!video_notes_author_id_fkey(id, display_name, first_name, last_name),
          video_note_targets(id, athlete_id, athlete:athletes(id, first_name, last_name))
        `)
        .eq('video_id', videoId)
        .order('timestamp_seconds', { ascending: true, nullsFirst: true })
      
      if (fetchError) throw fetchError
      
      const mappedNotes = ((data || []) as Array<Record<string, unknown>>).map((noteRow) => {
        const timestampSeconds =
          typeof noteRow.timestamp_seconds === 'number' ? noteRow.timestamp_seconds : null
        const durationSeconds =
          typeof noteRow.duration_seconds === 'number' ? noteRow.duration_seconds : null

        return {
          ...noteRow,
          timestamp_start: timestampSeconds,
          timestamp_end:
            timestampSeconds !== null && durationSeconds !== null
              ? timestampSeconds + durationSeconds
              : null,
          targets: (noteRow.video_note_targets as VideoNote['targets']) ?? [],
        } as unknown as VideoNote
      })

      setNotes(mappedNotes)
    } catch (err) {
      console.error('Error fetching video notes:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch notes'))
    } finally {
      setIsLoading(false)
    }
  }, [videoId, enabled, user?.id, viewerRoles])
  
  useEffect(() => {
    fetchNotes()
  }, [fetchNotes])
  
  const createNote = useCallback(async (note: {
    title?: string
    content: string
    timestamp_start?: number
    timestamp_end?: number
    scope?: VideoNoteScope
    is_pinned?: boolean
    drawing_data?: Record<string, unknown>
    target_athlete_ids?: string[]
  }): Promise<VideoNote | null> => {
    if (!videoId || !user?.id) {
      console.error('[createNote] Missing required data:', { videoId, userId: user?.id })
      return null
    }
    
    try {
      if (USE_FAKE_DATA) {
        const newNote = createMockVideoNote(videoId, user.id, note)
        setNotes(
          getMockVideoNotes(videoId, {
            userId: user.id,
            roles: viewerRoles,
          })
        )
        return newNote
      }

      const { target_athlete_ids, drawing_data } = note
      const payload = {
        video_id: videoId,
        author_id: user.id,
        title: note.title ?? null,
        content: note.content,
        scope: note.scope ?? 'coaches',
        timestamp_seconds: note.timestamp_start ?? null,
        duration_seconds: note.timestamp_end !== undefined && note.timestamp_end !== null
          ? Math.max(0, note.timestamp_end - (note.timestamp_start ?? 0))
          : null,
        is_pinned: note.is_pinned ?? false,
        drawing_data: (drawing_data ?? null) as Json | null,
      } as VideoNoteInsert
      
      // Insert WITHOUT .select() to avoid the SELECT RLS policy
      // (can_view_video_note has recursion issues in RLS context)
      const { error: createError } = await supabase
        .from('video_notes')
        .insert(payload)
      
      if (createError) {
        console.error('[createNote] INSERT FAILED:', createError)
        throw createError
      }
      
      // Fetch the newly created note separately
      const { data, error: fetchError } = await supabase
        .from('video_notes')
        .select('*')
        .eq('video_id', videoId)
        .eq('author_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchError || !data) {
        console.warn('[createNote] Insert succeeded but fetch failed:', fetchError)
        // Construct a minimal note from payload so the UI still updates
        const fallbackNote = {
          id: crypto.randomUUID(),
          ...payload,
          timestamp_start: payload.timestamp_seconds,
          timestamp_end:
            payload.timestamp_seconds !== null && payload.duration_seconds !== null
              ? (payload.timestamp_seconds ?? 0) + (payload.duration_seconds ?? 0)
              : null,
          targets: [],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        } as unknown as VideoNote
        setNotes(prev => [...prev, fallbackNote])
        return fallbackNote
      }
      
      // Add athlete targets if specified
      if (target_athlete_ids && target_athlete_ids.length > 0) {
        await supabase
          .from('video_note_targets')
          .insert(
            target_athlete_ids.map(athleteId => ({
              note_id: data.id,
              athlete_id: athleteId,
            }))
          )
      }
      
      const newNote = {
        ...(data as Record<string, unknown>),
        timestamp_start: data.timestamp_seconds,
        timestamp_end:
          data.timestamp_seconds !== null && data.duration_seconds !== null
            ? (data.timestamp_seconds ?? 0) + (data.duration_seconds ?? 0)
            : null,
        targets: [],
      } as unknown as VideoNote
      setNotes(prev => [...prev, newNote])
      return newNote
    } catch (err) {
      console.error('Error creating note:', err)
      return null
    }
  }, [videoId, user?.id, viewerRoles])
  
  const updateNote = useCallback(async (
    noteId: string,
    updates: Partial<VideoNote>
  ): Promise<boolean> => {
    try {
      if (USE_FAKE_DATA) {
        const ok = updateMockVideoNote(noteId, updates)
        if (ok && videoId) {
          setNotes(
            getMockVideoNotes(videoId, {
              userId: user?.id,
              roles: viewerRoles,
            })
          )
        }
        return ok
      }

      const dbUpdates = {
        ...(updates.title !== undefined && { title: updates.title }),
        ...(updates.content !== undefined && { content: updates.content }),
        ...(updates.scope !== undefined && { scope: updates.scope }),
        ...(updates.timestamp_start !== undefined && { timestamp_seconds: updates.timestamp_start }),
        ...(updates.timestamp_end !== undefined && { duration_seconds: updates.timestamp_end }),
        ...(updates.is_pinned !== undefined && { is_pinned: updates.is_pinned }),
        ...(updates.drawing_data !== undefined && { drawing_data: updates.drawing_data as Json | null }),
      } as VideoNoteUpdate
        
      const { error: updateError } = await supabase
        .from('video_notes')
        .update(dbUpdates)
        .eq('id', noteId)
      
      if (updateError) throw updateError
      
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...updates } : n))
      return true
    } catch (err) {
      console.error('Error updating note:', err)
      return false
    }
  }, [videoId, user?.id, viewerRoles])
  
  const deleteNote = useCallback(async (noteId: string): Promise<boolean> => {
    try {
      if (USE_FAKE_DATA) {
        const ok = deleteMockVideoNote(noteId)
        if (ok && videoId) {
          setNotes(
            getMockVideoNotes(videoId, {
              userId: user?.id,
              roles: viewerRoles,
            })
          )
        }
        return ok
      }

      const { error: deleteError } = await supabase
        .from('video_notes')
        .delete()
        .eq('id', noteId)
      
      if (deleteError) throw deleteError
      
      setNotes(prev => prev.filter(n => n.id !== noteId))
      return true
    } catch (err) {
      console.error('Error deleting note:', err)
      return false
    }
  }, [videoId, user?.id, viewerRoles])
  
  return { notes, isLoading, error, createNote, updateNote, deleteNote, refresh: fetchNotes }
}

// ============================================================================
// Video Bookmarks Hook
// ============================================================================

interface UseVideoBookmarksOptions {
  videoId?: string
  enabled?: boolean
}

interface UseVideoBookmarksReturn {
  bookmarks: VideoBookmark[]
  isLoading: boolean
  error: Error | null
  createBookmark: (timestamp: number, label?: string) => Promise<VideoBookmark | null>
  updateBookmark: (bookmarkId: string, updates: Partial<VideoBookmark>) => Promise<boolean>
  deleteBookmark: (bookmarkId: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useVideoBookmarks({ videoId, enabled = true }: UseVideoBookmarksOptions): UseVideoBookmarksReturn {
  const { user } = useAuth()
  const [bookmarks, setBookmarks] = useState<VideoBookmark[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchBookmarks = useCallback(async () => {
    if (!videoId || !enabled || !user?.id) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      if (USE_FAKE_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 80))
        setBookmarks(getMockVideoBookmarks(videoId, user.id))
        return
      }

      const { data, error: fetchError } = await supabase
        .from('video_bookmarks')
        .select('*')
        .eq('video_id', videoId)
        .eq('user_id', user.id)
        .order('timestamp_seconds', { ascending: true })
      
      if (fetchError) throw fetchError
      
      setBookmarks((data || []) as VideoBookmark[])
    } catch (err) {
      console.error('Error fetching bookmarks:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch bookmarks'))
    } finally {
      setIsLoading(false)
    }
  }, [videoId, enabled, user?.id])
  
  useEffect(() => {
    fetchBookmarks()
  }, [fetchBookmarks])
  
  const createBookmark = useCallback(async (
    timestamp: number,
    label?: string
  ): Promise<VideoBookmark | null> => {
    if (!videoId || !user?.id) return null
    
    try {
      if (USE_FAKE_DATA) {
        const newBookmark = createMockVideoBookmark(videoId, user.id, timestamp, label)
        setBookmarks(getMockVideoBookmarks(videoId, user.id))
        return newBookmark
      }

      const { data, error: createError } = await supabase
        .from('video_bookmarks')
        .insert({
          video_id: videoId,
          user_id: user.id,
          timestamp_seconds: timestamp,
          label,
        })
        .select()
        .single()
      
      if (createError) throw createError
      
      const newBookmark = data as VideoBookmark
      setBookmarks(prev => [...prev, newBookmark].sort((a, b) => a.timestamp_seconds - b.timestamp_seconds))
      return newBookmark
    } catch (err) {
      console.error('Error creating bookmark:', err)
      return null
    }
  }, [videoId, user?.id])
  
  const updateBookmark = useCallback(async (
    bookmarkId: string,
    updates: Partial<VideoBookmark>
  ): Promise<boolean> => {
    try {
      if (USE_FAKE_DATA) {
        const ok = updateMockVideoBookmark(bookmarkId, updates)
        if (ok && videoId && user?.id) {
          setBookmarks(getMockVideoBookmarks(videoId, user.id))
        }
        return ok
      }

      const { error: updateError } = await supabase
        .from('video_bookmarks')
        .update(updates)
        .eq('id', bookmarkId)
      
      if (updateError) throw updateError
      
      setBookmarks(prev => prev.map(b => b.id === bookmarkId ? { ...b, ...updates } : b))
      return true
    } catch (err) {
      console.error('Error updating bookmark:', err)
      return false
    }
  }, [videoId, user?.id])
  
  const deleteBookmark = useCallback(async (bookmarkId: string): Promise<boolean> => {
    try {
      if (USE_FAKE_DATA) {
        const ok = deleteMockVideoBookmark(bookmarkId)
        if (ok && videoId && user?.id) {
          setBookmarks(getMockVideoBookmarks(videoId, user.id))
        }
        return ok
      }

      const { error: deleteError } = await supabase
        .from('video_bookmarks')
        .delete()
        .eq('id', bookmarkId)
      
      if (deleteError) throw deleteError
      
      setBookmarks(prev => prev.filter(b => b.id !== bookmarkId))
      return true
    } catch (err) {
      console.error('Error deleting bookmark:', err)
      return false
    }
  }, [videoId, user?.id])
  
  return { bookmarks, isLoading, error, createBookmark, updateBookmark, deleteBookmark, refresh: fetchBookmarks }
}

// ============================================================================
// Video Comments Hook
// ============================================================================

interface UseVideoCommentsOptions {
  videoId?: string
  enabled?: boolean
}

interface UseVideoCommentsReturn {
  comments: VideoComment[]
  isLoading: boolean
  error: Error | null
  createComment: (content: string, options?: { timestamp?: number; parentId?: string }) => Promise<VideoComment | null>
  updateComment: (commentId: string, content: string) => Promise<boolean>
  deleteComment: (commentId: string) => Promise<boolean>
  refresh: () => Promise<void>
}

export function useVideoComments({ videoId, enabled = true }: UseVideoCommentsOptions): UseVideoCommentsReturn {
  const { user } = useAuth()
  const [comments, setComments] = useState<VideoComment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchComments = useCallback(async () => {
    if (!videoId || !enabled) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      if (USE_FAKE_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 80))
        setComments(getMockVideoComments(videoId))
        return
      }

      const { data, error: fetchError } = await supabase
        .from('video_comments')
        .select(`
          *,
          author:users!video_comments_author_id_fkey(id, display_name, first_name, last_name)
        `)
        .eq('video_id', videoId)
        .order('created_at', { ascending: true })
      
      if (fetchError) throw fetchError
      
      setComments((data || []) as unknown as VideoComment[])
    } catch (err) {
      console.error('Error fetching comments:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch comments'))
    } finally {
      setIsLoading(false)
    }
  }, [videoId, enabled])
  
  useEffect(() => {
    fetchComments()
  }, [fetchComments])
  
  const createComment = useCallback(async (
    content: string,
    options?: { timestamp?: number; parentId?: string }
  ): Promise<VideoComment | null> => {
    if (!videoId || !user?.id) return null
    
    try {
      if (USE_FAKE_DATA) {
        const newComment = createMockVideoComment(videoId, user.id, {
          content,
          timestamp: options?.timestamp,
          parentId: options?.parentId,
        })
        setComments(getMockVideoComments(videoId))
        return newComment
      }

      const { data, error: createError } = await supabase
        .from('video_comments')
        .insert({
          video_id: videoId,
          author_id: user.id,
          content,
          timestamp_seconds: options?.timestamp,
          parent_comment_id: options?.parentId,
        })
        .select(`
          *,
          author:users!video_comments_author_id_fkey(id, display_name, first_name, last_name)
        `)
        .single()
      
      if (createError) throw createError
      
      const newComment = data as unknown as VideoComment
      setComments(prev => [...prev, newComment])
      return newComment
    } catch (err) {
      console.error('Error creating comment:', err)
      return null
    }
  }, [videoId, user?.id])
  
  const updateComment = useCallback(async (
    commentId: string,
    content: string
  ): Promise<boolean> => {
    try {
      if (USE_FAKE_DATA) {
        const ok = updateMockVideoComment(commentId, content)
        if (ok && videoId) {
          setComments(getMockVideoComments(videoId))
        }
        return ok
      }

      const { error: updateError } = await supabase
        .from('video_comments')
        .update({ content, is_edited: true })
        .eq('id', commentId)
      
      if (updateError) throw updateError
      
      setComments(prev => prev.map(c => 
        c.id === commentId ? { ...c, content, is_edited: true } : c
      ))
      return true
    } catch (err) {
      console.error('Error updating comment:', err)
      return false
    }
  }, [videoId])
  
  const deleteComment = useCallback(async (commentId: string): Promise<boolean> => {
    try {
      if (USE_FAKE_DATA) {
        const ok = deleteMockVideoComment(commentId)
        if (ok && videoId) {
          setComments(getMockVideoComments(videoId))
        }
        return ok
      }

      const { error: deleteError } = await supabase
        .from('video_comments')
        .delete()
        .eq('id', commentId)
      
      if (deleteError) throw deleteError
      
      setComments(prev => prev.filter(c => c.id !== commentId))
      return true
    } catch (err) {
      console.error('Error deleting comment:', err)
      return false
    }
  }, [videoId])
  
  return { comments, isLoading, error, createComment, updateComment, deleteComment, refresh: fetchComments }
}

// ============================================================================
// Athlete Videos Hook (for Guardian Portal)
// ============================================================================

interface UseAthleteVideosOptions {
  athleteId?: string
  enabled?: boolean
}

interface UseAthleteVideosReturn {
  videos: Video[]
  total: number
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

export function useAthleteVideos({ athleteId, enabled = true }: UseAthleteVideosOptions): UseAthleteVideosReturn {
  const [videos, setVideos] = useState<Video[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  
  const fetchVideos = useCallback(async () => {
    if (!athleteId || !enabled) return
    
    setIsLoading(true)
    setError(null)
    
    try {
      if (USE_FAKE_DATA) {
        await new Promise((resolve) => setTimeout(resolve, 120))
        const filtered = getMockVideosForOrg(DEMO_ORG_A_ID)
          .filter((video) => video.status === 'ready')
          .filter((video) => getMockVideoAthleteLinks(video.id).some((link) => link.athlete_id === athleteId))
          .map((video) => ({
            ...video,
            athlete_links: getMockVideoAthleteLinks(video.id),
          })) as Video[]

        setVideos(filtered)
        setTotal(filtered.length)
        return
      }

      // Fetch videos linked to this athlete
      const { data: links, error: linksError } = await supabase
        .from('video_athlete_links')
        .select('video_id')
        .eq('athlete_id', athleteId)
      
      if (linksError) throw linksError
      
      if (!links || links.length === 0) {
        setVideos([])
        setTotal(0)
        return
      }
      
      const videoIds = links.map(l => l.video_id)
      
      const { data, error: fetchError, count } = await supabase
        .from('videos')
        .select(`
          *,
          team:teams!videos_team_id_fkey(id, name),
          video_athlete_links(id, link_type)
        `, { count: 'exact' })
        .in('id', videoIds)
        .eq('status', 'ready')
        .order('recorded_at', { ascending: false, nullsFirst: false })
      
      if (fetchError) throw fetchError
      
      setVideos((data || []) as unknown as Video[])
      setTotal(count || 0)
    } catch (err) {
      console.error('Error fetching athlete videos:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch videos'))
    } finally {
      setIsLoading(false)
    }
  }, [athleteId, enabled])
  
  useEffect(() => {
    fetchVideos()
  }, [fetchVideos])
  
  return { videos, total, isLoading, error, refresh: fetchVideos }
}

// ============================================================================
// Video Mutations Hook
// ============================================================================

interface UseVideoMutationsReturn {
  updateVideo: (videoId: string, updates: Partial<Video>) => Promise<boolean>
  deleteVideo: (videoId: string) => Promise<boolean>
  linkAthletes: (videoId: string, athleteIds: string[], linkType?: VideoLinkType) => Promise<boolean>
  unlinkAthlete: (videoId: string, athleteId: string) => Promise<boolean>
  linkTags: (videoId: string, tagIds: string[]) => Promise<boolean>
  unlinkTag: (videoId: string, tagId: string) => Promise<boolean>
}

export function useVideoMutations(): UseVideoMutationsReturn {
  const { user } = useAuth()
  
  const updateVideo = useCallback(async (
    videoId: string,
    updates: Partial<Video>
  ): Promise<boolean> => {
    try {
      // Only include columns that exist on the videos table (no season_id, program_id, level_id, sport_id, recording_location)
      const {
        title,
        description,
        category,
        visibility,
        team_id,
        season_id,
        event_id,
        program_id,
        level_id,
        sport_id,
        recorded_at,
        recording_location,
        thumbnail_time_offset,
      } = updates
      const safeUpdates = {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(visibility !== undefined && { visibility }),
        ...(team_id !== undefined && { team_id }),
        ...(season_id !== undefined && { season_id }),
        ...(event_id !== undefined && { event_id }),
        ...(program_id !== undefined && { program_id }),
        ...(level_id !== undefined && { level_id }),
        ...(sport_id !== undefined && { sport_id }),
        ...(recorded_at !== undefined && { recorded_at }),
        ...(recording_location !== undefined && { recording_location }),
        ...(thumbnail_time_offset !== undefined && { thumbnail_time_offset }),
      }
      
      const { error } = await supabase
        .from('videos')
        .update(safeUpdates)
        .eq('id', videoId)
      
      if (error) throw error
      return true
    } catch (err) {
      console.error('Error updating video:', err)
      return false
    }
  }, [])
  
  const deleteVideo = useCallback(async (videoId: string): Promise<boolean> => {
    try {
      const { error } = await (supabase as { rpc: (fn: string, args: { p_video_id: string }) => ReturnType<typeof supabase.rpc> }).rpc(
        'soft_delete_video',
        { p_video_id: videoId }
      )

      if (error) {
        console.error('Error deleting video:', error)
        throw error
      }

      return true
    } catch (err) {
      console.error('Error deleting video:', err)
      return false
    }
  }, [])
  
  const linkAthletes = useCallback(async (
    videoId: string,
    athleteIds: string[],
    linkType: VideoLinkType = 'appears'
  ): Promise<boolean> => {
    if (!user?.id) return false
    
    try {
      const { error } = await supabase
        .from('video_athlete_links')
        .upsert(
          athleteIds.map(athleteId => ({
            video_id: videoId,
            athlete_id: athleteId,
            link_type: linkType,
            created_by: user.id,
          })),
          { onConflict: 'video_id,athlete_id' }
        )
      
      if (error) throw error
      return true
    } catch (err) {
      console.error('Error linking athletes:', err)
      return false
    }
  }, [user?.id])
  
  const unlinkAthlete = useCallback(async (
    videoId: string,
    athleteId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('video_athlete_links')
        .delete()
        .eq('video_id', videoId)
        .eq('athlete_id', athleteId)
      
      if (error) throw error
      return true
    } catch (err) {
      console.error('Error unlinking athlete:', err)
      return false
    }
  }, [])
  
  const linkTags = useCallback(async (
    videoId: string,
    tagIds: string[]
  ): Promise<boolean> => {
    if (!user?.id) return false
    
    try {
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
      return true
    } catch (err) {
      console.error('Error linking tags:', err)
      return false
    }
  }, [user?.id])
  
  const unlinkTag = useCallback(async (
    videoId: string,
    tagId: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('video_tag_links')
        .delete()
        .eq('video_id', videoId)
        .eq('tag_id', tagId)
      
      if (error) throw error
      return true
    } catch (err) {
      console.error('Error unlinking tag:', err)
      return false
    }
  }, [])
  
  return {
    updateVideo,
    deleteVideo,
    linkAthletes,
    unlinkAthlete,
    linkTags,
    unlinkTag,
  }
}
