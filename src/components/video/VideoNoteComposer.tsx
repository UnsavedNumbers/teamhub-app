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

const SCOPES: { value: VideoNoteScope; label: string }[] = [
  { value: 'private', label: 'Private (only me)' },
  { value: 'coaches', label: 'Visible to coaches' },
  { value: 'guardians', label: 'Share with guardians' },
  { value: 'all', label: 'Visible to all' }
]

export default function VideoNoteComposer({
  currentTime,
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
        timestamp_start: currentTime,
        scope,
        target_athlete_ids: includeEntireTeam ? undefined : selectedAthletes
      })
      
      // Reset form
      setContent('')
      setSelectedAthletes([])
      setIncludeEntireTeam(false)
    } finally {
      setIsSaving(false)
    }
  }
  
  return (
    <div className={cn(
      "bg-white dark:bg-slate-900 rounded-2xl border-2 border-[var(--org-btn-primary-bg)] shadow-xl shadow-[var(--org-btn-primary-bg)]/5 overflow-hidden",
      className
    )}>
      {/* Header */}
      <div className="bg-[var(--org-btn-primary-bg)] p-4 flex items-center justify-between text-white">
        <span className="text-sm font-black uppercase tracking-widest">Interactive Composer</span>
        <div className="flex items-center gap-2">
          <Icon name="timer" size="text-sm" />
          <span className="text-sm font-black">{formatTimestamp(currentTime)}</span>
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
              title="Draw on video (coming soon)"
              disabled
            >
              <Icon name="draw" />
            </button>
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
              ADD NOTE AT {formatTimestamp(currentTime)}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
