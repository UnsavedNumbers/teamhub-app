/**
 * Ticketed Events List Page
 * 
 * Public page showing available ticketed events
 * Design: public_ticket_events_grid
 */

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getTicketedEvents, getTicketTypesForEvent } from '@/data/services'
import { useRouteLink } from '@/utils/routes'
import type { TicketedEvent, TicketType } from '@/types/ticketing'
import { formatCurrency } from '@/types/ticketing'

export default function TicketEventList() {
  const { data: eventsResponse } = useQuery({
    queryKey: ['ticketed-events', 'published'],
    queryFn: () => getTicketedEvents({ status: 'published', upcoming_only: true }),
  })

  const events = (Array.isArray(eventsResponse) ? eventsResponse : eventsResponse?.data || []) as TicketedEvent[]

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-white transition-colors">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#f0f2f4] dark:border-[#2a3038] px-10 py-3 bg-white dark:bg-[#111418]">
        <div className="flex items-center gap-4 text-[#137fec]">
          <div className="size-6">
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fillRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-[#111418] dark:text-white text-lg font-black leading-tight tracking-tight">YouthSports.team</h2>
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
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function EventCard({ event }: { event: TicketedEvent }) {
  const eventDate = new Date(event.starts_at)
  const eventUrl = useRouteLink('portal.ticketEventDetail', { eventId: event.id })
  
  // Get minimum price
  const { data: ticketTypesResponse } = useQuery({
    queryKey: ['ticket-types', event.id, 'min-price'],
    queryFn: () => getTicketTypesForEvent(event.id),
    select: (data: any) => {
      const types = Array.isArray(data) ? data : data?.data || []
      if (types.length === 0) return null
      return Math.min(...types.map((t: TicketType) => t.price_cents))
    },
  })

  const minPrice = ticketTypesResponse || null
  const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'short' })
  const dateStr = eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const timeStr = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  return (
    <Link
      to={eventUrl}
      className="flex flex-col bg-white dark:bg-[#1c2630] rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
    >
      {/* Image */}
      <div className="w-full aspect-[16/10] bg-center bg-no-repeat bg-cover relative">
        {event.cover_image_path ? (
          <img
            src={event.cover_image_path}
            alt={event.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#137fec] to-blue-600" />
        )}
        {event.event_type && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase text-[#137fec]">
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
          {minPrice !== null ? (
            <p className="text-[#111418] dark:text-gray-200 text-sm font-semibold leading-normal whitespace-nowrap">
              Starting from <span className="text-lg font-bold text-[#137fec]">{formatCurrency(minPrice)}</span>
            </p>
          ) : (
            <p className="text-[#111418] dark:text-gray-200 text-sm font-semibold">Tickets Available</p>
          )}
          <button className="flex-1 flex min-w-[120px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-12 px-4 bg-[#137fec] text-white text-sm font-black leading-normal tracking-[0.05em] shadow-[0_8px_15px_-3px_rgba(19,127,236,0.3),0_4px_6px_-2px_rgba(19,127,236,0.05)] hover:brightness-110 active:scale-[0.98] transition-all uppercase">
            Buy Tickets
          </button>
        </div>
      </div>
    </Link>
  )
}
