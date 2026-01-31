/**
 * My Tickets Page
 * 
 * Shows all tickets for the logged-in user
 */

import { useQuery } from '@tanstack/react-query'
import { getMyTicketOrders, getTicketsForOrder } from '@/data/services'
import TicketCard from '@/components/ticketing/TicketCard'
import { useRouteLink } from '@/utils/routes'

export default function MyTickets() {
  const { data: ordersResponse } = useQuery({
    queryKey: ['my-ticket-orders'],
    queryFn: () => getMyTicketOrders(),
  })

  const orders = ordersResponse?.data || []

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
            {orders.map((order) => (
              <OrderTickets key={order.id} orderId={order.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function OrderTickets({ orderId }: { orderId: string }) {
  const { data: ticketsResponse } = useQuery({
    queryKey: ['tickets', orderId],
    queryFn: () => getTicketsForOrder(orderId),
  })

  const tickets = ticketsResponse?.data || []

  if (tickets.length === 0) return null

  const event = tickets[0]?.ticketed_events

  return (
    <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-6">
      <h2 className="text-xl font-black text-[#111418] dark:text-white mb-4 uppercase tracking-tight">
        {event?.title || 'Event Tickets'}
      </h2>
      <div className="space-y-6">
        {tickets.map((ticket) => (
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
