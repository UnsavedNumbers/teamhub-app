
import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PortalLayout from '../../components/portal/PortalLayout'
import { PageTitle } from '../../components/portal/Typography'
import EventForm from '../../components/calendar/EventForm'
import { getEventDetails, updateEvent } from '../../data/services/eventsService'
import { useUserContext } from '../../hooks/useUserContext'
import { EventFormData } from '../../types/calendar'
import { getLink, RouteKeys } from '../../utils/routes'

export default function PortalEditEvent() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { context, isReady } = useUserContext()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialValues, setInitialValues] = useState<Partial<EventFormData>>({})

  useEffect(() => {
    if (!isReady || !eventId) return

    const loadEvent = async () => {
      const { data, error } = await getEventDetails(context, eventId)
      if (error || !data) {
        navigate(getLink(RouteKeys.PORTAL_CALENDAR))
        return
      }
      
      // Map CalendarEvent to EventFormData
      setInitialValues({
        title: data.title,
        type: data.type,
        team_id: data.team_id ?? undefined,
        season_id: data.season_id ?? undefined,
        sport_id: '', // Would need to fetch from team relation if we want to populate this
        program_id: '', // Would need to fetch from team relation
        start_time: data.start_time.slice(0, 16), // datetime-local format
        end_time: data.end_time.slice(0, 16),
        arrival_time: data.arrival_time ? data.arrival_time.slice(0, 16) : '',
        timezone: data.timezone,
        notes: data.notes || '',
        uniform_notes: data.uniform_notes || '',
        equipment_notes: data.equipment_notes || '',
        weather_dependent: data.weather_dependent,
        external_link: data.external_link || '',
        location: {
           venue_name: data.event_location?.venue_name || '',
           address_line1: data.event_location?.address_line1 || '',
           address_line2: data.event_location?.address_line2 || '',
           city: data.event_location?.city || '',
           state: data.event_location?.state || '',
           postal_code: data.event_location?.postal_code || '',
           place_id: data.event_location?.place_id || '',
           latitude: data.event_location?.latitude?.toString() || '',
           longitude: data.event_location?.longitude?.toString() || '',
           is_tbd: data.event_location?.is_tbd || false,
           is_virtual: data.event_location?.is_virtual || false,
           virtual_link: data.event_location?.virtual_link || ''
        },
        rsvp_enabled: data.rsvp_config?.enabled || false,
        rsvp_type: data.rsvp_config?.type || null,
        // Ticketing mapping skipped for simplicity in Edit mode unless strictly needed
      })
      setFetching(false)
    }
    loadEvent()
  }, [eventId, isReady, context, navigate])

  const handleSubmit = async (data: EventFormData) => {
    if (!eventId) return
    setLoading(true)
    setError(null)
    const { error } = await updateEvent(context, eventId, data)
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      navigate(getLink(RouteKeys.PORTAL_EVENT_DETAIL, { eventId: eventId! }))
    }
  }

  if (fetching) return <PortalLayout><div className="p-12 text-center">Loading...</div></PortalLayout>

  return (
    <PortalLayout breadcrumbs={[{ label: 'Calendar', path: getLink(RouteKeys.PORTAL_CALENDAR) }, { label: initialValues.title || 'Event' }]}>
      <div className="mb-6">
        <PageTitle>Edit Event</PageTitle>
      </div>
      <div className="max-w-3xl mx-auto">
        <EventForm 
            mode="edit" 
            initialValues={initialValues}
            onSubmit={handleSubmit} 
            loading={loading}
            error={error}
        />
      </div>
    </PortalLayout>
  )
}
