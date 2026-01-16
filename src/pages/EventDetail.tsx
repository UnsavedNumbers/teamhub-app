import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useUserContext } from '../hooks/useUserContext'
import { getEventDetails, updateRSVP, type RSVPStatus } from '../data/services/eventsService'
import { getChildren } from '../data/services/familyService'
import PortalLayout from '../components/portal/PortalLayout'
import PortalHeader from '../components/portal/PortalHeader'
import { PageTitle, SectionHeader, CardTitle } from '../components/portal/Typography'
import Card from '../components/portal/Card'
import Button from '../components/portal/Button'
import Icon from '../components/portal/Icon'

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
}

interface Child {
  id: string
  first_name: string
  last_name: string
}

interface Attendance {
  id: string
  child_id: string
  status: RSVPStatus
  note: string | null
}

export default function EventDetail() {
  const { eventId } = useParams<{ eventId: string }>()
  const [event, setEvent] = useState<Event | null>(null)
  const [children, setChildren] = useState<Child[]>([])
  const [attendance, setAttendance] = useState<Record<string, Attendance>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  const { profile } = useAuth()
  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const fetchData = useCallback(async () => {
    if (!isReady || !eventId) return
    
    setLoading(true)
    
    // Fetch event details
    const { data: eventData, error: eventError } = await getEventDetails(context, eventId)

    if (eventError || !eventData) {
      navigate('/portal/calendar')
      return
    }

    setEvent({
      id: eventData.id,
      title: eventData.title,
      type: eventData.type,
      start_time: eventData.start_time,
      end_time: eventData.end_time,
      arrival_time: eventData.arrival_time,
      location: eventData.event_location?.name ?? null,
      notes: eventData.notes,
      team: { name: eventData.team?.name ?? 'Team' },
    })

    // Fetch children
    const { data: childData } = await getChildren(context)
    setChildren(childData.map(c => ({
      id: c.id,
      first_name: c.first_name,
      last_name: c.last_name,
    })))

    // Fetch RSVPs
    if (eventData.rsvps) {
      const map: Record<string, Attendance> = {}
      eventData.rsvps.forEach((rsvp) => {
        map[rsvp.child_id] = {
          id: rsvp.id,
          child_id: rsvp.child_id,
          status: rsvp.status,
          note: rsvp.note,
        }
      })
      setAttendance(map)
    }

    setLoading(false)
  }, [eventId, context, isReady, navigate])

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
          child_id: data.child_id,
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

  const statusStyles = {
    going: 'bg-emerald-500 text-white',
    maybe: 'bg-amber-500 text-white',
    not_going: 'bg-red-500 text-white',
  }

  const statusInactiveStyles = 'bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'

  if (loading) {
    return (
      <>
        <PortalHeader />
        <PortalLayout>
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-900 dark:border-white"></div>
          </div>
        </PortalLayout>
      </>
    )
  }

  if (!event) return null

  return (
    <>
      <PortalHeader />
      <PortalLayout
        breadcrumbs={[
          { label: 'Home', path: '/portal/dashboard' },
          { label: 'Schedule', path: '/portal/calendar' },
          { label: event.title },
        ]}
      >
        <div className="mb-12">
          <PageTitle>{event.title}</PageTitle>
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{event.team.name}</p>
        </div>

        <Card className="mb-8 p-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Icon name="event" className="text-slate-400" />
              <div>
                <p className="font-black text-slate-900 dark:text-white">{formatDate(event.start_time)}</p>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{formatTime(event.start_time)} - {formatTime(event.end_time)}</p>
              </div>
            </div>

            {event.arrival_time && (
              <div className="flex items-center gap-3">
                <Icon name="schedule" className="text-amber-500" />
                <p className="font-black text-slate-900 dark:text-white">Arrive by {formatTime(event.arrival_time)}</p>
              </div>
            )}

            {event.location && (
              <div className="flex items-center gap-3">
                <Icon name="location_on" className="text-slate-400" />
                <p className="font-black text-slate-900 dark:text-white">{event.location}</p>
              </div>
            )}

            {event.notes && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-700 mt-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap">{event.notes}</p>
              </div>
            )}
          </div>
        </Card>

        <SectionHeader className="mb-6">RSVP</SectionHeader>
        
        {children.length === 0 ? (
          <Card className="text-center py-12">
            <p className="text-slate-500 dark:text-slate-400 mb-6">No children added.</p>
            <Button variant="primary" as={Link} to="/portal/children">
              Add
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {children.map((child) => {
              const att = attendance[child.id]
              return (
                <Card key={child.id} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <CardTitle className="text-lg">{child.first_name} {child.last_name}</CardTitle>
                    {saving === child.id && <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Saving</span>}
                  </div>
                  <div className="flex gap-3">
                    {(['going', 'maybe', 'not_going'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => handleRsvp(child.id, status)}
                        disabled={saving === child.id}
                        className={`flex-1 py-3 px-4 rounded font-bold text-sm uppercase tracking-wide transition-colors ${
                          att?.status === status
                            ? statusStyles[status]
                            : statusInactiveStyles
                        }`}
                      >
                        {status === 'going' ? 'Going' : status === 'maybe' ? 'Maybe' : 'Not Going'}
                      </button>
                    ))}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </PortalLayout>
    </>
  )
}
