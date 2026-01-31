/**
 * Ticket Order Success Page
 * 
 * Shown after successful Stripe checkout
 * Design: ticket_mobile_entry (success banner)
 */

import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTicketOrderById, getTicketsForOrder } from '@/data/services'
import { useRouteLink } from '@/utils/routes'
import TicketCard from '@/components/ticketing/TicketCard'

export default function TicketOrderSuccess() {
  const { orderId } = useParams<{ orderId: string }>()

  const { data: orderResponse } = useQuery({
    queryKey: ['ticket-order', orderId],
    queryFn: () => getTicketOrderById(orderId!),
    enabled: !!orderId,
  })

  const { data: ticketsResponse } = useQuery({
    queryKey: ['tickets', orderId],
    queryFn: () => getTicketsForOrder(orderId!),
    enabled: !!orderId,
  })

  const order = (orderResponse as any)?.data ?? orderResponse ?? null
  const ticketsResponseAny = ticketsResponse as any
  const tickets = Array.isArray(ticketsResponseAny) ? ticketsResponseAny : ticketsResponseAny?.data || []

  if (!order) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500">Loading order...</p>
        </div>
      </div>
    )
  }

  const event = order.ticketed_events
  const orderRef = `YS-${order.id.slice(-5).toUpperCase()}`

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
          {tickets.map((ticket: any, idx: number) => {
            const ticketEvent = ticket.ticketed_events || event
            return (
              <div key={ticket.id}>
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
                      <button className="text-[#137fec] font-bold text-sm">VIEW</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 py-6">
            <Link
              to={useRouteLink('portal.myTickets')}
              className="flex min-w-[84px] cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl h-14 px-5 bg-[#137fec] text-white text-lg font-bold leading-normal tracking-[0.015em] w-full shadow-lg shadow-[#137fec]/20 hover:bg-blue-600 transition-colors"
            >
              <span className="material-symbols-outlined">confirmation_number</span>
              <span className="truncate uppercase">View All My Tickets</span>
            </Link>
          </div>

          {/* Footer Support */}
          <div className="text-center pb-12">
            <p className="text-gray-500 text-sm mb-2">Need help with your entry?</p>
            <a className="text-[#137fec] font-bold text-sm underline" href="#">
              Contact Event Support
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
