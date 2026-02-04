/**
 * Fan Schedule Page
 * 
 * Consolidated calendar view of all events from followed entities.
 * Supports Month, Week, and Agenda views.
 * 
 * URL/ROUTE: /fan/schedule
 * Design: FanConnect Minimalist Light
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n/useI18n'
import { getFanCalendar, getFollowedOrgs } from '../../data/services/fanService'
import type { CalendarEvent, FanOrgFollow } from '../../types/staffAndFan'
import { getLink, RouteKeys } from '../../utils/routes'
import BookmarkButton from '../../components/fan/BookmarkButton'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { showError } from '../../utils/toast'
import '../../styles/fan.css'

type ViewMode = 'month' | 'week' | 'agenda'
type EventTypeFilter = 'all' | 'game' | 'practice' | 'event' | 'meeting'

// Persist view preference
const VIEW_STORAGE_KEY = 'fan_schedule_view'

export default function FanSchedule() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { t } = useI18n()
  
  // Data state
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [followedOrgs, setFollowedOrgs] = useState<FanOrgFollow[]>([])
  
  // View state - persisted
  const savedView = (localStorage.getItem(VIEW_STORAGE_KEY) as ViewMode) || 'month'
  const [viewMode, setViewMode] = useState<ViewMode>(savedView)
  const [currentDate, setCurrentDate] = useState(new Date())
  
  // Filter state
  const [entityFilter, setEntityFilter] = useState<string>('all')
  const [typeFilter, setTypeFilter] = useState<EventTypeFilter>('all')
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  // Load events on mount and date change
  useEffect(() => {
    loadEvents()
    loadFollowedOrgs()
  }, [currentDate, viewMode])

  // Persist view preference
  useEffect(() => {
    localStorage.setItem(VIEW_STORAGE_KEY, viewMode)
  }, [viewMode])

  const loadEvents = async () => {
    setLoading(true)
    
    // Calculate date range based on view mode
    let startDate: Date
    let endDate: Date

    if (viewMode === 'month') {
      // Current month + previous/next for smooth transitions
      startDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
      endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0)
    } else if (viewMode === 'week') {
      const day = currentDate.getDay()
      startDate = new Date(currentDate)
      startDate.setDate(currentDate.getDate() - day - 7) // Include previous week
      endDate = new Date(startDate)
      endDate.setDate(startDate.getDate() + 20) // Include next week
    } else {
      // Agenda: next 30 days
      startDate = new Date()
      endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)
    }

    const orgIds = entityFilter !== 'all' ? [entityFilter] : undefined

    const { data, error } = await getFanCalendar({
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      org_ids: orgIds,
    })

    if (error) {
      showError(t('portal.fan.errors.getFanCalendarFailed'))
    } else if (data) {
      let filteredEvents = data.events || []
      
      // Apply type filter
      if (typeFilter !== 'all') {
        filteredEvents = filteredEvents.filter(event => {
          const title = event.title.toLowerCase()
          switch (typeFilter) {
            case 'game': return title.includes('game') || title.includes('match')
            case 'practice': return title.includes('practice') || title.includes('training')
            case 'meeting': return title.includes('meeting')
            case 'event': return !title.includes('game') && !title.includes('practice') && !title.includes('meeting')
            default: return true
          }
        })
      }
      
      setEvents(filteredEvents)
    }
    
    setLoading(false)
  }

  const loadFollowedOrgs = async () => {
    const { data, error } = await getFollowedOrgs()
    if (!error && data) {
      setFollowedOrgs(data)
    }
  }

  // Navigation handlers
  const handlePrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
    } else if (viewMode === 'week') {
      const newDate = new Date(currentDate)
      newDate.setDate(currentDate.getDate() - 7)
      setCurrentDate(newDate)
    }
  }

  const handleNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    } else if (viewMode === 'week') {
      const newDate = new Date(currentDate)
      newDate.setDate(currentDate.getDate() + 7)
      setCurrentDate(newDate)
    }
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Filter handlers
  const handleEntityFilterChange = (value: string) => {
    setEntityFilter(value)
    updateActiveFilters('entity', value)
  }

  const handleTypeFilterChange = (value: EventTypeFilter) => {
    setTypeFilter(value)
    updateActiveFilters('type', value)
  }

  const updateActiveFilters = (category: string, value: string) => {
    if (value === 'all') {
      setActiveFilters(prev => prev.filter(f => !f.startsWith(category)))
    } else {
      setActiveFilters(prev => {
        const filtered = prev.filter(f => !f.startsWith(category))
        return [...filtered, `${category}:${value}`]
      })
    }
  }

  const clearAllFilters = () => {
    setEntityFilter('all')
    setTypeFilter('all')
    setActiveFilters([])
  }

  const removeFilter = (filter: string) => {
    const [category] = filter.split(':')
    if (category === 'entity') setEntityFilter('all')
    if (category === 'type') setTypeFilter('all')
    setActiveFilters(prev => prev.filter(f => f !== filter))
  }

  // View title
  const getViewTitle = () => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    } else if (viewMode === 'week') {
      const day = currentDate.getDay()
      const weekStart = new Date(currentDate)
      weekStart.setDate(currentDate.getDate() - day)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekStart.getDate() + 6)
      
      return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    } else {
      return 'Upcoming Events'
    }
  }

  // Navigate to event detail
  const handleEventClick = (eventId: string) => {
    navigate(`/fan/schedule/event/${eventId}`)
  }

  return (
    <>
      {/* Page Header */}
      <div className="fan-page-header">
        <h1 className="fan-page-title">Schedule</h1>
        <p className="fan-page-subtitle">Events from teams you follow</p>
      </div>

      {/* View Toggle */}
      <div className="fan-controls-bar">
        <div className="fan-controls-left">
          {/* Navigation */}
          {viewMode !== 'agenda' && (
            <div className="fan-nav-controls">
              <button
                onClick={handlePrevious}
                className="fan-nav-btn"
                aria-label="Previous"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button
                onClick={handleToday}
                className="fan-btn fan-btn-secondary"
              >
                Today
              </button>
              <button
                onClick={handleNext}
                className="fan-nav-btn"
                aria-label="Next"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          )}
          
          <h2 className="fan-view-title">{getViewTitle()}</h2>
        </div>

        <div className="fan-controls-right">
          {/* View Toggle */}
          <div className="fan-view-toggle">
            <button
              onClick={() => setViewMode('month')}
              className={`fan-view-btn ${viewMode === 'month' ? 'active' : ''}`}
            >
              Month
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`fan-view-btn ${viewMode === 'week' ? 'active' : ''}`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`fan-view-btn ${viewMode === 'agenda' ? 'active' : ''}`}
            >
              Agenda
            </button>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="fan-filter-bar">
        <div className="fan-filter-group">
          <select
            value={entityFilter}
            onChange={(e) => handleEntityFilterChange(e.target.value)}
            className="fan-filter-select"
          >
            <option value="all">All Organizations</option>
            {followedOrgs.map((follow) => (
              <option key={follow.id} value={follow.org_id}>
                {(follow.org as any)?.name || 'Organization'}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => handleTypeFilterChange(e.target.value as EventTypeFilter)}
            className="fan-filter-select"
          >
            <option value="all">All Types</option>
            <option value="game">Games</option>
            <option value="practice">Practices</option>
            <option value="event">Events</option>
            <option value="meeting">Meetings</option>
          </select>
        </div>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <div className="fan-active-filters">
            {activeFilters.map((filter) => {
              const [category, value] = filter.split(':')
              let displayValue = value
              if (category === 'entity') {
                const org = followedOrgs.find(f => f.org_id === value)
                displayValue = (org?.org as any)?.name || value
              }
              return (
                <span key={filter} className="fan-filter-chip">
                  {displayValue}
                  <button onClick={() => removeFilter(filter)}>
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </span>
              )
            })}
            <button className="fan-clear-filters" onClick={clearAllFilters}>
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Calendar Content */}
      <div className="fan-calendar-content">
        {loading ? (
          <div className="fan-loading-state">
            <LoadingSpinner size="lg" />
          </div>
        ) : viewMode === 'agenda' ? (
          <AgendaView 
            events={events} 
            onEventClick={handleEventClick}
          />
        ) : viewMode === 'month' ? (
          <MonthView 
            events={events} 
            currentDate={currentDate}
            selectedDay={selectedDay}
            onDaySelect={setSelectedDay}
            onEventClick={handleEventClick}
          />
        ) : (
          <WeekView 
            events={events} 
            currentDate={currentDate}
            onEventClick={handleEventClick}
          />
        )}
      </div>
    </>
  )
}

