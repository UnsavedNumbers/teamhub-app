/**
 * Ticketed Events List Page
 * 
 * Portal page showing upcoming ticketed events from:
 * - Current organization
 * - All organizations followed by the guardian/athlete
 */

import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTicketedEvents, getTicketTypesForEvent, getFollowedOrgs } from '@/data/services'
import { useRouteLink } from '@/utils/routes'
import { useUserContext } from '@/hooks/useUserContext'
import { PageTitle } from '@/components/portal/Typography'
import PortalLayout from '@/components/portal/PortalLayout'
import EmptyState from '@/components/portal/EmptyState'
import { useI18n } from '@/i18n/useI18n'
import type { TicketedEvent, TicketType } from '@/types/ticketing'
import { formatCurrency } from '@/types/ticketing'

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

export default function TicketEventList() {
  useDebugLifecycle('TicketEventList')
  const { context, isReady } = useUserContext()
  const { t } = useI18n()

  // Get followed organizations
  const { data: followedOrgs } = useQuery({
    queryKey: ['followed-orgs'],
    queryFn: async () => {
      const { data, error } = await getFollowedOrgs()
      if (error) throw error
      return data || []
    },
    enabled: isReady,
  })

  // Collect all org IDs: current org + followed orgs
  const orgIds = useMemo(() => {
    const ids: string[] = []
    if (context.orgId) {
      ids.push(context.orgId)
    }
    if (followedOrgs) {
      followedOrgs.forEach((follow) => {
        if (follow.org_id && !ids.includes(follow.org_id)) {
          ids.push(follow.org_id)
        }
      })
    }
    return ids
  }, [context.orgId, followedOrgs])

  // Fetch events for all orgs
  const { data: eventsResponse, isLoading } = useQuery({
    queryKey: ['ticketed-events', 'portal', 'published', 'fan-visible', 'upcoming', orgIds.join(',')],
    queryFn: async () => {
      // Fetch events for each org and combine
      const allEvents: TicketedEvent[] = []
      
      for (const orgId of orgIds) {
        const response = await getTicketedEvents({ 
          org_id: orgId,
          status: 'published', 
          upcoming_only: true, 
          fan_visible_only: true 
        })
        const responseAny = response as any
        const events = (Array.isArray(responseAny) ? responseAny : responseAny?.data || []) as TicketedEvent[]
        allEvents.push(...events)
      }
      
      // Sort by start date
      return allEvents.sort((a, b) => 
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      )
    },
    enabled: isReady && orgIds.length > 0,
  })

  const events = (eventsResponse || []) as TicketedEvent[]

  return (
    <PortalLayout
      breadcrumbs={[
        { label: 'Home', path: '/portal/dashboard' },
        { label: t('nav.tickets') },
      ]}
    >
      {/* Header Section */}
      <div className="mb-6 sm:mb-8">
        <PageTitle>{t('nav.tickets')}</PageTitle>
        <p className="text-slate-500 dark:text-slate-400 text-base sm:text-lg font-light tracking-wide mt-1">
          {t('portal.fan.tickets.subtitle')}
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden animate-pulse">
              <div className="w-full h-48 bg-slate-200 dark:bg-slate-700"></div>
              <div className="p-5">
                <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState
          icon="confirmation_number"
          title={t('portal.fan.tickets.noEvents')}
          description={t('portal.fan.tickets.noEventsDescription')}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </PortalLayout>
  )
}

function EventCard({ event }: { event: TicketedEvent }) {
  const eventDate = new Date(event.starts_at)
  const eventUrl = useRouteLink('portal.ticketEventDetail', { eventId: event.id })

  const { data: availability } = useQuery({
    queryKey: ['ticket-types', event.id, 'min-price'],
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
      to={eventUrl}
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
