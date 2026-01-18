
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUserContext } from '../../hooks/useUserContext'
import { getEvents } from '../../data/services/eventsService'
import { getRSVPSummary } from '../../data/services/rsvpService'
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
  rsvp_config?: { enabled: boolean; type: string | null }
  rsvp_summary?: string
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

      // Transform to display format and fetch RSVP summaries with safe defaults
      const displayEvents: Event[] = await Promise.all((data || []).map(async (event) => {
        let rsvpSummary = ''
        const rsvpConfig = event.rsvp_config || { enabled: false, type: null }
        
        if (rsvpConfig.enabled && isReady && context) {
          try {
            const { data: summary, error: summaryError } = await getRSVPSummary(context, event.id)
            if (!summaryError && summary) {
              if (summary.general) {
                rsvpSummary = `Going: ${summary.general.going_count || 0}, Not: ${summary.general.not_going_count || 0}, Maybe: ${summary.general.maybe_count || 0}`
              } else if (summary.athlete) {
                rsvpSummary = `Going: ${summary.athlete.going_count || 0}, Late: ${summary.athlete.late_count || 0}, Not: ${summary.athlete.not_going_count || 0}, Unknown: ${summary.athlete.unknown_count || 0}`
              }
            }
          } catch (err) {
            console.warn('Failed to fetch RSVP summary:', err)
            // Continue with empty summary
          }
        }
        
        return {
          id: event.id || '',
          title: (event.title || 'Untitled Event') + (event.is_cancelled ? ' (CANCELLED)' : ''),
          type: event.type || 'practice',
          start_time: event.start_time || new Date().toISOString(),
          end_time: event.end_time || new Date().toISOString(),
          location: event.event_location?.venue_name || event.location || (event.event_location?.is_tbd ? 'TBD' : null),
          team: { name: event.team?.name ?? 'Unknown Team' },
          rsvp_config: rsvpConfig,
          rsvp_summary: rsvpSummary,
        }
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
    { id: 'location', label: 'Location', render: (row) => row.location || '—' },
    { 
      id: 'rsvp', 
      label: 'RSVP', 
      render: (row) => {
        if (!row.rsvp_config?.enabled) return '—'
        return (
          <div className="text-xs">
            <div className="font-bold">{row.rsvp_config.type?.toUpperCase() || 'N/A'}</div>
            {row.rsvp_summary && <div className="text-slate-500">{row.rsvp_summary}</div>}
          </div>
        )
      }
    }
  ]

  return (
    <div className="pa-root">
      <PageHeader 
        title="Events" 
        actions={<Button onClick={() => navigate('/admin/events/new')}><span className="material-symbols-outlined">add</span>New Event</Button>} 
      />
      {events.length === 0 && !loading ? (
        <Card><EmptyState icon="event" title="NO UPCOMING EVENTS" description="Create your first event to get started." action={{ label: 'Create Event', onClick: () => navigate('/admin/events/new') }} /></Card>
      ) : (
        <PlatformDataTable columns={columns} rows={events} loading={loading} totalCount={totalCount} page={page} rowsPerPage={rowsPerPage} onPageChange={setPage} onRowsPerPageChange={setRowsPerPage} />
      )}
    </div>
  )
}
