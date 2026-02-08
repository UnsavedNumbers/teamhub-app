/**
 * VideoFavoriteButton Component
 * 
 * Toggle button to bookmark/favorite a video.
 * Shows filled bookmark when favorited.
 */

import { useState, useCallback } from 'react'
import { useVideoFavorites } from '@/hooks/useVideosExtended'
import Icon from '@/components/portal/Icon'
import { cn } from '@/utils/cn'
import { showSuccess, showError } from '@/utils/toast'

interface VideoFavoriteButtonProps {
  videoId: string
  orgId: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export default function VideoFavoriteButton({
  videoId,
  orgId,
  size = 'md',
  showLabel = false,
  className
}: VideoFavoriteButtonProps) {
  const { isFavorite, toggleFavorite, isLoading } = useVideoFavorites({ orgId, enabled: true })
  const [isToggling, setIsToggling] = useState(false)
  
  const favorited = isFavorite(videoId)

  const handleToggle = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (isToggling) return

    setIsToggling(true)
    try {
      const success = await toggleFavorite(videoId)
      if (success) {
        if (!favorited) {
          showSuccess('Video added to favorites')
        } else {
          showSuccess('Video removed from favorites')
        }
      } else {
        showError('Failed to update favorites')
      }
    } finally {
      setIsToggling(false)
    }
  }, [videoId, toggleFavorite, favorited, isToggling])

  const sizeClasses = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-3'
  }

  const iconSizes = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl'
  }

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading || isToggling}
      className={cn(
        "rounded-full transition-all",
        sizeClasses[size],
        favorited 
          ? "text-[var(--org-btn-primary-bg)] hover:text-[var(--org-btn-primary-bg)]/80" 
          : "text-gray-400 hover:text-[var(--org-btn-primary-bg)]",
        (isLoading || isToggling) && "opacity-50 cursor-not-allowed",
        className
      )}
      title={favorited ? "Remove from favorites" : "Add to favorites"}
    >
      <div className="flex items-center gap-1.5">
        <Icon 
          name={favorited ? "bookmark" : "bookmark_border"} 
          size={iconSizes[size]}
          className={isToggling ? "animate-pulse" : ""}
        />
        {showLabel && (
          <span className="text-sm font-medium">
            {favorited ? "Saved" : "Save"}
          </span>
        )}
      </div>
    </button>
  )
}