/**
 * Agenda View - Virtualized list of upcoming events
 */
interface AgendaViewProps {
  events: CalendarEvent[]
  onEventClick: (eventId: string) => void
}

function AgendaView({ events, onEventClick }: AgendaViewProps) {
  const { t } = useI18n()
  
  // Group events by date
  const groupedEvents = useMemo(() => {
    const upcomingEvents = events
      .filter(event => new Date(event.start_time) >= new Date())
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

    const groups: { date: string; dateObj: Date; events: CalendarEvent[] }[] = []
    
    upcomingEvents.forEach(event => {
      const eventDate = new Date(event.start_time).toDateString()
      const existingGroup = groups.find(g => g.date === eventDate)
      
      if (existingGroup) {
        existingGroup.events.push(event)
      } else {
        groups.push({
          date: eventDate,
          dateObj: new Date(event.start_time),
          events: [event]
        })
      }
    })

    return groups
  }, [events])

  if (groupedEvents.length === 0) {
    return (
      <div className="fan-empty-state">
        <span className="material-symbols-outlined">event_busy</span>
        <h3>No upcoming events</h3>
        <p>Check back later or adjust your filters</p>
      </div>
    )
  }

  return (
    <div className="fan-agenda-view">
      {groupedEvents.map((group) => (
        <div key={group.date} className="fan-agenda-group">
          <div className="fan-agenda-date-header">
            <span className="fan-agenda-day">
              {group.dateObj.toLocaleDateString('en-US', { weekday: 'long' })}
            </span>
            <span className="fan-agenda-date">
              {group.dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
            </span>
          </div>
          <div className="fan-agenda-events">
            {group.events.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                onClick={() => onEventClick(event.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * Month View - Calendar grid
 */
interface MonthViewProps {
  events: CalendarEvent[]
  currentDate: Date
  selectedDay: Date | null
  onDaySelect: (date: Date | null) => void
  onEventClick: (eventId: string) => void
}

function MonthView({ events, currentDate, selectedDay, onDaySelect, onEventClick }: MonthViewProps) {
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()
  
  // Generate calendar grid
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = firstDay.getDay()
  const totalDays = lastDay.getDate()

  // Create day slots
  const days: (Date | null)[] = []
  
  // Empty slots before first day
  for (let i = 0; i < startDay; i++) {
    days.push(null)
  }
  
  // Days of the month
  for (let i = 1; i <= totalDays; i++) {
    days.push(new Date(year, month, i))
  }

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  // Check if date is today
  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString()
  }

  // Get selected day events
  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : []

  return (
    <div className="fan-month-view">
      {/* Calendar Grid */}
      <div className="fan-calendar-grid">
        {/* Day headers */}
        <div className="fan-calendar-header">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="fan-calendar-header-cell">{day}</div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="fan-calendar-body">
          {days.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="fan-calendar-cell fan-calendar-cell-empty" />
            }

            const dayEvents = getEventsForDay(date)
            const hasEvents = dayEvents.length > 0
            const isSelected = selectedDay?.toDateString() === date.toDateString()

            return (
              <div
                key={date.toISOString()}
                className={`fan-calendar-cell ${isToday(date) ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasEvents ? 'has-events' : ''}`}
                onClick={() => onDaySelect(isSelected ? null : date)}
              >
                <span className="fan-calendar-day-number">{date.getDate()}</span>
                {hasEvents && (
                  <div className="fan-calendar-event-dots">
                    {dayEvents.slice(0, 3).map((_, i) => (
                      <span key={i} className="fan-calendar-dot" />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Selected Day Events */}
      {selectedDay && (
        <div className="fan-day-events">
          <h3 className="fan-day-events-title">
            {selectedDay.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          {selectedDayEvents.length === 0 ? (
            <p className="fan-day-events-empty">No events scheduled</p>
          ) : (
            <div className="fan-day-events-list">
              {selectedDayEvents.map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                  compact
                  onClick={() => onEventClick(event.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Week View - Weekly calendar
 */
interface WeekViewProps {
  events: CalendarEvent[]
  currentDate: Date
  onEventClick: (eventId: string) => void
}

function WeekView({ events, currentDate, onEventClick }: WeekViewProps) {
  // Get week dates
  const day = currentDate.getDay()
  const weekStart = new Date(currentDate)
  weekStart.setDate(currentDate.getDate() - day)

  const weekDays: Date[] = []
  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart)
    date.setDate(weekStart.getDate() + i)
    weekDays.push(date)
  }

  // Get events for a specific day
  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start_time)
      return eventDate.toDateString() === date.toDateString()
    }).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  // Check if date is today
  const isToday = (date: Date) => {
    return date.toDateString() === new Date().toDateString()
  }

  return (
    <div className="fan-week-view">
      <div className="fan-week-grid">
        {weekDays.map((date) => {
          const dayEvents = getEventsForDay(date)
          
          return (
            <div key={date.toISOString()} className={`fan-week-day ${isToday(date) ? 'today' : ''}`}>
              <div className="fan-week-day-header">
                <span className="fan-week-day-name">
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </span>
                <span className={`fan-week-day-number ${isToday(date) ? 'today' : ''}`}>
                  {date.getDate()}
                </span>
              </div>
              <div className="fan-week-day-events">
                {dayEvents.length === 0 ? (
                  <span className="fan-week-no-events">No events</span>
                ) : (
                  dayEvents.map((event) => (
                    <div 
                      key={event.id}
                      className="fan-week-event"
                      onClick={() => onEventClick(event.id)}
                    >
                      <span className="fan-week-event-time">
                        {new Date(event.start_time).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit' 
                        })}
                      </span>
                      <span className="fan-week-event-title">{event.title}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Event Card Component
 */
interface EventCardProps {
  event: CalendarEvent
  compact?: boolean
  onClick?: () => void
}

function EventCard({ event, compact = false, onClick }: EventCardProps) {
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  // Get event type icon
  const getEventIcon = () => {
    const title = event.title.toLowerCase()
    if (title.includes('game') || title.includes('match')) return 'sports'
    if (title.includes('practice') || title.includes('training')) return 'fitness_center'
    if (title.includes('meeting')) return 'groups'
    return 'event'
  }
  
  return (
    <div 
      className={`fan-event-card ${compact ? 'fan-event-card-compact' : ''}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
    >
      <div className="fan-event-card-icon">
        <span className="material-symbols-outlined">{getEventIcon()}</span>
      </div>
      
      <div className="fan-event-card-content">
        <h4 className="fan-event-card-title">{event.title}</h4>
        
        <div className="fan-event-card-details">
          <span className="fan-event-card-time">
            <span className="material-symbols-outlined">schedule</span>
            {formatTime(event.start_time)}
          </span>
          
          {event.location && (
            <span className="fan-event-card-location">
              <span className="material-symbols-outlined">location_on</span>
              {event.location}
            </span>
          )}
        </div>

        {event.org_name && !compact && (
          <span className="fan-event-card-org">{event.org_name}</span>
        )}
      </div>

      <div className="fan-event-card-actions">
        <BookmarkButton
          eventId={event.id}
          isBookmarked={false}
          variant="icon-only"
        />
      </div>
    </div>
  )
}
