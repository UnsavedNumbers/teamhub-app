/**
 * Guest Ticket Access Page
 * 
 * Allows guests to access tickets via magic link token
 */

import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTicketsByAccessToken } from '@/data/services'
import TicketCard from '@/components/ticketing/TicketCard'

export default function TicketAccess() {
  const { token } = useParams<{ token: string }>()

  const { data: ticketsResponse, error } = useQuery({
    queryKey: ['tickets-access', token],
    queryFn: () => getTicketsByAccessToken(token!),
    enabled: !!token,
  })

  const tickets = Array.isArray(ticketsResponse) ? ticketsResponse : ticketsResponse?.data || []

  if (error) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-lg mb-4">Invalid or expired access link</p>
          <p className="text-gray-500 dark:text-gray-400">Please check your email for a valid ticket link.</p>
        </div>
      </div>
    )
  }

  if (tickets.length === 0) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Loading tickets...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] py-8 text-[#111418] dark:text-white">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-black text-[#111418] dark:text-white mb-6 uppercase tracking-tight">Your Tickets</h1>
        <div className="space-y-6">
          {tickets.map((ticket: any) => {
            const ticketEvent = ticket.ticketed_events
            return (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                event={ticketEvent}
                showQR={true}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
