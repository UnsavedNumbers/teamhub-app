
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getEvents } from '../../data/services/eventsService'
import { 
  PageHeader, 
  Card, 
  Badge, 
  PlatformDataTable, 
  Button, 
  EmptyState,
  type ColumnConfig 
} from '../../components/platformAdmin'

interface Event {
  id: string
  title: string
  type: string
  start_time: string
  end_time: string
  location: string | null
  team: { name: string }
}

export default function Events() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [rowsPerPage, setRowsPerPage] = useState(50)
  const [totalCount, setTotalCount] = useState(0)

  const { context, isReady } = useUserContext()
  const navigate = useNavigate()

  const fetchEvents = useCallback(async () => {
    if (!isReady) return
    
    setLoading(true)
    try {
      const now = new Date()
      // Show fewer days or more? Let's keep 60 days for upcoming
      const sixtyDaysFromNow = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000)
      
      const { data, error } = await getEvents(context, {
        startDate: now,
        endDate: sixtyDaysFromNow,
        includeCancelled: true, // Show cancelled events in admin too
      })
      
      if (error) {
        console.error('Error fetching events:', error)
        setEvents([])
        setTotalCount(0)
        return
      }

      // Transform to display format
      const displayEvents: Event[] = data.map(event => ({
        id: event.id,
        title: event.title + (event.is_cancelled ? ' (CANCELLED)' : ''),
        type: event.type,
        start_time: event.start_time,
        end_time: event.end_time,
        location: event.event_location?.venue_name || event.location || (event.event_location?.is_tbd ? 'TBD' : null),
        team: { name: event.team?.name ?? 'Unknown Team' },
      }))

      setTotalCount(displayEvents.length)
      
      // Client-side pagination
      const from = page * rowsPerPage
      const to = from + rowsPerPage
      setEvents(displayEvents.slice(from, to))
    } finally { 
      setLoading(false) 
    }
  }, [context, isReady, page, rowsPerPage])

  useEffect(() => { 
    fetchEvents() 
  }, [fetchEvents])

  const getTypeVariant = (type: string): 'info' | 'success' | 'warning' | 'neutral' | 'error' => {
    switch (type) {
      case 'practice': return 'info'
      case 'game': return 'success'
      case 'tournament': return 'warning'
      case 'tryout': return 'warning'
      case 'blackout': return 'neutral'
      default: return 'neutral'
    }
  }

  const columns: ColumnConfig<Event>[] = [
    { id: 'date', label: 'Date', render: (row) => new Date(row.start_time).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }) },
    { id: 'time', label: 'Time', render: (row) => new Date(row.start_time).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) },
    { id: 'title', label: 'Title' },
    { id: 'type', label: 'Type', render: (row) => <Badge variant={getTypeVariant(row.type)}>{row.type.toUpperCase()}</Badge> },
    { id: 'team_name', label: 'Team', render: (row) => row.team?.name },
    { id: 'location', label: 'Location', render: (row) => row.location || '—' }
  ]

  return (
    <div className="pa-root">
      <PageHeader 
        title="Events" 
        actions={<Button onClick={() => navigate('/admin/events/new')}><span className="material-symbols-outlined">add</span>New Event</Button>} 
      />
      {events.length === 0 && !loading ? (
        <Card><EmptyState icon="event" title="NO UPCOMING EVENTS" description="Create your first event to get started." action={<Button onClick={() => navigate('/admin/events/new')}>Create Event</Button>} /></Card>
      ) : (
        <PlatformDataTable columns={columns} rows={events} loading={loading} totalCount={totalCount} page={page} rowsPerPage={rowsPerPage} onPageChange={setPage} onRowsPerPageChange={setRowsPerPage} />
      )}
    </div>
  )
}
