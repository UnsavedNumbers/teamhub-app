/**
 * My Tickets Page
 *
 * Shows all tickets for the logged-in user.
 * Audited: [Current Date]
 */

import { useMemo, useRef, useState, type UIEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMyTicketOrders, getTicketsForOrder, requestTicketWalletPass, resendTickets } from '@/data/services'
import TicketCard from '@/components/ticketing/TicketCard'
import { useRouteLink } from '@/utils/routes'
import { useOffline } from '@/hooks/useOffline'
import FullScreenLoader from '@/components/common/FullScreenLoader'
import { showSuccess, showError } from '@/utils/toast'
import PortalLayout from '@/components/portal/PortalLayout'
import PullToRefreshContainer from '@/components/common/mobile/PullToRefreshContainer'
import CollapsibleHeader from '@/components/common/mobile/CollapsibleHeader'
import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'
import type { Ticket, TicketOrder, TicketType, TicketedEvent } from '@/types/ticketing'

const MY_TICKETS_BREADCRUMBS = [
  { label: 'Home', path: '/portal/dashboard' },
  { label: 'My Tickets' },
]

type TicketEventSummary = Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>

type TicketWithRelations = Ticket & {
  ticket_types?: Pick<TicketType, 'name' | 'description'>
  ticketed_events?: TicketEventSummary
  ticket_orders?: { purchaser_email: string }
}

interface OrderTicketBundle {
  order: TicketOrder
  tickets: TicketWithRelations[]
}

interface EventTicketGroup {
  eventKey: string
  event: TicketEventSummary | null
  tickets: TicketWithRelations[]
  orders: TicketOrder[]
  emails: string[]
  latestOrderTimestamp: number
}

