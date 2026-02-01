/**
 * Admin Ticketing Events List
 * 
 * Admin page to view and manage ticketed events
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getTicketedEvents } from '@/data/services'
import { useRouteLink } from '@/utils/routes'
import { useOrganization } from '@/contexts/OrganizationContext'
import PublicUrlBanner, { QUERY_KEY_ORG_SLUG } from '@/components/admin/PublicUrlBanner'
import { getPublicBaseUrl } from '@/utils/publicUrls'
import type { TicketedEvent } from '@/types/ticketing'

export default function TicketingEvents() {
  const { currentOrganization } = useOrganization()

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

      {/* Public URL Banner */}
      {currentOrganization?.id && (
        <PublicUrlBanner
          orgId={currentOrganization.id}
          title="Your public ticket page"
          description="Share this link so guests can see events and buy tickets."
          path="tickets"
        />
      )}

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
  const [copied, setCopied] = useState(false)
  const eventDate = new Date(event.starts_at)
  const detailUrl = useRouteLink('admin.ticketingEvents.detail', { id: event.id })

  // Get org slug for public URL (use consistent query key)
  const { data: orgSlug } = useQuery({
    queryKey: [QUERY_KEY_ORG_SLUG, event.org_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('organizations')
        .select('slug')
        .eq('id', event.org_id)
        .single()

      return data?.slug || null
    },
    enabled: event.status === 'published',
  })

  const handleCopyPublicUrl = async () => {
    if (!orgSlug) return

    // Use shared util for URL construction
    const publicUrl = getPublicBaseUrl(orgSlug, `tickets/events/${event.id}`)
    
    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      // Fallback: textarea method
      const textArea = document.createElement('textarea')
      textArea.value = publicUrl
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (fallbackErr) {
        console.error('Fallback copy failed:', fallbackErr)
      }
      document.body.removeChild(textArea)
    }
  }

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
        <div className="flex items-center gap-2">
          {event.status === 'published' && orgSlug && (
            <button
              onClick={handleCopyPublicUrl}
              className={`pa-button pa-button-sm ${copied ? 'pa-button-success' : 'pa-button-secondary'}`}
              title="Copy public link"
            >
              {copied ? (
                <>
                  <span className="material-symbols-outlined text-xs">check</span>
                  Copied
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-xs">link</span>
                  Copy Link
                </>
              )}
            </button>
          )}
          <Link to={detailUrl} className="pa-button pa-button-sm">
            View
          </Link>
        </div>
      </td>
    </tr>
  )
}
