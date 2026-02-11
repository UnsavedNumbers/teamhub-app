
import { CalendarEvent, CalendarViewMode, formatEventTimeRange } from '../../types/calendar'
import type { SportInfo } from '../../utils/sportContext'
import Icon from '../portal/Icon'
import Button from '../portal/Button'
import EventCard from './EventCard'

interface CalendarGridProps {
  events: CalendarEvent[]
  eventSports: Record<string, SportInfo | null>
  viewMode: CalendarViewMode
  currentDate: Date
  currentPage?: number
  eventsPerPage?: number
  onEventClick: (event: CalendarEvent) => void
  onDateChange: (date: Date) => void
  onPageChange?: (page: number) => void
}

export default function CalendarGrid({ 
  events, 
  eventSports, 
  viewMode, 
  currentDate, 
  currentPage = 1,
  eventsPerPage = 9,
  onEventClick, 
  onDateChange,
  onPageChange
}: CalendarGridProps) {
  
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const days = []
    
    // Add empty days for padding before first day of month
    for (let i = 0; i < firstDay.getDay(); i++) {
        days.push(null)
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
        days.push(new Date(year, month, i))
    }
    return days
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
  }
  
  const isSameDay = (d1: Date, d2: Date) => {
      return d1.getDate() === d2.getDate() &&
             d1.getMonth() === d2.getMonth() &&
             d1.getFullYear() === d2.getFullYear()
  }

  const renderMonthView = () => {
      const days = getDaysInMonth(currentDate)
      const weeks: (Date | null)[][] = []
      let week: (Date | null)[] = []
      
      days.forEach((day, index) => {
          week.push(day)
          if ((index + 1) % 7 === 0 || index === days.length - 1) {
              weeks.push(week)
              week = []
          }
      })
      
      // Pad the last week
      if (week.length > 0) {
          while (week.length < 7) {
              week.push(null)
          }
          weeks.push(week)
      }

      return (
          <div className="w-full">
            <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-center font-bold text-xs uppercase text-slate-500 dark:text-slate-400 py-2">
                        {day}
                    </div>
                ))}
            </div>
            <div className="flex flex-col gap-1">
                {weeks.map((weekData, wIndex) => (
                    <div key={wIndex} className="grid grid-cols-7 gap-1 h-32">
                        {weekData.map((day, dIndex) => {
                           if (!day) return <div key={dIndex} className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded" />
                           
                           const dayEvents = events.filter(e => isSameDay(new Date(e.start_time), day))
                           const isCurrentDay = isToday(day)

                           return (
                               <div key={dIndex} className={`bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1 overflow-hidden hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors cursor-pointer ${isCurrentDay ? 'bg-slate-100 dark:bg-slate-700 ring-2 ring-[var(--org-btn-primary-bg)]' : ''}`}
                                    onClick={() => onDateChange(day)}
                               >
                                   <div className={`text-right text-xs font-bold mb-1 ${isCurrentDay ? 'text-[var(--org-link-color)]' : 'text-slate-500 dark:text-slate-400'}`}>
                                       {day.getDate()}
                                   </div>
                                    <div className="space-y-1">
                                        {dayEvents.slice(0, 3).map(event => (
                                            <div key={event.id} 
                                                 onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                                                 className={`text-[10px] truncate px-1 py-0.5 rounded border-l-2 cursor-pointer bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white
                                                 hover:bg-slate-100 dark:hover:bg-slate-600
                                                 ${event.is_cancelled ? 'line-through opacity-50' : ''}`}
                                                 style={{ borderLeftColor: event.type === 'game' ? '#10b981' : 'var(--org-btn-primary-bg, #137fec)' }}
                                            >
                                                {formatEventTimeRange(event.start_time, event.end_time, event.timezone).split(' - ')[0]} {event.title}
                                            </div>
                                        ))}
                                        {dayEvents.length > 3 && (
                                            <div className="text-[10px] text-slate-400 px-1">+{dayEvents.length - 3} more</div>
                                        )}
                                    </div>
                               </div>
                           ) 
                        })}
                    </div>
                ))}
            </div>
          </div>
      )
  }

  const renderAgendaView = () => {
    // Sort events by date
    const sortedEvents = [...events].sort((a, b) => 
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    // Calculate pagination
    const totalPages = Math.ceil(sortedEvents.length / eventsPerPage)
    const startIndex = (currentPage - 1) * eventsPerPage
    const endIndex = startIndex + eventsPerPage
    const paginatedEvents = sortedEvents.slice(startIndex, endIndex)

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedEvents.map(event => (
                    <EventCard 
                        key={event.id}
                        event={event} 
                        sport={eventSports[event.id] || null}
                        onClick={() => onEventClick(event)} 
                    />
                ))}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && onPageChange && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                        variant="secondary"
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-2"
                    >
                        <Icon name="chevron_left" />
                    </Button>
                    
                    <div className="flex items-center gap-2">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                onClick={() => onPageChange(page)}
                                className={`px-3 py-1.5 rounded text-sm font-bold transition-colors ${
                                    currentPage === page
                                        ? 'bg-[var(--org-btn-primary-bg)] text-white'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                    
                    <Button
                        variant="secondary"
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-3 py-2"
                    >
                        <Icon name="chevron_right" />
                    </Button>
                </div>
            )}
        </div>
    )
  }
  
  if (viewMode === 'month') return renderMonthView()
  return renderAgendaView()
}
