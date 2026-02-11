/**
 * NoteComposer Component (Panel version)
 *
 * Compact note creation form designed to live inside the slide-out NotesPanel.
 * Features:
 *  – Static timestamp input (NOT a live clock)
 *  – "Capture Time" button reads video currentTime on demand
 *  – Collapsible athlete-assignment + visibility row
 *  – Sticky positioning within the panel
 */

import { useState, useCallback } from 'react'
import type { VideoNoteScope } from '@/types/video'
import Icon from '@/components/portal/Icon'
import Button from '@/components/portal/Button'
import { cn } from '@/utils/cn'
import { t } from '@/i18n'

// ─── Types ─────────────────────────────────────────────────────────────────

interface Athlete {
  id: string
  name: string
}

export interface NewNote {
  content: string
  title?: string
  timestamp_start?: number
  scope: VideoNoteScope
  target_athlete_ids?: string[]
}

export interface NoteComposerProps {
  /** Callback that reads the video player's currentTime and returns it */
  onCaptureTime: () => number
  /** Called when the user submits a new note */
  onSubmit: (note: NewNote) => Promise<void>
  /** Athletes linked to the video (for the "Assign" checkboxes) */
  linkedAthletes?: Athlete[]
  /** Disable all inputs (e.g. demo mode) */
  disabled?: boolean
  className?: string
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function formatTs(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function parseTs(input: string): number | null {
  if (!input.trim()) return null
  const plain = parseInt(input, 10)
  if (!isNaN(plain) && input === String(plain)) return plain >= 0 ? plain : null
  const parts = input.split(':')
  if (parts.length !== 2) return null
  const mins = parseInt(parts[0], 10)
  const secs = parseInt(parts[1], 10)
  if (isNaN(mins) || isNaN(secs) || secs < 0 || secs > 59 || mins < 0) return null
  return mins * 60 + secs
}

const SCOPES: { value: VideoNoteScope; label: string }[] = [
  { value: 'private', label: t('videoLibrary.notes.scopes.private') },
  { value: 'coaches', label: t('videoLibrary.notes.scopes.coaches') },
  { value: 'guardians', label: t('videoLibrary.notes.scopes.guardians') },
  { value: 'all', label: t('videoLibrary.notes.scopes.all') },
]

// ─── Component ─────────────────────────────────────────────────────────────

export default function NoteComposer({
  onCaptureTime,
  onSubmit,
  linkedAthletes = [],
  disabled = false,
  className,
}: NoteComposerProps) {
  // Form state
  const [timestampSeconds, setTimestampSeconds] = useState<number>(0)
  const [timestampInput, setTimestampInput] = useState('00:00')
  const [content, setContent] = useState('')
  const [scope, setScope] = useState<VideoNoteScope>('coaches')
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([])
  const [showOptions, setShowOptions] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [tsError, setTsError] = useState<string | null>(null)

  // ── Timestamp management ──

  const handleCaptureTime = useCallback(() => {
    const time = onCaptureTime()
    setTimestampSeconds(time)
    setTimestampInput(formatTs(time))
    setTsError(null)
  }, [onCaptureTime])

  const handleTimestampChange = useCallback((value: string) => {
    setTimestampInput(value)
    setTsError(null)
    if (!value.trim()) {
      setTimestampSeconds(0)
      return
    }
    const parsed = parseTs(value)
    if (parsed === null) {
      setTsError(t('videoLibrary.notes.invalidTimestamp'))
      return
    }
    setTimestampSeconds(parsed)
  }, [])

  // ── Athlete toggles ──

  const toggleAthlete = (id: string) =>
    setSelectedAthletes((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    )

  // ── Submit ──

  const handleSubmit = useCallback(async () => {
    if (!content.trim() || disabled) return
    setIsSaving(true)
    try {
      await onSubmit({
        content: content.trim(),
        timestamp_start: timestampSeconds,
        scope,
        target_athlete_ids: selectedAthletes.length > 0 ? selectedAthletes : undefined,
      })
      // Reset form (keep panel open for rapid note-taking)
      setContent('')
      setTimestampSeconds(0)
      setTimestampInput('00:00')
      setSelectedAthletes([])
      setTsError(null)
    } finally {
      setIsSaving(false)
    }
  }, [content, disabled, onSubmit, timestampSeconds, scope, selectedAthletes])

  return (
    <div
      className={cn(
        'border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900',
        className,
      )}
    >
      <div className="p-4 space-y-3">
        {/* ── Timestamp Row ── */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={timestampInput}
              onChange={(e) => handleTimestampChange(e.target.value)}
              placeholder="00:00"
              aria-label={t('videoLibrary.notes.timestampLabel')}
              disabled={disabled}
              className={cn(
                'w-full px-3 py-2 rounded-lg border text-sm font-mono text-center',
                tsError
                  ? 'border-red-400 bg-red-50 dark:bg-red-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800',
              )}
            />
            {tsError && (
              <p className="absolute -bottom-4 left-0 text-[10px] text-red-500">{tsError}</p>
            )}
          </div>

          <button
            type="button"
            onClick={handleCaptureTime}
            disabled={disabled}
            className="shrink-0 px-3 py-2 rounded-lg bg-[var(--org-btn-secondary-bg)] text-white text-sm font-bold flex items-center gap-1.5 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Icon name="schedule" size="text-base" />
            {t('videoLibrary.notes.captureTime')}
          </button>
        </div>

        {/* ── Content ── */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={t('videoLibrary.notes.placeholder')}
          rows={3}
          disabled={disabled}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm resize-none focus:ring-2 focus:ring-[var(--org-btn-secondary-bg)] focus:border-transparent placeholder:text-gray-400"
        />

        {/* ── Collapsible Options (Athletes + Visibility) ── */}
        <button
          type="button"
          onClick={() => setShowOptions(!showOptions)}
          className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
        >
          <Icon
            name="expand_more"
            size="text-sm"
            className={cn('transition-transform duration-200', showOptions && 'rotate-180')}
          />
          {t('videoLibrary.notes.assignAndVisibility')}
        </button>

        {showOptions && (
          <div className="space-y-3 pt-1">
            {/* Athletes */}
            {linkedAthletes.length > 0 && (
              <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                  {t('videoLibrary.notes.assignToAthletes')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {linkedAthletes.map((a) => (
                    <label
                      key={a.id}
                      className="flex items-center gap-1.5 cursor-pointer text-xs"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAthletes.includes(a.id)}
                        onChange={() => toggleAthlete(a.id)}
                        disabled={disabled}
                        className="size-4 rounded border-gray-300 text-[var(--org-btn-secondary-bg)] focus:ring-[var(--org-btn-secondary-bg)]"
                      />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {a.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Scope */}
            <div>
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2">
                {t('videoLibrary.notes.visibility')}
              </label>
              <select
                value={scope}
                onChange={(e) => setScope(e.target.value as VideoNoteScope)}
                disabled={disabled}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-sm focus:ring-2 focus:ring-[var(--org-btn-secondary-bg)] focus:border-transparent"
              >
                {SCOPES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* ── Submit ── */}
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={disabled || !content.trim() || isSaving}
            className="text-sm"
          >
            {isSaving ? t('common.saving') : t('videoLibrary.notes.addAtTimestamp', { timestamp: formatTs(timestampSeconds) })}
          </Button>
        </div>
      </div>
    </div>
  )
}
