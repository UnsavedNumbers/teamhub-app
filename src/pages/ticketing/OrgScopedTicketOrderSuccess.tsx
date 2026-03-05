/**
 * Org-Scoped Ticket Order Success Page
 * 
 * Shown after successful Stripe checkout
 * Must be wrapped in OrgScopedRoute
 */

import { useCallback, useEffect, useRef } from 'react'
import { useParams, Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTicketOrderById, getTicketsForOrder } from '@/data/services'
import TicketCard from '@/components/ticketing/TicketCard'
import type { OrgContext } from '@/utils/orgResolution'
import { OrgScopedRoute } from '@/components/OrgScopedRoute'
import type { TicketOrder, TicketOrderItem, TicketType, TicketedEvent, Ticket } from '@/types/ticketing'
import { getLink, RouteKeys } from '@/utils/routes'
import { captureEvent } from '@/lib/analytics/analytics'
import { resolveTicketCheckoutRole } from '@/utils/ticketCheckoutRole'
import { useOptionalAuth } from '@/hooks/useAuth'

type TicketOrderWithRelations = TicketOrder & {
  ticket_order_items?: Array<TicketOrderItem & {
    ticket_types: Pick<TicketType, 'name' | 'description'>
  }>
  ticketed_events?: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'> | null
}

type TicketWithRelations = Ticket & {
  ticket_types: Pick<TicketType, 'name' | 'description'>
  ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'> | null
  ticket_orders?: { purchaser_email: string }
}

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

