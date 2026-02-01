import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useUserContext } from '../hooks/useUserContext'
import { getEventDetails, updateRSVP, getAthletes, deleteEvent } from '../data/services'
import type { RSVPStatus } from '../types/calendar'
import { getSportFromEvent, type SportInfo } from '../utils/sportContext'
import PortalLayout from '../components/portal/PortalLayout'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import { SportHero } from '../components/portal/SportHero'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'
import VenueInsights from '../components/portal/VenueInsights'
import NearbyAmenities from '../components/portal/NearbyAmenities'
import { GalleryLink } from '../components/gallery/GalleryLink'
import { useT } from '../i18n/useI18n'

interface Event {
  id: string
  title: string
  type: string
  start_time: string
  end_time: string
  arrival_time: string | null
  location: string | null
  notes: string | null
  team: { name: string }
  event_location?: {
    place_id: string | null
    venue_name: string | null
    latitude: number | null
    longitude: number | null
  } | null
  ticketed_event?: {
    id: string
    status: string
    ticket_types: { price_cents: number; currency: string }[]
  } | null
}

interface Child {
  id: string
  first_name: string
  last_name: string
}

interface Attendance {
  id: string
  athlete_id: string
  status: RSVPStatus
  note: string | null
}

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const t = useT()
  const [event, setEvent] = useState<Event | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [attendance, setAttendance] = useState<Record<string, Attendance>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [eventSport, setEventSport] = useState<SportInfo | null>(null)

  const { context, isReady } = useUserContext()
  const navigate = useNavigate()
  const location = useLocation()

  const fetchData = useCallback(async () => {
    if (!isReady || !eventId) return
    
    setLoading(true)
    
    // Fetch event details
    const { data: eventData, error: eventError } = await getEventDetails(context, eventId)

    if (eventError || !eventData) {
      // Preserve query params when redirecting back to calendar
      const searchParams = new URLSearchParams(location.search)
      const returnPath = searchParams.toString() 
        ? `/portal/calendar?${searchParams.toString()}` 
        : '/portal/calendar'
      navigate(returnPath)
      return
    }

    setEvent({
      id: eventData.id,
      title: eventData.title,
      type: eventData.type,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      arrival_time: eventData.arrival_time,
      location: eventData.event_location?.venue_name ?? null,
      notes: eventData.notes,
      team: { name: eventData.team?.name ?? 'Team' },
      event_location: eventData.event_location ? {
        place_id: eventData.event_location.place_id,
        venue_name: eventData.event_location.venue_name,
        latitude: eventData.event_location.latitude ?? null,
        longitude: eventData.event_location.longitude ?? null,
      } : null,
      ticketed_event: eventData.ticketed_event ? {
        id: eventData.ticketed_event.id,
        status: eventData.ticketed_event.status,
        ticket_types: eventData.ticketed_event.ticket_types || []
      } : null,
    })

    // Fetch children
    const { data: childData } = await getAthletes(context)
    setChildren(childData.map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
    })))

    // Fetch RSVPs
    if (eventData.rsvps) {
      const map: Record<string, Attendance> = {}
      eventData.rsvps.forEach((rsvp) => {
        map[rsvp.athlete_id] = {
          id: rsvp.id,
          athlete_id: rsvp.athlete_id,
          status: rsvp.status,
          note: rsvp.note,
        }
      })
      setAttendance(map)
    }

    // Load sport for event
    if (eventId) {
      const sport = await getSportFromEvent(context, eventId)
      if (sport) setEventSport(sport)
    }

    setLoading(false)
  }, [eventId, context, isReady, navigate, location])

  useEffect(() => {
    if (eventId && isReady) fetchData()
  }, [eventId, isReady, fetchData])

  async function handleRsvp(childId: string, status: RSVPStatus) {
    if (!eventId) return
    
    setSaving(childId)
    
    const { data, error } = await updateRSVP(context, eventId, childId, status)
    
    if (!error && data) {
      setAttendance(prev => ({
        ...prev,
        [childId]: {
          id: data.id,
          athlete_id: data.athlete_id,
          status: data.status,
          note: data.note,
        }
      }))
    }
    
    setSaving(null)
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    })
  }

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  const handleDelete = async () => {
    if (!eventId || !window.confirm('Are you sure you want to delete this event? This cannot be undone.')) return
    
    setLoading(true)
    const { error } = await deleteEvent(eventId)
    if (error) {
      alert(error.message)
      setLoading(false)
    } else {
      navigate('/portal/calendar')
    }
  }

  const canManage = context?.roles.includes('org_admin') || context?.roles.includes('coach')

  const statusStyles: Record<RSVPStatus, string> = {
    going: 'bg-emerald-500 text-white',
    late: 'bg-amber-500 text-white',
    not_going: 'bg-red-500 text-white',
    unknown: 'bg-slate-500 text-white',
  }

  const statusInactiveStyles = 'bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'

  if (loading) {
    return (
      <PortalLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
        </div>
      </PortalLayout>
    )
  }

  if (!event) return null

  const searchParams = new URLSearchParams(location.search)
  
  return (
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { 
            label: 'Calendar', 
            path: searchParams.toString() 
              ? `/portal/calendar?${searchParams.toString()}` 
              : '/portal/calendar' 
          },
          { label: event.title },
        ]}
      >
        {/* Sport Hero Section */}
        <div className="-mx-4 sm:-mx-6 mb-6 sm:mb-8">
          <SportHero sport={eventSport} height="40vh sm:50vh">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-6 sm:pb-8">
              <div className="mb-6 sm:mb-8 flex justify-between items-start">
                  <div>
                    <PageTitle className="text-white text-2xl sm:text-3xl md:text-4xl">{event.title}</PageTitle>
                    <p className="text-xs font-bold uppercase tracking-widest text-white/80 mt-2">{event.team.name}</p>
                  </div>
                  {canManage && (
                    <div className="flex gap-2">
                       <Button variant="secondary" className="bg-white/20 hover:bg-white/30 text-white border-none" onClick={() => navigate(`/portal/calendar/events/${eventId}/edit`)}>
                         <Icon name="edit" />
                       </Button>
                       <Button variant="secondary" className="bg-white/20 hover:bg-red-500/80 text-white border-none" onClick={handleDelete}>
                         <Icon name="delete" />
                       </Button>
                    </div>
                  )}
              </div>
            </div>
          </SportHero>
        </div>

        {event.ticketed_event && (
             <Card className="mb-6 border-l-4 border-l-[var(--org-btn-primary-bg)]">
                <div className="p-4 sm:p-6 flex justify-between items-center">
                   <div>
                       <h3 className="text-lg font-black uppercase text-slate-900 dark:text-white">Tickets Required</h3>
                        <p className="text-slate-500 dark:text-slate-400">
                           {event.ticketed_event.ticket_types.length > 0 && 
                              `Starting from $${(Math.min(...event.ticketed_event.ticket_types.map(t => t.price_cents)) / 100).toFixed(2)}`
                           }
                        </p>
                   </div>
                   <Button onClick={() => navigate(`/o/${context.orgId}/tickets/events/${event.ticketed_event?.id}`)}>
                      Get Tickets
                   </Button>
                </div>
             </Card>
        )}

        <Card className="mb-6 sm:mb-8 p-4 sm:p-6 md:p-8">
          <div className="space-y-3 sm:space-y-4">
            <div className="flex items-start sm:items-center gap-3">
              <Icon name="event" className="text-slate-400 flex-shrink-0 mt-1 sm:mt-0" />
              <div className="min-w-0">
                <p className="font-black text-slate-900 dark:text-white text-base sm:text-lg">{formatDate(event.start_time)}</p>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{formatTime(event.start_time)} - {formatTime(event.end_time)}</p>
              </div>
            </div>

            {event.arrival_time && (
              <div className="flex items-start sm:items-center gap-3">
                <Icon name="schedule" className="text-amber-500 flex-shrink-0 mt-1 sm:mt-0" />
                <p className="font-black text-slate-900 dark:text-white">Arrive by {formatTime(event.arrival_time)}</p>
              </div>
            )}

            {event.location && (
              <div className="flex items-start sm:items-center gap-3">
                <Icon name="location_on" className="text-slate-400 flex-shrink-0 mt-1 sm:mt-0" />
                <p className="font-black text-slate-900 dark:text-white break-words">{event.location}</p>
              </div>
            )}

            {event.notes && (
              <div className="pt-3 sm:pt-4 border-t border-slate-200 dark:border-slate-700 mt-3 sm:mt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{event.notes}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Venue Insights */}
        {event.event_location?.place_id && (
          <VenueInsights placeId={event.event_location.place_id} className="mb-6" />
        )}

        {/* Nearby Amenities */}
        <NearbyAmenities
          latitude={event.event_location?.latitude}
          longitude={event.event_location?.longitude}
          placeId={event.event_location?.place_id}
          eventType={event.type}
          eventStartTime={event.start_time}
          variant="event"
          className="mb-8"
        />

        {/* Event Gallery */}
        {eventId && (
          <Card className="mb-8 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg mb-1">Event Photos</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  View and share photos from this event
                </p>
              </div>
              <GalleryLink
                galleryType="event"
                entityId={eventId}
                entityName={event.title}
                variant="button"
              />
            </div>
          </Card>
        )}

        <SectionHeader className="mb-4 sm:mb-6">RSVP</SectionHeader>
        
        {children.length === 0 ? (
          <Card className="text-center py-8 sm:py-12">
            <p className="text-slate-500 dark:text-slate-400 mb-4 sm:mb-6">{t('portal.events.noChildren')}</p>
            <Button variant="primary" onClick={() => navigate('/portal/athletes')} className="w-full sm:w-auto">
              {t('portal.events.add')}
            </Button>
          </Card>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {children.map((child) => {
              const att = attendance[child.id]
              return (
                <Card key={child.id} className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-3 sm:mb-4">
                    <CardTitle className="text-base sm:text-lg">{child.first_name} {child.last_name}</CardTitle>
                    {saving === child.id && <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Saving</span>}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {(['going', 'late', 'not_going'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleRsvp(child.id, status)}
                        disabled={saving === child.id}
                        className={`flex-1 py-2.5 sm:py-3 px-4 rounded font-bold text-sm uppercase tracking-wide transition-colors min-h-[44px] ${
                          att?.status === status
                            ? statusStyles[status]
                            : statusInactiveStyles
                        }`}
                      >
                        {status === 'going' ? 'Going' : status === 'late' ? 'Running Late' : 'Not Going'}
                      </button>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </PortalLayout>
  )
}
