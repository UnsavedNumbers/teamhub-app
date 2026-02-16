/**
 * VideoCommentsPanel Component
 * 
 * Threaded comments discussion panel for video detail page.
 * Supports nested replies, sorting, and soft-delete display.
 */

import { useState, useMemo, useCallback, useRef } from 'react'
import { useVideoComments } from '@/hooks/useVideos'
import { useAuth } from '@/hooks/useAuth'
import Icon from '@/components/portal/Icon'
import Button from '@/components/portal/Button'
import { ConfirmDialog } from '@/components/admin/ConfirmDialog'
import { cn } from '@/utils/cn'
import { t } from '@/i18n'
import TimestampedText from './TimestampedText'
import { formatTimestampShort } from '@/utils/timestamps'

interface VideoCommentsPanelProps {
  videoId: string
  disabled?: boolean
  className?: string
  /** When provided, use ConfirmDialog for delete confirmation (e.g. on admin pages) */
  deleteConfirmDialog?: { title: string; description: string }
  /** Callback when user clicks a timestamp in comment content */
  onSeek?: (seconds: number) => void
  /** Returns current video time for timestamp insertion */
  onCaptureTime?: () => number
}

interface CommentWithReplies {
  id: string
  video_id: string
  author_id: string
  parent_comment_id: string | null
  content: string
  timestamp_seconds: number | null
  is_edited: boolean
  deleted_at?: string | null
  created_at: string
  updated_at: string
  author?: {
    id: string
    display_name: string | null
    first_name: string
    last_name: string
  }
  replies?: CommentWithReplies[]
}

type SortOption = 'newest' | 'oldest'

