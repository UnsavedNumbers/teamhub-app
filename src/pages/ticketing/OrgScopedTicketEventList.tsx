/**
 * Org-Scoped Ticketed Events List Page
 * 
 * Public page showing available ticketed events for an org
 * Must be wrapped in OrgScopedRoute
 */

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getTicketedEvents, getTicketTypesForEvent } from '@/data/services'
import type { TicketedEvent, TicketType } from '@/types/ticketing'
import { formatCurrency } from '@/types/ticketing'
import type { OrgContext } from '@/utils/orgResolution'
import { OrgScopedRoute } from '@/components/OrgScopedRoute'
import { getLink, RouteKeys } from '@/utils/routes'

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

function TicketEventListContent({ org }: { org: OrgContext }) {
  useDebugLifecycle('TicketEventListContent')
  
  const orgSlug = org.slug

  const { data: eventsResponse } = useQuery({
    queryKey: ['ticketed-events', 'published', org.id, 'fan-visible', 'upcoming'],
    queryFn: () => getTicketedEvents({ org_id: org.id, status: 'published', upcoming_only: true, fan_visible_only: true }),
  })

  const eventsResponseAny = eventsResponse as any
  const events = (Array.isArray(eventsResponseAny) ? eventsResponseAny : eventsResponseAny?.data || []) as TicketedEvent[]

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-white transition-colors">
      {/* Header with org branding */}
      <header className="flex items-center justify-between border-b border-[#f0f2f4] dark:border-[#2a3038] px-10 py-3 bg-white dark:bg-[#111418]">
        <div className="flex items-center gap-4 text-[#137fec]">
          <div className="size-6">
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fillRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-[#111418] dark:text-white text-lg font-black leading-tight tracking-tight">{org.name}</h2>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-10">
        {/* Headline */}
        <div className="mb-10 text-center">
          <h1 className="text-[#111418] dark:text-white tracking-tighter text-[56px] font-[900] leading-none uppercase">
            Upcoming Events
          </h1>
        </div>

        {events.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No upcoming events available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {events.map((event) => (
              <EventCard key={event.id} event={event} orgSlug={orgSlug} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function EventCard({ event, orgSlug }: { event: TicketedEvent; orgSlug: string }) {
  const { data: availability } = useQuery({
    queryKey: ['ticket-types', event.id, event.org_id, 'min-price'],
    queryFn: () => getTicketTypesForEvent(event.id, event.org_id),
    select: (data: any): {
      minPriceCents: number | null
      hasActiveTypes: boolean
      hasAvailableCapacity: boolean
    } => {
      const types = Array.isArray(data) ? data : data?.data || []
      const hasActiveTypes = types.length > 0
      const hasAvailableCapacity = types.some((t: TicketType) => t.capacity_remaining === null || t.capacity_remaining > 0)
      const priceSource = hasAvailableCapacity
        ? types.filter((t: TicketType) => t.capacity_remaining === null || t.capacity_remaining > 0)
        : types

      return {
        minPriceCents: priceSource.length > 0 ? Math.min(...priceSource.map((t: TicketType) => t.price_cents)) : null,
        hasActiveTypes,
        hasAvailableCapacity,
      }
    },
  })

  const minPrice = availability?.minPriceCents ?? null
  const eventDate = new Date(event.starts_at)
  const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' })
  const dateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  const now = Date.now()
  const eventEnded = new Date(event.ends_at).getTime() < now
  const soldOut = (availability?.hasActiveTypes ?? false) && !(availability?.hasAvailableCapacity ?? false)
  const noActiveTicketTypes = !availability?.hasActiveTypes
  const ticketsComingSoon = Boolean(event.sales_start_at) && new Date(event.sales_start_at as string).getTime() > now
  const ctaDisabled = eventEnded || soldOut || noActiveTicketTypes
  const ticketStateLabel = eventEnded
    ? 'This event has ended'
    : soldOut
      ? 'This event is sold out'
      : noActiveTicketTypes && ticketsComingSoon
        ? 'Tickets coming soon'
        : noActiveTicketTypes
          ? 'No tickets currently available'
          : null
  return (
    <Link
      to={getLink(RouteKeys.PORTAL_ORG_TICKET_EVENT, { orgSlug, eventId: event.id })}
      className={`flex flex-col rounded-xl overflow-hidden shadow-sm transition-shadow group ${
        ctaDisabled
          ? 'bg-white/95 dark:bg-[#1c2630] border border-gray-200 dark:border-gray-700'
          : 'bg-white dark:bg-[#1c2630] hover:shadow-md'
      }`}
    >
      {/* Image — 4:3 ratio enforced via padding-bottom */}
      <div className="relative w-full flex-shrink-0" style={{ paddingBottom: '75%' }}>
        <div className="absolute inset-0 bg-center bg-no-repeat bg-cover">
          {event.cover_image_path ? (
            <img
              src={event.cover_image_path}
              alt={event.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#137fec] to-blue-600" />
          )}
        </div>
        {event.event_type && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#137fec] z-10">
            {event.event_type}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="text-[#111418] dark:text-white text-xl font-bold leading-tight mb-2 group-hover:text-[#137fec] transition-colors">
          {event.title}
        </h3>
        <div className="flex items-center gap-2 text-[#617589] dark:text-gray-400 text-sm font-medium mb-6">
          <span className="material-symbols-outlined text-[16px]">schedule</span>
          <p>{dayName}, {dateStr} • {timeStr}</p>
        </div>
        <div className="mt-auto flex items-center justify-between gap-4 border-t border-gray-100 dark:border-gray-800 pt-5">
          {minPrice !== null && !ticketStateLabel ? (
            <p className="text-[#111418] dark:text-gray-200 text-sm font-semibold leading-normal whitespace-nowrap">
              Starting from <span className="text-lg font-bold text-[#137fec]">{formatCurrency(minPrice)}</span>
            </p>
          ) : (
            <p className="text-[#111418] dark:text-gray-200 text-sm font-semibold">{ticketStateLabel || 'Tickets Available'}</p>
          )}
          <button
            className={`flex-1 flex min-w-[120px] items-center justify-center overflow-hidden rounded-lg h-12 px-4 text-sm font-black leading-normal tracking-[0.05em] transition-all uppercase ${
              ctaDisabled
                ? 'bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-300 cursor-not-allowed'
                : 'cursor-pointer bg-[#137fec] text-white shadow-[0_8px_15px_-3px_rgba(19,127,236,0.3),0_4px_6px_-2px_rgba(19,127,236,0.05)] hover:brightness-110 active:scale-[0.98]'
            }`}
            type="button"
            disabled={ctaDisabled}
          >
            {eventEnded ? 'Ended' : soldOut ? 'Sold Out' : noActiveTicketTypes ? 'Unavailable' : 'Buy Tickets'}
          </button>
        </div>
      </div>
    </Link>
  )
}

export default function OrgScopedTicketEventList() {
  return (
    <OrgScopedRoute>
      {(org) => <TicketEventListContent org={org} />}
    </OrgScopedRoute>
  )
}
