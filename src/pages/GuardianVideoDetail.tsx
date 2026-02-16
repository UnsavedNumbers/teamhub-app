/**
 * Guardian Video Detail Page
 * 
 * Video detail view for guardians with coach notes display.
 * Shows video player, timestamped notes, and feedback summary.
 */

import { useState, useMemo, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import PortalLayout from '@/components/portal/PortalLayout'
import Card from '@/components/portal/Card'
import Button from '@/components/portal/Button'
import Icon from '@/components/portal/Icon'
import { VideoPlayer, type VideoPlayerRef, VideoNoteCard, VideoFavoriteButton } from '@/components/video'
import { useVideo, useVideoNotes, useVideoBookmarks } from '@/hooks/useVideos'
import { useVideoFavorites } from '@/hooks/useVideosExtended'
import { cn } from '@/utils/cn'
import type { VideoNote } from '@/types/video'
import { AccordionItem } from '@/components/video/Accordion'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { t } from '@/i18n'

export default function GuardianVideoDetail() {
  const { id: videoId } = useParams<{ id: string }>()
  const [currentTime, setCurrentTime] = useState(0)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [activeBookmarkId, setActiveBookmarkId] = useState<string | null>(null)
  const [starredNotes, setStarredNotes] = useState<Set<string>>(new Set())
  const videoPlayerRef = useRef<VideoPlayerRef>(null)
  const videoCardRef = useRef<HTMLDivElement>(null)

  // Fetch video and notes
  const { video, isLoading: videoLoading, error: videoError } = useVideo({
    videoId,
    enabled: !!videoId
  })
  
  useVideoFavorites({ enabled: !!videoId })
  
  const { notes, isLoading: _notesLoading } = useVideoNotes({
    videoId,
    enabled: !!videoId
  })
  
  const { bookmarks } = useVideoBookmarks({ videoId, enabled: !!videoId })
  
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
  
  // Handle seeking to a note's timestamp (or bookmark or timestamp link)
  const handleSeekToNote = useCallback((timestamp: number) => {
    // Start at t-1 to account for scroll time so the moment is visible when user arrives
    const seekTime = Math.max(0, timestamp - 1)
    setCurrentTime(seekTime)
    videoPlayerRef.current?.seekTo(seekTime)
    videoCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    // Find and highlight matching note if any (match on original timestamp)
    const note = notes.find(n => n.timestamp_start !== null && Math.abs((n.timestamp_start || 0) - timestamp) < 1)
    if (note) {
      setActiveNoteId(note.id)
    }
    // Find and highlight matching bookmark if any
    const bookmark = bookmarks?.find(b => Math.abs(b.timestamp_seconds - timestamp) < 1)
    if (bookmark) {
      setActiveBookmarkId(bookmark.id)
    } else {
      setActiveBookmarkId(null)
    }
  }, [notes, bookmarks])
  
  // Capture current video playhead time (for bookmark creation)
  const handleCaptureTime = useCallback((): number => {
    return videoPlayerRef.current?.getCurrentTime() ?? currentTime
  }, [currentTime])
  
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
            orgId={video.org_id}
          />
          <Button onClick={handleMarkReviewed} className="flex items-center gap-2">
            <Icon name="check_circle" size="text-sm" />
            MARK AS REVIEWED
          </Button>
        </div>
      </div>
      
      {/* Video Player Section */}
      <div ref={videoCardRef}>
      <Card noPadding className="overflow-hidden mb-8">
        {/* Player */}
        <VideoPlayer
          ref={videoPlayerRef}
          videoId={video.id}
          status={video.status}
          poster={video.thumbnail_url || undefined}
          onTimeUpdate={handleTimeUpdate}
          markers={markers}
          onMarkerClick={(marker) => handleSeekToNote(marker.time)}
          className="rounded-none"
        />
        
        {/* Description */}
        {(video.description || (video.tags && video.tags.length > 0)) && (
          <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
            {video.description && (
              <p className="text-sm text-slate-700 dark:text-slate-300 mb-4">
                {video.description}
              </p>
            )}
            {video.tags && video.tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Icon name="label" size="text-sm" className="text-slate-400 shrink-0" />
                {video.tags.map((link) => (
                  <span
                    key={link.id}
                    className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                    style={link.tag?.color ? { borderColor: link.tag.color, color: link.tag.color } : undefined}
                  >
                    {link.tag?.name ?? 'Tag'}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
        
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
      </div>

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
        </div>
      </div>
      
      {/* Bookmarks Section */}
      <Card className="mt-8">
        <AccordionItem
          title="My Bookmarks"
          badge={bookmarks?.length ?? 0}
        >
          <BookmarksPanel
            videoId={videoId!}
            onSeek={handleSeekToNote}
            onCaptureTime={handleCaptureTime}
            activeBookmarkId={activeBookmarkId}
          />
        </AccordionItem>
      </Card>
    </PortalLayout>
  )
}

// Bookmarks Panel Component (for guardian/athlete personal bookmarks)
function BookmarksPanel({
  videoId,
  onSeek,
  onCaptureTime,
  activeBookmarkId,
}: {
  videoId: string
  onSeek: (time: number) => void
  onCaptureTime: () => number
  activeBookmarkId?: string | null
}) {
  const { bookmarks, isLoading, createBookmark, deleteBookmark } = useVideoBookmarks({ videoId, enabled: true })
  const [showAddForm, setShowAddForm] = useState(false)
  const [label, setLabel] = useState('')
  const [adding, setAdding] = useState(false)
  const [bookmarkToDeleteId, setBookmarkToDeleteId] = useState<string | null>(null)

  const handleAdd = async () => {
    setAdding(true)
    try {
      const timestamp = onCaptureTime()
      await createBookmark(timestamp, label || undefined)
      setLabel('')
      setShowAddForm(false)
    } finally {
      setAdding(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest">
          {t('videoLibrary.bookmarks.title')}
        </h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-sm font-bold text-[var(--org-btn-primary-bg)] hover:underline flex items-center gap-1"
          >
            <Icon name="add" size="text-sm" />
            {t('videoLibrary.bookmarks.addBookmark')}
          </button>
        )}
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="mb-4 p-4 border border-[var(--org-btn-primary-bg)] rounded-lg space-y-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-1">
              {t('videoLibrary.bookmarks.bookmarkLabel')}
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t('videoLibrary.bookmarks.bookmarkLabelPlaceholder')}
              className="w-full px-3 py-2 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
              autoFocus
            />
          </div>
          <div className="text-xs text-gray-500">
            At {formatTimestamp(onCaptureTime())}
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="!px-4 !py-2 text-sm"
              onClick={() => {
                setShowAddForm(false)
                setLabel('')
              }}
              disabled={adding}
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              className="!px-4 !py-2 text-sm"
              onClick={handleAdd}
              disabled={adding}
            >
              {adding ? t('common.adding') : t('common.add')}
            </Button>
          </div>
        </div>
      )}

      {/* Bookmarks List */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          ))}
        </div>
      ) : bookmarks.length === 0 ? (
        <div className="text-center py-6 text-gray-500 text-sm">
          <Icon name="bookmark" size="text-3xl" className="mx-auto mb-2" />
          <p>{t('videoLibrary.bookmarks.noBookmarksMessage')}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bookmarks.map(bookmark => {
            const isActive = activeBookmarkId === bookmark.id
            return (
              <div
                key={bookmark.id}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors group",
                  isActive
                    ? "border-[var(--org-btn-primary-bg)] bg-[var(--org-btn-primary-bg)]/5"
                    : "border-gray-200 dark:border-gray-700 hover:border-[var(--org-btn-primary-bg)]"
                )}
              >
                <button
                  onClick={() => onSeek(bookmark.timestamp_seconds)}
                  className={cn(
                    "px-3 py-1 text-white rounded text-xs font-black hover:bg-opacity-90 transition-colors",
                    isActive
                      ? "bg-[var(--org-btn-primary-bg)]"
                      : "bg-[var(--org-btn-primary-bg)]"
                  )}
                >
                  {formatTimestamp(bookmark.timestamp_seconds)}
                </button>
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                  {bookmark.label || t('videoLibrary.bookmarks.jumpTo')}
                </span>
                <button
                  onClick={() => setBookmarkToDeleteId(bookmark.id)}
                  className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                >
                  <Icon name="delete" size="text-sm" />
                </button>
              </div>
            )
          })}
        </div>
      )}
      <ConfirmDialog
        open={bookmarkToDeleteId !== null}
        title={t('videoLibrary.bookmarks.deleteConfirmTitle')}
        description={t('videoLibrary.bookmarks.deleteConfirm')}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        variant="danger"
        onConfirm={() => {
          if (bookmarkToDeleteId) deleteBookmark(bookmarkToDeleteId)
          setBookmarkToDeleteId(null)
        }}
        onCancel={() => setBookmarkToDeleteId(null)}
      />
    </div>
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
