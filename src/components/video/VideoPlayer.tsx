/**
 * VideoPlayer Component
 * 
 * Mux-powered video player with signed playback support.
 * Wraps the Mux Player web component with React integration.
 */

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from 'react'
import { usePlaybackToken } from '@/hooks/useVideos'
import { useOrganization } from '@/contexts/OrganizationContext'
import Icon from '@/components/portal/Icon'
import { cn } from '@/utils/cn'

export interface VideoPlayerRef {
  seekTo: (seconds: number) => void
  getCurrentTime: () => number
  play: () => void
  pause: () => void
}

interface VideoPlayerProps {
  videoId: string
  /** Video processing status — if not 'ready', shows a placeholder instead of the player */
  status?: string
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  controls?: boolean
  startTime?: number
  poster?: string
  title?: string
  chapters?: Array<{
    startTime: number
    endTime?: number
    value: string
  }>
  onReady?: () => void
  onPlay?: () => void
  onPause?: () => void
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
  onError?: (error: Error) => void
  className?: string
  markers?: Array<{
    time: number
    label?: string
    color?: string
  }>
  onMarkerClick?: (marker: { time: number; label?: string }) => void
}

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
          title?: string
          'primary-color'?: string
          'secondary-color'?: string
          'accent-color'?: string
        },
        HTMLElement
      >
    }
  }
}

