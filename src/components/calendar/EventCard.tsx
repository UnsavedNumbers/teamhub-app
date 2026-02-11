
import { CalendarEvent, formatEventTimeRange, formatEventLocation } from '../../types/calendar'
import Icon from '../portal/Icon'
import { SportCardImage } from '../portal/SportCardImage'
import { useI18n } from '../../i18n/useI18n'
import type { SportInfo } from '../../utils/sportContext'

interface EventCardProps {
  event: CalendarEvent
  sport?: SportInfo | null
  onClick?: () => void
  showRSVP?: boolean
  compact?: boolean
  className?: string
}

export default function EventCard({ event, sport = null, onClick, compact = false, className = '' }: EventCardProps) {
  const { t } = useI18n()
  
  // Safe translation helper with fallbacks
  const safeT = (key: string, fallback: string = key): string => {
    try {
      return t(key as any) || fallback
    } catch {
      return fallback
    }
  }
  
  const typeLabel = safeT(`calendar.eventTypes.${event.type}`, event.type)
  
  const startTime = new Date(event.start_time)
  const isCancelled = event.is_cancelled

  return (
    <button 
      onClick={onClick}
      className={`pa-card pa-shadow-sm pa-w-full pa-text-left hover:pa-shadow-md transition-shadow pa-overflow-hidden pa-p-0 border-0 group pa-rounded-lg flex flex-col h-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 ${isCancelled ? 'opacity-75' : ''} ${className}`}
    >
      {/* Sport Background Image - Full Width */}
      <div className="pa-relative pa-overflow-hidden w-full rounded-t-lg" style={{ aspectRatio: '16 / 9' }}>
        <SportCardImage 
          sport={sport} 
          height="h-full"
          className="!rounded-none"
        >
          <div className="flex justify-between items-end">
            <div className="flex flex-col">
              <span className={`text-xs font-black uppercase tracking-wider mb-1 ${isCancelled ? 'text-red-400 line-through' : 'text-white/80'}`}>
                {typeLabel}
              </span>
              <span className="text-sm font-bold text-white">
                {formatEventTimeRange(event.start_time, event.end_time, event.timezone)}
              </span>
            </div>
            <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm px-2 py-1 text-center min-w-[3.5rem]">
              <div className="text-xs font-bold text-white/80 uppercase">{startTime.toLocaleDateString('en-US', { month: 'short' })}</div>
              <div className="text-xl font-black text-white leading-none">{startTime.getDate()}</div>
            </div>
          </div>
        </SportCardImage>
      </div>
        
      {/* Card Content */}
      <div className="pa-p-3 flex-1 flex flex-col justify-end">
        <div className="min-w-0 flex-1">
          <div className={`pa-font-semibold text-slate-900 dark:text-white group-hover:text-[var(--org-link-color)] transition-colors mb-1 ${isCancelled ? 'line-through text-slate-500 dark:text-slate-400' : ''}`}>
            {event.title}
          </div>
          
          <div className="pa-text-sm text-slate-500 dark:text-slate-400">
            {event.team?.name || 'Unknown Team'}
          </div>
          
          {isCancelled && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-1 inline-block mt-2">
              {safeT('calendar.event.cancelled', 'Cancelled')} {event.cancellation_reason ? `: ${event.cancellation_reason}` : ''}
            </div>
          )}

          {!compact && (
            <div className="space-y-1.5 text-sm text-slate-600 dark:text-slate-400 mt-2">
               {event.arrival_time && (
                <div className="flex items-center gap-2">
                  <Icon name="schedule" size="text-base" className="text-amber-500" />
                  <span className="text-xs">
                      {safeT('calendar.event.arriveBy', 'Arrive by {{time}}').replace('{{time}}', new Date(event.arrival_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))}
                  </span>
                </div>
              )}
              {event.event_location && (
                 <div className="flex items-start gap-2">
                  <Icon name="location_on" size="text-base" className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2 text-xs">{formatEventLocation(event.event_location)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  )
}
