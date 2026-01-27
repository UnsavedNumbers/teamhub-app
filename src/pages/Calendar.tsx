
import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { 
  getEvents, 
  updateRSVP, 
  getAthletes, 
  isGeneralRSVP, 
  isAthleteRSVP 
} from '../data/services'
import { 
    CalendarEvent, 
    CalendarViewMode, 
    CalendarFilters, 
    EventType,
    formatEventDate, 
    formatEventTimeRange, 
    formatEventLocation,
    getEventLocationMapsUrl,
    RSVPStatus
} from '../types/calendar'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import CalendarGrid from '../components/calendar/CalendarGrid'
import EventFilters from '../components/calendar/EventFilters'
import RSVPButton from '../components/calendar/RSVPButton'
import GeneralRSVPForm from '../components/calendar/GeneralRSVPForm'
import { getSportFromEvent, type SportInfo } from '../utils/sportContext'
import { useI18n } from '../i18n/useI18n'

// Default filters
const defaultFilters: CalendarFilters = {
    childIds: [],
    teamIds: [],
    eventTypes: [],
    startDate: new Date(),
    endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    showCancelled: false
}

// Number of events to show per page in agenda view (3x3 grid)
const EVENTS_PER_PAGE = 9

export default function Calendar() {
  // I18n hook - will throw if I18nProvider is missing (correct behavior)
  const { t } = useI18n()
  
  // Safe translation helper with fallbacks
  // Wraps the t() function to handle missing keys gracefully
  const safeT = (key: string, fallback: string = key): string => {
    try {
      // Type assertion needed because t() expects specific keys, but we want to handle dynamic keys
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = t(key as any, undefined)
      // If translation returns the key itself (not found), use fallback
      return result && result !== key ? result : fallback
    } catch (error) {
      // If translation throws, use fallback
      console.warn(`Translation failed for key: ${key}`, error)
      return fallback
    }
  }

  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [filters, setFilters] = useState<CalendarFilters>(defaultFilters)
  const [viewMode, setViewMode] = useState<CalendarViewMode>('agenda')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [children, setChildren] = useState<Array<{ id: string; first_name: string; last_name: string }>>([])
  const [eventSports, setEventSports] = useState<Record<string, SportInfo | null>>({})
  const [error, setError] = useState<string | null>(null)
  const [rsvpLoading, setRsvpLoading] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(1)
  
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const fetchData = useCallback(async () => {
    if (!isReady || !context) return
    setLoading(true)
    setError(null)
    
    try {
      // Determine date range based on view
      let start = new Date(currentDate)
      let end = new Date(currentDate)
      
      if (viewMode === 'month') {
          start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
          end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
      } else {
          // Agenda view gets all events regardless of time period
          start = new Date(0) // Beginning of time
          end = new Date('2099-12-31') // Far future
      }
      
      // Fetch user children for RSVP matching
      const { data: childrenData, error: childrenError } = await getAthletes(context)
      if (childrenError) {
        console.error('Error fetching children:', childrenError)
      } else {
        setChildren(childrenData || [])
      }

      const { data, error: eventsError } = await getEvents(context, {
        startDate: start,
        endDate: end,
        includeCancelled: filters.showCancelled,
      })

      if (eventsError) {
        console.error('Error fetching events:', eventsError)
        setError(eventsError.message || 'Failed to load events')
        setEvents([])
      } else {
          // filter in memory for event types if service doesn't support it yet
          let filtered = data || []
          if (filters.eventTypes.length > 0) {
              filtered = filtered.filter(e => filters.eventTypes.includes(e.type))
          }
          setEvents(filtered)
          
          // Load sports for events
          const sportsMap: Record<string, SportInfo | null> = {}
          await Promise.all(
            filtered.map(async (event) => {
              if (event.id) {
                try {
                  const sport = await getSportFromEvent(context, event.id)
                  if (sport) sportsMap[event.id] = sport
                } catch (err) {
                  console.warn(`Failed to load sport for event ${event.id}:`, err)
                }
              }
            })
          )
          setEventSports(sportsMap)
      }
    } catch (err) {
      console.error('Unexpected error in fetchData:', err)
      setError(err instanceof Error ? err.message : 'An unexpected error occurred')
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [context, isReady, currentDate, viewMode, filters])

  // Restore state from query params on mount
  useEffect(() => {
    const viewParam = searchParams.get('view')
    const dateParam = searchParams.get('date')
    const teamsParam = searchParams.get('teams')
    const childrenParam = searchParams.get('children')
    const typesParam = searchParams.get('types')
    
    if (viewParam && ['agenda', 'week', 'month'].includes(viewParam)) {
      setViewMode(viewParam as CalendarViewMode)
    }
    
    if (dateParam) {
      const parsedDate = new Date(dateParam)
      if (!isNaN(parsedDate.getTime())) {
        setCurrentDate(parsedDate)
      }
    }
    
    if (teamsParam || childrenParam || typesParam) {
      setFilters(prev => ({
        ...prev,
        teamIds: teamsParam ? teamsParam.split(',').filter(Boolean) : prev.teamIds,
        childIds: childrenParam ? childrenParam.split(',').filter(Boolean) : prev.childIds,
        eventTypes: typesParam ? typesParam.split(',').filter(Boolean).filter((t): t is EventType => {
          const validTypes: EventType[] = ['practice', 'game', 'tournament', 'meeting', 'tryout', 'travel', 'pickup_dropoff', 'social', 'blackout']
          return validTypes.includes(t as EventType)
        }) : prev.eventTypes,
      }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount - intentionally excluding searchParams to avoid re-running on every param change

  // Sync filters and view mode to URL params
  useEffect(() => {
    const params = new URLSearchParams()
    if (viewMode !== 'agenda') params.set('view', viewMode)
    if (currentDate) {
      const dateStr = currentDate.toISOString().split('T')[0]
      const todayStr = new Date().toISOString().split('T')[0]
      if (dateStr !== todayStr) params.set('date', dateStr)
    }
    if (filters.teamIds.length > 0) params.set('teams', filters.teamIds.join(','))
    if (filters.childIds.length > 0) params.set('children', filters.childIds.join(','))
    if (filters.eventTypes.length > 0) params.set('types', filters.eventTypes.join(','))
    
    const newSearch = params.toString()
    const currentSearch = searchParams.toString()
    if (newSearch !== currentSearch) {
      setSearchParams(params, { replace: true })
    }
  }, [viewMode, currentDate, filters, searchParams, setSearchParams])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedEvent) {
        setSelectedEvent(null)
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [selectedEvent])

  const handleRSVPChange = async (eventId: string, childId: string, newStatus: RSVPStatus) => {
      // Guard: Ensure context is ready and has userId
      if (!isReady || !context?.userId) {
        console.error('Cannot update RSVP: context not ready')
        setError('Cannot update RSVP: please refresh the page')
        return
      }

      const rsvpKey = `${eventId}-${childId}`
      setRsvpLoading(prev => ({ ...prev, [rsvpKey]: true }))

      // Store original state for rollback
      const originalEvents = [...events]
      const originalSelectedEvent = selectedEvent

      // Optimistic update
      setEvents(prev => prev.map(e => {
            if (e.id !== eventId) return e
            const newRSVPs = e.rsvps ? [...e.rsvps] : []
            const idx = newRSVPs.findIndex(r => r.child_id === childId)
            const mockRSVP = { 
                id: 'temp', 
                event_id: eventId, 
                child_id: childId, 
                status: newStatus, 
                responded_at: new Date().toISOString(), 
                responded_by_user_id: context.userId, 
                note: null, 
                created_at: new Date().toISOString(), 
                updated_at: new Date().toISOString() 
            }
            
            if (idx >= 0) {
                newRSVPs[idx] = { ...newRSVPs[idx], status: newStatus, responded_at: new Date().toISOString() }
            } else {
                newRSVPs.push(mockRSVP)
            }
            return { ...e, rsvps: newRSVPs }
      }))

      // Update selected event if open
      if (selectedEvent && selectedEvent.id === eventId) {
          setSelectedEvent(prev => {
              if(!prev) return null
              const newRSVPs = prev.rsvps ? [...prev.rsvps] : []
              const idx = newRSVPs.findIndex(r => r.child_id === childId)
              if (idx >= 0) {
                  newRSVPs[idx] = { ...newRSVPs[idx], status: newStatus, responded_at: new Date().toISOString() }
              } else {
                  newRSVPs.push({ 
                    id: 'temp', 
                    event_id: eventId, 
                    child_id: childId, 
                    status: newStatus, 
                    responded_at: new Date().toISOString(), 
                    responded_by_user_id: context.userId, 
                    note: null, 
                    created_at: new Date().toISOString(), 
                    updated_at: new Date().toISOString() 
                })
              }
              return { ...prev, rsvps: newRSVPs }
          })
      }

      try {
        const { data, error: rsvpError } = await updateRSVP(context, eventId, childId, newStatus)
        
        if (rsvpError) {
          // Rollback optimistic update
          setEvents(originalEvents)
          setSelectedEvent(originalSelectedEvent)
          setError(rsvpError.message || 'Failed to update RSVP')
          console.error('RSVP update error:', rsvpError)
        } else if (data) {
          // Update with server response
          setEvents(prev => prev.map(e => {
            if (e.id !== eventId) return e
            const newRSVPs = e.rsvps ? [...e.rsvps] : []
            const idx = newRSVPs.findIndex(r => r.child_id === childId)
            if (idx >= 0) {
              newRSVPs[idx] = data
            } else {
              newRSVPs.push(data)
            }
            return { ...e, rsvps: newRSVPs }
          }))

          if (selectedEvent && selectedEvent.id === eventId) {
            setSelectedEvent(prev => {
              if (!prev) return null
              const newRSVPs = prev.rsvps ? [...prev.rsvps] : []
              const idx = newRSVPs.findIndex(r => r.child_id === childId)
              if (idx >= 0) {
                newRSVPs[idx] = data
              } else {
                newRSVPs.push(data)
              }
              return { ...prev, rsvps: newRSVPs }
            })
          }
        }
      } catch (err) {
        // Rollback optimistic update
        setEvents(originalEvents)
        setSelectedEvent(originalSelectedEvent)
        setError(err instanceof Error ? err.message : 'Failed to update RSVP')
        console.error('RSVP update error:', err)
      } finally {
        setRsvpLoading(prev => {
          const next = { ...prev }
          delete next[rsvpKey]
          return next
        })
      }
  }

  const mapUrl = selectedEvent?.event_location ? getEventLocationMapsUrl(selectedEvent.event_location) : null

  return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: safeT('calendar.title', 'Calendar') },
        ]}
      >
        {/* Header Section */}
        <div className="mb-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <PageTitle>{safeT('calendar.title', 'Calendar')}</PageTitle>
              <p className="text-slate-500 dark:text-slate-400 text-lg font-light tracking-wide">
                {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1">
              {(['agenda', 'week', 'month'] as CalendarViewMode[]).map((v) => (
                <button
                  key={v}
                  onClick={() => {
                    setViewMode(v)
                    setCurrentPage(1) // Reset page when changing view
                  }}
                  disabled={loading}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                    viewMode === v
                      ? 'bg-[var(--org-btn-primary-bg)] text-white'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {safeT(`calendar.views.${v}`, v)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1">
                 <EventFilters filters={filters} onFiltersChange={setFilters} />
                 
                 {/* Mini Calendar Navigation could go here too */}
                 <Card className="p-4">
                     <div className="flex items-center justify-between mb-2">
                         <button 
                           onClick={() => {
                             const newDate = new Date(currentDate)
                             newDate.setMonth(newDate.getMonth() - 1)
                             setCurrentDate(newDate)
                           }} 
                           className="p-1 hover:bg-slate-100 rounded transition-colors"
                           disabled={loading}
                           aria-label="Previous month"
                         >
                             <Icon name="chevron_left" />
                         </button>
                         <span className="font-bold text-slate-700 dark:text-slate-300">
                             {currentDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric'})}
                         </span>
                         <button 
                           onClick={() => {
                             const newDate = new Date(currentDate)
                             newDate.setMonth(newDate.getMonth() + 1)
                             setCurrentDate(newDate)
                           }} 
                           className="p-1 hover:bg-slate-100 rounded transition-colors"
                           disabled={loading}
                           aria-label="Next month"
                         >
                             <Icon name="chevron_right" />
                         </button>
                     </div>
                     <button 
                       onClick={() => setCurrentDate(new Date())} 
                       className="w-full text-xs font-bold text-[var(--org-link-color)] text-center py-1 hover:underline transition-colors"
                       disabled={loading}
                     >
                         Jump to Today
                     </button>
                 </Card>
            </div>

            <div className="lg:col-span-3">
                {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
                    <p className="mt-4 text-sm text-slate-500">Loading events...</p>
                </div>
                ) : error ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Icon name="error_outline" size="text-4xl" className="text-red-500 mb-4" />
                    <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setError(null)
                        fetchData()
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                ) : events.length === 0 ? (
                  <Card className="text-center py-12">
                    <Icon name="event" size="text-6xl" className="text-slate-400 mb-4" />
                    <CardTitle className="mb-2">{safeT('calendar.noEvents.title', 'No events')}</CardTitle>
                    <p className="text-slate-500 dark:text-slate-400">{safeT('calendar.noEvents.description', 'No events scheduled across your organizations.')}</p>
                  </Card>
                ) : (
                    <CalendarGrid 
                        events={events}
                        eventSports={eventSports}
                        viewMode={viewMode}
                        currentDate={currentDate}
                        currentPage={currentPage}
                        eventsPerPage={EVENTS_PER_PAGE}
                        onEventClick={setSelectedEvent}
                        onDateChange={setCurrentDate}
                        onPageChange={setCurrentPage}
                    />
                )}
            </div>
        </div>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" 
          onClick={() => setSelectedEvent(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="event-modal-title"
        >
            <div className="max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
              <Card className="p-0 overflow-hidden">
                <div className={`h-2 w-full ${selectedEvent.is_cancelled ? 'bg-red-500' : 'bg-[var(--org-btn-primary-bg)]'}`} />
                <div className="p-6">
                    <div className="flex items-start justify-between mb-6">
                        <div>
                        <div className="flex items-center gap-2 mb-1">
                            {selectedEvent.is_cancelled && <span className="text-xs font-black text-red-600 bg-red-100 px-1.5 py-0.5 rounded">{safeT('calendar.event.cancelled', 'Cancelled').toUpperCase()}</span>}
                             <span className="text-xs font-bold uppercase tracking-wider text-slate-500">{safeT(`calendar.eventTypes.${selectedEvent.type}`, selectedEvent.type)}</span>
                        </div>
                        <CardTitle className="mb-1 text-2xl">{selectedEvent.title}</CardTitle>
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--org-link-color)]">{selectedEvent.team?.name}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedEvent(null)} 
                          className="text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 hover:bg-slate-100 rounded-full transition-colors"
                          aria-label="Close event details"
                        >
                        <Icon name="close" />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <Icon name="event" className="text-slate-500" />
                            </div>
                            <div>
                                <p className="font-bold text-slate-900 dark:text-white">{formatEventDate(selectedEvent.start_time, selectedEvent.timezone)}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{formatEventTimeRange(selectedEvent.start_time, selectedEvent.end_time, selectedEvent.timezone)}</p>
                            </div>
                        </div>

                        {selectedEvent.arrival_time && (
                        <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center shrink-0">
                                <Icon name="schedule" className="text-amber-500" />
                             </div>
                            <p className="font-bold text-slate-900 dark:text-white">
                                {safeT('calendar.event.arriveBy', 'Arrive by {{time}}').replace('{{time}}', new Date(selectedEvent.arrival_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }))}
                            </p>
                        </div>
                        )}

                        {(selectedEvent.event_location?.venue_name || selectedEvent.location) && (
                        <div className="flex items-start gap-3">
                             <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                <Icon name="location_on" className="text-slate-500" />
                             </div>
                            <div className="flex-1">
                                <p className="font-bold text-slate-900 dark:text-white text-sm">{selectedEvent.event_location?.venue_name || selectedEvent.location}</p>
                                <p className="text-xs text-slate-500">{selectedEvent.event_location ? formatEventLocation(selectedEvent.event_location) : ''}</p>
                                {mapUrl && (
                                    <a href={mapUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-[var(--org-link-color)] hover:underline flex items-center gap-1 mt-1">
                                        {safeT('calendar.event.getDirections', 'Get Directions')} <Icon name="open_in_new" size="text-[10px]" />
                                    </a>
                                )}
                            </div>
                        </div>
                        )}

                        {selectedEvent.notes && (
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{selectedEvent.notes}</p>
                            </div>
                        )}

                         {/* RSVP Section - Only show if RSVP is enabled */}
                        {selectedEvent.rsvp_config?.enabled && isReady && context?.userId && (
                            <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-3">{safeT('calendar.rsvp.yourResponse', 'Your Response')}</h4>
                                
                                {isGeneralRSVP(selectedEvent) ? (
                                    <GeneralRSVPForm 
                                        eventId={selectedEvent.id}
                                        userId={context.userId}
                                        currentRSVP={selectedEvent.general_rsvps?.find(r => r.user_id === context.userId) || null}
                                        disabled={selectedEvent.is_cancelled || false}
                                        onRSVPUpdate={(updatedRSVP) => {
                                          // Update selected event with new RSVP
                                          setSelectedEvent(prev => {
                                            if (!prev) return null
                                            const newGeneralRSVPs = prev.general_rsvps ? [...prev.general_rsvps] : []
                                            const idx = newGeneralRSVPs.findIndex(r => r.user_id === context.userId)
                                            if (idx >= 0) {
                                              newGeneralRSVPs[idx] = updatedRSVP
                                            } else {
                                              newGeneralRSVPs.push(updatedRSVP)
                                            }
                                            return { ...prev, general_rsvps: newGeneralRSVPs }
                                          })
                                          // Update events list
                                          setEvents(prev => prev.map(e => {
                                            if (e.id !== selectedEvent.id) return e
                                            const newGeneralRSVPs = e.general_rsvps ? [...e.general_rsvps] : []
                                            const idx = newGeneralRSVPs.findIndex(r => r.user_id === context.userId)
                                            if (idx >= 0) {
                                              newGeneralRSVPs[idx] = updatedRSVP
                                            } else {
                                              newGeneralRSVPs.push(updatedRSVP)
                                            }
                                            return { ...e, general_rsvps: newGeneralRSVPs }
                                          }))
                                        }}
                                    />
                                ) : isAthleteRSVP(selectedEvent) ? (
                                    children.length === 0 ? (
                                        <p className="text-sm text-slate-500 italic">No children connected to account.</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {children.map(child => {
                                                const rsvp = selectedEvent.rsvps?.find(r => r.child_id === child.id)
                                                const rsvpKey = `${selectedEvent.id}-${child.id}`
                                                return (
                                                    <RSVPButton 
                                                        key={child.id}
                                                        eventId={selectedEvent.id}
                                                        childId={child.id}
                                                        childName={child.first_name}
                                                        currentStatus={rsvp?.status || 'unknown'}
                                                        onStatusChange={(s) => handleRSVPChange(selectedEvent.id, child.id, s)}
                                                        disabled={selectedEvent.is_cancelled || rsvpLoading[rsvpKey] || false}
                                                    />
                                                )
                                            })}
                                        </div>
                                    )
                                ) : null}
                            </div>
                        )}
                    </div>

                    <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                        <Button
                            variant="secondary"
                            onClick={() => {
                                const params = new URLSearchParams()
                                params.set('view', viewMode)
                                params.set('date', currentDate.toISOString().split('T')[0])
                                if (filters.teamIds.length > 0) params.set('teams', filters.teamIds.join(','))
                                if (filters.childIds.length > 0) params.set('children', filters.childIds.join(','))
                                if (filters.eventTypes.length > 0) params.set('types', filters.eventTypes.join(','))
                                navigate(`/portal/calendar/events/${selectedEvent.id}?${params.toString()}`)
                                setSelectedEvent(null)
                            }}
                            className="w-full"
                        >
                        {safeT('common.viewDetails', 'View Details')}
                        </Button>
                    </div>
                </div>
              </Card>
            </div>
        </div>
      )}
      </PortalLayout>
  )
}
