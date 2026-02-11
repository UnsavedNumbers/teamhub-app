/**
 * VideoCommentsPanel Component
 * 
 * Threaded comments discussion panel for video detail page.
 * Supports nested replies, sorting, and soft-delete display.
 */

import { useState, useMemo, useCallback } from 'react'
import { useVideoComments } from '@/hooks/useVideos'
import { useAuth } from '@/hooks/useAuth'
import Icon from '@/components/portal/Icon'
import Button from '@/components/portal/Button'
import { cn } from '@/utils/cn'
import { t } from '@/i18n'
import { showError } from '@/utils/toast'

interface VideoCommentsPanelProps {
  videoId: string
  disabled?: boolean
  className?: string
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
    full_name: string
    avatar_url: string | null
  }
  replies?: CommentWithReplies[]
}

type SortOption = 'newest' | 'oldest'

export default function VideoCommentsPanel({ 
  videoId, 
  disabled = false,
  className 
}: VideoCommentsPanelProps) {
  const { user } = useAuth()
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

  // Build threaded comments structure
  const threadedComments = useMemo(() => {
    const threads: CommentWithReplies[] = []
    const commentMap = new Map<string, CommentWithReplies>()

    // Build map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] } as CommentWithReplies)
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
      const created = await createComment(newComment.trim())
      if (created) {
        setNewComment('')
      } else {
        showError(t('videoLibrary.comments.createFailed'))
      }
    } finally {
      setPosting(false)
    }
  }, [newComment, createComment, disabled, t])

  const handleReply = useCallback(async (parentId: string) => {
    if (!replyContent.trim() || disabled) return
    
    setPosting(true)
    try {
      const created = await createComment(replyContent.trim(), { parentId })
      if (created) {
        setReplyContent('')
        setReplyingTo(null)
        setExpandedReplies(prev => new Set([...prev, parentId]))
      } else {
        showError(t('videoLibrary.comments.createFailed'))
      }
    } finally {
      setPosting(false)
    }
  }, [replyContent, createComment, disabled, t])

  const handleDelete = useCallback(async (commentId: string) => {
    if (!window.confirm(t('videoLibrary.comments.deleteConfirm'))) return
    const deleted = await deleteComment(commentId)
    if (!deleted) {
      showError(t('videoLibrary.comments.deleteFailed'))
    }
  }, [deleteComment, t])

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

    if (diffMins < 1) return t('videoLibrary.comments.time.justNow')
    if (diffMins < 60) return t('videoLibrary.comments.time.minutesAgo', { count: diffMins })
    if (diffHours < 24) return t('videoLibrary.comments.time.hoursAgo', { count: diffHours })
    if (diffDays < 7) return t('videoLibrary.comments.time.daysAgo', { count: diffDays })
    return date.toLocaleDateString()
  }

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
            {comment.author?.avatar_url ? (
              <img 
                src={comment.author.avatar_url} 
                alt="" 
                className="size-full rounded-full object-cover"
              />
            ) : (
              <Icon name="person" size={isReply ? "text-xs" : "text-sm"} />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
              <span className={cn("font-bold", isReply ? "text-xs" : "text-sm")}>
                {comment.author?.full_name || t('videoLibrary.comments.userFallback')}
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
                ? t('videoLibrary.comments.deletedMessage')
                : comment.content
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
                    onClick={() => handleDelete(comment.id)}
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
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder={t('videoLibrary.comments.writeComment')}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent resize-none"
                  rows={2}
                  disabled={disabled}
                />
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
            <option value="newest">{t('videoLibrary.comments.sortNewest')}</option>
            <option value="oldest">{t('videoLibrary.comments.sortOldest')}</option>
          </select>
        )}
      </div>

      {/* New Comment Form */}
      <div className="mb-6">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={t('videoLibrary.comments.writeComment')}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent resize-none"
          rows={3}
          disabled={disabled}
        />
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
    </div>
  )
}
