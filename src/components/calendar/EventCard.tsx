
import { CalendarEvent, formatEventTimeRange, formatEventLocation, EVENT_TYPE_COLORS } from '../../types/calendar'
import Card from '../portal/Card'
import Icon from '../portal/Icon'
import { CardTitle } from '../portal/Typography'
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
  const typeColor = EVENT_TYPE_COLORS[event.type] || 'border-l-slate-300'
  
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
      className={`w-full text-left group ${className}`}
    >
      <Card className={`p-0 border-l-4 ${typeColor} hover:shadow-lg transition-all duration-300 overflow-hidden h-full rounded-none !border-0 ${isCancelled ? 'opacity-75 bg-slate-50 dark:bg-slate-900/50' : ''}`}>
        {/* Sport Background Image */}
        <SportCardImage 
          sport={sport} 
          height="h-48"
          className="rounded-none"
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
            <div className="bg-white/20 dark:bg-black/30 backdrop-blur-sm rounded-none px-2 py-1 text-center min-w-[3.5rem]">
              <div className="text-xs font-bold text-white/80 uppercase">{startTime.toLocaleDateString('en-US', { month: 'short' })}</div>
              <div className="text-xl font-black text-white leading-none">{startTime.getDate()}</div>
            </div>
          </div>
        </SportCardImage>
        
        {/* Card Content */}
        <div className="p-4">
          <CardTitle className={`mb-1 text-lg ${isCancelled ? 'line-through text-slate-500' : ''}`}>
            {event.title}
          </CardTitle>
          
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">
            {event.team?.name || 'Unknown Team'}
          </p>
          
          {isCancelled && (
            <div className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-bold px-2 py-1 rounded-none inline-block mb-3">
              {safeT('calendar.event.cancelled', 'Cancelled')} {event.cancellation_reason ? `: ${event.cancellation_reason}` : ''}
            </div>
          )}

          {!compact && (
            <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
               {event.arrival_time && (
                <div className="flex items-center gap-2">
                  <Icon name="schedule" size="text-lg" className="text-amber-500" />
                  <span>
                      {safeT('calendar.event.arriveBy', 'Arrive by {{time}}').replace('{{time}}', new Date(event.arrival_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }))}
                  </span>
                </div>
              )}
              {event.event_location && (
                 <div className="flex items-start gap-2">
                  <Icon name="location_on" size="text-lg" className="text-slate-400 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{formatEventLocation(event.event_location)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </button>
  )
}
