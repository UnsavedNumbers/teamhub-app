/**
 * NotesPanel Component
 *
 * Slide-out panel for coaching notes on the video detail page.
 *
 * Desktop (≥768px): Slides in from the right, taking 40% of the content width.
 * Mobile  (<768px): Renders as a bottom sheet with 3 states:
 *   collapsed → half-screen → full-screen, with drag handle.
 *
 * The panel houses:
 *  1. Header with close button
 *  2. Sticky NoteComposer with timestamp capture
 *  3. Scrollable NotesFeed
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import type { VideoNote } from '@/types/video'
import NoteComposer, { type NewNote } from './NoteComposer'
import NotesFeed from './NotesFeed'
import Icon from '@/components/portal/Icon'
import { cn } from '@/utils/cn'
import { t } from '@/i18n'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface NotesPanelProps {
  isOpen: boolean
  onClose: () => void
  /** Returns the video player's currentTime in seconds */
  onCaptureTime: () => number
  /** Seek the video to the given time */
  onSeekToTimestamp: (seconds: number) => void
  /** Called when a new note is submitted */
  onAddNote: (note: NewNote) => Promise<void>
  /** Existing coaching notes */
  notes: VideoNote[]
  notesLoading?: boolean
  activeNoteId?: string | null
  /** Athletes linked to the video (passed to NoteComposer) */
  linkedAthletes?: { id: string; name: string }[]
  disabled?: boolean
}

// ─── Mobile bottom-sheet state ─────────────────────────────────────────────

type SheetState = 'collapsed' | 'half' | 'full'

// ─── Component ─────────────────────────────────────────────────────────────

export default function NotesPanel({
  isOpen,
  onClose,
  onCaptureTime,
  onSeekToTimestamp,
  onAddNote,
  notes,
  notesLoading = false,
  activeNoteId,
  linkedAthletes = [],
  disabled = false,
}: NotesPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const [sheetState, setSheetState] = useState<SheetState>('half')
  const dragStartY = useRef<number | null>(null)

  // ── Keyboard: ESC to close ──
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  // ── Click outside to close (desktop only) ──
  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose()
      }
    },
    [onClose],
  )

  // ── Mobile drag handling ──
  const handleDragStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
  }

  const handleDragEnd = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return
    const diff = dragStartY.current - e.changedTouches[0].clientY

    if (diff > 60) {
      // Swipe up → expand
      setSheetState((prev) => (prev === 'collapsed' ? 'half' : 'full'))
    } else if (diff < -60) {
      // Swipe down → collapse
      if (sheetState === 'full') setSheetState('half')
      else onClose()
    }
    dragStartY.current = null
  }

  // When opening on mobile, reset to half
  useEffect(() => {
    if (isOpen) setSheetState('half')
  }, [isOpen])

  // ─── Desktop Panel ────────────────────────────────────────────────────────
  const desktopPanel = (
    <>
      {/* Backdrop (semi-transparent click catcher) */}
      {isOpen && (
        <div
          className="hidden md:block fixed inset-0 z-40"
          onClick={handleBackdropClick}
        />
      )}

      <div
        ref={panelRef}
        className={cn(
          'hidden md:flex flex-col fixed top-0 right-0 h-full z-40',
          'w-[40vw] max-w-[560px] min-w-[340px]',
          'bg-white dark:bg-gray-900 shadow-[-4px_0_24px_rgba(0,0,0,0.08)]',
          'transition-transform duration-300 ease-out will-change-transform',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <h2 className="text-sm font-black uppercase tracking-widest text-[var(--pa-text-primary)]">
            {t('videoLibrary.notes.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={t('videoLibrary.notes.closePanel')}
          >
            <Icon name="close" size="text-xl" />
          </button>
        </div>

        {/* Sticky Composer */}
        <NoteComposer
          onCaptureTime={onCaptureTime}
          onSubmit={onAddNote}
          linkedAthletes={linkedAthletes}
          disabled={disabled}
          className="shrink-0"
        />

        {/* Scrollable Feed */}
        <NotesFeed
          notes={notes}
          isLoading={notesLoading}
          activeNoteId={activeNoteId}
          onSeekToTimestamp={onSeekToTimestamp}
          className="flex-1 min-h-0"
        />
      </div>
    </>
  )

  // ─── Mobile Bottom Sheet ──────────────────────────────────────────────────

  const sheetHeightClass: Record<SheetState, string> = {
    collapsed: 'h-0',
    half: 'h-[50vh]',
    full: 'h-[90vh]',
  }

  const mobileSheet = (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-40"
          onClick={onClose}
        />
      )}

      <div
        ref={panelRef}
        className={cn(
          'md:hidden fixed bottom-0 left-0 right-0 z-40',
          'bg-white dark:bg-gray-900 rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.12)]',
          'transition-all duration-300 ease-out',
          isOpen ? sheetHeightClass[sheetState] : 'h-0',
          'flex flex-col overflow-hidden',
        )}
        onTouchStart={handleDragStart}
        onTouchEnd={handleDragEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center py-2 shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pb-2 shrink-0">
          <h2 className="text-sm font-black uppercase tracking-widest text-[var(--pa-text-primary)]">{t('videoLibrary.notes.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label={t('videoLibrary.notes.closePanel')}
          >
            <Icon name="close" size="text-lg" />
          </button>
        </div>

        {/* Composer */}
        <NoteComposer
          onCaptureTime={onCaptureTime}
          onSubmit={onAddNote}
          linkedAthletes={linkedAthletes}
          disabled={disabled}
          className="shrink-0"
        />

        {/* Feed */}
        <NotesFeed
          notes={notes}
          isLoading={notesLoading}
          activeNoteId={activeNoteId}
          onSeekToTimestamp={onSeekToTimestamp}
          className="flex-1 min-h-0"
        />
      </div>
    </>
  )

  return (
    <>
      {desktopPanel}
      {mobileSheet}
    </>
  )
}
