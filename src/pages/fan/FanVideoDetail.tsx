/**
 * Fan Video Detail Page
 * 
 * Video detail view for fan users. Shows video player with
 * organization/team branding and allows viewing public information.
 * 
 * URL/ROUTE: /fan/videos/:id
 * Design: FanConnect Minimalist Light
 */

import { useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useVideo } from '@/hooks/useVideos'
import { VideoPlayer, VideoFavoriteButton } from '@/components/video'
import Icon from '@/components/portal/Icon'
import Button from '@/components/portal/Button'
import '@/styles/fan.css'
import '@/styles/fan-layouts.css'

export default function FanVideoDetail() {
  const { id: videoId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [_currentTime, setCurrentTime] = useState(0)
  
  // Fetch video data
  const { video, isLoading, error } = useVideo({
    videoId,
    enabled: !!videoId
  })
  
  // Handle time update from player
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])
  
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
  
  // Format date helper
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className="fan-page min-h-screen">
        <div className="fan-container py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
            <div className="aspect-video bg-gray-200 rounded-2xl mb-6" />
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-2" />
            <div className="h-4 bg-gray-200 rounded w-2/3" />
          </div>
        </div>
      </div>
    )
  }
  
  // Error state
  if (error || !video) {
    return (
      <div className="fan-page min-h-screen">
        <div className="fan-container py-8">
          <div className="text-center py-16">
            <div className="size-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="error" size="text-4xl" className="text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Video Not Found</h2>
            <p className="text-gray-500 mb-6">
              {error?.message || 'This video may have been removed or is not available.'}
            </p>
            <Button as={Link} to="/fan/videos" variant="secondary">
              Back to Videos
            </Button>
          </div>
        </div>
      </div>
    )
  }
  
  return (
    <div className="fan-page min-h-screen">
      <div className="fan-container py-8">
        {/* Back Navigation */}
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 group"
        >
          <Icon name="arrow_back" size="text-lg" className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Back to Videos</span>
        </button>
        
        {/* Video Player Section */}
        <div className="bg-black rounded-2xl overflow-hidden shadow-xl mb-8">
          <VideoPlayer
            videoId={video.id}
            status={video.status}
            poster={video.thumbnail_url || undefined}
            onTimeUpdate={handleTimeUpdate}
            className="aspect-video"
          />
        </div>
        
        {/* Video Info */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 mb-8">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              {video.category && (
                <span className="px-3 py-1 bg-[var(--fan-primary)]/10 text-[var(--fan-primary)] rounded-full text-xs font-bold uppercase">
                  {video.category}
                </span>
              )}
              {video.team?.name && (
                <span className="text-gray-500 text-sm font-medium">
                  {video.team.name}
                </span>
              )}
            </div>
            
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-3">
              {video.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
              {video.duration_seconds && (
                <span className="flex items-center gap-1">
                  <Icon name="schedule" size="text-base" />
                  {formatDuration(video.duration_seconds)}
                </span>
              )}
              {video.recorded_at && (
                <span className="flex items-center gap-1">
                  <Icon name="calendar_today" size="text-base" />
                  {formatDate(video.recorded_at)}
                </span>
              )}
              {typeof video.view_count === 'number' && (
                <span className="flex items-center gap-1">
                  <Icon name="visibility" size="text-base" />
                  {video.view_count.toLocaleString()} views
                </span>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-3">
            {videoId && video.org_id && (
              <VideoFavoriteButton
                videoId={videoId}
                orgId={video.org_id}
              />
            )}
            <Button variant="secondary" className="flex items-center gap-2">
              <Icon name="share" size="text-sm" />
              Share
            </Button>
          </div>
        </div>
        
        {/* Description */}
        {video.description && (
          <div className="bg-gray-50 rounded-xl p-6 mb-8">
            <h3 className="text-sm font-bold text-gray-900 uppercase mb-3">Description</h3>
            <p className="text-gray-600 leading-relaxed">{video.description}</p>
          </div>
        )}
        
        {/* Tagged Athletes */}
        {video.athlete_links && video.athlete_links.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-900 uppercase mb-4">Featured Athletes</h3>
            <div className="flex flex-wrap gap-3">
              {video.athlete_links.map((link) => (
                <Link
                  key={link.id}
                  to={`/fan/athlete/${link.athlete_id}`}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full hover:border-[var(--fan-primary)] hover:shadow-sm transition-all group"
                >
                  <div className="size-6 rounded-full bg-gray-200 flex items-center justify-center">
                    <Icon name="person" size="text-xs" className="text-gray-500" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-[var(--fan-primary)]">
                    {link.link_type === 'featured' ? 'Featured' : 'Appears'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}
        
        {/* Team Info */}
        {video.team && (
          <div className="border-t border-gray-100 pt-6">
            <div className="inline-flex items-center gap-3">
              <div className="size-10 rounded-lg bg-[var(--fan-primary)]/10 flex items-center justify-center">
                <Icon name="groups" className="text-[var(--fan-primary)]" />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Team</p>
                <p className="font-bold text-gray-900">
                  {video.team.name}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
