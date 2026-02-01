/**
 * Coach Video Detail Page
 * 
 * Full video analysis interface for coaches - video player, note composer,
 * chronological notes, sharing controls, and video metadata.
 */

import { useState, useMemo, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { VideoPlayer, VideoNoteCard, VideoNoteComposer } from '@/components/video'
import { useVideo, useVideoNotes, useVideoMutations } from '@/hooks/useVideos'
import type { VideoNote, VideoCategory, VideoNoteScope, VideoAthleteLink } from '@/types/video'
import { AdminPageHeader, Card } from '@/components/platformAdmin'
import Button from '@/components/portal/Button'
import Icon from '@/components/portal/Icon'
import '@/styles/orgAdmin.css'

export default function CoachVideoDetail() {
  const { id: videoId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  
  // State
  const [currentTime, setCurrentTime] = useState(0)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'timestamp' | 'created'>('timestamp')
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  
  // Fetch data
  const { video, isLoading: videoLoading, error: videoError, refresh: refreshVideo } = useVideo({
    videoId,
    enabled: !!videoId
  })
  
  const { notes, isLoading: notesLoading, createNote, deleteNote, refresh: refreshNotes } = useVideoNotes({
    videoId,
    enabled: !!videoId
  })
  
  const { deleteVideo, updateVideo } = useVideoMutations()
  
  // Sort notes
  const sortedNotes = useMemo(() => {
    return [...notes].sort((a, b) => {
      if (sortBy === 'timestamp') {
        return (a.timestamp_start || 0) - (b.timestamp_start || 0)
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })
  }, [notes, sortBy])
  
  // Create markers for timeline
  const markers = useMemo(() => {
    return notes
      .filter(note => note.timestamp_start !== null && note.timestamp_start !== undefined)
      .map(note => ({
        time: note.timestamp_start!,
        label: note.title || note.content.substring(0, 30),
        color: 'var(--org-btn-primary-bg)'
      }))
  }, [notes])
  
  // Handle note creation
  const handleCreateNote = useCallback(async (data: {
    content: string
    title?: string
    timestamp_start?: number
    scope: VideoNoteScope
    target_athlete_ids?: string[]
  }) => {
    if (!videoId) return
    
    await createNote({
      content: data.content,
      title: data.title,
      timestamp_start: data.timestamp_start ?? currentTime,
      scope: data.scope,
      target_athlete_ids: data.target_athlete_ids
    })
    
    refreshNotes()
  }, [videoId, currentTime, createNote, refreshNotes])
  
  // Handle note deletion
  const handleDeleteNote = useCallback(async (note: VideoNote) => {
    if (window.confirm('Are you sure you want to delete this note?')) {
      await deleteNote(note.id)
      refreshNotes()
    }
  }, [deleteNote, refreshNotes])
  
  // Handle seeking to timestamp
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
    const tolerance = 2
    const activeNote = notes.find(note =>
      note.timestamp_start !== null &&
      Math.abs((note.timestamp_start || 0) - time) < tolerance
    )
    
    if (activeNote) {
      setActiveNoteId(activeNote.id)
    }
  }, [notes])
  
  // Copy link to clipboard
  const handleCopyLink = useCallback(() => {
    const url = `${window.location.origin}/admin/videos/${videoId}`
    navigator.clipboard.writeText(url)
    // Could add a toast notification here
  }, [videoId])
  
  // Handle video edit
  const handleStartEdit = useCallback(() => {
    if (video) {
      setEditTitle(video.title)
      setEditDescription(video.description || '')
      setIsEditingDetails(true)
    }
  }, [video])
  
  const handleSaveDetails = useCallback(async () => {
    if (!videoId || !video) return
    
    setIsSaving(true)
    try {
      await updateVideo(videoId, {
        title: editTitle,
        description: editDescription
      })
      setIsEditingDetails(false)
      refreshVideo()
    } catch (err) {
      console.error('Error saving video details:', err)
    } finally {
      setIsSaving(false)
    }
  }, [videoId, video, editTitle, editDescription, updateVideo, refreshVideo])
  
  // Handle video delete
  const handleDeleteVideo = useCallback(async () => {
    if (!videoId) return
    
    if (window.confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
      await deleteVideo(videoId)
      navigate('/admin/videos')
    }
  }, [videoId, deleteVideo, navigate])
  
  // Category labels
  const categoryLabels: Record<VideoCategory, string> = {
    game: 'Game',
    practice: 'Practice',
    training: 'Training',
    highlight: 'Highlight',
    event: 'Event',
    other: 'Other'
  }
  
  // Loading state
  if (videoLoading) {
    return (
      <div className="oa-theme-active pa-layout">
        <AdminPageHeader
          title="Loading..."
          breadcrumbs={[
            { label: 'Admin', path: '/admin/dashboard' },
            { label: 'Videos', path: '/admin/videos' },
            { label: 'Loading...' }
          ]}
        />
        <div className="animate-pulse space-y-8">
          <Card className="aspect-video" />
          <Card />
        </div>
      </div>
    )
  }
  
  // Error state
  if (videoError || !video) {
    return (
      <div className="oa-theme-active pa-layout">
        <AdminPageHeader
          title="Error"
          breadcrumbs={[
            { label: 'Admin', path: '/admin/dashboard' },
            { label: 'Videos', path: '/admin/videos' },
            { label: 'Error' }
          ]}
        />
        <Card className="text-center py-12">
          <Icon name="error" size="text-5xl" className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Failed to load video</h2>
          <p className="text-gray-500 mb-4">{videoError?.message || 'Video not found'}</p>
          <Button onClick={() => navigate('/admin/videos')}>
            Back to Library
          </Button>
        </Card>
      </div>
    )
  }
  
  return (
    <div className="oa-theme-active pa-layout">
      {/* Page Header */}
      <AdminPageHeader
        title={video.title}
        subtitle={`${video.category ? categoryLabels[video.category] : 'Video'} • ${video.team?.name || 'All Teams'}`}
        breadcrumbs={[
          { label: 'Admin', path: '/admin/dashboard' },
          { label: 'Videos', path: '/admin/videos' },
          { label: video.title }
        ]}
        actions={
          <>
            <Button variant="secondary" onClick={handleCopyLink}>
              <Icon name="ios_share" size="text-sm" className="mr-2" />
              Share
            </Button>
            <Button variant="secondary" onClick={handleStartEdit}>
              <Icon name="edit" size="text-sm" className="mr-2" />
              Edit
            </Button>
            <button
              onClick={handleDeleteVideo}
              className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <Icon name="delete" size="text-sm" />
              Delete
            </button>
          </>
        }
      />
      
      {/* Video Player */}
      <Card className="mb-8 overflow-hidden">
        <VideoPlayer
          videoId={video.id}
          poster={video.thumbnail_url || undefined}
          onTimeUpdate={handleTimeUpdate}
          markers={markers}
          onMarkerClick={(marker) => handleSeekToNote(marker.time)}
        />
      </Card>
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Column - Video Details & Sharing */}
        <div className="col-span-12 lg:col-span-5 space-y-8">
          {/* Analysis Details */}
          <Card>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest">Analysis Details</h3>
              <span className="bg-gray-100 dark:bg-gray-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded">
                {video.category ? categoryLabels[video.category].toUpperCase() : 'RAW FILM'}
              </span>
            </div>
            
            <div className="space-y-6">
              {/* Description */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  Description
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {video.description || 'No description provided. Add notes below to document key moments.'}
                </p>
              </div>
              
              {/* Tags */}
              {video.tags && video.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {video.tags.map((tagLink, i) => (
                    <div
                      key={i}
                      className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-500 flex items-center gap-1.5"
                    >
                      <Icon name="tag" size="text-sm" />
                      {tagLink.tag?.name?.toUpperCase() || 'TAG'}
                    </div>
                  ))}
                </div>
              )}
              
              {/* Metadata */}
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    Uploaded By
                  </label>
                  <span className="text-sm font-bold">
                    {video.uploader?.full_name || 'Unknown'}
                  </span>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    Upload Date
                  </label>
                  <span className="text-sm font-bold">
                    {new Date(video.created_at).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                {video.duration_seconds && (
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Duration
                    </label>
                    <span className="text-sm font-bold">
                      {formatDuration(video.duration_seconds)}
                    </span>
                  </div>
                )}
                {video.notes_count !== undefined && (
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      Notes
                    </label>
                    <span className="text-sm font-bold">
                      {video.notes_count}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>
          
          {/* Sharing Controls */}
          <Card className="bg-[var(--org-btn-primary-bg)]/5 border-[var(--org-btn-primary-bg)]/10">
            <h3 className="text-sm font-black text-[var(--org-btn-primary-bg)] uppercase tracking-widest mb-4">
              Sharing Controls
            </h3>
            
            <div className="flex flex-col gap-3">
              <button
                onClick={handleCopyLink}
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl flex items-center justify-between hover:border-[var(--org-btn-primary-bg)] transition-all group"
              >
                <div className="flex items-center gap-3">
                  <Icon name="link" size="text-lg" className="text-[var(--org-btn-primary-bg)]" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Copy Analysis Link</span>
                </div>
                <Icon name="content_copy" size="text-lg" className="text-gray-300 group-hover:text-[var(--org-btn-primary-bg)]" />
              </button>
              
              <button className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl flex items-center justify-between hover:border-[var(--org-btn-primary-bg)] transition-all group">
                <div className="flex items-center gap-3">
                  <Icon name="mail" size="text-lg" className="text-[var(--org-btn-primary-bg)]" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Email to Athletes</span>
                </div>
                <Icon name="arrow_forward" size="text-lg" className="text-gray-300 group-hover:text-[var(--org-btn-primary-bg)]" />
              </button>
              
              <button className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 rounded-xl flex items-center justify-between hover:border-[var(--org-btn-primary-bg)] transition-all group">
                <div className="flex items-center gap-3">
                  <Icon name="download" size="text-lg" className="text-[var(--org-btn-primary-bg)]" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Export Clips</span>
                </div>
                <Icon name="arrow_forward" size="text-lg" className="text-gray-300 group-hover:text-[var(--org-btn-primary-bg)]" />
              </button>
            </div>
          </Card>
          
          {/* Linked Athletes */}
          {video.athlete_links && video.athlete_links.length > 0 && (
            <Card>
              <h3 className="text-sm font-black uppercase tracking-widest mb-4">
                Linked Athletes
              </h3>
              <div className="space-y-2">
                {video.athlete_links.map((link: VideoAthleteLink) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Icon name="person" size="text-sm" className="text-gray-500" />
                    </div>
                    <span className="text-sm font-medium">Athlete #{link.athlete_id.slice(0, 8)}</span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-bold uppercase">
                      {link.link_type}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
        
        {/* Right Column - Note Composer & Notes List */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Interactive Composer */}
          <VideoNoteComposer
            currentTime={currentTime}
            onSave={handleCreateNote}
          />
          
          {/* Notes List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black uppercase tracking-widest">
                Chronological Notes
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400">
                SORT BY{' '}
                <button
                  onClick={() => setSortBy(sortBy === 'timestamp' ? 'created' : 'timestamp')}
                  className="text-[var(--org-btn-primary-bg)] cursor-pointer underline"
                >
                  {sortBy === 'timestamp' ? 'TIMESTAMP' : 'DATE CREATED'}
                </button>
              </div>
            </div>
            
            {notesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex gap-4">
                      <div className="h-10 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : sortedNotes.length === 0 ? (
              <Card className="text-center py-8">
                <Icon name="speaker_notes_off" size="text-4xl" className="text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-gray-500 text-sm">
                  No notes yet. Use the composer above to add your first coaching observation.
                </p>
              </Card>
            ) : (
              <div className="space-y-4">
                {sortedNotes.map(note => (
                  <VideoNoteCard
                    key={note.id}
                    note={note}
                    isActive={activeNoteId === note.id}
                    isGuardianView={false}
                    onSeek={handleSeekToNote}
                    onEdit={() => {
                      // Could open an edit modal here
                      console.log('Edit note:', note.id)
                    }}
                    onDelete={handleDeleteNote}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Edit Video Modal */}
      {isEditingDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold">Edit Video Details</h3>
              <button
                onClick={() => setIsEditingDetails(false)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <Icon name="close" size="text-xl" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent resize-none"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
                <Button
                  variant="secondary"
                  onClick={() => setIsEditingDetails(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveDetails}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Back Link */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
        <Link
          to="/admin/videos"
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--org-btn-primary-bg)] hover:underline"
        >
          <Icon name="arrow_back" size="text-lg" />
          Back to Video Library
        </Link>
      </div>
    </div>
  )
}

/**
 * Format duration helper
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}
