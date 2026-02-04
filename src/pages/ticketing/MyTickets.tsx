/**
 * My Tickets Page
 *
 * Shows all tickets for the logged-in user.
 * Audited: [Current Date]
 */

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMyTicketOrders, getTicketsForOrder, resendTickets } from '@/data/services'
import TicketCard from '@/components/ticketing/TicketCard'
import { useRouteLink } from '@/utils/routes'
import FullScreenLoader from '@/components/common/FullScreenLoader'
import { showSuccess, showError } from '@/utils/toast'
import type { Ticket, TicketOrder } from '@/types/ticketing'

export default function MyTickets() {
  const { 
    data: orders, 
    isLoading, 
    isError, 
    error,
    refetch 
  } = useQuery<TicketOrder[]>({
    queryKey: ['my-ticket-orders'],
    queryFn: async () => {
      const response = await getMyTicketOrders()
      if (Array.isArray(response)) return response
      if (response.error) throw response.error
      return response.data || []
    },
  })

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] py-8 px-4 flex justify-center items-start">
         <FullScreenLoader message="Loading your tickets..." />
      </div>
    )
  }

  // Error State
  if (isError) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] py-8 px-4">
        <div className="max-w-4xl mx-auto text-center py-12">
          <div className="bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 p-4 rounded-xl inline-block mb-4">
            <span className="material-symbols-outlined text-4xl">error_outline</span>
          </div>
          <h2 className="text-xl font-bold text-[#111418] dark:text-white mb-2">
            Unable to load tickets
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            {error instanceof Error ? error.message : 'We encountered a problem fetching your ticket orders. Please try again.'}
          </p>
          <button
            onClick={() => refetch()}
            className="px-6 py-2 bg-[#137fec] text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Empty State
  if (!orders || orders.length === 0) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-black text-[#111418] dark:text-white mb-6 uppercase tracking-tight">
            My Tickets
          </h1>
          <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-12 text-center border border-gray-100 dark:border-gray-800">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-3xl text-gray-400">confirmation_number</span>
            </div>
            <h3 className="text-xl font-bold text-[#111418] dark:text-white mb-2">
              No tickets found
            </h3>
            <p className="text-[#617589] dark:text-gray-400 text-lg mb-8 max-w-md mx-auto">
              You haven't purchased any tickets yet. Browse upcoming events to get started.
            </p>
            <a
              href={useRouteLink('portal.tickets')}
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#137fec] text-white font-black rounded-lg hover:bg-blue-700 uppercase tracking-wider shadow-lg shadow-blue-500/20 transition-all transform hover:-translate-y-0.5"
            >
              <span className="material-symbols-outlined">calendar_month</span>
              Browse Events
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Success State
  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] py-8 text-[#111418] dark:text-white">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-black text-[#111418] dark:text-white uppercase tracking-tight">
            My Tickets
          </h1>
          <a
             href={useRouteLink('portal.tickets')}
             className="text-sm font-bold text-[#137fec] hover:text-blue-700 flex items-center gap-1"
          >
            Find More Events
            <span className="material-symbols-outlined text-base">arrow_forward</span>
          </a>
        </div>

        <div className="space-y-8">
          {orders.map((order) => (
            <OrderTickets key={order.id} order={order} />
          ))}
        </div>
      </div>
    </div>
  )
}

function OrderTickets({ order }: { order: TicketOrder }) {
  const [isResending, setIsResending] = useState(false)

  const { 
    data: tickets, 
    isLoading,
    isError,
    error,
    refetch
  } = useQuery<Ticket[]>({
    queryKey: ['tickets', order.id],
    queryFn: async () => {
      const response = await getTicketsForOrder(order.id)
      return response
    },
  })

  // Extract event details safely from the first ticket if available
  // Note: TicketOrder usually doesn't have event details directly nested unless joined, 
  // but getTicketsForOrder returns tickets with nested event data.
  const event = (tickets?.[0] as any)?.ticketed_events
  const orderDate = new Date(order.created_at).toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric' 
  })

  const handleResend = async () => {
    if (!order.id || !order.purchaser_email) return

    setIsResending(true)
    try {
      const { data: result, error } = await resendTickets({
        order_id: order.id,
        email: order.purchaser_email,
      })

      if (error || !result) {
        showError(error?.message || 'Failed to resend tickets')
      } else {
        showSuccess(result.message || 'Tickets resent successfully!')
      }
    } catch {
      showError('Failed to resend tickets')
    } finally {
      setIsResending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-6"></div>
        <div className="space-y-4">
          <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
          <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded-xl"></div>
        </div>
      </div>
    )
  }

  if (isError || !tickets || tickets.length === 0) {
    // If we have an order but can't load tickets, show a small error card
    return (
      <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-6 border border-red-100 dark:border-red-900/30">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Order #{order.id.slice(-6).toUpperCase()}</h3>
            <p className="text-sm text-red-500 mt-1">
              Failed to load tickets: {error instanceof Error ? error.message : 'Unknown error'}
            </p>
          </div>
          <button 
             onClick={() => refetch()}
             className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-md font-medium transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-[#1c2630] rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-800 relative overflow-hidden">
        {/* Status indicator strip */}
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
             order.status === 'paid' ? 'bg-green-500' : 
             order.status === 'pending_payment' ? 'bg-yellow-500' : 'bg-gray-300'
        }`} />

      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 pl-3">
        <div>
           {/* Event Title */}
          <h2 className="text-xl font-black text-[#111418] dark:text-white uppercase tracking-tight leading-tight">
            {event?.title || 'Event Tickets'}
          </h2>
          {/* Order Meta */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
             <span className="font-medium">Order #{order.id.slice(-6).toUpperCase()}</span>
             <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
             <span>{orderDate}</span>
             <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></span>
             <span>{tickets.length} Ticket{tickets.length !== 1 ? 's' : ''}</span>
          </div>
        </div>

        <button
          onClick={handleResend}
          disabled={isResending || !order.purchaser_email}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold bg-[#f0f2f5] dark:bg-[#2a3441] text-[#111418] dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-[#344050] transition-colors disabled:opacity-50 disabled:cursor-not-allowed uppercase tracking-wider min-w-[140px]"
          title={`Resend ticket email to ${order.purchaser_email}`}
        >
          {isResending ? (
            <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <span className="material-symbols-outlined text-lg">forward_to_inbox</span>
          )}
          <span>{isResending ? 'Sending...' : 'Email Tickets'}</span>
        </button>
      </div>

      <div className="space-y-8 pl-3">
        {tickets.map((ticket) => (
          <TicketCard
            key={ticket.id}
            ticket={ticket}
            event={event}
            orderId={order.id}
            showQR={true}
          />
        ))}
      </div>
      
      {/* Footer Info */}
       <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex justify-end">
          <p className="text-xs text-gray-400 dark:text-gray-500">
             Sent to {order.purchaser_email}
          </p>
       </div>
    </div>
  )
}
