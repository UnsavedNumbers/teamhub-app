/**
 * VideoCard Component
 * 
 * Displays a video thumbnail card with metadata, status badge, duration,
 * and action buttons on hover. Used in both portal and admin video libraries.
 */

import { Link } from 'react-router-dom'
import type { Video, VideoStatus } from '@/types/video'
import Icon from '@/components/portal/Icon'
import { cn } from '@/utils/cn'
import { formatDuration } from '@/utils/formatters'

interface VideoCardProps {
  video: Video
  linkTo?: string
  onPlay?: (video: Video) => void
  onEdit?: (video: Video) => void
  onShare?: (video: Video) => void
  onDelete?: (video: Video) => void
  showActions?: boolean
  showNewNotes?: boolean
  newNotesCount?: number
  compact?: boolean
  className?: string
}

function getStatusBadge(status: VideoStatus) {
  switch (status) {
    case 'ready':
      return { label: 'READY', className: 'bg-emerald-500 text-white' }
    case 'processing':
      return { label: 'PROCESSING', className: 'bg-[var(--org-btn-primary-bg)] text-white', icon: 'sync', animate: true }
    case 'uploading':
      return { label: 'UPLOADING', className: 'bg-[var(--org-btn-primary-bg)] text-white', icon: 'cloud_upload', animate: true }
    case 'pending_upload':
      return { label: 'PENDING', className: 'bg-amber-500 text-white' }
    case 'errored':
      return { label: 'ERROR', className: 'bg-red-500 text-white', icon: 'error' }
    default:
      return null
  }
}

function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    game: 'Game Film',
    practice: 'Practice',
    training: 'Training',
    highlight: 'Highlight',
    instructional: 'Instructional',
    evaluation: 'Evaluation',
    other: 'Other'
  }
  return labels[category] || category
}

export default function VideoCard({
  video,
  linkTo,
  onPlay,
  onEdit,
  onShare,
  onDelete,
  showActions = true,
  showNewNotes = false,
  newNotesCount = 0,
  compact = false,
  className
}: VideoCardProps) {
  const statusBadge = getStatusBadge(video.status)
  const duration = video.duration_seconds ? formatDuration(video.duration_seconds) : null
  const thumbnailUrl = video.thumbnail_url || undefined
  
  const cardContent = (
    <div className={cn(
      "video-card group flex flex-col gap-3 relative cursor-pointer",
      compact ? "pb-2" : "pb-3",
      className
    )}>
      {/* Thumbnail Container */}
      <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800">
        {/* Thumbnail Image */}
        {thumbnailUrl ? (
          <div 
            className="absolute inset-0 bg-center bg-no-repeat bg-cover"
            style={{ backgroundImage: `url(${thumbnailUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800">
            <Icon name="videocam" size="text-4xl" className="text-slate-400" />
          </div>
        )}
        
        {/* Status Badge */}
        {statusBadge && (
          <div className={cn(
            "absolute top-2 left-2 text-[10px] font-black px-2 py-0.5 rounded shadow-sm tracking-wider flex items-center gap-1",
            statusBadge.className
          )}>
            {statusBadge.icon && (
              <span className={cn(
                "material-symbols-outlined text-[12px]",
                statusBadge.animate && "animate-spin"
              )}>
                {statusBadge.icon}
              </span>
            )}
            {statusBadge.label}
          </div>
        )}
        
        {/* New Notes Badge */}
        {showNewNotes && newNotesCount > 0 && (
          <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-1 rounded tracking-wider uppercase flex items-center gap-1 shadow-sm">
            <Icon name="chat_bubble" size="text-[12px]" />
            {newNotesCount} NEW {newNotesCount === 1 ? 'NOTE' : 'NOTES'}
          </div>
        )}
        
        {/* Duration Badge */}
        {duration && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">
            {duration}
          </div>
        )}
        
        {/* Play Button Overlay - Show on Hover for ready videos */}
        {video.status === 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
            <div className="size-12 bg-white/90 rounded-full flex items-center justify-center text-[var(--org-btn-primary-bg)] shadow-lg">
              <Icon name="play_arrow" size="text-3xl" />
            </div>
          </div>
        )}
        
        {/* Action Buttons Overlay - Show on Hover */}
        {showActions && video.status === 'ready' && (onEdit || onShare || onDelete) && (
          <div className="action-overlay absolute inset-0 bg-black/40 flex items-center justify-center gap-3 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(video); }}
                className="p-2 bg-white text-black rounded-full hover:bg-[var(--org-btn-primary-bg)] hover:text-white transition-all shadow-lg"
                title="Edit video"
              >
                <Icon name="edit" size="text-lg" />
              </button>
            )}
            {onShare && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShare(video); }}
                className="p-2 bg-white text-black rounded-full hover:bg-[var(--org-btn-primary-bg)] hover:text-white transition-all shadow-lg"
                title="Share video"
              >
                <Icon name="share" size="text-lg" />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(video); }}
                className="p-2 bg-white text-black rounded-full hover:bg-red-500 hover:text-white transition-all shadow-lg"
                title="Delete video"
              >
                <Icon name="delete" size="text-lg" />
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* Video Info */}
      <div className={compact ? "px-0.5" : "px-1"}>
        <p className={cn(
          "text-slate-900 dark:text-white font-bold leading-snug line-clamp-1 mb-1 group-hover:text-[var(--org-link-color)] transition-colors",
          compact ? "text-sm" : "text-sm"
        )}>
          {video.title}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-[var(--org-link-color)]">
            {getCategoryLabel(video.category)}
          </span>
          {video.team?.name && (
            <>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <p className="text-slate-500 text-[11px] font-normal leading-normal truncate">
                {video.team.name}
              </p>
            </>
          )}
          {video.recorded_at && (
            <>
              <span className="text-slate-300 dark:text-slate-600">•</span>
              <p className="text-slate-500 text-[11px] font-normal leading-normal">
                {new Date(video.recorded_at).toLocaleDateString()}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
  
  // Wrap in Link if linkTo is provided
  if (linkTo) {
    return (
      <Link to={linkTo} onClick={() => onPlay?.(video)}>
        {cardContent}
      </Link>
    )
  }
  
  // Otherwise use onClick
  return (
    <div onClick={() => onPlay?.(video)}>
      {cardContent}
    </div>
  )
}