/** Map our chapter shape to Mux Player API. Pass both title and value so any player version works; never pass undefined. */
function toMuxChapters(
  ch: Array<{ startTime: number; endTime?: number; value: string }>
): Array<{ startTime: number; endTime?: number; title: string; value: string }> {
  return ch.map((c) => {
    const label = c.value ?? ''
    return { startTime: c.startTime, endTime: c.endTime, title: label, value: label }
  })
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

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({
  videoId,
  status,
  autoPlay = false,
  muted = false,
  loop = false,
  controls: _controls = true,
  startTime,
  poster,
  title,
  chapters = [],
  onReady,
  onPlay,
  onPause,
  onTimeUpdate,
  onEnded,
  onError,
  className,
  markers = [],
  onMarkerClick
}, ref) => {
  const playerRef = useRef<HTMLElement>(null)
  const nativeVideoRef = useRef<HTMLVideoElement>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [_isPlaying, setIsPlaying] = useState(false)
  
  // Track the latest chapters in a ref so the loadedmetadata callback always sees them
  const chaptersRef = useRef(chapters)
  chaptersRef.current = chapters
  
  // Get organization theme color
  const { currentOrganization } = useOrganization()
  const accentColor = (currentOrganization as { primary_color?: string } | null)?.primary_color || '#137fec'
  
  // Get playback token from edge function
  const isReady = !status || status === 'ready'
  const { playbackData, isLoading, error: tokenError } = usePlaybackToken({
    videoId,
    type: 'video',
    enabled: !!videoId && isReady
  })
  const directStreamUrl = playbackData?.stream_url || ''
  const isDirectVideoSource =
    directStreamUrl.startsWith('/demo-assets/videos/') || /\.mp4($|\?)/i.test(directStreamUrl)
  
  // Show status message for non-ready videos
  if (!isReady) {
    const statusMessages: Record<string, { icon: string; title: string; subtitle: string }> = {
      pending_upload: {
        icon: 'cloud_upload',
        title: 'Upload Pending',
        subtitle: 'This video is waiting to be uploaded.'
      },
      uploading: {
        icon: 'cloud_upload',
        title: 'Uploading...',
        subtitle: 'This video is currently being uploaded.'
      },
      processing: {
        icon: 'hourglass_top',
        title: 'Processing...',
        subtitle: 'This video is being processed by Mux. This usually takes a few minutes.'
      },
      errored: {
        icon: 'error',
        title: 'Processing Failed',
        subtitle: 'There was an error processing this video.'
      },
    }
    const msg = statusMessages[status] || statusMessages.pending_upload
    
    return (
      <div className="relative w-full bg-black" style={{ aspectRatio: '16/9' }}>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-center p-8">
          {status === 'processing' || status === 'uploading' ? (
            <div className="size-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-4" />
          ) : (
            <Icon name={msg.icon} size="text-5xl" className="mb-4 text-white/70" />
          )}
          <h3 className="text-lg font-bold mb-1">{msg.title}</h3>
          <p className="text-sm text-white/60">{msg.subtitle}</p>
        </div>
      </div>
    )
  }
  
  // Load Mux Player script on mount
  useEffect(() => {
    if (isDirectVideoSource) {
      setPlayerError(null)
      return
    }

    loadMuxPlayerScript()
      .then(() => setIsScriptLoaded(true))
      .catch((err) => {
        setPlayerError(err.message)
        onError?.(err)
      })
  }, [onError, isDirectVideoSource])
  
  // Set up player event listeners and chapters
  useEffect(() => {
    if (isDirectVideoSource) return
    const player = playerRef.current as any
    if (!player || !isScriptLoaded) return
    
    const handleLoadedMetadata = () => {
      setDuration(player.duration || 0)
      onReady?.()
      
      // Add chapters once metadata is loaded (per Mux docs; API expects title, not value)
      const ch = chaptersRef.current
      if (ch.length > 0 && typeof player.addChapters === 'function') {
        try {
          player.addChapters(toMuxChapters(ch))
        } catch (err) {
          console.warn('Failed to add chapters on loadedmetadata:', err)
        }
      }
    }
    
    const handlePlay = () => {
      setIsPlaying(true)
      onPlay?.()
    }
    
    const handlePause = () => {
      setIsPlaying(false)
      onPause?.()
      if (player?.currentTime !== undefined) {
        onTimeUpdate?.(player.currentTime)
      }
    }
    
    const handleTimeUpdate = () => {
      const time = player.currentTime || 0
      setCurrentTime(time)
      onTimeUpdate?.(time)
    }
    
    const handleEnded = () => {
      setIsPlaying(false)
      onEnded?.()
    }
    
    const handleError = () => {
      const err = new Error('Video playback error')
      setPlayerError(err.message)
      onError?.(err)
    }
    
    // mux-player dispatches standard media events on itself, so listen directly
    player.addEventListener('loadedmetadata', handleLoadedMetadata)
    player.addEventListener('play', handlePlay)
    player.addEventListener('pause', handlePause)
    player.addEventListener('timeupdate', handleTimeUpdate)
    player.addEventListener('ended', handleEnded)
    player.addEventListener('error', handleError)
    
    // If metadata was already loaded before this effect ran, handle immediately
    if (player.readyState >= 1) {
      handleLoadedMetadata()
    }
    
    return () => {
      player.removeEventListener('loadedmetadata', handleLoadedMetadata)
      player.removeEventListener('play', handlePlay)
      player.removeEventListener('pause', handlePause)
      player.removeEventListener('timeupdate', handleTimeUpdate)
      player.removeEventListener('ended', handleEnded)
      player.removeEventListener('error', handleError)
    }
  }, [isScriptLoaded, onReady, onPlay, onPause, onTimeUpdate, onEnded, onError, isDirectVideoSource])
  
  // Re-add chapters when the chapters prop changes after initial load (e.g. bookmarks loaded late)
  useEffect(() => {
    if (isDirectVideoSource) return
    const player = playerRef.current as any
    if (!player || !isScriptLoaded || chapters.length === 0) return

    const applyChapters = () => {
      if (typeof player.addChapters !== 'function') return
      try {
        player.addChapters(toMuxChapters(chapters))
      } catch (err) {
        console.warn('Failed to update chapters:', err)
      }
    }

    if (player.readyState >= 1) {
      applyChapters()
    } else {
      // Chapters arrived before metadata; apply once the player is ready
      player.addEventListener('loadedmetadata', applyChapters, { once: true })
      return () => player.removeEventListener('loadedmetadata', applyChapters)
    }
  }, [isScriptLoaded, chapters, isDirectVideoSource])

  // Seek to a specific time
  const seekTo = useCallback((time: number) => {
    const player = (nativeVideoRef.current as any) || (playerRef.current as any)
    if (player) {
      player.currentTime = time
    }
  }, [])

  // Get current time
  const getCurrentTime = useCallback((): number => {
    const player = (nativeVideoRef.current as any) || (playerRef.current as any)
    return player?.currentTime ?? currentTime
  }, [currentTime])

  // Play
  const play = useCallback(() => {
    const player = (nativeVideoRef.current as any) || (playerRef.current as any)
    if (player && typeof player.play === 'function') {
      player.play()
    }
  }, [])

  // Pause
  const pause = useCallback(() => {
    const player = (nativeVideoRef.current as any) || (playerRef.current as any)
    if (player && typeof player.pause === 'function') {
      player.pause()
    }
  }, [])

  // Expose API via ref
  useImperativeHandle(ref, () => ({
    seekTo,
    getCurrentTime,
    play,
    pause
  }), [seekTo, getCurrentTime, play, pause])
  
  // Handle marker click
  const handleMarkerClick = useCallback((marker: { time: number; label?: string }) => {
    seekTo(marker.time)
    onMarkerClick?.(marker)
  }, [seekTo, onMarkerClick])
  
  // Loading state
  if (isLoading || (!isDirectVideoSource && !isScriptLoaded)) {
    return (
      <div className={cn(
        "relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center",
        className
      )}>
        <div className="flex flex-col items-center gap-4 text-white">
          <div className="size-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading player...</span>
        </div>
      </div>
    )
  }
  
  // Error state
  if (tokenError || playerError) {
    return (
      <div className={cn(
        "relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center",
        className
      )}>
        <div className="flex flex-col items-center gap-4 text-white text-center p-8">
          <Icon name="error" size="text-4xl" className="text-red-400" />
          <span className="text-sm font-medium">
            {tokenError?.message || playerError || 'Failed to load video'}
          </span>
        </div>
      </div>
    )
  }
  
  if (!playbackData) {
    return (
      <div className={cn(
        "relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center",
        className
      )}>
        <div className="flex flex-col items-center gap-4 text-white">
          <Icon name="videocam_off" size="text-4xl" className="text-slate-400" />
          <span className="text-sm font-medium">Video not available</span>
        </div>
      </div>
    )
  }

  if (isDirectVideoSource) {
    return (
      <div className={cn("relative w-full", className)}>
        <video
          ref={nativeVideoRef}
          src={directStreamUrl}
          poster={poster || playbackData.thumbnail_url}
          autoPlay={autoPlay}
          muted={muted}
          loop={loop}
          controls={_controls}
          playsInline
          className="w-full"
          style={{
            aspectRatio: '16/9',
            borderRadius: '12px',
            overflow: 'hidden',
            background: 'black',
          }}
          onLoadedMetadata={(event) => {
            const element = event.currentTarget
            setDuration(element.duration || 0)
            onReady?.()
          }}
          onPlay={() => {
            setIsPlaying(true)
            onPlay?.()
          }}
          onPause={(event) => {
            setIsPlaying(false)
            onPause?.()
            onTimeUpdate?.(event.currentTarget.currentTime)
          }}
          onTimeUpdate={(event) => {
            const time = event.currentTarget.currentTime || 0
            setCurrentTime(time)
            onTimeUpdate?.(time)
          }}
          onEnded={() => {
            setIsPlaying(false)
            onEnded?.()
          }}
          onError={() => {
            const err = new Error('Video playback error')
            setPlayerError(err.message)
            onError?.(err)
          }}
        />

        {markers.length > 0 && duration > 0 && (
          <div className="relative w-full h-6 mt-2">
            <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full">
              <div
                className="absolute top-0 left-0 h-full bg-[var(--org-btn-primary-bg)] rounded-full transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />

              {markers.map((marker, index) => (
                <button
                  key={index}
                  onClick={() => handleMarkerClick(marker)}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 size-3 rounded-full cursor-pointer hover:scale-150 transition-transform border-2 border-white shadow-md",
                    marker.time <= currentTime
                      ? "bg-[var(--org-btn-primary-bg)]"
                      : "bg-slate-400"
                  )}
                  style={{
                    left: `${(marker.time / duration) * 100}%`,
                    backgroundColor: marker.color
                  }}
                  title={marker.label || `${Math.floor(marker.time / 60)}:${String(Math.floor(marker.time % 60)).padStart(2, '0')}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  return (
    <div className={cn("relative w-full", className)}>
      {/* Mux Player */}
      <mux-player
        ref={playerRef as React.RefObject<HTMLElement>}
        playback-id={playbackData.playback_id}
        playback-token={playbackData.token}
        thumbnail-token={playbackData.thumbnail_token}
        storyboard-token={playbackData.storyboard_token}
        stream-type="on-demand"
        start-time={startTime}
        autoplay={autoPlay}
        muted={muted}
        loop={loop}
        poster={poster || playbackData.thumbnail_url}
        title={title}
        accent-color={accentColor}
        style={{
          aspectRatio: '16/9',
          width: '100%',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      />
      
      {/* Timeline Markers */}
      {markers.length > 0 && duration > 0 && (
        <div className="relative w-full h-6 mt-2">
          <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-1 bg-slate-200 dark:bg-slate-700 rounded-full">
            {/* Progress indicator */}
            <div 
              className="absolute top-0 left-0 h-full bg-[var(--org-btn-primary-bg)] rounded-full transition-all"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            
            {/* Markers */}
            {markers.map((marker, index) => (
              <button
                key={index}
                onClick={() => handleMarkerClick(marker)}
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 size-3 rounded-full cursor-pointer hover:scale-150 transition-transform border-2 border-white shadow-md",
                  marker.time <= currentTime 
                    ? "bg-[var(--org-btn-primary-bg)]" 
                    : "bg-slate-400"
                )}
                style={{ 
                  left: `${(marker.time / duration) * 100}%`,
                  backgroundColor: marker.color 
                }}
                title={marker.label || `${Math.floor(marker.time / 60)}:${String(Math.floor(marker.time % 60)).padStart(2, '0')}`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

VideoPlayer.displayName = 'VideoPlayer'

export default VideoPlayer

// Export a simple function to format time
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}
