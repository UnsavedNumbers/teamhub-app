/**
 * VideoPlayer Component
 * 
 * Mux-powered video player with signed playback support.
 * Wraps the Mux Player web component with React integration.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { usePlaybackToken } from '@/hooks/useVideos'
import Icon from '@/components/portal/Icon'
import { cn } from '@/utils/cn'

interface VideoPlayerProps {
  videoId: string
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  controls?: boolean
  startTime?: number
  poster?: string
  onReady?: () => void
  onPlay?: () => void
  onPause?: () => void
  onTimeUpdate?: (currentTime: number) => void
  onEnded?: () => void
  onError?: (error: Error) => void
  className?: string
  /**
   * Markers to display on the timeline (for notes/bookmarks)
   */
  markers?: Array<{
    time: number
    label?: string
    color?: string
  }>
  /**
   * Called when a marker is clicked
   */
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
          'primary-color'?: string
          'secondary-color'?: string
        },
        HTMLElement
      >
    }
  }
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

export default function VideoPlayer({
  videoId,
  autoPlay = false,
  muted = false,
  loop = false,
  controls: _controls = true,
  startTime,
  poster,
  onReady,
  onPlay,
  onPause,
  onTimeUpdate,
  onEnded,
  onError,
  className,
  markers = [],
  onMarkerClick
}: VideoPlayerProps) {
  const playerRef = useRef<HTMLElement>(null)
  const [isScriptLoaded, setIsScriptLoaded] = useState(false)
  const [playerError, setPlayerError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [_isPlaying, setIsPlaying] = useState(false)
  
  // Get playback token from edge function
  const { playbackData, isLoading, error: tokenError } = usePlaybackToken({
    videoId,
    type: 'video',
    enabled: !!videoId
  })
  
  // Load Mux Player script on mount
  useEffect(() => {
    loadMuxPlayerScript()
      .then(() => setIsScriptLoaded(true))
      .catch((err) => {
        setPlayerError(err.message)
        onError?.(err)
      })
  }, [onError])
  
  // Set up player event listeners
  useEffect(() => {
    const player = playerRef.current as HTMLMediaElement | null
    if (!player || !isScriptLoaded) return
    
    const handleLoadedData = () => {
      setDuration(player.duration || 0)
      onReady?.()
    }
    
    const handlePlay = () => {
      setIsPlaying(true)
      onPlay?.()
    }
    
    const handlePause = () => {
      setIsPlaying(false)
      onPause?.()
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
    
    player.addEventListener('loadeddata', handleLoadedData)
    player.addEventListener('play', handlePlay)
    player.addEventListener('pause', handlePause)
    player.addEventListener('timeupdate', handleTimeUpdate)
    player.addEventListener('ended', handleEnded)
    player.addEventListener('error', handleError)
    
    return () => {
      player.removeEventListener('loadeddata', handleLoadedData)
      player.removeEventListener('play', handlePlay)
      player.removeEventListener('pause', handlePause)
      player.removeEventListener('timeupdate', handleTimeUpdate)
      player.removeEventListener('ended', handleEnded)
      player.removeEventListener('error', handleError)
    }
  }, [isScriptLoaded, onReady, onPlay, onPause, onTimeUpdate, onEnded, onError])
  
  // Seek to a specific time
  const seekTo = useCallback((time: number) => {
    const player = playerRef.current as HTMLMediaElement | null
    if (player) {
      player.currentTime = time
    }
  }, [])
  
  // Handle marker click
  const handleMarkerClick = useCallback((marker: { time: number; label?: string }) => {
    seekTo(marker.time)
    onMarkerClick?.(marker)
  }, [seekTo, onMarkerClick])
  
  // Loading state
  if (isLoading || !isScriptLoaded) {
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
  
  return (
    <div className={cn("relative w-full", className)}>
      {/* Mux Player */}
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl">
        <mux-player
          ref={playerRef as React.RefObject<HTMLElement>}
          playback-id={playbackData.playback_id}
          playback-token={playbackData.token}
          thumbnail-token={playbackData.token}
          storyboard-token={playbackData.token}
          stream-type="on-demand"
          start-time={startTime}
          autoplay={autoPlay}
          muted={muted}
          loop={loop}
          poster={poster || playbackData.thumbnail_url}
          primary-color="var(--org-btn-primary-bg, #137fec)"
          style={{ width: '100%', height: '100%' }}
        />
      </div>
      
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
}

// Export a simple function to format time
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${String(secs).padStart(2, '0')}`
}