export default function VideoCommentsPanel({ 
  videoId, 
  disabled = false,
  className,
  deleteConfirmDialog,
  onSeek,
  onCaptureTime,
}: VideoCommentsPanelProps) {
  const { user, profile } = useAuth()
  const { comments, isLoading, createComment, deleteComment, refresh: _refresh } = useVideoComments({ 
    videoId, 
    enabled: true 
  })
  
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set())
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null)
  const newCommentTextareaRef = useRef<HTMLTextAreaElement>(null)
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null)

  const handleInsertTimestamp = useCallback((isReply: boolean) => {
    if (!onCaptureTime) return
    const time = onCaptureTime()
    const timestampText = formatTimestampShort(time)
    const textarea = isReply ? replyTextareaRef.current : newCommentTextareaRef.current
    const currentContent = isReply ? replyContent : newComment
    
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const before = currentContent.substring(0, start)
      const after = currentContent.substring(end)
      const newContent = before + timestampText + ' ' + after
      if (isReply) {
        setReplyContent(newContent)
      } else {
        setNewComment(newContent)
      }
      // Restore cursor position after timestamp
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + timestampText.length + 1, start + timestampText.length + 1)
      }, 0)
    } else {
      // Fallback: append to end
      if (isReply) {
        setReplyContent(prev => prev + (prev ? ' ' : '') + timestampText + ' ')
      } else {
        setNewComment(prev => prev + (prev ? ' ' : '') + timestampText + ' ')
      }
    }
  }, [onCaptureTime, replyContent, newComment])

  // Build threaded comments structure
  const threadedComments = useMemo(() => {
    const threads: CommentWithReplies[] = []
    const commentMap = new Map<string, CommentWithReplies>()

    // Build map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { 
        ...comment, 
        replies: [],
        author: comment.author || undefined
      } as CommentWithReplies)
    })

    // Build thread hierarchy
    comments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id)
        if (parent) {
          parent.replies = parent.replies || []
          parent.replies.push(commentWithReplies)
        }
      } else {
        threads.push(commentWithReplies)
      }
    })

    // Sort threads and replies
    const sortFn = (a: CommentWithReplies, b: CommentWithReplies) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB
    }

    threads.sort(sortFn)
    threads.forEach(thread => {
      if (thread.replies) {
        thread.replies.sort(sortFn)
      }
    })

    return threads
  }, [comments, sortBy])

  const handlePost = useCallback(async () => {
    if (!newComment.trim() || disabled) return
    
    setPosting(true)
    try {
      await createComment(newComment.trim())
      setNewComment('')
    } finally {
      setPosting(false)
    }
  }, [newComment, createComment, disabled])

  const handleReply = useCallback(async (parentId: string) => {
    if (!replyContent.trim() || disabled) return
    
    setPosting(true)
    try {
      await createComment(replyContent.trim(), { parentId })
      setReplyContent('')
      setReplyingTo(null)
      setExpandedReplies(prev => new Set([...prev, parentId]))
    } finally {
      setPosting(false)
    }
  }, [replyContent, createComment, disabled])

  const handleDeleteClick = useCallback((commentId: string) => {
    if (deleteConfirmDialog) {
      setCommentToDeleteId(commentId)
    } else if (window.confirm(t('videoLibrary.comments.deleteConfirm'))) {
      deleteComment(commentId)
    }
  }, [deleteConfirmDialog, deleteComment])

  const handleConfirmDeleteComment = useCallback(() => {
    if (commentToDeleteId) {
      deleteComment(commentToDeleteId)
      setCommentToDeleteId(null)
    }
  }, [commentToDeleteId, deleteComment])

  const toggleReplies = useCallback((commentId: string) => {
    setExpandedReplies(prev => {
      const next = new Set(prev)
      if (next.has(commentId)) {
        next.delete(commentId)
      } else {
        next.add(commentId)
      }
      return next
    })
  }, [])

  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const getAuthorDisplayName = useCallback((comment: CommentWithReplies): string => {
    if (user?.id === comment.author_id && profile) {
      const fromProfile = profile.display_name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
      if (fromProfile) return fromProfile
    }
    const fromAuthor = comment.author?.display_name || `${comment.author?.first_name || ''} ${comment.author?.last_name || ''}`.trim()
    return fromAuthor || 'User'
  }, [user?.id, profile])

  const renderComment = (comment: CommentWithReplies, isReply = false) => {
    const isDeleted = !!comment.deleted_at
    const isAuthor = user?.id === comment.author_id
    const hasReplies = comment.replies && comment.replies.length > 0
    const isExpanded = expandedReplies.has(comment.id)

    return (
      <div key={comment.id} className={cn("space-y-3", isReply && "ml-11 pl-4 border-l-2 border-gray-200 dark:border-gray-700")}>
        <div className="flex gap-3">
          {/* Avatar */}
          <div className={cn(
            "rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center shrink-0",
            isReply ? "size-6" : "size-8"
          )}>
            <Icon name="person" size={isReply ? "text-xs" : "text-sm"} />
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("font-bold", isReply ? "text-xs" : "text-sm")}>
                {getAuthorDisplayName(comment)}
              </span>
              <span className={cn("text-gray-400", isReply ? "text-[10px]" : "text-xs")}>
                {formatRelativeTime(comment.created_at)}
              </span>
              {comment.is_edited && !isDeleted && (
                <span className="text-xs text-gray-400">
                  ({t('videoLibrary.comments.edited')})
                </span>
              )}
            </div>

            {/* Content */}
            <p className={cn(
              "text-gray-600 dark:text-gray-400",
              isReply ? "text-xs" : "text-sm",
              isDeleted && "italic text-gray-400"
            )}>
              {isDeleted 
                ? '[This comment has been removed]' 
                : (
                  <TimestampedText
                    text={comment.content}
                    onSeek={onSeek}
                  />
                )
              }
            </p>

            {/* Actions */}
            {!isDeleted && (
              <div className="mt-2 flex items-center gap-4">
                {!isReply && (
                  <button 
                    onClick={() => {
                      setReplyingTo(replyingTo === comment.id ? null : comment.id)
                      setReplyContent('')
                    }}
                    className="text-xs font-bold text-gray-500 hover:text-[var(--org-btn-primary-bg)]"
                    disabled={disabled}
                  >
                    {t('videoLibrary.comments.reply')}
                  </button>
                )}
                {isAuthor && (
                  <button
                    onClick={() => handleDeleteClick(comment.id)}
                    className="text-xs font-bold text-gray-500 hover:text-red-500"
                    disabled={disabled}
                  >
                    {t('videoLibrary.comments.deleteComment')}
                  </button>
                )}
              </div>
            )}

            {/* Reply Form */}
            {replyingTo === comment.id && (
              <div className="mt-3 space-y-2">
                <div className="relative">
                  <textarea
                    ref={replyTextareaRef}
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    placeholder={t('videoLibrary.comments.writeComment')}
                    className="w-full px-3 py-2 pr-10 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent resize-none"
                    rows={2}
                    disabled={disabled}
                  />
                  {onCaptureTime && (
                    <button
                      type="button"
                      onClick={() => handleInsertTimestamp(true)}
                      disabled={disabled}
                      className="absolute right-2 top-2 px-1.5 py-1 text-xs font-bold text-[var(--org-btn-primary-bg)] hover:bg-[var(--org-btn-primary-bg)]/10 rounded transition-colors disabled:opacity-50"
                      title="Insert current timestamp"
                    >
                      <Icon name="schedule" size="text-xs" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="primary"
                    className="!px-3 !py-1.5 text-xs"
                    onClick={() => handleReply(comment.id)}
                    disabled={disabled || posting || !replyContent.trim()}
                  >
                    {posting ? t('common.loading') : t('videoLibrary.comments.reply')}
                  </Button>
                  <button
                    onClick={() => {
                      setReplyingTo(null)
                      setReplyContent('')
                    }}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Replies Toggle */}
        {hasReplies && !isReply && (
          <button
            onClick={() => toggleReplies(comment.id)}
            className="ml-11 text-xs font-bold text-[var(--org-btn-primary-bg)] flex items-center gap-1"
          >
            <Icon name={isExpanded ? "expand_less" : "expand_more"} size="text-sm" />
            {isExpanded 
              ? t('videoLibrary.comments.hideReplies')
              : t('videoLibrary.comments.showReplies', { count: comment.replies!.length })
            }
          </button>
        )}

        {/* Nested Replies */}
        {hasReplies && isExpanded && (
          <div className="space-y-3">
            {comment.replies!.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn("bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-black uppercase tracking-widest">
          {t('videoLibrary.comments.title')}
          {comments.length > 0 && (
            <span className="ml-2 text-gray-400 font-medium normal-case">
              ({comments.length})
            </span>
          )}
        </h3>
        
        {/* Sort Dropdown */}
        {comments.length > 1 && (
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        )}
      </div>

      {/* New Comment Form */}
      <div className="mb-6">
        <div className="relative">
          <textarea
            ref={newCommentTextareaRef}
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={t('videoLibrary.comments.writeComment')}
            className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent resize-none"
            rows={3}
            disabled={disabled}
          />
          {onCaptureTime && (
            <button
              type="button"
              onClick={() => handleInsertTimestamp(false)}
              disabled={disabled}
              className="absolute right-2 top-2 px-2 py-1 text-xs font-bold text-[var(--org-btn-primary-bg)] hover:bg-[var(--org-btn-primary-bg)]/10 rounded transition-colors disabled:opacity-50"
              title="Insert current timestamp"
            >
              <Icon name="schedule" size="text-sm" />
            </button>
          )}
        </div>
        <div className="mt-2 flex justify-end">
          <Button
            variant="primary"
            className="!px-4 !py-2 text-sm"
            onClick={handlePost}
            disabled={disabled || posting || !newComment.trim()}
          >
            {posting ? t('common.loading') : t('videoLibrary.comments.postComment')}
          </Button>
        </div>
      </div>

      {/* Comments List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="flex gap-3">
                <div className="size-8 rounded-full bg-gray-200 dark:bg-gray-700" />
                <div className="flex-1">
                  <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
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
          {threadedComments.map(comment => renderComment(comment))}
        </div>
      )}
      {deleteConfirmDialog && (
        <ConfirmDialog
          open={commentToDeleteId !== null}
          title={deleteConfirmDialog.title}
          description={deleteConfirmDialog.description}
          confirmLabel={t('common.delete')}
          cancelLabel={t('common.cancel')}
          variant="danger"
          onConfirm={handleConfirmDeleteComment}
          onCancel={() => setCommentToDeleteId(null)}
        />
      )}
    </div>
  )
}
