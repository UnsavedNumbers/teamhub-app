/**
 * Org-Scoped Ticketed Event Detail Page
 * 
 * Shows event details, ticket types, and allows purchase
 * Must be wrapped in OrgScopedRoute
 */

import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getTicketedEventById, getTicketTypesForEvent, createCheckoutSession } from '@/data/services'
import { formatCurrency } from '@/types/ticketing'
import type { TicketType } from '@/types/ticketing'
import type { OrgContext } from '@/utils/orgResolution'
import { OrgScopedRoute } from '@/components/OrgScopedRoute'

interface CartItem {
  ticket_type_id: string
  quantity: number
  ticketType: TicketType
}

function TicketEventDetailContent({ org }: { org: OrgContext }) {
  const { eventId, orgSlug } = useParams<{ eventId: string; orgSlug: string }>()
  const [cart, setCart] = useState<CartItem[]>([])
  const [purchaserEmail, setPurchaserEmail] = useState('')
  const [expandedTicketType, setExpandedTicketType] = useState<TicketType | null>(null)

  const { data: eventResponse } = useQuery({
    queryKey: ['ticketed-event', eventId, org.id],
    queryFn: () => getTicketedEventById(eventId!, org.id),
    enabled: !!eventId && !!org.id,
  })

  const { data: ticketTypesResponse } = useQuery({
    queryKey: ['ticket-types', eventId, org.id],
    queryFn: () => getTicketTypesForEvent(eventId!, org.id),
    enabled: !!eventId && !!org.id,
  })

  const event = (eventResponse as any)?.data ?? eventResponse ?? null
  const ticketTypes = ((ticketTypesResponse as any)?.data ?? ticketTypesResponse ?? []) as TicketType[]

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      // We need to pass org_slug to the checkout function
      // For now, we'll update the checkout function to accept it
      const response = await createCheckoutSession({
        ticketed_event_id: eventId!,
        items: cart.map((item) => ({
          ticket_type_id: item.ticket_type_id,
          quantity: item.quantity,
        })),
        purchaser_email: purchaserEmail,
        org_slug: orgSlug!, // Pass org slug for URL construction
      })
      return response
    },
    onSuccess: ({ data, error }) => {
      if (data && !error && data.checkout_url) {
        window.location.href = data.checkout_url
      }
    },
  })

  const updateQuantity = (ticketTypeId: string, delta: number) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.ticket_type_id === ticketTypeId)
      const ticketType = ticketTypes.find((t) => t.id === ticketTypeId)!
      const available = ticketType.capacity_remaining ?? Infinity
      const newQuantity = existing ? existing.quantity + delta : delta

      if (newQuantity <= 0) {
        return prev.filter((item) => item.ticket_type_id !== ticketTypeId)
      }
      if (newQuantity > available) {
        return prev
      }

      if (existing) {
        return prev.map((item) =>
          item.ticket_type_id === ticketTypeId ? { ...item, quantity: newQuantity } : item,
        )
      }
      return [...prev, { ticket_type_id: ticketTypeId, quantity: newQuantity, ticketType }]
    })
  }

  const totalCents = cart.reduce(
    (sum, item) => sum + item.ticketType.price_cents * item.quantity,
    0,
  )

  if (!event) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <p className="text-gray-500">Loading event...</p>
      </div>
    )
  }

  const eventDate = new Date(event.starts_at)
  const venue = event.venue_name
    ? `${event.venue_name}${event.venue_city ? `, ${event.venue_city}` : ''}${event.venue_state ? ` ${event.venue_state}` : ''}`
    : 'Location TBD'
  const dateFormatted = eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const timeFormatted = eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-white">
      {/* Header with org branding */}
      <header className="flex items-center justify-between border-b border-[#f0f2f4] dark:border-gray-800 bg-white dark:bg-[#101922] px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-4 text-[#111418] dark:text-white">
          <div className="size-6 text-[#137fec]">
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
              backgroundImage: event.ticket_banner_url
                ? `linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0) 100%), url(${event.ticket_banner_url})`
                : event.cover_image_path
                  ? `linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0) 100%), url(${event.cover_image_path})`
                  : 'linear-gradient(to top, rgba(19,127,236,0.9) 0%, rgba(19,127,236,0.3) 100%)',
            }}
          >
            <div className="max-w-[1200px] mx-auto w-full px-10 pb-10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span className="bg-[var(--org-btn-primary-bg)] text-[var(--org-btn-primary-text)] text-xs font-bold uppercase tracking-widest px-3 py-1 rounded">
                  Official Event
                </span>
              </div>
              <h1 className="text-white text-5xl md:text-6xl font-black leading-tight tracking-tight">
                {event.title}
              </h1>
              {event.description && (
                <p className="text-white/80 text-lg mt-2 max-w-2xl font-light">{event.description}</p>
              )}
              {event.event_description && (
                <p className="text-white/90 text-lg mt-4 max-w-3xl whitespace-pre-wrap leading-relaxed">{event.event_description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Metadata Bar */}
        <div className="bg-white dark:bg-gray-900 border-b border-[#f0f2f4] dark:border-gray-800 py-4 px-10">
          <div className="max-w-[1200px] mx-auto flex flex-wrap justify-between items-center gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#137fec]">calendar_month</span>
                <span className="text-sm font-medium text-[#617589] dark:text-gray-400">{dateFormatted}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#137fec]">location_on</span>
                <span className="text-sm font-medium text-[#617589] dark:text-gray-400">{venue}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#137fec]">schedule</span>
                <span className="text-sm font-medium text-[#617589] dark:text-gray-400">Doors open at {timeFormatted}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-10 py-12">
          <div className="flex flex-col lg:flex-row gap-10">
            {/* Left Column: Ticket Selection */}
            <div className="flex-1">
              <div className="mb-8">
                <h2 className="text-3xl font-black tracking-tight mb-2">Ticket Selection</h2>
                <p className="text-[#617589] dark:text-gray-400">Select your access level for this event.</p>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.1),0_2px_4px_-2px_rgb(0_0_0_/_0.1)] overflow-hidden border border-[#f0f2f4] dark:border-gray-800">
                {ticketTypes.map((ticketType, idx) => {
                  const cartItem = cart.find((item) => item.ticket_type_id === ticketType.id)
                  const quantity = cartItem?.quantity || 0
                  const available = ticketType.capacity_remaining ?? Infinity

                  return (
                    <div
                      key={ticketType.id}
                      className={`flex flex-col md:flex-row md:items-center justify-between p-6 ${
                        idx < ticketTypes.length - 1 ? 'border-b border-[var(--org-border-subtle)]' : ''
                      } hover:bg-[var(--org-surface-hover)] transition-colors`}
                    >
                      <div className="mb-4 md:mb-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-[var(--org-text-primary)]">{ticketType.name}</h3>
                            {ticketType.description && (
                                <button
                                    onClick={() => setExpandedTicketType(ticketType)}
                                    className="text-[var(--org-link-color)] hover:opacity-80"
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
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateQuantity(ticketType.id, -1)}
                          disabled={quantity === 0}
                          className="bg-[var(--org-btn-primary-bg)] hover:opacity-90 disabled:bg-[var(--org-btn-disabled-bg)] disabled:text-[var(--org-btn-disabled-text)] disabled:cursor-not-allowed text-[var(--org-btn-primary-text)] size-12 flex items-center justify-center rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined">remove</span>
                        </button>
                        <div className="bg-[var(--org-surface-card)] border border-[var(--org-border-default)] size-12 flex items-center justify-center font-bold text-xl text-[var(--org-text-primary)]">
                          {quantity}
                        </div>
                        <button
                          onClick={() => updateQuantity(ticketType.id, 1)}
                          disabled={available <= quantity}
                          className="bg-[var(--org-btn-primary-bg)] hover:opacity-90 disabled:bg-[var(--org-btn-disabled-bg)] disabled:text-[var(--org-btn-disabled-text)] disabled:cursor-not-allowed text-[var(--org-btn-primary-text)] size-12 flex items-center justify-center rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined">add</span>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Right Column: Sticky Order Summary */}
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
                        <span className="text-3xl font-black text-[#137fec]">{formatCurrency(totalCents)}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-[#111418] dark:text-white mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={purchaserEmail}
                        onChange={(e) => setPurchaserEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-[#111418] dark:text-white focus:ring-2 focus:ring-[#137fec]"
                        required
                      />
                    </div>

                    <button
                      onClick={() => checkoutMutation.mutate()}
                      disabled={cart.length === 0 || !purchaserEmail || checkoutMutation.isPending}
                      className="w-full bg-[#137fec] hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-black py-4 rounded-lg shadow-[0_8px_0px_0px_rgba(10,64,118,1)] transition-all active:translate-y-1 active:shadow-none uppercase tracking-widest mb-6"
                    >
                      {checkoutMutation.isPending ? 'Processing...' : 'Checkout Now'}
                    </button>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3 text-xs text-[#617589] dark:text-gray-500">
                        <span className="material-symbols-outlined text-[#137fec] text-sm">verified_user</span>
                        <p>Secure SSL Encrypted Checkout via YouthSports Payment Gateway.</p>
                      </div>
                      <div className="flex items-start gap-3 text-xs text-[#617589] dark:text-gray-500">
                        <span className="material-symbols-outlined text-[#137fec] text-sm">confirmation_number</span>
                        <p>Instant digital ticket delivery to your registered email address.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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
