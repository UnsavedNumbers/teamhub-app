/**
 * NotesFeed Component
 *
 * Scrollable list of existing coaching notes rendered inside the NotesPanel.
 * Clicking a note's timestamp seeks the video to that position.
 */

import { useState, useRef, useEffect } from 'react'
import type { VideoNote } from '@/types/video'
import Icon from '@/components/portal/Icon'
import { cn } from '@/utils/cn'

// ─── Types ─────────────────────────────────────────────────────────────────

type SortMode = 'timestamp' | 'newest'

export interface NotesFeedProps {
  notes: VideoNote[]
  isLoading?: boolean
  activeNoteId?: string | null
  /** Seek the video to the given time in seconds */
  onSeekToTimestamp: (seconds: number) => void
  className?: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTs(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '--:--'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ─── Component ─────────────────────────────────────────────────────────────

export default function NotesFeed({
  notes,
  isLoading = false,
  activeNoteId,
  onSeekToTimestamp,
  className,
}: NotesFeedProps) {
  const [sortMode, setSortMode] = useState<SortMode>('timestamp')
  const scrollRef = useRef<HTMLDivElement>(null)
  const savedScrollRef = useRef(0)

  // Persist scroll position across close/reopen
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    // Restore
    el.scrollTop = savedScrollRef.current
    const handleScroll = () => {
      savedScrollRef.current = el.scrollTop
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [])

  const sorted = [...notes].sort((a, b) => {
    if (sortMode === 'timestamp') {
      return (a.timestamp_start ?? 0) - (b.timestamp_start ?? 0)
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className={cn('p-4 space-y-3', className)}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800 h-20"
          />
        ))}
      </div>
    )
  }

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      {/* Sort toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 dark:border-gray-800">
        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </span>
        <button
          type="button"
          onClick={() => setSortMode(sortMode === 'timestamp' ? 'newest' : 'timestamp')}
          className="text-[10px] font-bold text-[var(--org-btn-secondary-bg)] hover:underline uppercase tracking-wider"
        >
          {sortMode === 'timestamp' ? '↕ By Time' : '↕ Newest'}
        </button>
      </div>

      {/* Scrollable feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2">
        {sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Icon name="speaker_notes_off" size="text-3xl" className="mb-2" />
            <p className="text-sm">No notes yet</p>
          </div>
        ) : (
          sorted.map((note) => {
            const isActive = activeNoteId === note.id
            const hasTs =
              note.timestamp_start !== null && note.timestamp_start !== undefined

            return (
              <div
                key={note.id}
                className={cn(
                  'rounded-lg border p-3 transition-colors',
                  'border-l-4',
                  isActive
                    ? 'border-[var(--org-btn-secondary-bg)] bg-[var(--org-btn-secondary-bg)]/5 border-l-[var(--org-btn-secondary-bg)]'
                    : 'border-gray-200 dark:border-gray-700 border-l-gray-300 dark:border-l-gray-600 hover:border-[var(--org-btn-secondary-bg)]/50',
                )}
              >
                <div className="flex items-start gap-2.5">
                  {/* Timestamp pill – clickable */}
                  {hasTs && (
                    <button
                      type="button"
                      onClick={() => onSeekToTimestamp(note.timestamp_start!)}
                      className="shrink-0 px-2 py-0.5 rounded bg-gray-900 dark:bg-gray-700 text-white text-[11px] font-black hover:bg-[var(--org-btn-secondary-bg)] transition-colors flex items-center gap-1"
                    >
                      <Icon name="play_arrow" size="text-xs" />
                      {formatTs(note.timestamp_start)}
                    </button>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Author & date */}
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[11px] font-bold text-gray-900 dark:text-white truncate">
                        {note.author?.full_name || 'Coach'}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(note.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Title */}
                    {note.title && (
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200 mb-0.5">
                        {note.title}
                      </p>
                    )}

                    {/* Content */}
                    <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                      {note.content}
                    </p>

                    {/* Athlete targets */}
                    {note.targets && note.targets.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {note.targets.map((t) => (
                          <span
                            key={t.id}
                            className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-[9px] font-bold text-gray-500 uppercase"
                          >
                            {t.athlete?.first_name} {t.athlete?.last_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
