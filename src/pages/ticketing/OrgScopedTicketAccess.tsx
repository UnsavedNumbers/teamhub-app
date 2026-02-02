/**
 * Org-Scoped Guest Ticket Access Page
 * 
 * Allows guests to access tickets via magic link token
 * Must be wrapped in OrgScopedRoute
 */

import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTicketsByAccessToken } from '@/data/services'
import TicketCard from '@/components/ticketing/TicketCard'
import type { OrgContext } from '@/utils/orgResolution'
import { OrgScopedRoute } from '@/components/OrgScopedRoute'

function TicketAccessContent({ org }: { org: OrgContext }) {
  const { token } = useParams<{ token: string }>()

  const { data: ticketsResponse, error } = useQuery({
    queryKey: ['tickets-access', token, org.id],
    queryFn: () => getTicketsByAccessToken(token!, org.id),
    enabled: !!token && !!org.id,
  })

  const ticketsResponseAny = ticketsResponse as any
  const tickets = Array.isArray(ticketsResponseAny) ? ticketsResponseAny : ticketsResponseAny?.data || []

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
      {/* Header with org branding */}
      <header className="flex items-center justify-between border-b border-[#f0f2f4] dark:border-gray-800 bg-white dark:bg-[#101922] px-10 py-3 sticky top-0 z-50 mb-8">
        <div className="flex items-center gap-4 text-[#111418] dark:text-white">
          <div className="size-6 text-[#137fec]">
            <svg fill="currentColor" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
              <path clipRule="evenodd" d="M24 4H6V17.3333V30.6667H24V44H42V30.6667V17.3333H24V4Z" fillRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-[#111418] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">{org.name}</h2>
        </div>
      </header>

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

export default function OrgScopedTicketAccess() {
  return (
    <OrgScopedRoute>
      {(org) => <TicketAccessContent org={org} />}
    </OrgScopedRoute>
  )
}
