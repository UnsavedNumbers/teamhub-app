/**
 * Admin Ticketing Events List
 * 
 * Admin page to view and manage ticketed events
 */

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getTicketedEvents } from '@/data/services'
import { useRouteLink } from '@/utils/routes'
import type { TicketedEvent } from '@/types/ticketing'

export default function TicketingEvents() {
  const { data: eventsResponse } = useQuery({
    queryKey: ['ticketed-events', 'admin'],
    queryFn: async () => {
      // Get user's org_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return { data: [], error: new Error('Not authenticated') }
      
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()
      
      if (!userData?.org_id) return { data: [], error: null }
      
      return getTicketedEvents({ org_id: userData.org_id, upcoming_only: false })
    },
  })

  const events = Array.isArray(eventsResponse) ? eventsResponse : eventsResponse?.data || []

  return (
    <div className="pa-page-container">
      <div className="pa-page-header">
        <h1 className="pa-page-title">Ticketed Events</h1>
        <Link
          to={useRouteLink('admin.ticketingEvents.create')}
          className="pa-button pa-button-primary"
        >
          Create Event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="pa-empty-state">
          <p>No ticketed events yet. Create your first event to start selling tickets.</p>
        </div>
      ) : (
        <div className="pa-table-container">
          <table className="pa-table">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function EventRow({ event }: { event: TicketedEvent }) {
  const eventDate = new Date(event.starts_at)
  const detailUrl = useRouteLink('admin.ticketingEvents.detail', { id: event.id })

  return (
    <tr>
      <td>
        <Link to={detailUrl} className="pa-link">
          {event.title}
        </Link>
      </td>
      <td>{eventDate.toLocaleDateString()}</td>
      <td>
        <span className={`pa-badge pa-badge-${event.status === 'published' ? 'success' : 'default'}`}>
          {event.status}
        </span>
      </td>
      <td>
        <Link to={detailUrl} className="pa-button pa-button-sm">
          View
        </Link>
      </td>
    </tr>
  )
}
