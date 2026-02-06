/**
 * Coach Video Detail Page - COMPLETE IMPLEMENTATION
 * 
 * Full video analysis interface for coaches with:
 * - Video player with Mux signed playback
 * - Complete metadata editing (all fields)
 * - Athlete linking with bulk actions
 * - Tag management (create, add, remove)
 * - Coaching notes with athlete targeting
 * - Comments section with threading
 * - Personal bookmarks
 * - Shareable links
 * - Processing state indicators
 * - Demo mode support
 * - Offline detection
 * - Full error handling
 */

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { VideoPlayer, VideoNoteCard, VideoNoteComposer } from '@/components/video'
import {
  useVideo,
  useVideoNotes,
  useVideoMutations,
  useVideoTags,
  useVideoComments,
  useVideoBookmarks,
} from '@/hooks/useVideos'
import type {
  VideoNote,
  VideoCategory,
  VideoNoteScope,
  VideoAthleteLink,
  VideoVisibility,
  VideoLinkType,
  VideoComment,
} from '@/types/video'
import { AdminPageHeader, Card } from '@/components/platformAdmin'
import Button from '@/components/portal/Button'
import Icon from '@/components/portal/Icon'
import { t } from '@/i18n'
import { useOrganization } from '@/contexts/OrganizationContext'
import { supabase } from '@/lib/supabase'
import { getLink } from '@/utils/routes'
import { showSuccess, showError } from '@/utils/toast'
import { useCopyToClipboard } from '@/hooks/useCopyToClipboard'
import { cn } from '@/utils/cn'
import { USE_FAKE_DATA } from '@/data/config'
import '@/styles/orgAdmin.css'

// ============================================================================
// Helper Components
// ============================================================================

interface Athlete {
  id: string
  first_name: string
  last_name: string
  jersey_number: string | null
  has_profile_photo: boolean | null
  profile_photo_updated_at: string | null
}

interface Team {
  id: string
  name: string
}

interface Season {
  id: string
  name: string
  start_date: string
  end_date: string
}

interface Program {
  id: string
  name: string
}

interface Level {
  id: string
  name: string
}

interface Sport {
  id: string
  name: string
}

interface Event {
  id: string
  title: string
  type: string
}

