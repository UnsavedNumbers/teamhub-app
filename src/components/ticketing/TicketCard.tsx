/**
 * Ticket Card Component
 * 
 * Displays a ticket with entry code prominently and authenticity markers.
 * Used in My Tickets, guest access, and PDF generation.
 * Design: ticket_mobile_entry
 */

// QR Code will be generated server-side or via a library
// For now, using a placeholder that can be replaced with QRCodeSVG from 'qrcode.react'
import type { Ticket, TicketType, TicketedEvent } from '@/types/ticketing'
import { formatEntryCode } from '@/types/ticketing'

interface TicketCardProps {
  ticket: Ticket & {
    ticket_types?: Pick<TicketType, 'name' | 'description'>
  }
  event?: Pick<TicketedEvent, 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
  orderId?: string
  orgName?: string
  showQR?: boolean
}

export default function TicketCard({
  ticket,
  event,
  orderId,
  orgName,
  showQR = true,
}: TicketCardProps) {
  const entryCodeFormatted = formatEntryCode(ticket.entry_code)
  const eventDate = event?.starts_at ? new Date(event.starts_at) : null
  const dateStr = eventDate
    ? eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : 'TBD'
  const timeStr = eventDate ? eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''
  const venue = event?.venue_name
    ? `${event.venue_name}${event.venue_city ? ` • ${event.venue_city}` : ''}${event.venue_state ? ` ${event.venue_state}` : ''}`
    : 'Location TBD'

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-800 max-w-[480px] mx-auto">
      {/* Ticket Header with Notched Edges */}
      <div className="p-6 text-center border-b border-dashed border-gray-200 dark:border-gray-700 relative">
        {/* Left Notch */}
        <div className="absolute -left-3 bottom-0 translate-y-1/2 w-6 h-6 rounded-full bg-[#f6f7f8] dark:bg-[#101922]" />
        {/* Right Notch */}
        <div className="absolute -right-3 bottom-0 translate-y-1/2 w-6 h-6 rounded-full bg-[#f6f7f8] dark:bg-[#101922]" />
        
        <p className="text-[#137fec] text-xs font-bold tracking-widest uppercase mb-4">
          YouthSports.team Official Ticket
        </p>
        <h2 className="text-[#111418] dark:text-white text-3xl font-black leading-tight mb-2 uppercase">
          {event?.title || 'Event Ticket'}
        </h2>
        <div className="flex flex-col items-center gap-1 mb-6">
          <p className="text-gray-600 dark:text-gray-400 text-lg font-medium">
            {dateStr} {timeStr && `• ${timeStr}`}
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">{venue}</p>
        </div>

        {/* Entry Code - Prominent */}
        <div className="bg-[#137fec]/10 border-2 border-[#137fec]/20 rounded-xl p-6 mb-6">
          <p className="text-[#137fec] text-xs font-bold tracking-widest uppercase mb-3">ENTRY CODE</p>
          <p
            className="text-5xl font-black font-mono text-[#137fec] tracking-wider"
            style={{ userSelect: 'none', letterSpacing: '0.1em' }}
          >
            {entryCodeFormatted}
          </p>
          <p className="text-xs text-[#137fec]/80 mt-3 font-medium">Show this code at the gate</p>
        </div>

        {/* QR Code */}
        {showQR && (
          <div className="relative inline-block p-4 bg-white rounded-xl shadow-inner border border-gray-100">
            <div className="w-[250px] h-[250px] bg-white flex items-center justify-center mx-auto">
              <QRCodeSVG
                value={ticket.entry_code}
                size={250}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="mt-4 flex flex-col items-center">
              <span className="bg-[#137fec] text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider animate-pulse">
                Show this at entry
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Footer Info */}
      <div className="p-6 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
        <div>
          <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-tighter">Ticket Type</p>
          <p className="text-[#111418] dark:text-white text-xl font-bold">
            {ticket.ticket_types?.name || 'General Admission'}
          </p>
        </div>
        {orderId && (
          <div className="text-right">
            <p className="text-gray-500 dark:text-gray-400 text-xs uppercase font-bold tracking-tighter">Order Ref</p>
            <p className="text-[#111418] dark:text-white text-xl font-bold font-mono">
              {orderId.slice(-6).toUpperCase()}
            </p>
          </div>
        )}
      </div>

      {/* Status Badge */}
      {ticket.status !== 'active' && (
        <div className="px-6 pb-6 text-center">
          <span
            className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
              ticket.status === 'used'
                ? 'bg-gray-100 text-gray-800'
                : ticket.status === 'refunded'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {ticket.status === 'used' && 'Used'}
            {ticket.status === 'refunded' && 'Refunded'}
            {ticket.status === 'voided' && 'Voided'}
          </span>
        </div>
      )}
    </div>
  )
}
