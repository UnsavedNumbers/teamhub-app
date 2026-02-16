/**
 * VideoNoteComposer Component
 * 
 * Allows coaches to create timestamped notes on videos.
 * Supports athlete targeting and scope selection.
 */

import { useState } from 'react'
import type { VideoNoteScope } from '@/types/video'
import Icon from '@/components/portal/Icon'
import Button from '@/components/portal/Button'
import { cn } from '@/utils/cn'

interface Athlete {
  id: string
  name: string
}

interface VideoNoteComposerProps {
  currentTime: number
  isPlaying?: boolean
  durationSeconds?: number
  athletes?: Athlete[]
  onSave: (note: {
    content: string
    title?: string
    timestamp_start?: number
    scope: VideoNoteScope
    target_athlete_ids?: string[]
  }) => Promise<void>
  onCancel?: () => void
  className?: string
  disabled?: boolean
}

function formatTimestamp(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

/**
 * Parse manual timestamp input (M:SS or MM:SS or plain seconds)
 * Returns seconds, or null if invalid
 */
function parseTimestampInput(input: string): number | null {
  if (!input.trim()) return null
  
  // Try plain seconds (e.g. "90")
  const plainSeconds = parseInt(input, 10)
  if (!isNaN(plainSeconds) && input === String(plainSeconds)) {
    return plainSeconds >= 0 ? plainSeconds : null
  }
  
  // Try M:SS or MM:SS
  const parts = input.split(':')
  if (parts.length !== 2) return null
  
  const mins = parseInt(parts[0], 10)
  const secs = parseInt(parts[1], 10)
  
  if (isNaN(mins) || isNaN(secs)) return null
  if (secs < 0 || secs > 59) return null
  if (mins < 0) return null
  
  return mins * 60 + secs
}

const SCOPES: { value: VideoNoteScope; label: string }[] = [
  { value: 'private', label: 'Private (only me)' },
  { value: 'coaches', label: 'Visible to coaches' },
  { value: 'guardians', label: 'Share with guardians' },
  { value: 'all', label: 'Visible to all' }
]

export default function VideoNoteComposer({
  currentTime,
  isPlaying = false,
  durationSeconds,
  athletes = [],
  onSave,
  onCancel,
  className,
  disabled = false
}: VideoNoteComposerProps) {
  const [content, setContent] = useState('')
  const [scope, setScope] = useState<VideoNoteScope>('guardians')
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([])
  const [includeEntireTeam, setIncludeEntireTeam] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Manual timestamp state
  const [manualTimeSeconds, setManualTimeSeconds] = useState<number | null>(null)
  const [timestampInput, setTimestampInput] = useState('')
  const [timestampError, setTimestampError] = useState<string | null>(null)
  
  // Effective timestamp: manual override or live currentTime
  const effectiveTime = manualTimeSeconds !== null ? manualTimeSeconds : currentTime
  
  // Max allowed timestamp (default to 24h if no duration)
  const maxSeconds = durationSeconds ?? 86400
  
  // Handle timestamp input changes
  const handleTimestampInputChange = (value: string) => {
    setTimestampInput(value)
    setTimestampError(null)
    
    if (!value.trim()) {
      // Clear manual time (revert to live)
      setManualTimeSeconds(null)
      return
    }
    
    const parsed = parseTimestampInput(value)
    if (parsed === null) {
      setTimestampError('Invalid time format')
      return
    }
    
    if (parsed > maxSeconds) {
      setTimestampError(`Exceeds max time (${formatTimestamp(maxSeconds)})`)
      setManualTimeSeconds(maxSeconds)
      return
    }
    
    setManualTimeSeconds(parsed)
  }
  
  // Capture current time button
  const handleCaptureTime = () => {
    setManualTimeSeconds(currentTime)
    setTimestampInput(formatTimestamp(currentTime))
    setTimestampError(null)
  }
  
  const handleAthleteToggle = (athleteId: string) => {
    setSelectedAthletes(prev => 
      prev.includes(athleteId)
        ? prev.filter(id => id !== athleteId)
        : [...prev, athleteId]
    )
  }
  
  const handleEntireTeamToggle = () => {
    if (includeEntireTeam) {
      setIncludeEntireTeam(false)
    } else {
      setIncludeEntireTeam(true)
      setSelectedAthletes([])
    }
  }
  
  const handleSave = async () => {
    if (!content.trim()) return
    
    setIsSaving(true)
    try {
      await onSave({
        content: content.trim(),
        timestamp_start: effectiveTime,
        scope,
        target_athlete_ids: includeEntireTeam ? undefined : selectedAthletes
      })
      
      // Reset form
      setContent('')
      setSelectedAthletes([])
      setIncludeEntireTeam(false)
      setManualTimeSeconds(null)
      setTimestampInput('')
      setTimestampError(null)
    } finally {
      setIsSaving(false)
    }
  }
  
  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-2xl border-2 border-[var(--org-btn-primary-bg)] shadow-xl shadow-[var(--org-btn-primary-bg)]/5 overflow-hidden",
      className
    )}>
      {/* Header with Live Indicator */}
      <div className="bg-[var(--org-btn-primary-bg)] p-4 flex items-center justify-between text-white">
        <span className="text-sm font-black uppercase tracking-widest">NOTE COMPOSER</span>
        <div className="flex items-center gap-3">
          {/* Live indicator when playing and no manual override */}
          {isPlaying && manualTimeSeconds === null && (
            <div className="flex items-center gap-1.5 px-2 py-1 bg-white/20 rounded-full">
              <div className="size-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs font-black uppercase tracking-wider">LIVE</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Prominent Time Display */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="text-center">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
            Note at
          </label>
          <div className="text-5xl font-black text-[var(--org-btn-primary-bg)] tabular-nums tracking-tight mb-4">
            {formatTimestamp(effectiveTime)}
          </div>
          
          {/* Manual Timestamp Input & Capture Button */}
          <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
            <div className="flex-1">
              <input
                type="text"
                value={timestampInput}
                onChange={(e) => handleTimestampInputChange(e.target.value)}
                placeholder="0:00"
                className={cn(
                  "w-full px-3 py-2 rounded-lg border text-sm text-center font-mono",
                  timestampError
                    ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                )}
                aria-label="Timestamp (MM:SS)"
              />
              {timestampError && (
                <p className="text-xs text-red-500 mt-1">{timestampError}</p>
              )}
            </div>
            
            <button
              type="button"
              onClick={handleCaptureTime}
              className="px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2 transition-colors whitespace-nowrap"
              aria-label="Capture current time"
            >
              <Icon name="schedule" size="text-lg" />
              Capture Time
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="p-6">
        {/* Text Area */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Start typing your coaching observation..."
          className="w-full border-none focus:ring-0 text-lg font-medium placeholder:text-slate-300 min-h-[120px] resize-none p-0 bg-transparent text-slate-900 dark:text-white"
        />
        
        {/* Athlete Selection */}
        {athletes.length > 0 && (
          <div className="mt-4 pt-6 border-t border-slate-100 dark:border-slate-800">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-4">
              Assign to Athletes
            </label>
            <div className="flex flex-wrap gap-4">
              {athletes.map((athlete) => (
                <label key={athlete.id} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedAthletes.includes(athlete.id)}
                    onChange={() => handleAthleteToggle(athlete.id)}
                    disabled={includeEntireTeam}
                    className="size-5 rounded border-slate-200 dark:border-slate-700 text-[var(--org-btn-primary-bg)] focus:ring-[var(--org-btn-primary-bg)] transition-all disabled:opacity-50"
                  />
                  <span className={cn(
                    "text-sm font-bold transition-colors",
                    includeEntireTeam 
                      ? "text-slate-400" 
                      : "text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white"
                  )}>
                    {athlete.name}
                  </span>
                </label>
              ))}
              
              {/* Entire Team Option */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeEntireTeam}
                  onChange={handleEntireTeamToggle}
                  className="size-5 rounded border-slate-200 dark:border-slate-700 text-[var(--org-btn-primary-bg)] focus:ring-[var(--org-btn-primary-bg)] transition-all"
                />
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  Entire Team
                </span>
              </label>
            </div>
          </div>
        )}
        
        {/* Scope Selection */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-3">
            Visibility
          </label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value as VideoNoteScope)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-[var(--org-btn-primary-bg)] focus:border-transparent"
          >
            {SCOPES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        
        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="size-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              title="Add attachment (coming soon)"
              disabled
            >
              <Icon name="attachment" />
            </button>
          </div>
          
          <div className="flex items-center gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
            )}
            <Button
              onClick={handleSave}
              disabled={disabled || !content.trim() || isSaving}
              className="flex items-center gap-3"
            >
              <Icon name="add_circle" size="text-xl" />
              ADD NOTE AT {formatTimestamp(effectiveTime)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