// Athlete Selector Modal
function AthleteSelectorModal({
  isOpen,
  onClose,
  teamId,
  currentLinks,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  teamId: string | null
  currentLinks: VideoAthleteLink[]
  onSave: (athleteIds: string[], linkType: VideoLinkType) => Promise<void>
}) {
  const [athletes, setAthletes] = useState<Athlete[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [linkType, setLinkType] = useState<VideoLinkType>('appears')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && teamId) {
      fetchAthletes()
    }
  }, [isOpen, teamId])

  const fetchAthletes = async () => {
    if (!teamId) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('athletes')
        .select('id, first_name, last_name, jersey_number, has_profile_photo, profile_photo_updated_at')
        .order('last_name')
      if (error) throw error
      setAthletes(data || [])
    } catch (err) {
      console.error('Failed to load athletes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(selectedIds, linkType)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const toggleAll = () => {
    if (selectedIds.length === athletes.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(athletes.map(a => a.id))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h3 className="text-xl font-bold">{t('videoLibrary.athletes.linkAthletes')}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <Icon name="close" size="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Link Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
              {t('videoLibrary.athletes.linkType')}
            </label>
            <select
              value={linkType}
              onChange={(e) => setLinkType(e.target.value as VideoLinkType)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
            >
              <option value="appears">{t('videoLibrary.athletes.linkTypes.appears')}</option>
              <option value="featured">{t('videoLibrary.athletes.linkTypes.featured')}</option>
              <option value="highlight">{t('videoLibrary.athletes.linkTypes.highlight')}</option>
            </select>
          </div>

          {/* Select All */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-600 dark:text-gray-400">
              {t('videoLibrary.athletes.athletesSelected', { count: selectedIds.length })}
            </span>
            <button
              onClick={toggleAll}
              className="text-sm font-bold text-[var(--org-btn-primary-bg)] hover:underline"
            >
              {selectedIds.length === athletes.length ? t('common.clearSelection') : t('videoLibrary.athletes.linkAllTeam')}
            </button>
          </div>

          {/* Athlete List */}
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {athletes.map(athlete => {
                const isSelected = selectedIds.includes(athlete.id)
                const isCurrentlyLinked = currentLinks.some(link => link.athlete_id === athlete.id)
                
                return (
                  <label
                    key={athlete.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      isSelected
                        ? "border-[var(--org-btn-primary-bg)] bg-[var(--org-btn-primary-bg)]/5"
                        : "border-gray-200 dark:border-gray-700 hover:border-[var(--org-btn-primary-bg)]"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, athlete.id])
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== athlete.id))
                        }
                      }}
                      className="size-5 rounded border-gray-300 text-[var(--org-btn-primary-bg)] focus:ring-[var(--org-btn-primary-bg)]"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {athlete.first_name} {athlete.last_name}
                      </span>
                      {athlete.jersey_number && (
                        <span className="ml-2 text-sm text-gray-500">
                          #{athlete.jersey_number}
                        </span>
                      )}
                      {isCurrentlyLinked && (
                        <span className="ml-2 text-xs text-[var(--org-btn-primary-bg)] uppercase font-bold">
                          Already Linked
                        </span>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving && selectedIds.length === 0}
            >
              {saving ? t('common.saving') : t('videoLibrary.athletes.saveLinks')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Tag Manager Modal
function TagManagerModal({
  isOpen,
  onClose,
  orgId,
  currentTagIds,
  onSave,
}: {
  isOpen: boolean
  onClose: () => void
  orgId: string
  currentTagIds: string[]
  onSave: (tagIds: string[]) => Promise<void>
}) {
  const { tags, isLoading, createTag } = useVideoTags({ orgId, enabled: isOpen })
  const [selectedIds, setSelectedIds] = useState<string[]>(currentTagIds)
  const [saving, setSaving] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [newTagType, setNewTagType] = useState<'skill' | 'drill' | 'play' | 'custom'>('custom')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    setSelectedIds(currentTagIds)
  }, [currentTagIds, isOpen])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(selectedIds)
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    
    setCreating(true)
    try {
      const newTag = await createTag({
        name: newTagName.trim(),
        tag_type: newTagType,
        color: null,
        description: null,
      })
      
      if (newTag) {
        setSelectedIds([...selectedIds, newTag.id])
        setNewTagName('')
        setShowCreateForm(false)
      }
    } finally {
      setCreating(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
          <h3 className="text-xl font-bold">{t('videoLibrary.tags.title')}</h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white">
            <Icon name="close" size="text-xl" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Create Tag Form */}
          {showCreateForm ? (
            <div className="p-4 border border-[var(--org-btn-primary-bg)] rounded-lg space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.tags.tagName')}
                </label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="e.g., Zone Defense"
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.tags.tagType')}
                </label>
                <select
                  value={newTagType}
                  onChange={(e) => setNewTagType(e.target.value as any)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                >
                  <option value="custom">{t('videoLibrary.tags.tagTypes.custom')}</option>
                  <option value="skill">{t('videoLibrary.tags.tagTypes.skill')}</option>
                  <option value="drill">{t('videoLibrary.tags.tagTypes.drill')}</option>
                  <option value="play">{t('videoLibrary.tags.tagTypes.play')}</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="!px-4 !py-2 text-sm"
                  onClick={() => {
                    setShowCreateForm(false)
                    setNewTagName('')
                  }}
                  disabled={creating}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="primary"
                  className="!px-4 !py-2 text-sm"
                  onClick={handleCreateTag}
                  disabled={creating || !newTagName.trim()}
                >
                  {creating ? t('common.adding') : t('videoLibrary.tags.createTag')}
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreateForm(true)}
              className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-gray-500 hover:text-[var(--org-btn-primary-bg)] hover:border-[var(--org-btn-primary-bg)] transition-colors font-bold flex items-center justify-center gap-2"
            >
              <Icon name="add" />
              {t('videoLibrary.tags.createTag')}
            </button>
          )}

          {/* Tag List */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Icon name="label" size="text-4xl" className="mx-auto mb-2" />
              <p>{t('videoLibrary.tags.noTags')}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {tags.map(tag => {
                const isSelected = selectedIds.includes(tag.id)
                
                return (
                  <label
                    key={tag.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      isSelected
                        ? "border-[var(--org-btn-primary-bg)] bg-[var(--org-btn-primary-bg)]/5"
                        : "border-gray-200 dark:border-gray-700 hover:border-[var(--org-btn-primary-bg)]"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, tag.id])
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== tag.id))
                        }
                      }}
                      className="size-5 rounded border-gray-300 text-[var(--org-btn-primary-bg)] focus:ring-[var(--org-btn-primary-bg)]"
                    />
                    <div className="flex-1">
                      <span className="font-bold text-gray-900 dark:text-white">
                        {tag.name}
                      </span>
                      <span className="ml-2 text-xs text-gray-500 uppercase">
                        {tag.tag_type}
                      </span>
                      {tag.usage_count > 0 && (
                        <span className="ml-2 text-xs text-gray-400">
                          ({tag.usage_count} videos)
                        </span>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-800">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? t('common.saving') : t('common.save')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Comments Section Component
function CommentsSection({
  videoId,
  disabled = false,
}: {
  videoId: string
  disabled?: boolean
}) {
  const { comments, isLoading, createComment, deleteComment } = useVideoComments({ videoId, enabled: true })
  const [newComment, setNewComment] = useState('')
  const [posting, setPosting] = useState(false)

  const handlePost = async () => {
    if (!newComment.trim()) return
    
    setPosting(true)
    try {
      await createComment(newComment.trim())
      setNewComment('')
    } finally {
      setPosting(false)
    }
  }

  const threadedComments = useMemo(() => {
    const threads: (VideoComment & { replies?: VideoComment[] })[] = []
    const commentMap = new Map<string, VideoComment & { replies?: VideoComment[] }>()

    // Build map
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    // Build threads
    comments.forEach(comment => {
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id)
        if (parent) {
          parent.replies = parent.replies || []
          parent.replies.push(commentMap.get(comment.id)!)
        }
      } else {
        threads.push(commentMap.get(comment.id)!)
      }
    })

    return threads
  }, [comments])

  return (
    <Card className="p-6">
      <h3 className="text-sm font-black uppercase tracking-widest mb-6">
        {t('videoLibrary.comments.title')}
      </h3>

      {/* New Comment */}
      <div className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={t('videoLibrary.comments.writeComment')}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent resize-none"
          rows={3}
        />
        <div className="mt-2 flex justify-end">
          <Button
            variant="primary"
            className="!px-4 !py-2 text-sm"
            onClick={handlePost}
            disabled={disabled || posting || !newComment.trim()}
          >
            {posting ? t('common.adding') : t('videoLibrary.comments.postComment')}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
              <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
          ))}
        </div>
      ) : threadedComments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Icon name="comment" size="text-4xl" className="mx-auto mb-2" />
          <p className="text-sm">{t('videoLibrary.comments.noCommentsMessage')}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {threadedComments.map(comment => (
            <div key={comment.id} className="space-y-3">
              {/* Main Comment */}
              <div className="flex gap-3">
                <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                  <Icon name="person" size="text-sm" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold">
                      {comment.author?.full_name || 'User'}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                    {comment.is_edited && (
                      <span className="text-xs text-gray-400">
                        ({t('videoLibrary.comments.edited')})
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {comment.content}
                  </p>
                  <div className="mt-2 flex items-center gap-4">
                    <button className="text-xs font-bold text-gray-500 hover:text-[var(--org-btn-primary-bg)]">
                      {t('videoLibrary.comments.reply')}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(t('videoLibrary.comments.deleteConfirm'))) {
                          deleteComment(comment.id)
                        }
                      }}
                      className="text-xs font-bold text-gray-500 hover:text-red-500"
                    >
                      {t('videoLibrary.comments.deleteComment')}
                    </button>
                  </div>
                </div>
              </div>

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-11 space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700">
                  {comment.replies.map(reply => (
                    <div key={reply.id} className="flex gap-3">
                      <div className="size-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0">
                        <Icon name="person" size="text-xs" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold">
                            {reply.author?.full_name || 'User'}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(reply.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">
                          {reply.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// Bookmarks Panel Component
function BookmarksPanel({
  videoId,
  currentTime,
  onSeek,
  disabled = false,
}: {
  videoId: string
  currentTime: number
  onSeek: (time: number) => void
  disabled?: boolean
}) {
  const { bookmarks, isLoading, createBookmark, deleteBookmark } = useVideoBookmarks({ videoId, enabled: true })
  const [showAddForm, setShowAddForm] = useState(false)
  const [label, setLabel] = useState('')
  const [adding, setAdding] = useState(false)

  const handleAdd = async () => {
    setAdding(true)
    try {
      await createBookmark(currentTime, label || undefined)
      setLabel('')
      setShowAddForm(false)
    } finally {
      setAdding(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest">
          {t('videoLibrary.bookmarks.title')}
        </h3>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            disabled={disabled}
            className={cn(
              "text-sm font-bold text-[var(--org-btn-primary-bg)] hover:underline flex items-center gap-1",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            title={disabled ? t('videoLibrary.demoMode.message') : undefined}
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
            At {formatTimestamp(currentTime)}
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
          {bookmarks.map(bookmark => (
            <div
              key={bookmark.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-[var(--org-btn-primary-bg)] transition-colors group"
            >
              <button
                onClick={() => onSeek(bookmark.timestamp_seconds)}
                className="px-3 py-1 bg-[var(--org-btn-primary-bg)] text-white rounded text-xs font-black hover:bg-opacity-90"
              >
                {formatTimestamp(bookmark.timestamp_seconds)}
              </button>
              <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                {bookmark.label || t('videoLibrary.bookmarks.jumpTo')}
              </span>
              <button
                onClick={() => {
                  if (window.confirm('Delete bookmark?')) {
                    deleteBookmark(bookmark.id)
                  }
                }}
                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
              >
                <Icon name="delete" size="text-sm" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// Format timestamp helper
function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// Format duration helper
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

// ============================================================================
// Main Component
// ============================================================================

export default function CoachVideoDetail() {
  const { id: videoId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentOrganization } = useOrganization()
  
  // State
  const [currentTime, setCurrentTime] = useState(0)
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'timestamp' | 'created'>('timestamp')
  
  // Modals
  const [isEditingDetails, setIsEditingDetails] = useState(false)
  const [showAthletesModal, setShowAthletesModal] = useState(false)
  const [showTagsModal, setShowTagsModal] = useState(false)
  
  // Edit form state
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editCategory, setEditCategory] = useState<VideoCategory>('practice')
  const [editVisibility, setEditVisibility] = useState<VideoVisibility>('team')
  const [editTeamId, setEditTeamId] = useState<string | null>(null)
  const [editSeasonId, setEditSeasonId] = useState<string | null>(null)
  const [editProgramId, setEditProgramId] = useState<string | null>(null)
  const [editLevelId, setEditLevelId] = useState<string | null>(null)
  const [editSportId, setEditSportId] = useState<string | null>(null)
  const [editEventId, setEditEventId] = useState<string | null>(null)
  const [editRecordedAt, setEditRecordedAt] = useState<string>('')
  const [editRecordedLocation, setEditRecordedLocation] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  
  // Dropdowns for edit form
  const [teams, setTeams] = useState<Team[]>([])
  const [seasons, setSeasons] = useState<Season[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [sports, setSports] = useState<Sport[]>([])
  const [events, setEvents] = useState<Event[]>([])
  
  // Fetch data
  const { video, isLoading: videoLoading, error: videoError, refresh: refreshVideo } = useVideo({
    videoId,
    enabled: !!videoId
  })
  
  const { notes, isLoading: notesLoading, createNote, deleteNote, refresh: refreshNotes } = useVideoNotes({
    videoId,
    enabled: !!videoId
  })
  
  const { deleteVideo, updateVideo, linkAthletes, unlinkAthlete, linkTags } = useVideoMutations()
  
  // Load dropdown data when edit modal opens
  useEffect(() => {
    if (isEditingDetails && currentOrganization?.id) {
      loadDropdownData()
    }
  }, [isEditingDetails, currentOrganization?.id])
  
  const loadDropdownData = async () => {
    if (!currentOrganization?.id) return
    
    try {
      const [teamsRes, seasonsRes, programsRes, levelsRes, sportsRes, eventsRes] = await Promise.all([
        supabase.from('teams').select('id, name').eq('org_id', currentOrganization.id).order('name'),
        supabase.from('seasons').select('id, name, start_date, end_date').eq('org_id', currentOrganization.id).order('start_date', { ascending: false }),
        supabase.from('programs').select('id, name').eq('org_id', currentOrganization.id).order('name'),
        supabase.from('levels').select('id, name').eq('org_id', currentOrganization.id).order('name'),
        supabase.from('sports').select('id, name').order('name'),
        supabase.from('events').select('id, title, type').eq('org_id', currentOrganization.id).order('created_at', { ascending: false }).limit(50),
      ])
      
      setTeams(teamsRes.data || [])
      setSeasons(seasonsRes.data || [])
      setPrograms(programsRes.data || [])
      setLevels(levelsRes.data || [])
      setSports(sportsRes.data || [])
      setEvents(eventsRes.data || [])
    } catch (err) {
      console.error('Failed to load dropdown data:', err)
    }
  }
  
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
    if (window.confirm(t('videoLibrary.notes.deleteConfirm'))) {
      await deleteNote(note.id)
      refreshNotes()
    }
  }, [deleteNote, refreshNotes, t])
  
  // Handle seeking to timestamp
  const handleSeekToNote = useCallback((timestamp: number) => {
    setCurrentTime(timestamp)
    const note = notes.find(n => n.timestamp_start === timestamp)
    if (note) {
      setActiveNoteId(note.id)
    }
  }, [notes])
  
  // Handle time update from player
  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time)
    
    const tolerance = 2
    const activeNote = notes.find(note =>
      note.timestamp_start !== null &&
      Math.abs((note.timestamp_start || 0) - time) < tolerance
    )
    
    if (activeNote) {
      setActiveNoteId(activeNote.id)
    }
  }, [notes])
  
  const { copy: copyToClipboard } = useCopyToClipboard()

  // Copy link to clipboard
  const handleCopyLink = useCallback(async () => {
    if (!videoId) return
    const url = `${window.location.origin}${getLink('admin.videos.detail', { id: videoId })}`
    const ok = await copyToClipboard(url)
    if (ok) {
      showSuccess(t('videoLibrary.actions.linkCopied'))
    } else {
      showError(t('common.error.clipboardFailed'))
    }
  }, [videoId, copyToClipboard])
  
  // Handle video edit
  const handleStartEdit = useCallback(() => {
    if (video) {
      setEditTitle(video.title)
      setEditDescription(video.description || '')
      setEditCategory(video.category)
      setEditVisibility(video.visibility)
      setEditTeamId(video.team_id)
      setEditSeasonId(video.season_id || null)
      setEditProgramId(video.program_id || null)
      setEditLevelId(video.level_id || null)
      setEditSportId(video.sport_id || null)
      setEditEventId(video.event_id || null)
      setEditRecordedAt(video.recorded_at ? video.recorded_at.split('T')[0] : '')
      setEditRecordedLocation(video.recording_location || '')
      setIsEditingDetails(true)
    }
  }, [video])
  
  const handleSaveDetails = useCallback(async () => {
    if (!videoId || !video) return

    setIsSaving(true)
    try {
      // Only pass fields that exist on the videos table (no season_id, program_id, level_id, sport_id, recording_location)
      const ok = await updateVideo(videoId, {
        title: editTitle,
        description: editDescription,
        category: editCategory,
        visibility: editVisibility,
        team_id: editTeamId,
        event_id: editEventId,
        recorded_at: editRecordedAt || null,
      })
      if (ok) {
        setIsEditingDetails(false)
        refreshVideo()
        showSuccess(t('toast.success.updated'))
      } else {
        showError(t('videoLibrary.errors.updateFailed'))
      }
    } catch (err) {
      console.error('Error saving video details:', err)
      showError(t('videoLibrary.errors.updateFailed'))
    } finally {
      setIsSaving(false)
    }
  }, [videoId, video, editTitle, editDescription, editCategory, editVisibility, editTeamId, editEventId, editRecordedAt, updateVideo, refreshVideo, t])
  
  // Handle video delete
  const handleDeleteVideo = useCallback(async () => {
    if (!videoId) return
    
    if (window.confirm(t('videoLibrary.delete.message'))) {
      await deleteVideo(videoId)
      navigate(getLink('admin.videos.list'))
    }
  }, [videoId, deleteVideo, navigate, t])
  
  // Handle athlete links
  const handleSaveAthleteLinks = useCallback(async (athleteIds: string[], linkType: VideoLinkType) => {
    if (!videoId) return
    await linkAthletes(videoId, athleteIds, linkType)
    refreshVideo()
  }, [videoId, linkAthletes, refreshVideo])
  
  const handleUnlinkAthlete = useCallback(async (athleteId: string) => {
    if (!videoId) return
    if (window.confirm('Remove this athlete from the video?')) {
      await unlinkAthlete(videoId, athleteId)
      refreshVideo()
    }
  }, [videoId, unlinkAthlete, refreshVideo])
  
  // Handle tags
  const handleSaveTags = useCallback(async (tagIds: string[]) => {
    if (!videoId) return
    await linkTags(videoId, tagIds)
    refreshVideo()
  }, [videoId, linkTags, refreshVideo])
  
  // Loading state
  if (videoLoading) {
    return (
      <div className="oa-theme-active pa-layout">
        <AdminPageHeader
          title={t('common.loading')}
          breadcrumbs={[
            { label: 'Admin', path: getLink('admin.dashboard') },
            { label: t('videoLibrary.title'), path: getLink('admin.videos.list') },
            { label: t('common.loading') }
          ]}
        />
        <div className="animate-pulse space-y-8">
          <Card className="aspect-video" />
          <Card className="h-64" />
        </div>
      </div>
    )
  }
  
  // Error state
  if (videoError || !video) {
    return (
      <div className="oa-theme-active pa-layout">
        <AdminPageHeader
          title={t('videoLibrary.errors.notFound')}
          breadcrumbs={[
            { label: 'Admin', path: getLink('admin.dashboard') },
            { label: t('videoLibrary.title'), path: getLink('admin.videos.list') },
            { label: t('common.error.label') }
          ]}
        />
        <Card className="text-center py-12">
          <Icon name="error" size="text-5xl" className="text-red-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">{t('videoLibrary.errors.loadFailed')}</h2>
          <p className="text-gray-500 mb-4">{videoError?.message || t('videoLibrary.errors.loadFailedMessage')}</p>
          <Button onClick={() => navigate(getLink('admin.videos.list'))}>
            {t('common.goBack')}
          </Button>
        </Card>
      </div>
    )
  }
  
  const categoryLabels: Record<VideoCategory, string> = {
    game: t('videoUploader.categories.game'),
    practice: t('videoUploader.categories.practice'),
    training: t('videoUploader.categories.training'),
    highlight: t('videoUploader.categories.highlight'),
    event: t('videoUploader.categories.event'),
    other: t('videoUploader.categories.other'),
  }
  
  return (
    <div className="oa-theme-active pa-layout">
      {/* Demo Mode Banner */}
      {USE_FAKE_DATA && (
        <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-center gap-3">
          <Icon name="info" className="text-amber-500 text-xl" />
          <div>
            <p className="font-bold text-amber-700 dark:text-amber-400">
              {t('videoLibrary.demoMode.title')}
            </p>
            <p className="text-sm text-amber-600 dark:text-amber-500">
              {t('videoLibrary.demoMode.message')}
            </p>
          </div>
        </div>
      )}
      
      {/* Page Header */}
      <AdminPageHeader
        title={video.title}
        subtitle={`${video.category ? categoryLabels[video.category] : t('videoLibrary.title')} • ${video.team?.name || 'All Teams'}`}
        breadcrumbs={[
          { label: 'Admin', path: getLink('admin.dashboard') },
          { label: t('videoLibrary.title'), path: getLink('admin.videos.list') },
          { label: video.title }
        ]}
        actions={
          <>
            <Button variant="secondary" onClick={handleCopyLink}>
              <Icon name="ios_share" size="text-sm" className="mr-2" />
              {t('videoLibrary.actions.share')}
            </Button>
            <Button
              variant="secondary"
              onClick={handleStartEdit}
              disabled={USE_FAKE_DATA}
              title={USE_FAKE_DATA ? t('videoLibrary.demoMode.message') : undefined}
            >
              <Icon name="edit" size="text-sm" className="mr-2" />
              {t('common.edit')}
            </Button>
            <button
              onClick={handleDeleteVideo}
              disabled={USE_FAKE_DATA}
              title={USE_FAKE_DATA ? t('videoLibrary.demoMode.message') : undefined}
              className={cn(
                "px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors flex items-center gap-2",
                USE_FAKE_DATA && "opacity-50 cursor-not-allowed"
              )}
            >
              <Icon name="delete" size="text-sm" />
              {t('common.delete')}
            </button>
          </>
        }
      />
      
      {/* Video Player */}
      <Card className="mb-8 overflow-hidden">
        {video.status === 'ready' ? (
          <VideoPlayer
            videoId={video.id}
            status={video.status}
            poster={video.thumbnail_url || undefined}
            onTimeUpdate={handleTimeUpdate}
            markers={markers}
            onMarkerClick={(marker) => handleSeekToNote(marker.time)}
          />
        ) : video.status === 'processing' ? (
          <div className="aspect-video flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
            <Icon name="hourglass_empty" size="text-6xl" className="text-gray-400 mb-4 animate-spin" />
            <p className="text-xl font-bold text-gray-600 dark:text-gray-400 mb-2">
              {t('videoLibrary.processing.processing')}
            </p>
            <p className="text-sm text-gray-500">
              {t('videoLibrary.processing.processingMessage')}
            </p>
          </div>
        ) : (
          <div className="aspect-video flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-800">
            <Icon name="error" size="text-6xl" className="text-gray-400 mb-4" />
            <p className="text-xl font-bold text-gray-600 dark:text-gray-400">
              {video.status === 'pending_upload' ? t('videoLibrary.processing.pendingUpload')
                : video.status === 'uploading' ? t('videoLibrary.processing.uploading')
                : video.status === 'errored' ? t('videoLibrary.processing.failed')
                : video.status === 'deleted' ? t('videoLibrary.processing.deleted')
                : t('videoLibrary.processing.processing')}
            </p>
          </div>
        )}
      </Card>
      
      {/* Two Column Layout */}
      <div className="grid grid-cols-12 gap-8">
        {/* Left Column - Video Details, Athletes, Tags, Bookmarks */}
        <div className="col-span-12 lg:col-span-5 space-y-6">
          {/* Video Details */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-black uppercase tracking-widest">
                {t('videoLibrary.details.title')}
              </h3>
              <span className="bg-gray-100 dark:bg-gray-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded">
                {video.category ? categoryLabels[video.category].toUpperCase() : 'VIDEO'}
              </span>
            </div>
            
            <div className="space-y-4">
              {/* Description */}
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  {t('videoLibrary.details.description')}
                </label>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {video.description || t('videoLibrary.details.noDescription')}
                </p>
              </div>
              
              {/* Metadata Grid */}
              <div className="pt-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    {t('videoLibrary.details.uploadedBy')}
                  </label>
                  <span className="text-sm font-bold">
                    {video.uploader?.full_name || 'Unknown'}
                  </span>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                    {t('videoLibrary.details.uploadDate')}
                  </label>
                  <span className="text-sm font-bold">
                    {new Date(video.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                {video.duration_seconds && (
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      {t('videoLibrary.details.duration')}
                    </label>
                    <span className="text-sm font-bold">
                      {formatDuration(video.duration_seconds)}
                    </span>
                  </div>
                )}
                {video.recorded_at && (
                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      {t('videoLibrary.details.recordedDate')}
                    </label>
                    <span className="text-sm font-bold">
                      {new Date(video.recorded_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {video.recording_location && (
                  <div className="col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-1">
                      {t('videoLibrary.details.recordedLocation')}
                    </label>
                    <span className="text-sm font-bold">
                      {video.recording_location}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </Card>
          
          {/* Linked Athletes */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest">
                {t('videoLibrary.details.linkedAthletes')}
              </h3>
              <button
                onClick={() => setShowAthletesModal(true)}
                disabled={USE_FAKE_DATA}
                className={cn(
                  "text-sm font-bold text-[var(--org-btn-primary-bg)] hover:underline flex items-center gap-1",
                  USE_FAKE_DATA && "opacity-50 cursor-not-allowed"
                )}
                title={USE_FAKE_DATA ? t('videoLibrary.demoMode.message') : undefined}
              >
                <Icon name="add" size="text-sm" />
                {t('videoLibrary.athletes.linkAthletes')}
              </button>
            </div>
            {video.athlete_links && video.athlete_links.length > 0 ? (
              <div className="space-y-2">
                {video.athlete_links.map((link: VideoAthleteLink) => (
                  <div
                    key={link.id}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 group"
                  >
                    <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                      <Icon name="person" size="text-sm" className="text-gray-500" />
                    </div>
                    <div className="flex-1">
                      <span className="text-sm font-medium">
                        {link.athlete?.first_name} {link.athlete?.last_name}
                      </span>
                      {link.athlete?.jersey_number && (
                        <span className="ml-2 text-xs text-gray-500">
                          #{link.athlete.jersey_number}
                        </span>
                      )}
                      <div>
                        <span className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-bold uppercase">
                          {link.link_type}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnlinkAthlete(link.athlete_id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
                    >
                      <Icon name="close" size="text-sm" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                <Icon name="group" size="text-3xl" className="mx-auto mb-2" />
                <p>{t('videoLibrary.athletes.noAthletes')}</p>
              </div>
            )}
          </Card>
          
          {/* Tags */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-widest">
                {t('videoLibrary.tags.title')}
              </h3>
              <button
                onClick={() => setShowTagsModal(true)}
                disabled={USE_FAKE_DATA}
                className={cn(
                  "text-sm font-bold text-[var(--org-btn-primary-bg)] hover:underline flex items-center gap-1",
                  USE_FAKE_DATA && "opacity-50 cursor-not-allowed"
                )}
                title={USE_FAKE_DATA ? t('videoLibrary.demoMode.message') : undefined}
              >
                <Icon name="add" size="text-sm" />
                {t('videoLibrary.tags.addTag')}
              </button>
            </div>
            {video.tags && video.tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {video.tags.map((tagLink, i) => (
                  <div
                    key={i}
                    className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-500 flex items-center gap-1.5"
                  >
                    <Icon name="label" size="text-sm" />
                    {tagLink.tag?.name?.toUpperCase() || 'TAG'}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500 text-sm">
                <Icon name="label" size="text-3xl" className="mx-auto mb-2" />
                <p>{t('videoLibrary.tags.noTags')}</p>
              </div>
            )}
          </Card>
          
          {/* Bookmarks */}
          <BookmarksPanel
            videoId={videoId!}
            currentTime={currentTime}
            onSeek={handleSeekToNote}
            disabled={USE_FAKE_DATA}
          />
        </div>
        
        {/* Right Column - Notes, Comments */}
        <div className="col-span-12 lg:col-span-7 space-y-6">
          {/* Note Composer */}
          <VideoNoteComposer
            currentTime={currentTime}
            athletes={video.athlete_links?.map(link => ({
              id: link.athlete_id,
              name: `${link.athlete?.first_name} ${link.athlete?.last_name}`
            })) || []}
            onSave={handleCreateNote}
            disabled={USE_FAKE_DATA}
          />
          
          {/* Notes List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-sm font-black uppercase tracking-widest">
                {t('videoLibrary.notes.title')}
              </h3>
              <div className="flex items-center gap-2 text-[10px] font-black text-gray-400">
                {t('videoLibrary.notes.sortBy')}{' '}
                <button
                  onClick={() => setSortBy(sortBy === 'timestamp' ? 'created' : 'timestamp')}
                  className="text-[var(--org-btn-primary-bg)] cursor-pointer underline"
                >
                  {sortBy === 'timestamp' ? t('videoLibrary.notes.sortByTimestamp') : t('videoLibrary.notes.sortByCreated')}
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
                  {t('videoLibrary.notes.noNotesMessage')}
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
                      console.log('Edit note:', note.id)
                    }}
                    onDelete={handleDeleteNote}
                  />
                ))}
              </div>
            )}
          </div>
          
          {/* Comments Section */}
          <CommentsSection videoId={videoId!} disabled={USE_FAKE_DATA} />
        </div>
      </div>
      
      {/* Edit Video Modal */}
      {isEditingDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h3 className="text-xl font-bold">{t('videoLibrary.edit.title')}</h3>
              <button
                onClick={() => setIsEditingDetails(false)}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <Icon name="close" size="text-xl" />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-6">
              {/* Title */}
              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.edit.titleLabel')}
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder={t('videoLibrary.edit.titlePlaceholder')}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                />
              </div>
              
              {/* Description */}
              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.edit.descriptionLabel')}
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder={t('videoLibrary.edit.descriptionPlaceholder')}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent resize-none"
                />
              </div>
              
              {/* Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.edit.categoryLabel')}
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as VideoCategory)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                >
                  <option value="game">{t('videoUploader.categories.game')}</option>
                  <option value="practice">{t('videoUploader.categories.practice')}</option>
                  <option value="training">{t('videoUploader.categories.training')}</option>
                  <option value="highlight">{t('videoUploader.categories.highlight')}</option>
                  <option value="event">{t('videoUploader.categories.event')}</option>
                  <option value="other">{t('videoUploader.categories.other')}</option>
                </select>
              </div>
              
              {/* Visibility */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.edit.visibilityLabel')}
                </label>
                <select
                  value={editVisibility}
                  onChange={(e) => setEditVisibility(e.target.value as VideoVisibility)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                >
                  <option value="private">{t('videoUploader.visibilities.private')}</option>
                  <option value="team">{t('videoUploader.visibilities.team')}</option>
                  <option value="organization">{t('videoUploader.visibilities.organization')}</option>
                  <option value="guardians">{t('videoUploader.visibilities.guardians')}</option>
                </select>
              </div>
              
              {/* Team */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.edit.teamLabel')}
                </label>
                <select
                  value={editTeamId || ''}
                  onChange={(e) => setEditTeamId(e.target.value || null)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                >
                  <option value="">{t('videoLibrary.edit.teamPlaceholder')}</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Season */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.edit.seasonLabel')}
                </label>
                <select
                  value={editSeasonId || ''}
                  onChange={(e) => setEditSeasonId(e.target.value || null)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                >
                  <option value="">{t('videoLibrary.edit.seasonPlaceholder')}</option>
                  {seasons.map(season => (
                    <option key={season.id} value={season.id}>{season.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Program */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.edit.programLabel')}
                </label>
                <select
                  value={editProgramId || ''}
                  onChange={(e) => setEditProgramId(e.target.value || null)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                >
                  <option value="">{t('videoLibrary.edit.programPlaceholder')}</option>
                  {programs.map(program => (
                    <option key={program.id} value={program.id}>{program.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Level */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.edit.levelLabel')}
                </label>
                <select
                  value={editLevelId || ''}
                  onChange={(e) => setEditLevelId(e.target.value || null)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                >
                  <option value="">{t('videoLibrary.edit.levelPlaceholder')}</option>
                  {levels.map(level => (
                    <option key={level.id} value={level.id}>{level.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Sport */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.edit.sportLabel')}
                </label>
                <select
                  value={editSportId || ''}
                  onChange={(e) => setEditSportId(e.target.value || null)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                >
                  <option value="">{t('videoLibrary.edit.sportPlaceholder')}</option>
                  {sports.map(sport => (
                    <option key={sport.id} value={sport.id}>{sport.name}</option>
                  ))}
                </select>
              </div>
              
              {/* Event */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.edit.eventLabel')}
                </label>
                <select
                  value={editEventId || ''}
                  onChange={(e) => setEditEventId(e.target.value || null)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                >
                  <option value="">{t('videoLibrary.edit.eventPlaceholder')}</option>
                  {events.map(event => (
                    <option key={event.id} value={event.id}>{event.title}</option>
                  ))}
                </select>
              </div>
              
              {/* Recorded Date */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.edit.recordedDateLabel')}
                </label>
                <input
                  type="date"
                  value={editRecordedAt}
                  onChange={(e) => setEditRecordedAt(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                />
              </div>
              
              {/* Recorded Location */}
              <div className="col-span-2">
                <label className="block text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
                  {t('videoLibrary.edit.recordedLocationLabel')}
                </label>
                <input
                  type="text"
                  value={editRecordedLocation}
                  onChange={(e) => setEditRecordedLocation(e.target.value)}
                  placeholder={t('videoLibrary.edit.recordedLocationPlaceholder')}
                  className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => setIsEditingDetails(false)}
                disabled={isSaving}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveDetails}
                disabled={isSaving}
              >
                {isSaving ? t('common.saving') : t('videoLibrary.edit.saveChanges')}
              </Button>
            </div>
          </div>
        </div>
      )}
      
      {/* Athlete Selector Modal */}
      <AthleteSelectorModal
        isOpen={showAthletesModal}
        onClose={() => setShowAthletesModal(false)}
        teamId={video.team_id}
        currentLinks={video.athlete_links || []}
        onSave={handleSaveAthleteLinks}
      />
      
      {/* Tag Manager Modal */}
      {currentOrganization && (
        <TagManagerModal
          isOpen={showTagsModal}
          onClose={() => setShowTagsModal(false)}
          orgId={currentOrganization.id}
          currentTagIds={video.tags?.map(t => t.tag_id!) || []}
          onSave={handleSaveTags}
        />
      )}
      
      {/* Back Link */}
      <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-800">
        <Link
          to={getLink('admin.videos.list')}
          className="inline-flex items-center gap-2 text-sm font-bold text-[var(--org-btn-primary-bg)] hover:underline"
        >
          <Icon name="arrow_back" size="text-lg" />
          {t('videoLibrary.title')}
        </Link>
      </div>
    </div>
  )
}
