/**
 * Org-Scoped Ticketed Event Detail Page
 * 
 * Shows event details, ticket types, and allows purchase
 * Must be wrapped in OrgScopedRoute
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  createCheckoutSession,
  getTicketBannerPublicUrl,
  getTicketedEventById,
  getTicketTypesForEvent,
} from '@/data/services'
import { formatCurrency } from '@/types/ticketing'
import type { SeatSelection, TicketType, TicketedEvent } from '@/types/ticketing'
import type { OrgContext } from '@/utils/orgResolution'
import { OrgScopedRoute } from '@/components/OrgScopedRoute'
import { showError } from '@/utils/toast'
import { useOffline } from '@/hooks/useOffline'
import SeatSelector from '@/components/ticketing/SeatSelector'
import { validateAdjacentSeats } from '@/utils/ticketingHelpers'
import { useT } from '@/i18n/useI18n'
import { resolveTicketCheckoutRole } from '@/utils/ticketCheckoutRole'
import { useOptionalAuth } from '@/hooks/useAuth'

interface CartItem {
  ticket_type_id: string
  quantity: number
  ticketType: TicketType
  seat_selections?: SeatSelection[]
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

function TicketEventDetailContent({ org }: { org: OrgContext }) {
  useDebugLifecycle('TicketEventDetailContent')
  
  const t = useT()
  const { eventId, orgSlug } = useParams<{ eventId: string; orgSlug: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const auth = useOptionalAuth()
  const { isOffline } = useOffline()
  const [cart, setCart] = useState<CartItem[]>([])
  const [purchaserEmail, setPurchaserEmail] = useState('')
  const [emailTouched, setEmailTouched] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [expandedTicketType, setExpandedTicketType] = useState<TicketType | null>(null)

  const eventQuery = useQuery<TicketedEvent, Error>({
    queryKey: ['ticketed-event', eventId, org.id],
    queryFn: () => getTicketedEventById(eventId!, org.id),
    enabled: !!eventId && !!org.id,
  })

  const ticketTypesQuery = useQuery<TicketType[], Error>({
    queryKey: ['ticket-types', eventId, org.id],
    queryFn: () => getTicketTypesForEvent(eventId!, org.id),
    enabled: !!eventId && !!org.id,
  })

  const event = eventQuery.data ?? null
  const ticketTypes = useMemo(() => ticketTypesQuery.data ?? [], [ticketTypesQuery.data])

  useEffect(() => {
    if (!expandedTicketType) return
    const handleKeyDown = (eventKey: KeyboardEvent) => {
      if (eventKey.key === 'Escape') {
        setExpandedTicketType(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [expandedTicketType])

  useEffect(() => {
    setCart((prev) => {
      const nextCart: CartItem[] = []

      for (const item of prev) {
        const latest = ticketTypes.find((type) => type.id === item.ticket_type_id)
        if (!latest) {
          continue
        }

        const available = latest.capacity_remaining ?? item.quantity
        const nextQuantity = Math.min(item.quantity, available)
        if (nextQuantity <= 0) {
          continue
        }

        const nextItem: CartItem = {
          ticket_type_id: item.ticket_type_id,
          quantity: nextQuantity,
          ticketType: latest,
        }

        if (latest.seating_mode === 'reserved_seating') {
          nextItem.seat_selections =
            (item.seat_selections?.length ?? 0) === nextQuantity
              ? item.seat_selections
              : []
        }

        nextCart.push(nextItem)
      }

      return nextCart
    })
  }, [ticketTypes])

  const updateQuantity = useCallback(
    (ticketTypeId: string, delta: number) => {
      setCart((prev) => {
        const ticketType = ticketTypes.find((type) => type.id === ticketTypeId)
        if (!ticketType) return prev

        const existing = prev.find((item) => item.ticket_type_id === ticketTypeId)
        const available = ticketType.capacity_remaining ?? Infinity
        const currentQuantity = existing?.quantity ?? 0
        const newQuantity = currentQuantity + delta

        if (newQuantity <= 0) {
          return prev.filter((item) => item.ticket_type_id !== ticketTypeId)
        }
        if (newQuantity > available) {
          return prev
        }

        if (existing) {
          return prev.map((item) => {
            if (item.ticket_type_id !== ticketTypeId) {
              return item
            }
            return {
              ...item,
              quantity: newQuantity,
              ticketType,
              seat_selections: ticketType.seating_mode === 'reserved_seating' ? [] : undefined,
            }
          })
        }
        return [
          ...prev,
          {
            ticket_type_id: ticketTypeId,
            quantity: newQuantity,
            ticketType,
            seat_selections: ticketType.seating_mode === 'reserved_seating' ? [] : undefined,
          },
        ]
      })
    },
    [ticketTypes],
  )

  const totalCents = useMemo(
    () => cart.reduce((sum, item) => sum + item.ticketType.price_cents * item.quantity, 0),
    [cart],
  )

  const salesStatus = useMemo(() => {
    if (!event) return { isOnSale: false, message: 'Event not available.' }
    const now = new Date()
    const starts = event.sales_start_at ? new Date(event.sales_start_at) : null
    const ends = event.sales_end_at ? new Date(event.sales_end_at) : null
    const eventEndsAt = new Date(event.ends_at)

    if (event.status !== 'published') {
      return { isOnSale: false, message: 'Ticket sales are not currently open.' }
    }
    if (!Number.isNaN(eventEndsAt.getTime()) && eventEndsAt < now) {
      return { isOnSale: false, message: 'This event has ended.' }
    }
    if (starts && starts > now) {
      return { isOnSale: false, message: 'Ticket sales have not started yet.' }
    }
    if (ends && ends < now) {
      return { isOnSale: false, message: 'Ticket sales have ended.' }
    }
    return { isOnSale: true, message: '' }
  }, [event])

  const hasAvailableTickets = useMemo(
    () => ticketTypes.some((type) => type.capacity_remaining === null || type.capacity_remaining > 0),
    [ticketTypes],
  )
  const isSoldOut = useMemo(
    () => ticketTypes.length > 0 && !hasAvailableTickets,
    [hasAvailableTickets, ticketTypes.length],
  )
  const noActiveTicketTypes = ticketTypes.length === 0
  const emptyTicketStateMessage = useMemo(() => {
    if (!event) return 'No tickets are currently available for this event.'

    const now = Date.now()
    const eventEnd = new Date(event.ends_at).getTime()
    if (!Number.isNaN(eventEnd) && eventEnd < now) {
      return 'This event has ended.'
    }

    if (event.sale_status === 'sold_out' || isSoldOut) {
      return 'This event is sold out.'
    }

    const salesStart = event.sales_start_at ? new Date(event.sales_start_at).getTime() : null
    if (salesStart !== null && !Number.isNaN(salesStart) && salesStart > now) {
      return 'Tickets for this event are coming soon.'
    }

    return 'No tickets are currently available for this event.'
  }, [event, isSoldOut])

  const emailIsValid = EMAIL_REGEX.test(purchaserEmail.trim())
  const emailError = emailTouched && !emailIsValid ? 'Enter a valid email address.' : null
  const profileRoles = useMemo(
    () => auth?.profile?.organizations?.flatMap((organization) => organization.roles ?? []) ?? [],
    [auth?.profile?.organizations],
  )
  const checkoutRole = resolveTicketCheckoutRole(searchParams.get('role'), {
    profileRoles,
    fallbackRole: 'guardian',
  })

  useEffect(() => {
    if (searchParams.get('role')) return
    const next = new URLSearchParams(searchParams)
    next.set('role', checkoutRole)
    setSearchParams(next, { replace: true })
  }, [searchParams, checkoutRole, setSearchParams])

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      setSubmitError(null)

      if (!eventId) throw new Error('Missing event')
      if (isOffline) throw new Error('You are offline. Please reconnect to checkout.')
      if (!salesStatus.isOnSale) throw new Error(salesStatus.message)
      if (noActiveTicketTypes) throw new Error(emptyTicketStateMessage)
      if (isSoldOut) throw new Error('This event is sold out.')

      const trimmedEmail = purchaserEmail.trim()
      if (!EMAIL_REGEX.test(trimmedEmail)) throw new Error('Enter a valid email address.')
      if (cart.length === 0) throw new Error('Select at least one ticket.')
      if (
        cart.some(
          (item) =>
            item.ticketType.seating_mode === 'reserved_seating' &&
            (item.seat_selections?.length ?? 0) !== item.quantity,
        )
      ) {
        throw new Error(t('ticketing.reservedSeating.errors.requiredSeats'))
      }
      if (
        cart.some(
          (item) =>
            item.ticketType.seating_mode === 'reserved_seating' &&
            item.seat_selections &&
            item.seat_selections.length > 1 &&
            !validateAdjacentSeats(item.seat_selections),
        )
      ) {
        throw new Error(t('ticketing.reservedSeating.errors.adjacentSeats'))
      }

      const response = await createCheckoutSession({
        ticketed_event_id: eventId,
        items: cart.map((item) => ({
          ticket_type_id: item.ticket_type_id,
          quantity: item.quantity,
        })),
        purchaser_email: trimmedEmail,
        purchaser_role: checkoutRole,
        org_slug: orgSlug,
        seat_selections: cart
          .filter((item) => item.ticketType.seating_mode === 'reserved_seating')
          .map((item) => ({
            ticket_type_id: item.ticket_type_id,
            seat_map_section_ids: (item.seat_selections ?? []).map((seat) => seat.seat_map_section_id),
          })),
      })

      if (response.error) {
        throw response.error
      }
      if (!response.data?.checkout_url) {
        throw new Error('Checkout could not be started.')
      }

      return response.data
    },
    onSuccess: (data) => {
      window.location.assign(data.checkout_url)
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Checkout failed.'
      setSubmitError(message)
      showError(message)
    },
  })

  if (!eventId) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Event not found.</p>
        </div>
      </div>
    )
  }

  if (eventQuery.isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <p className="text-gray-500">Loading event...</p>
      </div>
    )
  }

  if (eventQuery.isError || !event) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">{eventQuery.error?.message || 'Event not found.'}</p>
          <button
            onClick={() => eventQuery.refetch()}
            className="mt-4 px-4 py-2 bg-[var(--org-btn-primary-bg)] text-[var(--org-btn-primary-text)] rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const eventDate = new Date(event.starts_at)
  const venue = event.venue_name
    ? `${event.venue_name}${event.venue_city ? `, ${event.venue_city}` : ''}${event.venue_state ? ` ${event.venue_state}` : ''}`
    : 'Location TBD'
  const dateFormatted = eventDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: event.timezone,
  })
  const timeFormatted = eventDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: event.timezone,
    timeZoneName: 'short',
  })
  const heroBannerUrl = getTicketBannerPublicUrl(event.ticket_banner_url) || getTicketBannerPublicUrl(event.cover_image_path)

  const checkoutDisabled =
    checkoutMutation.isPending ||
    isOffline ||
    !salesStatus.isOnSale ||
    isSoldOut ||
    noActiveTicketTypes ||
    cart.length === 0 ||
    !emailIsValid ||
    cart.some(
      (item) => item.ticketType.seating_mode === 'reserved_seating' && (item.seat_selections?.length ?? 0) !== item.quantity,
    )
  const shouldShowOrderSummary =
    !ticketTypesQuery.isLoading &&
    !ticketTypesQuery.isError &&
    hasAvailableTickets

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-white">
      {/* Header with org branding */}
      <header className="flex items-center justify-between border-b border-[#f0f2f4] dark:border-gray-800 bg-white dark:bg-[#101922] px-6 md:px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-4 text-[#111418] dark:text-white">
          <div className="size-6 text-[var(--org-btn-primary-bg)]" style={{ color: 'var(--org-btn-primary-bg)' }}>
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fillRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">{org.name}</h2>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Header Section */}
        <div className="w-full">
          <div
            className="relative min-h-[400px] flex flex-col justify-end bg-cover bg-center"
            style={{
              backgroundImage: heroBannerUrl
                ? `linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0) 100%), url(${heroBannerUrl})`
                : 'linear-gradient(to top, rgba(19,127,236,0.9) 0%, rgba(19,127,236,0.3) 100%)',
            }}
          >
            <div className="max-w-[1200px] mx-auto w-full px-6 md:px-10 pb-10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="bg-[var(--org-btn-primary-bg)] text-[var(--org-btn-primary-text)] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded">
                  Official Event
                </span>
              </div>
              <h1 className="text-white text-5xl md:text-6xl font-black leading-tight tracking-tight">
                {event.title}
              </h1>

              {event.event_description && (
                <p className="text-white/90 text-lg mt-4 max-w-3xl whitespace-pre-wrap leading-relaxed">{event.event_description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="bg-white dark:bg-gray-900 border-b border-[#f0f2f4] dark:border-gray-800 py-4">
          <div className="max-w-[1200px] mx-auto px-6 md:px-10 flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-col items-start md:flex-row md:items-center gap-4 md:gap-6 w-full md:w-auto">
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[var(--org-btn-primary-bg)]" style={{ color: 'var(--org-btn-primary-bg)' }}>calendar_month</span>
                <span className="text-sm font-medium text-[#617589] dark:text-gray-400 whitespace-normal break-words leading-5 md:whitespace-nowrap">{dateFormatted}</span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[var(--org-btn-primary-bg)]" style={{ color: 'var(--org-btn-primary-bg)' }}>location_on</span>
                <span className="min-w-0 text-sm font-medium text-[#617589] dark:text-gray-400 whitespace-normal break-words leading-5">
                  {venue}
                </span>
              </div>
              <div className="flex items-center gap-2 min-w-0">
                <span className="material-symbols-outlined text-[var(--org-btn-primary-bg)]" style={{ color: 'var(--org-btn-primary-bg)' }}>schedule</span>
                <span className="text-sm font-medium text-[#617589] dark:text-gray-400 whitespace-normal break-words leading-5 md:whitespace-nowrap">Doors open at {timeFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-6 md:px-10 py-12">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Left Column: Ticket Selection */}
            <div className="flex-1">
              <div className="mb-8">
                <h2 className="text-3xl font-black tracking-tight mb-2">Ticket Selection</h2>
                <p className="text-[#617589] dark:text-gray-400">Select your access level for this event.</p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.1),0_2px_4px_-2px_rgb(0_0_0_/_0.1)] overflow-hidden border border-[#f0f2f4] dark:border-gray-800">
                {ticketTypesQuery.isLoading && (
                  <div className="p-6 text-center text-gray-500">Loading ticket options...</div>
                )}
                {ticketTypesQuery.isError && (
                  <div className="p-6 text-center">
                    <p className="text-red-500">{ticketTypesQuery.error?.message || 'Unable to load ticket options.'}</p>
                    <button
                      onClick={() => ticketTypesQuery.refetch()}
                      className="mt-3 px-4 py-2 bg-[var(--org-btn-primary-bg)] text-[var(--org-btn-primary-text)] rounded-lg"
                    >
                      Retry
                    </button>
                  </div>
                )}
                {!ticketTypesQuery.isLoading && !ticketTypesQuery.isError && ticketTypes.length === 0 && (
                  <div className="p-6 text-center text-gray-500">{emptyTicketStateMessage}</div>
                )}
                {ticketTypes.map((ticketType, idx) => {
                  const cartItem = cart.find((item) => item.ticket_type_id === ticketType.id)
                  const quantity = cartItem?.quantity || 0
                  const available = ticketType.capacity_remaining ?? Infinity
                  const isSoldOut = available <= 0
                  const lowInventoryThreshold = ticketType.capacity_total !== null
                    ? Math.ceil(ticketType.capacity_total * 0.25)
                    : null
                  const isRunningOut =
                    lowInventoryThreshold !== null &&
                    ticketType.capacity_remaining !== null &&
                    ticketType.capacity_remaining > 0 &&
                    ticketType.capacity_remaining <= lowInventoryThreshold

                  return (
                    <div
                      key={ticketType.id}
                      className={`p-6 ${
                        idx < ticketTypes.length - 1 ? 'border-b border-[var(--org-border-subtle)]' : ''
                      } hover:bg-[var(--org-surface-hover)] transition-colors`}
                    >
                      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-[var(--org-text-primary)]">{ticketType.name}</h3>
                            {ticketType.description && (
                              <button
                                onClick={() => setExpandedTicketType(ticketType)}
                                className="text-[var(--org-btn-primary-bg)] hover:opacity-80"
                                style={{ color: 'var(--org-btn-primary-bg)' }}
                                aria-label="More info"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-xl align-middle">info</span>
                              </button>
                            )}
                          </div>
                          <div className="mt-2 text-[var(--org-text-accent)] font-bold text-lg" style={{ color: 'var(--org-link-color)' }}>
                            {formatCurrency(ticketType.price_cents)}{' '}
                            <span className="text-xs font-normal text-[var(--org-text-secondary)] uppercase">per ticket</span>
                          </div>
                          {ticketType.capacity_remaining !== null && (
                            <p className="text-xs text-[var(--org-text-secondary)] mt-1">
                              {isSoldOut ? 'Sold out' : isRunningOut ? 'Tickets are running out' : null}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => updateQuantity(ticketType.id, -1)}
                            disabled={quantity === 0 || checkoutMutation.isPending}
                            className="bg-[var(--org-btn-primary-bg)] hover:opacity-90 disabled:bg-[var(--org-btn-disabled-bg)] disabled:text-[var(--org-btn-disabled-text)] disabled:cursor-not-allowed text-[var(--org-btn-primary-text)] size-12 flex items-center justify-center rounded-lg transition-colors"
                            type="button"
                          >
                            <span className="material-symbols-outlined">remove</span>
                          </button>
                          <div className="bg-[var(--org-surface-card)] border border-[var(--org-border-default)] size-12 flex items-center justify-center font-bold text-xl text-[var(--org-text-primary)]">
                            {quantity}
                          </div>
                          <button
                            onClick={() => updateQuantity(ticketType.id, 1)}
                            disabled={available <= quantity || isSoldOut || checkoutMutation.isPending}
                            className="bg-[var(--org-btn-primary-bg)] hover:opacity-90 disabled:bg-[var(--org-btn-disabled-bg)] disabled:text-[var(--org-btn-disabled-text)] disabled:cursor-not-allowed text-[var(--org-btn-primary-text)] size-12 flex items-center justify-center rounded-lg transition-colors"
                            type="button"
                          >
                            <span className="material-symbols-outlined">add</span>
                          </button>
                        </div>
                      </div>

                      {ticketType.seating_mode === 'reserved_seating' && quantity > 0 && (
                        <SeatSelector
                          ticketTypeId={ticketType.id}
                          quantity={quantity}
                          onSeatsSelected={(selections) => {
                            setCart((prev) =>
                              prev.map((item) =>
                                item.ticket_type_id === ticketType.id
                                  ? { ...item, seat_selections: selections }
                                  : item,
                              ),
                            )
                          }}
                        />
                      )}

                      {ticketType.seating_mode === 'reserved_seating' && (cartItem?.seat_selections?.length ?? 0) > 0 && (
                        <p className="mt-2 text-xs text-[var(--org-text-secondary)]">
                          {t('ticketing.reservedSeating.selectedSeatsInline', {
                            seats: cartItem?.seat_selections?.map((seat) => `${seat.section}-${seat.row}-${seat.seat}`).join(', ') ?? '',
                          })}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Column: Sticky Order Summary */}
            {shouldShowOrderSummary && (
              <div className="w-full lg:w-[380px]">
                <div className="sticky top-24">
                  <div className="bg-white dark:bg-gray-900 rounded-xl shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.1),0_2px_4px_-2px_rgb(0_0_0_/_0.1)] border border-[#f0f2f4] dark:border-gray-800 overflow-hidden">
                    <div className="bg-[#111418] dark:bg-black p-4 text-white">
                      <h3 className="font-bold text-lg uppercase tracking-widest">Order Summary</h3>
                    </div>
                    <div className="p-6">
                      <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#617589] dark:text-gray-400">Subtotal</span>
                          <span className="font-bold text-[#111418] dark:text-white">{formatCurrency(totalCents)}</span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-[#617589] dark:text-gray-400">Service Fee</span>
                          <span className="font-bold text-[#111418] dark:text-white">$0.00</span>
                        </div>
                        <div className="h-px bg-[#f0f2f4] dark:bg-gray-800 my-2" />
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-[#111418] dark:text-white uppercase">Total</span>
                          <span className="text-3xl font-black text-[var(--org-btn-primary-bg)]" style={{ color: 'var(--org-btn-primary-bg)' }}>{formatCurrency(totalCents)}</span>
                        </div>
                      </div>

                      {isOffline && (
                        <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
                          You are offline. Checkout is unavailable until you reconnect.
                        </div>
                      )}
                      {!salesStatus.isOnSale && (
                        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                          {salesStatus.message}
                        </div>
                      )}
                      {isSoldOut && (
                        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                          This event is sold out.
                        </div>
                      )}
                      {noActiveTicketTypes && (
                        <div className="mb-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600">
                          {emptyTicketStateMessage}
                        </div>
                      )}

                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          setEmailTouched(true)
                          checkoutMutation.mutate()
                        }}
                      >
                        <div className="mb-4">
                          <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                            Email
                          </label>
                          <input
                            type="email"
                            value={purchaserEmail}
                            onChange={(e) => setPurchaserEmail(e.target.value)}
                            onBlur={() => setEmailTouched(true)}
                            placeholder="your@email.com"
                            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-[var(--org-btn-primary-bg)]"
                            style={{ '--tw-ring-color': 'var(--org-btn-primary-bg)' } as CSSProperties}
                            required
                          />
                          {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
                        </div>

                        {submitError && <p className="mb-4 text-xs text-red-500">{submitError}</p>}

                        <button
                          type="submit"
                          disabled={checkoutDisabled}
                          className="w-full bg-[var(--org-btn-primary-bg)] hover:opacity-90 disabled:bg-gray-400 disabled:cursor-not-allowed text-[var(--org-btn-primary-text)] font-black py-4 rounded-lg shadow-[0_8px_0px_0px_rgba(0,0,0,0.2)] transition-all active:translate-y-1 active:shadow-none uppercase tracking-widest mb-6"
                        >
                          {checkoutMutation.isPending ? 'Processing...' : 'Checkout Now'}
                        </button>
                      </form>

                      <div className="space-y-3">
                        <div className="flex items-start gap-3 text-xs text-[#617589] dark:text-gray-500">
                          <span className="material-symbols-outlined text-[var(--org-btn-primary-bg)] text-sm" style={{ color: 'var(--org-btn-primary-bg)' }}>verified_user</span>
                          <p>Secure SSL Encrypted Checkout via YouthSports Payment Gateway.</p>
                        </div>
                        <div className="flex items-start gap-3 text-xs text-[#617589] dark:text-gray-500">
                          <span className="material-symbols-outlined text-[var(--org-btn-primary-bg)] text-sm" style={{ color: 'var(--org-btn-primary-bg)' }}>confirmation_number</span>
                          <p>Instant digital ticket delivery to your registered email address.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Ticket Info Modal */}
      {expandedTicketType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setExpandedTicketType(null)}>
          <div className="bg-[var(--org-surface-card)] rounded-xl shadow-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b border-[var(--org-border-subtle)] flex justify-between items-center">
              <h3 className="text-xl font-bold text-[var(--org-text-primary)]">{expandedTicketType.name}</h3>
              <button 
                onClick={() => setExpandedTicketType(null)} 
                className="text-[var(--org-text-muted)] hover:text-[var(--org-text-primary)]"
                type="button"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-6 max-h-[60vh] overflow-y-auto">
              <p className="whitespace-pre-wrap text-[var(--org-text-secondary)] leading-relaxed">
                {expandedTicketType.description}
              </p>
            </div>
            <div className="p-4 bg-[var(--org-surface-section)] flex justify-end">
               <button 
                onClick={() => setExpandedTicketType(null)} 
                className="px-4 py-2 border border-[var(--org-border-default)] bg-[var(--org-surface-card)] text-[var(--org-text-primary)] rounded-lg font-medium hover:bg-[var(--org-surface-hover)] transition-colors"
                type="button"
               >
                 Close
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function OrgScopedTicketEventDetail() {
  return (
    <OrgScopedRoute>
      {(org) => <TicketEventDetailContent org={org} />}
    </OrgScopedRoute>
  )
}
