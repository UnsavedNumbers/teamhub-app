/**
 * Guardian Video Detail Page
 * 
 * Video detail view for guardians with coach notes display.
 * Shows video player, timestamped notes, and feedback summary.
 */

import { useState, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import PortalLayout from '@/components/portal/PortalLayout'
import Card from '@/components/portal/Card'
import Button from '@/components/portal/Button'
import Icon from '@/components/portal/Icon'
import { VideoPlayer, VideoNoteCard, VideoFavoriteButton } from '@/components/video'
import { useVideo, useVideoNotes } from '@/hooks/useVideos'
import { useVideoFavorites } from '@/hooks/useVideosExtended'
import { cn } from '@/utils/cn'
import type { VideoNote } from '@/types/video'

export default function GuardianVideoDetail() {
  const { id: videoId } = useParams<{ id: string }>()
  const [currentTime, setCurrentTime] = useState(0)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [starredNotes, setStarredNotes] = useState<Set<string>>(new Set())
  
  // Fetch video and notes
  const { video, isLoading: videoLoading, error: videoError } = useVideo({
    videoId,
    enabled: !!videoId
  })
  
  const { isFavorited, toggleFavorite } = useVideoFavorites(videoId || '')
  
  const { notes, isLoading: _notesLoading } = useVideoNotes({
    videoId,
    enabled: !!videoId
  })
  
  // Separate notes by type (for athlete vs team)
  const { athleteNotes, teamNotes } = useMemo(() => {
    const athlete: VideoNote[] = []
    const team: VideoNote[] = []
    
    notes.forEach(note => {
      if (note.scope === 'guardians') {
        athlete.push(note)
      } else if (note.scope === 'all') {
        team.push(note)
      }
    })
    
    return {
      athleteNotes: athlete.sort((a, b) => (a.timestamp_start || 0) - (b.timestamp_start || 0)),
      teamNotes: team.sort((a, b) => (a.timestamp_start || 0) - (b.timestamp_start || 0))
    }
  }, [notes])
  
  // Create markers for timeline from notes
  const markers = useMemo(() => {
    return notes
      .filter(note => note.timestamp_start !== null && note.timestamp_start !== undefined)
      .map(note => ({
        time: note.timestamp_start!,
        label: note.title || note.content.substring(0, 50),
        color: note.scope === 'guardians' ? 'var(--org-btn-primary-bg)' : undefined
      }))
  }, [notes])
  
  // Handle seeking to a note's timestamp
  const handleSeekToNote = useCallback((timestamp: number) => {
    setCurrentTime(timestamp)
    // Find the note at this timestamp
    const note = notes.find(n => n.timestamp_start === timestamp)
    if (note) {
      setActiveNoteId(note.id)
    }
  }, [notes])
  
  // Handle time update from player
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time)
    
    // Find the closest note to current time
    const tolerance = 2 // 2 second tolerance
    const activeNote = notes.find(note => 
      note.timestamp_start !== null && 
      Math.abs((note.timestamp_start || 0) - time) < tolerance
    )
    
    if (activeNote) {
      setActiveNoteId(activeNote.id)
    }
  }, [notes])
  
  // Toggle star on a note
  const handleToggleStar = useCallback((note: VideoNote) => {
    setStarredNotes(prev => {
      const next = new Set(prev)
      if (next.has(note.id)) {
        next.delete(note.id)
      } else {
        next.add(note.id)
      }
      return next
    })
  }, [])
  
  // Mark as reviewed
  const handleMarkReviewed = useCallback(() => {
    // TODO: Implement mark as reviewed API call
    console.log('Mark video as reviewed:', videoId)
  }, [videoId])
  
  // Loading state
  if (videoLoading) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Videos', path: '/portal/videos' },
          { label: 'Loading...' }
        ]}
      >
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-4" />
          <div className="aspect-video bg-slate-200 dark:bg-slate-700 rounded-2xl mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              ))}
            </div>
            <div className="space-y-4">
              {[1, 2].map(i => (
                <div key={i} className="h-32 bg-slate-200 dark:bg-slate-700 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </PortalLayout>
    )
  }
  
  // Error state
  if (videoError || !video) {
    return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Videos', path: '/portal/videos' },
          { label: 'Error' }
        ]}
      >
        <Card className="text-center py-12">
          <Icon name="error" size="text-4xl" className="text-red-500 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            Failed to load video
          </h3>
          <p className="text-slate-500 mb-4">
            {videoError?.message || 'Video not found'}
          </p>
          <Button as={Link} to="/portal/videos">
            Back to Videos
          </Button>
        </Card>
      </PortalLayout>
    )
  }
  
  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: 'Videos', path: '/portal/videos' },
        { label: video.title }
      ]}
    >
      {/* Page Heading */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="flex-1">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-2">
            Guardian Video: Athlete Feedback
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-base">
            {video.team?.name && `${video.team.name} - `}
            {video.title}
          </p>
        </div>
        <div className="flex gap-2">
          <VideoFavoriteButton
            videoId={videoId!}
            isFavorited={isFavorited}
            onToggle={toggleFavorite}
          />
          <Button onClick={handleMarkReviewed} className="flex items-center gap-2">
            <Icon name="check_circle" size="text-sm" />
            MARK AS REVIEWED
          </Button>
        </div>
      </div>
      
      {/* Video Player Section */}
      <Card noPadding className="overflow-hidden mb-8">
        {/* Player */}
        <VideoPlayer
          videoId={video.id}
          status={video.status}
          poster={video.thumbnail_url || undefined}
          onTimeUpdate={handleTimeUpdate}
          markers={markers}
          onMarkerClick={(marker) => handleSeekToNote(marker.time)}
          className="rounded-none"
        />
        
        {/* Interactive Timeline Bar */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            <div className="flex items-center gap-12 px-4 whitespace-nowrap">
              {markers.map((marker, index) => {
                const isActive = Math.abs(currentTime - marker.time) < 2
                return (
                  <button
                    key={index}
                    onClick={() => handleSeekToNote(marker.time)}
                    className="flex flex-col items-center gap-1 group cursor-pointer"
                  >
                    <div className={cn(
                      "size-4 rounded-full border-4 transition-all",
                      isActive 
                        ? "bg-[var(--org-btn-primary-bg)] border-[var(--org-btn-primary-bg)]/20 scale-125 shadow-sm shadow-[var(--org-btn-primary-bg)]"
                        : marker.time <= currentTime
                        ? "bg-[var(--org-btn-primary-bg)] border-[var(--org-btn-primary-bg)]/20"
                        : "bg-slate-300 dark:bg-slate-600"
                    )} />
                    <span className={cn(
                      "text-[10px] font-bold",
                      isActive ? "text-[var(--org-btn-primary-bg)]" : "text-slate-400"
                    )}>
                      {formatTimestamp(marker.time)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Card>
      
      {/* Notes Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Athlete Feedback */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold tracking-tight uppercase text-slate-900 dark:text-white">
              Feedback for Athlete
            </h3>
            <span className="bg-[var(--org-btn-primary-bg)]/10 text-[var(--org-btn-primary-bg)] px-3 py-1 rounded-full text-xs font-bold">
              {athleteNotes.length} {athleteNotes.length === 1 ? 'NOTE' : 'NOTES'}
            </span>
          </div>
          
          {athleteNotes.length === 0 ? (
            <Card className="text-center py-8">
              <Icon name="comment" size="text-3xl" className="text-slate-300 mb-2" />
              <p className="text-slate-500 text-sm">No personal feedback available</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {athleteNotes.map((note) => (
                <VideoNoteCard
                  key={note.id}
                  note={note}
                  isActive={activeNoteId === note.id}
                  isGuardianView
                  onSeek={handleSeekToNote}
                  onStar={handleToggleStar}
                  isStarred={starredNotes.has(note.id)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Team Notes */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold tracking-tight uppercase text-slate-900 dark:text-white">
              Team Notes
            </h3>
            <span className="bg-slate-200 dark:bg-slate-800 text-slate-500 px-3 py-1 rounded-full text-xs font-bold">
              GENERAL
            </span>
          </div>
          
          {teamNotes.length === 0 ? (
            <Card className="text-center py-8 opacity-80">
              <Icon name="groups" size="text-3xl" className="text-slate-300 mb-2" />
              <p className="text-slate-500 text-sm">No team notes available</p>
            </Card>
          ) : (
            <div className="space-y-4">
              {teamNotes.map((note) => (
                <div key={note.id} className="opacity-80">
                  <VideoNoteCard
                    note={note}
                    isActive={activeNoteId === note.id}
                    isGuardianView
                    onSeek={handleSeekToNote}
                  />
                </div>
              ))}
            </div>
          )}
          
          {/* Coaches' Summary */}
          <div className="mt-10 p-6 bg-[var(--org-btn-primary-bg)]/5 dark:bg-[var(--org-btn-primary-bg)]/10 rounded-xl border border-[var(--org-btn-primary-bg)]/20">
            <h4 className="font-bold text-sm mb-2 text-[var(--org-btn-primary-bg)] uppercase">
              Coaches' Summary
            </h4>
            <p className="text-sm text-slate-700 dark:text-slate-300 italic">
              {video.description || 
                "Overall, great effort shown in this session. Review the timestamped notes for specific areas to focus on during practice."}
            </p>
          </div>
        </div>
      </div>
    </PortalLayout>
  )
}

/**
 * Format timestamp helper
 */
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
