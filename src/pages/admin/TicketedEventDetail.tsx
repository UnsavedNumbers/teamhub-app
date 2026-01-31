/**
 * Admin Ticketed Event Detail Page
 * 
 * View event details, manage ticket types, generate staff links
 */

import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getTicketedEventById, getTicketTypesForEvent } from '@/data/services'
import { supabase } from '@/lib/supabase'
import { useRouteLink } from '@/utils/routes'
import { formatCurrency, type TicketType } from '@/types/ticketing'

// Hash token helper (client-side)
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function TicketedEventDetail() {
  const { id } = useParams<{ id: string }>()

  const { data: eventResponse } = useQuery({
    queryKey: ['ticketed-event', id],
    queryFn: () => getTicketedEventById(id!),
    enabled: !!id,
  })

  const { data: ticketTypesResponse } = useQuery({
    queryKey: ['ticket-types', id],
    queryFn: () => getTicketTypesForEvent(id!),
    enabled: !!id,
  })

  const event = (eventResponse as any)?.data ?? eventResponse ?? null
  const ticketTypes = (ticketTypesResponse as any)?.data ?? ticketTypesResponse ?? []

  const generateStaffLinkMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error('No event ID')
      
      // Get user's org_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (!userData?.org_id) throw new Error('No organization')

      // Generate token
      const array = new Uint8Array(32)
      window.crypto.getRandomValues(array)
      const token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')

      // Hash token
      const tokenHash = await hashToken(token)

      // Create staff link (expires in 7 days)
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7)

      const { error } = await supabase.from('ticket_staff_links').insert({
        org_id: userData.org_id,
        ticketed_event_id: id,
        token_hash: tokenHash,
        expires_at: expiresAt.toISOString(),
        created_by_user_id: user.id,
      })

      if (error) throw error

      // Return the raw token (only shown once)
      const baseUrl = window.location.origin
      return `${baseUrl}/tickets/validate/${token}`
    },
    onSuccess: (link) => {
      navigator.clipboard.writeText(link)
      alert(`Staff link copied to clipboard:\n${link}\n\nShare this link with gate staff. It expires in 7 days.`)
    },
  })

  if (!event) {
    return (
      <div className="pa-page-container">
        <p>Loading event...</p>
      </div>
    )
  }

  return (
    <div className="pa-page-container">
      <div className="pa-page-header">
        <h1 className="pa-page-title">{event.title}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => generateStaffLinkMutation.mutate()}
            className="pa-button pa-button-secondary"
            disabled={generateStaffLinkMutation.isPending}
          >
            {generateStaffLinkMutation.isPending ? 'Generating...' : 'Generate Staff Link'}
          </button>
          <Link
            to={useRouteLink('admin.ticketingScanner')}
            className="pa-button pa-button-primary"
          >
            Open Scanner
          </Link>
        </div>
      </div>

      <div className="pa-card">
        <h2 className="pa-card-title">Event Details</h2>
        <div className="pa-info-grid">
          <div>
            <span className="pa-info-label">Status:</span>
            <span className={`pa-badge pa-badge-${event.status === 'published' ? 'success' : 'default'}`}>
              {event.status}
            </span>
          </div>
          <div>
            <span className="pa-info-label">Date:</span>
            <span>{new Date(event.starts_at).toLocaleString()}</span>
          </div>
          <div>
            <span className="pa-info-label">Venue:</span>
            <span>{event.venue_name || 'TBD'}</span>
          </div>
        </div>
      </div>

      <div className="pa-card mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="pa-card-title">Ticket Types</h2>
          <Link
            to={`${useRouteLink('admin.ticketingEvents.detail', { id: event.id })}/ticket-types/new`}
            className="pa-button pa-button-sm pa-button-primary"
          >
            Add Ticket Type
          </Link>
        </div>

        {ticketTypes.length === 0 ? (
          <p className="text-gray-500">No ticket types yet. Add ticket types to start selling.</p>
        ) : (
          <table className="pa-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Capacity</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ticketTypes.map((type: TicketType) => (
                <tr key={type.id}>
                  <td>{type.name}</td>
                  <td>{formatCurrency(type.price_cents)}</td>
                  <td>
                    {type.capacity_total !== null
                      ? `${type.capacity_remaining}/${type.capacity_total}`
                      : 'Unlimited'}
                  </td>
                  <td>
                    <span className={`pa-badge pa-badge-${type.is_active ? 'success' : 'default'}`}>
                      {type.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
