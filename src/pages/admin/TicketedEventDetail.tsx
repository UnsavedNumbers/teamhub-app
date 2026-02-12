/**
 * Admin Ticketed Event Detail Page
 * 
 * View event details, manage ticket types, generate staff links
 */

import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getLink, useRouteLink } from '@/utils/routes'
import { supabase } from '@/lib/supabase'
import { getTicketedEventByIdAdmin, getTicketTypesForEventAdmin } from '@/data/services'
import { formatCurrency, type TicketedEvent, type TicketType } from '@/types/ticketing'
import AdminPageHeader from '@/components/admin/AdminPageHeader'
import { OrgAdminButton } from '@/components/admin/OrgAdminButton'
import EmptyState from '@/components/platformAdmin/EmptyState'
import PublicUrlShare from '@/components/ticketing/PublicUrlShare'
import { useT } from '@/i18n/useI18n'
import '../../styles/orgAdmin.css'

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

function formatDateRange(start: string, end: string) {
  const startDate = new Date(start)
  const endDate = new Date(end)
  return `${startDate.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })} – ${endDate.toLocaleString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`
}

function formatSalesWindow(start?: string | null, end?: string | null) {
  if (start && end) {
    const startDate = new Date(start)
    const endDate = new Date(end)
    return `${startDate.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })} – ${endDate.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })}`
  }

  if (start) {
    return `Sales begin ${new Date(start).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
  }

  if (end) {
    return `Sales end ${new Date(end).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
  }

  return 'Opens automatically when event is published'
}

export default function TicketedEventDetail() {
  const t = useT()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const scannerPath = useRouteLink('admin.ticketingScanner')
  const addTicketTypePath = useRouteLink('admin.ticketingEvents.ticketTypes.create', { id: id ?? '' })
  const eventsPath = useRouteLink('admin.ticketingEvents.list')

  const {
    data: event,
    isLoading: eventLoading,
    isError: eventError,
  } = useQuery<TicketedEvent | null>({
    queryKey: ['ticketed-event', id],
    queryFn: () => getTicketedEventByIdAdmin(id!),
    enabled: Boolean(id),
  })

  const {
    data: ticketTypes,
    isLoading: ticketTypesLoading,
  } = useQuery<TicketType[]>({
    queryKey: ['ticket-types', id],
    queryFn: () => getTicketTypesForEventAdmin(id!),
    enabled: Boolean(id),
  })

  const ticketTypesList = ticketTypes ?? []

  const generateStaffLinkMutation = useMutation<string>({
    mutationFn: async () => {
      if (!id) throw new Error('No event ID')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('id', user.id)
        .single()

      if (!userData?.org_id) throw new Error('No organization')

      const array = new Uint8Array(32)
      window.crypto.getRandomValues(array)
      const token = Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('')
      const tokenHash = await hashToken(token)

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

      const baseUrl = window.location.origin
      return `${baseUrl}/tickets/validate/${token}`
    },
    onSuccess: (link) => {
      navigator.clipboard.writeText(link)
      alert(`Staff link copied to clipboard:\n${link}\n\nShare this link with gate staff. It expires in 7 days.`)
    },
  })

  if (!id) {
    return (
      <div className="oa-page-container">
        <EmptyState
          icon="event"
          title="Event missing"
          description="We could not determine which ticketed event to show."
          action={{ label: 'Back to events', onClick: () => navigate(eventsPath) }}
          noCard
        />
      </div>
    )
  }

  if (eventLoading && !event) {
    return (
      <div className="oa-page-container">
        <div style={{ padding: '24px' }}>
          <div className="oa-skeleton" style={{ height: '60px', marginBottom: '24px' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
            <div className="oa-skeleton" style={{ height: '250px' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="oa-skeleton" style={{ height: '60px' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="oa-skeleton" style={{ height: '200px' }} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="oa-page-container">
        <EmptyState
          icon="event_busy"
          title={eventError ? 'Unable to load event' : 'Event not found'}
          description={eventError ? 'Something went wrong while loading this ticketed event.' : 'This event may have been deleted.'}
          action={{ label: 'Back to ticketed events', onClick: () => navigate(eventsPath) }}
          noCard
        />
      </div>
    )
  }

  const eventDateRange = formatDateRange(event.starts_at, event.ends_at)
  const salesWindow = formatSalesWindow(event.sales_start_at, event.sales_end_at)
  const venueLabel = event.venue_name
    ? `${event.venue_name} (${[event.venue_city, event.venue_state].filter(Boolean).join(', ')})`
    : [event.venue_city, event.venue_state].filter(Boolean).join(', ') || 'TBD'

  return (
    <div className="oa-page-container">
      <AdminPageHeader
        title={event.title}
        subtitle={`Status: ${event.status}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <OrgAdminButton
              variant="secondary"
              icon={generateStaffLinkMutation.isPending ? 'hourglass_empty' : 'admin_panel_settings'}
              onClick={() => generateStaffLinkMutation.mutate()}
              disabled={generateStaffLinkMutation.isPending}
            >
              {generateStaffLinkMutation.isPending ? 'Generating...' : 'Generate Staff Link'}
            </OrgAdminButton>
            <OrgAdminButton as={Link} to={scannerPath} icon="qr_code_scanner">
              Open Scanner
            </OrgAdminButton>
          </div>
        }
      >
        {event.description && <p className="oa-page-description">{event.description}</p>}
      </AdminPageHeader>

      <div className="oa-space-y-6">
        <div className="oa-grid oa-grid-cols-1 md:oa-grid-cols-2 oa-gap-6">
          <div className="oa-card">
            <h2 className="oa-card-title">Event Details</h2>
            <div className="oa-info-grid">
              <div>
                <span className="oa-info-label">Date</span>
                <span>{eventDateRange}</span>
              </div>
              <div>
                <span className="oa-info-label">Venue</span>
                <span>{venueLabel}</span>
              </div>
              <div>
                <span className="oa-info-label">Timezone</span>
                <span>{event.timezone}</span>
              </div>
              <div>
                <span className="oa-info-label">Sales window</span>
                <span>{salesWindow}</span>
              </div>
              <div>
                <span className="oa-info-label">Team</span>
                <span>{event.team_id ? event.team_id : 'Organization wide'}</span>
              </div>
              <div>
                <span className="oa-info-label">Last updated</span>
                <span>{new Date(event.updated_at).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {event.status === 'published' ? (
            <PublicUrlShare
              orgId={event.org_id}
              path={`tickets/events/${event.id}`}
              title="Public event URL"
              description="Share this link with guests so they can buy tickets."
            />
          ) : (
            <div className="oa-card oa-flex oa-flex-col oa-gap-3 oa-justify-center oa-p-8">
              <h2 className="oa-card-title">Public link</h2>
              <p className="oa-text-muted">
                Publish this event to unlock the public sharing toolkit and allow guests to reserve tickets.
              </p>
            </div>
          )}
        </div>

        <div className="oa-card">
          <div className="flex justify-between items-center gap-2 mb-4">
            <h2 className="oa-card-title">Ticket Types</h2>
            <OrgAdminButton
              as={Link}
              to={addTicketTypePath}
              size="compact"
              icon="add"
            >
              Add Ticket Type
            </OrgAdminButton>
          </div>

          {ticketTypesLoading ? (
            <div className="oa-flex oa-justify-center oa-py-9">
              <span className="oa-spinner" style={{ width: '32px', height: '32px', borderWidth: '3px' }} />
            </div>
          ) : ticketTypesList.length === 0 ? (
            <div className="oa-p-8">
              <EmptyState
                icon="confirmation_number"
                title="No ticket types yet"
                description="Create ticket types (GA, VIP, donation passes) so guests can start purchasing."
                action={{ label: 'Add Ticket Type', onClick: () => navigate(addTicketTypePath) }}
                noCard
              />
            </div>
          ) : (
            <div className="oa-table-container">
              <table className="oa-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>{t('ticketing.reservedSeating.admin.modeColumn')}</th>
                    <th>Price</th>
                    <th>Capacity</th>
                    <th>Status</th>
                    <th>{t('ticketing.reservedSeating.admin.actionsColumn')}</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketTypesList.map((type) => (
                    <tr key={type.id}>
                      <td>{type.name}</td>
                      <td>
                        <span className={`oa-badge oa-badge-${type.seating_mode === 'reserved_seating' ? 'info' : 'default'}`}>
                          {type.seating_mode === 'reserved_seating'
                            ? t('ticketing.reservedSeating.mode.reservedSeating')
                            : t('ticketing.reservedSeating.mode.generalAdmission')}
                        </span>
                      </td>
                      <td>{formatCurrency(type.price_cents)}</td>
                      <td>
                        {type.seating_mode === 'reserved_seating' && type.capacity_total !== null
                          ? t('ticketing.reservedSeating.admin.reservedCapacitySummary', {
                            total: type.capacity_total,
                            available: type.capacity_remaining ?? 0,
                            sold: type.capacity_total - (type.capacity_remaining ?? 0),
                          })
                          : type.capacity_total !== null
                          ? `${type.capacity_remaining}/${type.capacity_total}`
                          : 'Unlimited'}
                      </td>
                      <td>
                        <span className={`oa-badge oa-badge-${type.is_active ? 'success' : 'default'}`}>
                          {type.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        {type.seating_mode === 'reserved_seating' && type.seat_map_id ? (
                          <Link
                            to={getLink('admin.ticketingEvents.seatMaps.builder', {
                              eventId: id!,
                              seatMapId: type.seat_map_id,
                            })}
                            className="oa-link"
                          >
                            {t('ticketing.reservedSeating.admin.manageSeats')}
                          </Link>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
