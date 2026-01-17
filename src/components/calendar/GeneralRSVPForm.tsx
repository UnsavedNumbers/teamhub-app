import { useState, useEffect } from 'react'
import { getGeneralRSVP, setGeneralRSVP } from '../../data/services/rsvpService'
import { useUserContext } from '../../hooks/useUserContext'
import type { GeneralRSVP, GeneralRSVPStatus } from '../../types/calendar'
import Icon from '../portal/Icon'

interface GeneralRSVPFormProps {
  eventId: string
  userId: string
  currentRSVP?: GeneralRSVP | null
  disabled?: boolean
}

const STATUS_OPTIONS: { value: GeneralRSVPStatus; label: string; color: string }[] = [
  { value: 'going', label: 'Going', color: 'text-green-600 bg-green-50' },
  { value: 'not_going', label: 'Not Going', color: 'text-red-600 bg-red-50' },
  { value: 'maybe', label: 'Maybe', color: 'text-amber-600 bg-amber-50' },
]

export default function GeneralRSVPForm({ eventId, userId, currentRSVP, disabled = false }: GeneralRSVPFormProps) {
  const { context, isReady } = useUserContext()
  const [status, setStatus] = useState<GeneralRSVPStatus | null>(currentRSVP?.status || null)
  const [note, setNote] = useState<string>(currentRSVP?.note || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Guard: Don't render if context not ready
  if (!isReady || !context) {
    return (
      <div className="text-sm text-slate-500 italic">
        Loading...
      </div>
    )
  }

  useEffect(() => {
    if (currentRSVP) {
      setStatus(currentRSVP.status)
      setNote(currentRSVP.note || '')
    } else {
      // Reset to defaults if RSVP is cleared
      setStatus(null)
      setNote('')
    }
  }, [currentRSVP])

  const handleStatusChange = async (newStatus: GeneralRSVPStatus) => {
    if (disabled || loading || !context) return
    
    setLoading(true)
    setError(null)
    
    try {
      const { data, error: rsvpError } = await setGeneralRSVP(
        context,
        eventId,
        userId,
        newStatus,
        note || null
      )
      
      if (rsvpError) {
        setError(rsvpError.message)
        return
      }
      
      setStatus(newStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update RSVP')
    } finally {
      setLoading(false)
    }
  }

  // Use useEffect for debounced note updates
  useEffect(() => {
    if (!status || disabled || loading || !context) return
    
    const timeoutId = setTimeout(async () => {
      setLoading(true)
      try {
        await setGeneralRSVP(context, eventId, userId, status, note || null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update note')
      } finally {
        setLoading(false)
      }
    }, 1000)
    
    return () => clearTimeout(timeoutId)
  }, [note, status, eventId, userId, disabled, loading, context])

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
          {error}
        </div>
      )}
      
      <div className="space-y-2">
        {STATUS_OPTIONS.map(option => (
          <button
            key={option.value}
            onClick={() => handleStatusChange(option.value)}
            disabled={disabled || loading}
            className={`w-full flex items-center justify-between px-3 py-2 rounded border transition-colors ${
              status === option.value 
                ? `${option.color} border-current` 
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="font-bold text-sm flex items-center gap-2">
              {loading && status === option.value && (
                <div className="animate-spin h-3 w-3 border-2 border-current rounded-full border-t-transparent"/>
              )}
              {option.label}
            </span>
            {status === option.value && <Icon name="check" />}
          </button>
        ))}
      </div>
      
      {status && (
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
            Note (Optional)
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            disabled={disabled || loading}
            placeholder="Add a note..."
            className="w-full px-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#137fec] disabled:opacity-50"
            rows={2}
          />
        </div>
      )}
    </div>
  )
}
