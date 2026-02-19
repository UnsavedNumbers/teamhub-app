/**
 * Ticket Order Success Page
 *
 * Shown after successful Stripe checkout
 * Works for both authenticated users and guests
 * Design: ticket_mobile_entry (success banner)
 */

import { useCallback, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getPublicOrderWithTickets, resendTickets, type PublicOrderResponse } from '@/data/services'
import { useRouteLink } from '@/utils/routes'
import TicketCard from '@/components/ticketing/TicketCard'

import { useDebugLifecycle } from '@/lib/debug/integrations/useDebugLifecycle'

export default function TicketOrderSuccess() {
  useDebugLifecycle('TicketOrderSuccess')
  
  const { orderId } = useParams<{ orderId: string }>()
  const myTicketsLink = useRouteLink('portal.myTickets')
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const scrollToTicket = useCallback((ticketId: string) => {
    const target = document.getElementById(`ticket-${ticketId}`)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [])

  const handleResendTickets = async () => {
    if (!orderId || !data?.order?.purchaser_email) return

    setIsResending(true)
    setResendMessage(null)

    try {
      const { data: result, error } = await resendTickets({
        order_id: orderId,
        email: data.order.purchaser_email,
      })

      if (error || !result) {
        setResendMessage({ type: 'error', text: error?.message || 'Failed to resend tickets' })
      } else {
        setResendMessage({ type: 'success', text: result.message || 'Tickets resent successfully!' })
        // Auto-clear success message after 5 seconds
        setTimeout(() => setResendMessage(null), 5000)
      }
    } catch {
      setResendMessage({ type: 'error', text: 'Failed to resend tickets' })
    } finally {
      setIsResending(false)
    }
  }

  // Use public endpoint that works without authentication
  const { data, isLoading, isError, error, refetch } = useQuery<PublicOrderResponse, Error>({
    queryKey: ['public-ticket-order', orderId],
    queryFn: () => getPublicOrderWithTickets(orderId!),
    enabled: !!orderId,
  })

  if (!orderId) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <p className="text-gray-500">Order not found.</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Loading order...</p>
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-lg mb-4">
            {error?.message || 'Order not found'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-[#137fec] text-white rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  const order = data.order
  const event = order.event || undefined
  const orderRef = `YS-${order.id.slice(-5).toUpperCase()}`
  const tickets = data.tickets ?? []
  const normalizedTickets = tickets.map((ticket) => ({
    ...ticket,
    ticket_types: ticket.ticket_type,
    ticketed_events: ticket.event,
  })) as unknown as Array<
    PublicOrderResponse['tickets'][number] & {
      ticket_types?: { name: string; description: string | null }
      ticketed_events?: PublicOrderResponse['tickets'][number]['event'] | null
    }
  >

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] text-[#111418] dark:text-white">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-[#f0f2f4] dark:border-gray-800 bg-white dark:bg-[#101922] px-10 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-4 text-[#111418] dark:text-white">
          <div className="size-6 text-[#137fec]">
            <svg fill="none" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fill="currentColor" fillRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">YouthSports.team</h2>
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
          {normalizedTickets.map((ticket, idx) => {
            const nextTicket = normalizedTickets[idx + 1]
            const ticketEvent = ticket.ticketed_events || event
            return (
              <div key={ticket.id} id={`ticket-${ticket.id}`}>
                <TicketCard
                  ticket={ticket as any}
                  event={ticketEvent}
                  orderId={order.id}
                  showQR={true}
                />
                {idx < normalizedTickets.length - 1 && (
                  <div className="mt-6 bg-white dark:bg-gray-900 rounded-xl shadow-md overflow-hidden border border-gray-100 dark:border-gray-800 opacity-60">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="size-12 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center">
                          <span className="material-symbols-outlined text-gray-400">qr_code_2</span>
                        </div>
                        <div>
                          <h3 className="font-bold text-[#111418] dark:text-white">Ticket {idx + 2} of {normalizedTickets.length}</h3>
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
            <Link
              to={myTicketsLink}
              className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-14 px-5 bg-[#137fec] text-white text-lg font-bold leading-normal tracking-[0.015em] w-full shadow-lg shadow-[#137fec]/20 hover:bg-blue-600 transition-colors"
            >
              <span className="material-symbols-outlined">confirmation_number</span>
              <span className="truncate uppercase">View All My Tickets</span>
            </Link>

            {/* Resend Tickets Button */}
            <button
              onClick={handleResendTickets}
              disabled={isResending}
              className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-12 px-5 bg-white dark:bg-gray-900 text-[#111418] dark:text-white border-2 border-gray-300 dark:border-gray-700 text-base font-bold leading-normal tracking-[0.015em] w-full hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-lg">
                {isResending ? 'hourglass_empty' : 'forward_to_inbox'}
              </span>
              <span className="truncate uppercase">
                {isResending ? 'Sending...' : 'Resend Email'}
              </span>
            </button>

            {/* Resend Message */}
            {resendMessage && (
              <div className={`rounded-lg px-4 py-3 text-sm font-medium ${
                resendMessage.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
              }`}>
                {resendMessage.text}
              </div>
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
