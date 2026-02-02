/**
 * VideoNoteCard Component
 * 
 * Displays a timestamped coach note for a video.
 * Used in both guardian video detail and coach video analysis views.
 */

import type { VideoNote } from '@/types/video'
import Icon from '@/components/portal/Icon'
import { cn } from '@/utils/cn'

interface VideoNoteCardProps {
  note: VideoNote
  isActive?: boolean
  isGuardianView?: boolean
  onSeek?: (timestamp: number) => void
  onEdit?: (note: VideoNote) => void
  onDelete?: (note: VideoNote) => void
  onStar?: (note: VideoNote) => void
  isStarred?: boolean
  className?: string
}

function formatTimestamp(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '--:--'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export default function VideoNoteCard({
  note,
  isActive = false,
  isGuardianView = false,
  onSeek,
  onEdit,
  onDelete,
  onStar,
  isStarred = false,
  className
}: VideoNoteCardProps) {
  const hasTimestamp = note.timestamp_start !== null && note.timestamp_start !== undefined
  const authorName = note.author?.full_name || 'Coach'
  const targetAthletes = note.targets || []
  
  return (
    <div className={cn(
      "bg-white dark:bg-slate-900/50 border-2 rounded-lg p-5 transition-colors cursor-pointer group",
      isActive 
        ? "border-[var(--org-btn-primary-bg)] shadow-lg shadow-[var(--org-btn-primary-bg)]/10" 
        : "border-slate-200 dark:border-slate-800 hover:border-[var(--org-btn-primary-bg)]",
      className
    )}>
      <div className="flex gap-4">
        {/* Timestamp Button */}
        {hasTimestamp && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onSeek?.(note.timestamp_start!)
            }}
            className={cn(
              "h-10 px-3 shrink-0 rounded-lg flex items-center gap-2 text-xs font-black transition-all",
              isGuardianView
                ? "bg-[var(--org-btn-primary-bg)] text-white"
                : "bg-slate-900 text-white hover:bg-[var(--org-btn-primary-bg)]"
            )}
          >
            <Icon name="play_arrow" size="text-sm" />
            {formatTimestamp(note.timestamp_start)}
          </button>
        )}
        
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-white">
                {authorName}
              </span>
              <span className="text-[10px] text-slate-400 font-bold uppercase">
                • {new Date(note.created_at).toLocaleDateString()}
              </span>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {onStar && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onStar(note)
                  }}
                  className={cn(
                    "transition-colors",
                    isStarred ? "text-yellow-400" : "text-slate-300 hover:text-yellow-400"
                  )}
                >
                  <Icon 
                    name={isStarred ? "star" : "star"} 
                    size="text-lg" 
                    className={isStarred ? "fill-yellow-400" : ""} 
                  />
                </button>
              )}
              
              {onEdit && !isGuardianView && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onEdit(note)
                  }}
                  className="text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <Icon name="edit" size="text-lg" />
                </button>
              )}
              
              {onDelete && !isGuardianView && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDelete(note)
                  }}
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Icon name="delete" size="text-lg" />
                </button>
              )}
            </div>
          </div>
          
          {/* Title */}
          {note.title && (
            <h4 className="font-bold text-slate-900 dark:text-white mb-1">
              {note.title}
            </h4>
          )}
          
          {/* Content */}
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {note.content}
          </p>
          
          {/* Athlete Tags */}
          {targetAthletes.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {targetAthletes.map((target) => (
                <span
                  key={target.id}
                  className="px-2 py-0.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded text-[10px] font-black text-slate-500 uppercase"
                >
                  {target.athlete?.first_name} {target.athlete?.last_name}
                </span>
              ))}
            </div>
          )}
          
          {/* Scope Badge for Guardians */}
          {isGuardianView && note.scope && (
            <div className="mt-3">
              {note.scope === 'guardians' && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                  Personal feedback
                </span>
              )}
              {note.scope === 'all' && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Team note
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
