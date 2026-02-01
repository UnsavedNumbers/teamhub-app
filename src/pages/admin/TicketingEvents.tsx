/**
 * Admin Ticketing Events List
 * 
 * Admin page to view and manage ticketed events
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { getTicketedEvents } from '@/data/services'
import { useRouteLink } from '@/utils/routes'
import { useOrganization } from '@/contexts/OrganizationContext'
import PublicUrlBanner, { QUERY_KEY_ORG_SLUG } from '@/components/admin/PublicUrlBanner'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { OrgAdminButton } from '@/components/admin/OrgAdminButton'
import EmptyState from '@/components/platformAdmin/EmptyState'
import { getPublicBaseUrl } from '@/utils/publicUrls'
import type { TicketedEvent } from '@/types/ticketing'

const CREATE_EVENT_ROUTE = 'admin.events.create'

export default function TicketingEvents() {
  const { currentOrganization } = useOrganization()
  const navigate = useNavigate()
  const createEventPath = useRouteLink(CREATE_EVENT_ROUTE)
  const hasOrg = Boolean(currentOrganization?.id)

  const { data: eventsResponse, isLoading } = useQuery<TicketedEvent[]>({
    queryKey: ['ticketed-events', currentOrganization?.id],
    enabled: hasOrg,
    queryFn: async () => {
      if (!currentOrganization?.id) return []
      return getTicketedEvents({ org_id: currentOrganization.id, upcoming_only: false })
    },
  })

  const events = eventsResponse ?? []
  const isEmpty = hasOrg && !isLoading && events.length === 0

  const handleCreateEvent = () => {
    navigate(createEventPath)
  }

  return (
    <div className="pa-page-container">
      <AdminPageHeader
        title="Ticketed Events"
        subtitle="Publish tickets for your next games, fundraisers, or tournaments."
        actions={
          <OrgAdminButton as={Link} to={createEventPath} icon="add">
            Create Event
          </OrgAdminButton>
        }
      />

      {currentOrganization?.id && (
        <div className="pa-mb-6">
          <PublicUrlBanner
            orgId={currentOrganization.id}
            title="Your public ticket page"
            description="Share this link so guests can see ticketed events and buy tickets."
            path="tickets"
          />
        </div>
      )}

      <div className="pa-card pa-card--no-padding pa-shadow-sm">
        {isLoading && events.length === 0 ? (
          <div className="pa-py-9 pa-flex pa-justify-center">
            <span
              className="pa-spinner"
              style={{ width: '32px', height: '32px', borderWidth: '3px' }}
            />
          </div>
        ) : isEmpty ? (
          <div className="pa-p-8">
            <EmptyState
              icon="event_available"
              title="No ticketed events yet"
              description="Publish an event under Events and enable tickets to start selling."
              action={{ label: 'Create Event', onClick: handleCreateEvent }}
              noCard
            />
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

    const publicUrl = getPublicBaseUrl(orgSlug, `tickets/events/${event.id}`)

    try {
      await navigator.clipboard.writeText(publicUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
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