function TicketOrderSuccessContent({ org }: { org: OrgContext }) {
  useDebugLifecycle('TicketOrderSuccessContent')
  
  const { orderId, orgSlug } = useParams<{ orderId: string; orgSlug: string }>()
  const [searchParams] = useSearchParams()
  const auth = useOptionalAuth()
  const profileRoles = auth?.profile?.organizations?.flatMap((organization) => organization.roles ?? []) ?? []
  const checkoutRole = resolveTicketCheckoutRole(searchParams.get('role'), {
    profileRoles,
    fallbackRole: 'guardian',
  })
  const myTicketsLink = checkoutRole === 'fan'
    ? getLink(RouteKeys.FAN_TICKETS)
    : getLink(RouteKeys.PORTAL_MY_TICKETS)
  const scrollToTicket = useCallback((ticketId: string) => {
    const target = document.getElementById(`ticket-${ticketId}`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const orderQuery = useQuery<TicketOrderWithRelations, Error>({
    queryKey: ['ticket-order', orderId, org.id],
    queryFn: () => getTicketOrderById(orderId!, org.id),
    enabled: !!orderId && !!org.id,
  })

  const ticketsQuery = useQuery<TicketWithRelations[], Error>({
    queryKey: ['tickets', orderId],
    queryFn: async () => {
      const data = await getTicketsForOrder(orderId!)
      return (data as TicketWithRelations[]) || []
    },
    enabled: !!orderId,
  })

  const trackedOrderRef = useRef<string | null>(null)
  useEffect(() => {
    const order = orderQuery.data
    if (!orderId || !order || order.status !== 'paid') return
    if (trackedOrderRef.current === orderId) return
    trackedOrderRef.current = orderId
    const eventId = order.ticketed_events?.id ?? (order as unknown as Record<string, unknown>).ticketed_event_id
    captureEvent('ticket_purchased', {
      order_id: orderId,
      event_id: eventId,
      org_id: org.id,
      ticket_count: ticketsQuery.data?.length ?? 0,
      purchaser_user_id: (order as unknown as Record<string, unknown>).purchaser_user_id,
    })
  }, [orderId, orderQuery.data, org.id, ticketsQuery.data])

  if (!orderId) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <p className="text-gray-500">Order not found.</p>
      </div>
    )
  }

  if (orderQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Loading order...</p>
        </div>
      </div>
    )
  }

  if (orderQuery.isError || !orderQuery.data) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-lg mb-4">
            {orderQuery.error?.message || 'Order not found'}
          </p>
          <button
            onClick={() => orderQuery.refetch()}
            className="px-4 py-2 bg-[#137fec] text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const order = orderQuery.data
  const event = order.ticketed_events || undefined
  const tickets: TicketWithRelations[] = ticketsQuery.data ?? []
  const orderRef = `YS-${order.id.slice(-5).toUpperCase()}`

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-white">
      {/* Header with org branding */}
      <header className="flex items-center justify-between border-b border-[#f0f2f4] dark:border-gray-800 bg-white dark:bg-[#101922] px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-4 text-[#111418] dark:text-white">
          <div className="size-6 text-[#137fec]">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">{org.name}</h2>
        </div>
      </header>

      {/* Success Banner */}
      <div className="bg-[#10b981] py-6 px-4">
        <div className="max-w-[600px] mx-auto flex flex-col items-center justify-center text-white">
          <div className="bg-white/20 rounded-full p-2 mb-3">
            <span className="material-symbols-outlined text-4xl block" style={{ fontVariationSettings: "'FILL' 1" }}>
              check_circle
            </span>
          </div>
          <h1 className="tracking-tight text-2xl md:text-[32px] font-bold leading-tight text-center uppercase">
            Tickets Confirmed
          </h1>
          <p className="text-white/90 text-sm mt-1">Your order {orderRef} is ready</p>
        </div>
      </div>

      <main className="flex-1 px-4 py-8">
        <div className="max-w-[480px] mx-auto space-y-6">
          {/* Entry Tooltip */}
          <div className="bg-[#137fec]/10 border border-[#137fec]/20 rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined text-[#137fec]">info</span>
            <p className="text-sm font-medium text-[#137fec]">
              Show this QR code at the entry gate. Ensure your screen brightness is at maximum for scanning.
            </p>
          </div>

          {/* Tickets */}
          {ticketsQuery.isLoading && (
            <div className="text-center text-gray-500">Loading tickets...</div>
          )}
          {ticketsQuery.isError && (
            <div className="text-center text-red-500">{ticketsQuery.error?.message || 'Unable to load tickets.'}</div>
          )}
          {tickets.map((ticket, idx) => {
            const nextTicket = tickets[idx + 1]
            const ticketEvent = ticket.ticketed_events || event
            return (
              <div key={ticket.id} id={`ticket-${ticket.id}`}>
                <TicketCard
                  ticket={ticket}
                  event={ticketEvent}
                  orderId={order.id}
                  showQR={true}
                />
                {idx < tickets.length - 1 && (
                  <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-800 opacity-60">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                          <span className="material-symbols-outlined text-gray-400">qr_code_2</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-[#111418] dark:text-white">Ticket {idx + 2} of {tickets.length}</h3>
                          <p className="text-xs text-gray-500">{ticket.ticket_types?.name || 'General Admission'}</p>
                        </div>
                      </div>
                      <button
                        className="text-[#137fec] font-bold text-sm"
                        type="button"
                        onClick={() => scrollToTicket(nextTicket?.id || ticket.id)}
                      >
                        VIEW
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 py-6">
            {/* For guest users, link back to org tickets page */}
            {!order.purchaser_user_id && (
              <Link
                to={getLink(RouteKeys.PORTAL_ORG_TICKETS, { orgSlug: orgSlug || '' })}
                className="flex min-w-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-14 px-5 bg-[#137fec] text-white text-lg font-bold leading-normal tracking-[0.015em] w-full shadow-lg shadow-[#137fec]/20 hover:bg-blue-600 transition-colors"
              >
                <span className="material-symbols-outlined">confirmation_number</span>
                <span className="truncate uppercase">View More Events</span>
              </Link>
            )}
            {/* For logged-in users, link to portal */}
            {order.purchaser_user_id && (
              <Link
                to={myTicketsLink}
                className="flex min-w-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-14 px-5 bg-[#137fec] text-white text-lg font-bold leading-normal tracking-[0.015em] w-full shadow-lg shadow-[#137fec]/20 hover:bg-blue-600 transition-colors"
              >
                <span className="material-symbols-outlined">confirmation_number</span>
                <span className="truncate uppercase">View All My Tickets</span>
              </Link>
            )}
          </div>

          {/* Footer Support */}
          <div className="text-center pb-12">
            <p className="text-gray-500 text-sm mb-2">Need help with your entry?</p>
            <a className="text-[#137fec] font-bold text-sm underline" href="mailto:support@youthsports.team">
              Contact Event Support
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function OrgScopedTicketOrderSuccess() {
  return (
    <OrgScopedRoute>
      {(org) => <TicketOrderSuccessContent org={org} />}
    </OrgScopedRoute>
  )
}
