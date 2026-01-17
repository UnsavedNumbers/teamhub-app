
import { RSVPStatus, RSVP_STATUS_COLORS } from '../../types/calendar'
import Icon from '../portal/Icon'
import { useState } from 'react'
import { useI18n } from '../../i18n/useI18n'

interface RSVPButtonProps {
  eventId: string
  childId: string
  childName: string
  currentStatus: RSVPStatus
  onStatusChange: (newStatus: RSVPStatus) => Promise<void>
  disabled?: boolean
}

export default function RSVPButton({ eventId, childId, childName, currentStatus, onStatusChange, disabled = false }: RSVPButtonProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // Safe translation helper with fallbacks
  const safeT = (key: string, fallback: string = key): string => {
    try {
      return t(key as any) || fallback
    } catch {
      return fallback
    }
  }

  const handleSelect = async (status: RSVPStatus) => {
    setLoading(true)
    setIsOpen(false)
    try {
        await onStatusChange(status)
    } finally {
        setLoading(false)
    }
  }

  // Helper to get translated label with safe fallbacks
  const getStatusLabel = (status: RSVPStatus): string => {
    const statusKey = `calendar.rsvp.${status}`
    const fallbacks: Record<RSVPStatus, string> = {
      going: 'Going',
      late: 'Running Late',
      not_going: 'Not Going',
      unknown: 'No Response',
    }
    return safeT(statusKey, fallbacks[status] || status)
  }

  const currentStatusLabel = getStatusLabel(currentStatus)
  const currentStatusColor = RSVP_STATUS_COLORS[currentStatus]

  const statusOptions: RSVPStatus[] = ['going', 'late', 'not_going', 'unknown']

  return (
    <div className="relative">
      <div className="mb-1 text-xs font-bold uppercase tracking-wider text-slate-500">{childName}</div>
      <button 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled || loading}
        className={`w-full flex items-center justify-between px-3 py-2 rounded border transition-colors ${currentStatusColor} ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-opacity-80'}`}
      >
        <span className="font-bold text-sm flex items-center gap-2">
           {loading ? <div className="animate-spin h-3 w-3 border-2 border-current rounded-full border-t-transparent"/> : null}
           {currentStatusLabel}
        </span>
        <Icon name="expand_more" />
      </button>

      {isOpen && (
        <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute z-20 w-full mt-1 bg-white dark:bg-slate-800 rounded shadow-xl border border-slate-200 dark:border-slate-700 py-1 overflow-hidden">
                {statusOptions
                    .filter(s => s !== 'unknown') // Don't allow selecting 'unknown' manually
                    .map(status => (
                    <button
                        key={status}
                        onClick={() => handleSelect(status)}
                        className={`w-full text-left px-3 py-2 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 ${status === currentStatus ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                    >
                        <span className={`w-2 h-2 rounded-full ${RSVP_STATUS_COLORS[status].split(' ')[0].replace('text-', 'bg-')}`} />
                        {getStatusLabel(status)}
                    </button>
                ))}
            </div>
        </>
      )}
    </div>
  )
}
