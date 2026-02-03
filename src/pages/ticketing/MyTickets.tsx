/**
 * My Tickets Page
 *
 * Shows all tickets for the logged-in user
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMyTicketOrders, getTicketsForOrder, resendTickets } from '@/data/services'
import TicketCard from '@/components/ticketing/TicketCard'
import { useRouteLink } from '@/utils/routes'

export default function MyTickets() {
  const { data: ordersResponse } = useQuery({
    queryKey: ['my-ticket-orders'],
    queryFn: () => getMyTicketOrders(),
  })

  const ordersResponseAny = ordersResponse as any
  const orders = Array.isArray(ordersResponseAny) ? ordersResponseAny : ordersResponseAny?.data || []

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] py-8 text-[#111418] dark:text-white">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-black text-[#111418] dark:text-white mb-6 uppercase tracking-tight">My Tickets</h1>

        {orders.length === 0 ? (
          <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-12 text-center">
            <p className="text-[#617589] dark:text-gray-400 text-lg mb-4">You don't have any tickets yet</p>
            <a
              href={useRouteLink('portal.tickets')}
              className="inline-block px-6 py-3 bg-[#137fec] text-white font-black rounded-lg hover:bg-blue-700 uppercase tracking-wider shadow-[0_8px_15px_-3px_rgba(19,127,236,0.3),0_4px_6px_-2px_rgba(19,127,236,0.05)]"
            >
              Browse Events
            </a>
          </div>
        ) : (
          <div className="space-y-8">
            {orders.map((order: any) => (
              <OrderTickets key={order.id} orderId={order.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OrderTickets({ orderId }: { orderId: string }) {
  const [isResending, setIsResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { data: ticketsResponse } = useQuery({
    queryKey: ['tickets', orderId],
    queryFn: () => getTicketsForOrder(orderId),
  })

  const ticketsResponseAny = ticketsResponse as any
  const tickets = Array.isArray(ticketsResponseAny) ? ticketsResponseAny : ticketsResponseAny?.data || []

  if (tickets.length === 0) return null

  const event = tickets[0]?.ticketed_events
  const purchaserEmail = tickets[0]?.ticket_orders?.purchaser_email

  const handleResend = async () => {
    if (!orderId || !purchaserEmail) return

    setIsResending(true)
    setResendMessage(null)

    try {
      const { data: result, error } = await resendTickets({
        order_id: orderId,
        email: purchaserEmail,
      })

      if (error || !result) {
        setResendMessage({ type: 'error', text: error?.message || 'Failed to resend tickets' })
      } else {
        setResendMessage({ type: 'success', text: result.message || 'Tickets resent successfully!' })
        setTimeout(() => setResendMessage(null), 5000)
      }
    } catch {
      setResendMessage({ type: 'error', text: 'Failed to resend tickets' })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-black text-[#111418] dark:text-white uppercase tracking-tight">
          {event?.title || 'Event Tickets'}
        </h2>
        <button
          onClick={handleResend}
          disabled={isResending || !purchaserEmail}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold bg-gray-100 dark:bg-gray-800 text-[#111418] dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Resend ticket email with QR codes"
        >
          <span className="material-symbols-outlined text-lg">
            {isResending ? 'hourglass_empty' : 'forward_to_inbox'}
          </span>
          <span>{isResending ? 'Sending...' : 'Resend Email'}</span>
        </button>
      </div>

      {/* Resend Message */}
      {resendMessage && (
        <div className={`mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
          resendMessage.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
            : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
        }`}>
          {resendMessage.text}
        </div>
      )}

      <div className="space-y-6">
        {tickets.map((ticket: any) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            event={event}
            orderId={orderId}
            showQR={true}
          />
        ))}
      </div>
    </div>
  )
}