function parseTimestamp(value: string): number {
  const timestamp = new Date(value).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function buildEventTicketGroups(orderBundles: OrderTicketBundle[]): EventTicketGroup[] {
  const grouped = new Map<string, {
    event: TicketEventSummary | null
    tickets: TicketWithRelations[]
    ordersById: Map<string, TicketOrder>
    emails: Set<string>
    latestOrderTimestamp: number
  }>()

  for (const bundle of orderBundles) {
    const orderTimestamp = parseTimestamp(bundle.order.created_at)

    for (const ticket of bundle.tickets) {
      const event = ticket.ticketed_events || null
      const eventKey = event?.id || ticket.ticketed_event_id || `order-${bundle.order.id}`
      const existing = grouped.get(eventKey)

      if (!existing) {
        grouped.set(eventKey, {
          event,
          tickets: [ticket],
          ordersById: new Map([[bundle.order.id, bundle.order]]),
          emails: new Set(
            [
              bundle.order.purchaser_email,
              ticket.ticket_orders?.purchaser_email,
            ].filter((email): email is string => Boolean(email)),
          ),
          latestOrderTimestamp: orderTimestamp,
        })
        continue
      }

      existing.tickets.push(ticket)
      existing.ordersById.set(bundle.order.id, bundle.order)
      if (bundle.order.purchaser_email) {
        existing.emails.add(bundle.order.purchaser_email)
      }
      if (ticket.ticket_orders?.purchaser_email) {
        existing.emails.add(ticket.ticket_orders.purchaser_email)
      }
      existing.latestOrderTimestamp = Math.max(existing.latestOrderTimestamp, orderTimestamp)
      if (!existing.event && event) {
        existing.event = event
      }
    }
  }

  return Array.from(grouped.entries())
    .map(([eventKey, value]) => ({
      eventKey,
      event: value.event,
      tickets: [...value.tickets].sort((a, b) => parseTimestamp(a.created_at) - parseTimestamp(b.created_at)),
      orders: [...value.ordersById.values()].sort((a, b) => parseTimestamp(b.created_at) - parseTimestamp(a.created_at)),
      emails: [...value.emails],
      latestOrderTimestamp: value.latestOrderTimestamp,
    }))
    .sort((a, b) => b.latestOrderTimestamp - a.latestOrderTimestamp)
}

function getGroupStatusClass(orders: TicketOrder[]): string {
  if (orders.some((order) => order.status === 'pending_payment')) {
    return 'bg-yellow-500'
  }
  if (orders.some((order) => order.status === 'paid')) {
    return 'bg-green-500'
  }
  return 'bg-gray-300'
}

function EventTicketCarousel({ group }: { group: EventTicketGroup }) {
  const [isResending, setIsResending] = useState(false)
  const [walletLoading, setWalletLoading] = useState<'Google' | 'Apple' | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const { isOffline } = useOffline()

  const ticketCount = group.tickets.length
  const activeTicket = group.tickets[Math.min(activeIndex, ticketCount - 1)]
  const nextTicketIndex = activeIndex + 1
  const nextTicket = nextTicketIndex < ticketCount ? group.tickets[nextTicketIndex] : null

  const event = group.event || activeTicket?.ticketed_events || null
  const eventDate = event?.starts_at ? new Date(event.starts_at) : null
  const eventDateLabel = eventDate
    ? eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : 'Date TBD'
  const eventTimeLabel = eventDate
    ? eventDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    : ''

  const handleCarouselScroll = (scrollEvent: UIEvent<HTMLDivElement>) => {
    const element = scrollEvent.currentTarget
    if (element.clientWidth <= 0 || ticketCount <= 1) {
      return
    }
    const nextIndex = Math.round(element.scrollLeft / element.clientWidth)
    const clampedIndex = Math.max(0, Math.min(nextIndex, ticketCount - 1))
    if (clampedIndex !== activeIndex) {
      setActiveIndex(clampedIndex)
    }
  }

  const goToTicket = (targetIndex: number) => {
    const element = carouselRef.current
    if (!element) {
      return
    }
    const clampedIndex = Math.max(0, Math.min(targetIndex, ticketCount - 1))
    element.scrollTo({
      left: element.clientWidth * clampedIndex,
      behavior: 'smooth',
    })
    setActiveIndex(clampedIndex)
  }

  const handleResend = async () => {
    const uniqueTargets = [...new Map(
      group.orders
        .filter((order) => Boolean(order.purchaser_email))
        .map((order) => [order.id, { orderId: order.id, email: order.purchaser_email }]),
    ).values()]

    if (uniqueTargets.length === 0) {
      showError('No delivery email found for this ticket group.')
      return
    }

    setIsResending(true)
    try {
      let resentCount = 0
      for (const target of uniqueTargets) {
        const { data: result, error } = await resendTickets({
          order_id: target.orderId,
          email: target.email,
        })

        if (error || !result) {
          throw new Error(error?.message || 'Failed to resend tickets')
        }

        resentCount += result.tickets_resent || 0
      }

      showSuccess(resentCount > 0 ? `Resent ${resentCount} ticket${resentCount === 1 ? '' : 's'} successfully.` : 'Tickets resent successfully!')
    } catch (resendError) {
      showError(resendError instanceof Error ? resendError.message : 'Failed to resend tickets')
    } finally {
      setIsResending(false)
    }
  }

  const handleWalletClick = async (walletType: 'Google' | 'Apple') => {
    if (!activeTicket) {
      showError('No active ticket available for wallet pass.')
      return
    }

    setWalletLoading(walletType)
    try {
      const response = await requestTicketWalletPass({
        ticket_id: activeTicket.id,
        wallet_type: walletType === 'Google' ? 'google' : 'apple',
        entry_code: activeTicket.entry_code,
        event_title: event?.title ?? null,
        event_starts_at: event?.starts_at ?? null,
        venue_name: event?.venue_name ?? null,
        venue_city: event?.venue_city ?? null,
        venue_state: event?.venue_state ?? null,
      })

      if (response.error || !response.data) {
        throw response.error ?? new Error('Unable to generate wallet pass')
      }

      if (typeof window === 'undefined') {
        return
      }

      if (response.data.action === 'download') {
        const anchor = document.createElement('a')
        anchor.href = response.data.url
        if (response.data.filename) {
          anchor.download = response.data.filename
        }
        anchor.rel = 'noopener noreferrer'
        document.body.appendChild(anchor)
        anchor.click()
        anchor.remove()
      } else {
        const openedWindow = window.open(response.data.url, '_blank', 'noopener,noreferrer')
        if (!openedWindow) {
          throw new Error('Unable to open wallet pass. Please allow pop-ups and try again.')
        }
      }

      if (response.data.is_fallback) {
        showSuccess(
          walletType === 'Google'
            ? 'Opened a digital pass preview. Google Wallet is not configured in this environment.'
            : 'Downloaded an event pass file. Apple Wallet direct integration is not configured in this environment.',
        )
      } else {
        showSuccess(
          walletType === 'Google'
            ? 'Google Wallet pass opened.'
            : 'Apple Wallet pass opened.',
        )
      }
    } catch (walletError) {
      showError(walletError instanceof Error ? walletError.message : 'Unable to open wallet pass')
    } finally {
      setWalletLoading(null)
    }
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  const newestOrder = group.orders[0]
  const orderDateLabel = newestOrder
    ? new Date(newestOrder.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
    : null

  const nextTicketPreview = nextTicket
    ? nextTicket.seat_info
      ? `Row ${nextTicket.seat_info.row}, Seat ${nextTicket.seat_info.seat}`
      : nextTicket.ticket_types?.name || 'General Admission'
    : null

  return (
    <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 relative overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${getGroupStatusClass(group.orders)}`} />

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 pl-3">
        <div className="min-w-0">
          <h2 className="text-lg sm:text-xl font-extrabold text-[#111418] dark:text-white tracking-tight leading-tight break-words">
            {event?.title || 'Event Tickets'}
          </h2>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
            <span className="font-medium break-words">{eventDateLabel}{eventTimeLabel ? ` - ${eventTimeLabel}` : ''}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            {orderDateLabel && <span>Purchased {orderDateLabel}</span>}
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span>{group.tickets.length} Ticket{group.tickets.length !== 1 ? 's' : ''}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
            <span>{group.orders.length} Order{group.orders.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <button
          onClick={handleResend}
          disabled={isResending}
          className="flex w-full sm:w-auto items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-[#f0f2f5] dark:bg-[#2a3441] text-[#111418] dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-[#344050] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider min-w-0 sm:min-w-[140px]"
          title="Resend ticket email"
        >
          {isResending ? (
            <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-lg">forward_to_inbox</span>
          )}
          <span>{isResending ? 'Sending...' : 'Email Tickets'}</span>
        </button>
      </div>

      <div className="pl-3 pr-1">
        <div className="mb-3 flex items-center justify-between pr-2">
          <p className="text-sm font-semibold text-[#111418] dark:text-white">
            Ticket {Math.min(activeIndex + 1, ticketCount)} of {ticketCount}
          </p>
          {ticketCount > 1 && (
            <div className="flex items-center gap-2">
              {group.tickets.map((ticket, index) => (
                <button
                  key={`dot-${ticket.id}`}
                  type="button"
                  onClick={() => goToTicket(index)}
                  className={`h-2.5 w-2.5 rounded-full transition-colors ${index === activeIndex ? 'bg-[#137fec]' : 'bg-gray-300 dark:bg-gray-600'}`}
                  aria-label={`View ticket ${index + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {group.tickets.map((ticket) => (
            <div key={ticket.id} className="min-w-full snap-center">
              <TicketCard
                ticket={ticket}
                event={ticket.ticketed_events || event || undefined}
                orderId={ticket.order_id}
                showQR={true}
              />
            </div>
          ))}
        </div>

        {nextTicket && (
          <div className="mt-4 bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-800 opacity-70">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="size-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                  <span className="material-symbols-outlined text-gray-400">qr_code_2</span>
                </div>
                <div>
                  <h3 className="font-bold text-[#111418] dark:text-white break-words">Ticket {nextTicketIndex + 1} of {ticketCount}</h3>
                  <p className="text-xs text-gray-500 break-words">{nextTicketPreview}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => goToTicket(nextTicketIndex)}
                className="text-[#137fec] font-bold text-sm"
              >
                VIEW
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 py-6 pr-2">
          {isOffline && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
              You are offline. Wallet actions will use an offline-compatible fallback pass.
            </div>
          )}
          <button
            type="button"
            onClick={() => handleWalletClick('Google')}
            disabled={walletLoading !== null}
            className="flex min-w-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-14 px-5 bg-[#137fec] text-white text-lg font-bold leading-normal tracking-[0.015em] w-full shadow-lg shadow-[#137fec]/20 hover:bg-blue-600 transition-colors"
          >
            <span className="material-symbols-outlined">add_to_home_screen</span>
            <span className="truncate uppercase">{walletLoading === 'Google' ? 'Opening Google Wallet...' : 'Add to Google Wallet'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleWalletClick('Apple')}
            disabled={walletLoading !== null}
            className="flex min-w-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-14 px-5 bg-white dark:bg-gray-800 border-2 border-[#f0f2f4] dark:border-gray-700 text-[#111418] dark:text-white text-base font-bold leading-normal tracking-[0.015em] w-full hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined">phone_iphone</span>
            <span className="truncate">{walletLoading === 'Apple' ? 'Preparing Apple Wallet...' : 'Add to Apple Wallet'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex min-w-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-12 px-5 bg-[#f0f2f4] dark:bg-gray-800 text-sm font-bold text-[#111418] dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <span className="material-symbols-outlined text-base">print</span>
            <span className="truncate uppercase">Print Ticket</span>
          </button>
        </div>
      </div>

      {group.emails.length > 0 && (
        <div className="mt-2 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex justify-end">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {group.emails.length === 1 ? `Sent to ${group.emails[0]}` : `Sent to ${group.emails.length} emails`}
          </p>
        </div>
      )}
    </div>
  )
}

export default function MyTickets() {
  useDebugLifecycle('MyTickets')
  const ticketsLink = useRouteLink('portal.tickets')

  const {
    data: orders,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<TicketOrder[]>({
    queryKey: ['my-ticket-orders'],
    queryFn: async () => {
      const response = await getMyTicketOrders()
      if (Array.isArray(response)) return response
      if (response.error) throw response.error
      return response.data || []
    },
  })

  const orderIdsKey = useMemo(
    () => (orders ?? []).map((order) => order.id).join('|'),
    [orders],
  )

  const {
    data: orderBundles,
    isLoading: isLoadingTickets,
    isError: isTicketsError,
    error: ticketsError,
    refetch: refetchTickets,
  } = useQuery<OrderTicketBundle[], Error>({
    queryKey: ['my-ticket-orders-with-tickets', orderIdsKey],
    enabled: (orders?.length ?? 0) > 0,
    queryFn: async () => {
      const bundles = await Promise.all((orders ?? []).map(async (order) => {
        const tickets = await getTicketsForOrder(order.id)
        return {
          order,
          tickets: tickets as TicketWithRelations[],
        }
      }))

      return bundles
    },
  })

  const eventGroups = useMemo(
    () => buildEventTicketGroups(orderBundles ?? []),
    [orderBundles],
  )

  const renderHeader = () => (
    <div className="mb-6 sm:mb-8">
      <CollapsibleHeader
        title="My Tickets"
        mode="large"
        scrollContainerSelector=".portal-workspace-main"
      />
      <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-light tracking-wide">
        Your event tickets
      </p>
    </div>
  )

  if (isLoading) {
    return (
      <PortalLayout breadcrumbs={MY_TICKETS_BREADCRUMBS}>
        <div className="flex justify-center items-start min-h-[200px]">
          <FullScreenLoader message="Loading your tickets..." />
        </div>
      </PortalLayout>
    )
  }

  if (isError) {
    return (
      <PortalLayout breadcrumbs={MY_TICKETS_BREADCRUMBS}>
        <div className="text-center py-12">
          <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-xl inline-block mb-4">
            <span className="material-symbols-outlined text-4xl">error_outline</span>
          </div>
          <h2 className="text-xl font-bold text-[#111418] dark:text-white mb-2">
            Unable to load tickets
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {error instanceof Error ? error.message : 'We encountered a problem fetching your ticket orders. Please try again.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-[#137fec] text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </PortalLayout>
    )
  }

  if (!orders || orders.length === 0) {
    return (
      <PortalLayout breadcrumbs={MY_TICKETS_BREADCRUMBS}>
        {renderHeader()}
        <div className="bg-white dark:bg-gray-900/50 rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="material-symbols-outlined text-3xl text-gray-400">confirmation_number</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            No tickets found
          </h3>
          <p className="text-gray-500 dark:text-gray-400 text-lg mb-8 max-w-md mx-auto">
            You haven't purchased any tickets yet. Browse upcoming events to get started.
          </p>
          <a
            href={ticketsLink}
            className="inline-flex items-center gap-2 px-8 py-3 bg-[var(--org-btn-primary-bg)] text-white font-black rounded-lg hover:opacity-90 uppercase tracking-wider shadow-lg transition-all"
          >
            <span className="material-symbols-outlined">calendar_month</span>
            Browse Events
          </a>
        </div>
      </PortalLayout>
    )
  }

  if (isLoadingTickets) {
    return (
      <PortalLayout breadcrumbs={MY_TICKETS_BREADCRUMBS}>
        {renderHeader()}
        <div className="animate-pulse bg-white dark:bg-gray-900/50 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6" />
          <div className="h-6 bg-gray-100 dark:bg-gray-800 rounded w-2/3 mb-4" />
          <div className="h-[420px] bg-gray-100 dark:bg-gray-800 rounded-xl" />
        </div>
      </PortalLayout>
    )
  }

  if (isTicketsError) {
    return (
      <PortalLayout breadcrumbs={MY_TICKETS_BREADCRUMBS}>
        <div className="text-center py-12 bg-white dark:bg-gray-900/50 rounded-xl shadow-sm border border-red-200 dark:border-red-900/30">
            <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-xl inline-block mb-4">
              <span className="material-symbols-outlined text-4xl">error_outline</span>
            </div>
            <h2 className="text-xl font-bold text-[#111418] dark:text-white mb-2">
              Unable to load ticket details
            </h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {ticketsError instanceof Error ? ticketsError.message : 'We encountered a problem fetching your tickets. Please try again.'}
            </p>
            <button
              onClick={() => refetchTickets()}
              className="px-6 py-2 bg-[#137fec] text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Retry
            </button>
        </div>
      </PortalLayout>
    )
  }

  if (eventGroups.length === 0) {
    return (
      <PortalLayout breadcrumbs={MY_TICKETS_BREADCRUMBS}>
        {renderHeader()}
        <div className="text-center py-12 bg-white dark:bg-gray-900/50 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No ticket records found</h2>
          <p className="text-gray-500 dark:text-gray-400">We found your orders but no active ticket records for this account.</p>
        </div>
      </PortalLayout>
    )
  }

  return (
    <PortalLayout breadcrumbs={MY_TICKETS_BREADCRUMBS}>
      <PullToRefreshContainer onRefresh={async () => { await refetch(); await refetchTickets() }}>
      <div className="mb-6 sm:mb-8">
        <div className="mobile-stack-controls mb-6 sm:mb-8 sm:items-end sm:justify-between sm:gap-6">
          <div className="flex-1">
            <CollapsibleHeader
              title="My Tickets"
              mode="large"
              scrollContainerSelector=".portal-workspace-main"
            />
            <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg font-light tracking-wide">
              Your event tickets
            </p>
          </div>
          <a
            href={ticketsLink}
            className="text-sm font-bold text-[var(--org-link-color)] hover:underline flex items-center gap-1 shrink-0"
          >
            Find More Events
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </a>
        </div>
      </div>

      <div className="space-y-8">
        {eventGroups.map((group) => (
          <EventTicketCarousel key={group.eventKey} group={group} />
        ))}
      </div>
      </PullToRefreshContainer>
    </PortalLayout>
  )
}

