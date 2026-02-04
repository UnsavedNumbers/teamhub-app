/**
 * Bookmark Button Component
 * 
 * Button to bookmark/unbookmark an event.
 */

import { useState } from 'react'
import { bookmarkEvent, removeBookmark } from '../../data/services/fanService'
import { showError } from '../../utils/toast'
import Button from '../portal/Button'
import { useI18n } from '../../i18n/useI18n'

interface BookmarkButtonProps {
  eventId: string
  isBookmarked: boolean
  onToggle?: (isBookmarked: boolean) => void
  variant?: 'default' | 'compact' | 'icon-only'
  className?: string
}

export default function BookmarkButton({ 
  eventId, 
  isBookmarked: initialBookmarked, 
  onToggle,
  variant = 'default',
  className = ''
}: BookmarkButtonProps) {
  const { t } = useI18n()
  const [isBookmarked, setIsBookmarked] = useState(initialBookmarked)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    setLoading(true)

    try {
      if (isBookmarked) {
        const { error } = await removeBookmark(eventId)
        if (error) {
          showError(error.message || t('portal.fan.bookmarkedEvents.removeFailed'))
          return
        }
        setIsBookmarked(false)
        onToggle?.(false)
      } else {
        const { error } = await bookmarkEvent(eventId)
        if (error) {
          showError(error.message || t('portal.fan.bookmarkedEvents.bookmarkFailed'))
          return
        }
        setIsBookmarked(true)
        onToggle?.(true)
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t('portal.fan.bookmarkedEvents.updateStatusFailed'))
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'icon-only') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 ${className}`}
        aria-label={isBookmarked ? t('portal.fan.bookmarkedEvents.removeBookmark') : t('portal.fan.bookmarkedEvents.bookmarkEvent')}
      >
        <span className={`material-symbols-outlined ${isBookmarked ? 'text-yellow-500' : 'text-gray-400'}`}>
          {loading ? 'hourglass_empty' : isBookmarked ? 'bookmark' : 'bookmark_border'}
        </span>
      </button>
    )
  }

  return (
    <Button
      variant={isBookmarked ? 'secondary' : 'primary'}
      onClick={handleToggle}
      disabled={loading}
      className={`${variant === 'compact' ? 'px-4 py-2 text-xs' : ''} ${className}`}
    >
      {loading ? (
        <>
          <span className="material-symbols-outlined animate-spin inline-block mr-1">hourglass_empty</span>
          {isBookmarked ? t('portal.fan.bookmarkedEvents.removing') : t('portal.fan.bookmarkedEvents.saving')}
        </>
      ) : isBookmarked ? (
        <>
          <span className="material-symbols-outlined inline-block mr-1">bookmark</span>
          {t('portal.fan.bookmarkedEvents.bookmarked')}
        </>
      ) : (
        <>
          <span className="material-symbols-outlined inline-block mr-1">bookmark_border</span>
          {t('portal.fan.bookmarkedEvents.bookmark')}
        </>
      )}
    </Button>
  )
}

