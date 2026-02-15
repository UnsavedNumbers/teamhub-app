/**
 * SharedVideoPage - Public video sharing via token
 * 
 * Displays a video that was shared via a link token.
 * - Validates the share token
 * - Handles password protection if enabled
 * - Tracks view analytics
 * - Supports download if allowed
 * 
 * URL: /share/video/:token
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'
import Icon from '@/components/portal/Icon'
import Button from '@/components/portal/Button'
import { cn } from '@/utils/cn'

interface ShareValidation {
  video_id: string
  is_valid: boolean
  allow_download: boolean
  requires_password: boolean
}

interface VideoData {
  id: string
  title: string
  description: string | null
  mux_playback_id: string | null
  duration_seconds: number | null
  thumbnail_url: string | null
  category: string
  team_name: string | null
  org_name: string | null
  recorded_at: string | null
  created_at: string
}

interface PlaybackData {
  stream_url: string
  thumbnail_url: string
  token: string
}

// Load Mux Player script
function loadMuxPlayerScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector('script[src*="mux-player"]')) {
      resolve()
      return
    }
    
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/@mux/mux-player@2'
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load Mux Player script'))
    document.head.appendChild(script)
  })
}

export default function SharedVideoPage() {
  const { token } = useParams<{ token: string }>()
  useDebugLifecycle('SharedVideoPage', { token })
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shareValidation, setShareValidation] = useState<ShareValidation | null>(null)
  const [video, setVideo] = useState<VideoData | null>(null)
  const [playbackData, setPlaybackData] = useState<PlaybackData | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)
  
  // Password protection state
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [passwordInput, setPasswordInput] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [verifyingPassword, setVerifyingPassword] = useState(false)
  const [passwordVerified, setPasswordVerified] = useState(false)
  
  // Download state
  const [downloading, setDownloading] = useState(false)
  
  // Ref to avoid stale closure in validateToken
  const loadVideoRef = useRef<(videoId: string) => Promise<void>>(() => Promise.resolve())

  // Load Mux Player script
  useEffect(() => {
    loadMuxPlayerScript()
      .then(() => setScriptLoaded(true))
      .catch((err) => console.error('Failed to load Mux Player:', err))
  }, [])

  // Validate the share token
  const validateToken = useCallback(async () => {
    if (!token) {
      setError('Invalid share link')
      setLoading(false)
      return
    }

    try {
      // Call the RPC function to validate the token - use type assertion since function is added via migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: rpcError } = await (supabase as any)
        .rpc('validate_video_share_token', { p_token: token })
        .single()

      if (rpcError) throw rpcError

      if (!data || !data.is_valid) {
        setError('This share link has expired or been revoked')
        setLoading(false)
        return
      }

      const validation = data as ShareValidation
      setShareValidation(validation)
      
      if (validation.requires_password) {
        setRequiresPassword(true)
        setLoading(false)
        return
      }

      // No password required, proceed to load video
      await loadVideoRef.current(validation.video_id)
    } catch (err) {
      console.error('Error validating share token:', err)
      setError('Failed to validate share link')
      setLoading(false)
    }
  }, [token])

  // Load video data
  const loadVideo = useCallback(async (videoId: string) => {
    try {
      // Fetch video details (using service role via RPC or direct query)
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select(`
          id,
          title,
          description,
          mux_playback_id,
          duration_seconds,
          thumbnail_url,
          category,
          recorded_at,
          created_at,
          team:teams!videos_team_id_fkey(name),
          organization:organizations!videos_org_id_fkey(name)
        `)
        .eq('id', videoId)
        .single()

      if (videoError || !videoData) {
        throw new Error('Video not found')
      }

      const transformedVideo: VideoData = {
        id: videoData.id,
        title: videoData.title,
        description: videoData.description,
        mux_playback_id: videoData.mux_playback_id,
        duration_seconds: videoData.duration_seconds,
        thumbnail_url: videoData.thumbnail_url,
        category: videoData.category,
        team_name: (videoData.team as { name?: string } | null)?.name || null,
        org_name: (videoData.organization as { name?: string } | null)?.name || null,
        recorded_at: videoData.recorded_at,
        created_at: videoData.created_at,
      }

      setVideo(transformedVideo)

      // Get signed playback URL
      if (videoData.mux_playback_id) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const response = await fetch(`${supabaseUrl}/functions/v1/mux-signed-playback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            video_id: videoId,
            type: 'video',
            expiration: 7200, // 2 hours for shared video
            share_token: token, // Pass share token for validation
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setPlaybackData(data)
        }
      }

      // Increment access count - use type assertion since function is added via migration
      if (token) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc('increment_share_access', { p_token: token })
      }

      setLoading(false)
    } catch (err) {
      console.error('Error loading video:', err)
      setError('Failed to load video')
      setLoading(false)
    }
  }, [token])
  
  // Keep ref updated
  loadVideoRef.current = loadVideo

  // Handle password verification
  const handlePasswordSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!passwordInput.trim() || !shareValidation) return

    setVerifyingPassword(true)
    setPasswordError(null)

    try {
      // Verify password via RPC - use type assertion since function is added via migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: verifyError } = await (supabase as any)
        .rpc('verify_video_share_password', { 
          p_token: token, 
          p_password: passwordInput 
        })

      if (verifyError) throw verifyError

      if (data === true) {
        setPasswordVerified(true)
        setRequiresPassword(false)
        await loadVideo(shareValidation.video_id)
      } else {
        setPasswordError('Incorrect password')
      }
    } catch (err) {
      console.error('Error verifying password:', err)
      setPasswordError('Failed to verify password')
    } finally {
      setVerifyingPassword(false)
    }
  }, [passwordInput, shareValidation, token, loadVideo])

  // Handle download
  const handleDownload = useCallback(async () => {
    if (!video || !playbackData || !shareValidation?.allow_download) return

    setDownloading(true)
    try {
      // Create download link
      const downloadUrl = playbackData.stream_url.replace('/stream.m3u8', '/high.mp4')
      
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = `${video.title}.mp4`
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (err) {
      console.error('Download failed:', err)
    } finally {
      setDownloading(false)
    }
  }, [video, playbackData, shareValidation])

  // Initial load
  useEffect(() => {
    validateToken()
  }, [validateToken])

  // Format duration helper
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return ''
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${mins}:${String(secs).padStart(2, '0')}`
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="size-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/60">Loading video...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="size-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="error" size="text-4xl" className="text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Unable to Load Video</h1>
          <p className="text-white/60 mb-6">{error}</p>
          <Link to="/">
            <Button variant="secondary">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  // Password protection screen
  if (requiresPassword && !passwordVerified) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-gray-900 rounded-2xl p-8 shadow-xl">
            <div className="text-center mb-6">
              <div className="size-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Icon name="lock" size="text-4xl" className="text-blue-500" />
              </div>
              <h1 className="text-xl font-bold text-white mb-2">Password Protected</h1>
              <p className="text-white/60">
                This video requires a password to view.
              </p>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="mb-4">
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter password"
                  className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
                {passwordError && (
                  <p className="text-red-400 text-sm mt-2">{passwordError}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="primary"
                className="w-full"
                disabled={verifyingPassword || !passwordInput.trim()}
              >
                {verifyingPassword ? 'Verifying...' : 'Unlock Video'}
              </Button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  // Video player screen
  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon name="play_circle" size="text-2xl" className="text-blue-500" />
            <span className="text-white font-bold">Shared Video</span>
          </div>
          {video?.org_name && (
            <span className="text-white/40 text-sm">{video.org_name}</span>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Video Player */}
        <div className="relative w-full bg-black rounded-xl overflow-hidden shadow-2xl" style={{ aspectRatio: '16/9' }}>
          {playbackData && scriptLoaded ? (
            <mux-player
              playback-id={playbackData.stream_url.split('/')[4]}
              playback-token={playbackData.token}
              stream-type="on-demand"
              primary-color="#3b82f6"
              secondary-color="#1e293b"
              style={{ width: '100%', height: '100%' }}
            />
          ) : video?.thumbnail_url ? (
            <div 
              className="absolute inset-0 bg-center bg-cover"
              style={{ backgroundImage: `url(${video.thumbnail_url})` }}
            >
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <div className="size-12 border-4 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <Icon name="videocam" size="text-5xl" className="text-gray-600" />
            </div>
          )}
        </div>

        {/* Video Info */}
        <div className="mt-6">
          <h1 className="text-2xl font-bold text-white mb-2">{video?.title}</h1>
          
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/60 mb-4">
            {video?.team_name && (
              <span className="flex items-center gap-1">
                <Icon name="groups" size="text-base" />
                {video.team_name}
              </span>
            )}
            {video?.category && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs uppercase font-bold">
                {video.category}
              </span>
            )}
            {video?.duration_seconds && (
              <span className="flex items-center gap-1">
                <Icon name="schedule" size="text-base" />
                {formatDuration(video.duration_seconds)}
              </span>
            )}
            {video?.recorded_at && (
              <span className="flex items-center gap-1">
                <Icon name="calendar_today" size="text-base" />
                {new Date(video.recorded_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {video?.description && (
            <p className="text-white/70 mb-6">{video.description}</p>
          )}

          {/* Download button */}
          {shareValidation?.allow_download && (
            <Button
              variant="secondary"
              onClick={handleDownload}
              disabled={downloading || !playbackData}
              className="flex items-center gap-2"
            >
              <Icon name={downloading ? 'sync' : 'download'} className={cn(downloading && 'animate-spin')} />
              {downloading ? 'Downloading...' : 'Download Video'}
            </Button>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12 py-6 text-center text-white/40 text-sm">
        Powered by YouthSports.team
      </footer>
    </div>
  )
}

// Declare mux-player element for TypeScript
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'mux-player': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement> & {
          'playback-id'?: string
          'playback-token'?: string
          'thumbnail-token'?: string
          'storyboard-token'?: string
          'stream-type'?: 'on-demand' | 'live'
          'start-time'?: number
          autoplay?: boolean
          muted?: boolean
          loop?: boolean
          poster?: string
          'primary-color'?: string
          'secondary-color'?: string
        },
        HTMLElement
      >
    }
  }
}
