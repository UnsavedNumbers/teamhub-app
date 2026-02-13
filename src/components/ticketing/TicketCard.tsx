/**
 * Ticket Card Component
 *
 * Displays a ticket with entry code prominently and authenticity markers.
 * Used in My Tickets, guest access, and PDF generation.
 * Design: ticket_mobile_entry
 */

import { QRCodeSVG } from 'qrcode.react'
import type { Ticket, TicketType, TicketedEvent } from '@/types/ticketing'
import { formatEntryCode } from '@/types/ticketing'
import { useT } from '@/i18n/useI18n'

interface TicketCardProps {
  ticket: Ticket & {
    ticket_types?: Pick<TicketType, 'name' | 'description'>
  }
  event?: Pick<TicketedEvent, 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
  orderId?: string
  showQR?: boolean
}

export default function TicketCard({
  ticket,
  event,
  orderId,
  showQR = true,
}: TicketCardProps) {
  const t = useT()
  const isUsed = ticket.status === 'used'
  const isInactive = ticket.status !== 'active'
  const entryCodeFormatted = formatEntryCode(ticket.entry_code)
  const qrValue = ticket.entry_code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  const eventDate = event?.starts_at ? new Date(event.starts_at) : null
  const dateStr = eventDate
    ? eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    : 'TBD'
  const timeStr = eventDate ? eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : ''
  const usedAtStr = ticket.used_at
    ? new Date(ticket.used_at).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
    : null
  const venue = event?.venue_name
    ? `${event.venue_name}${event.venue_city ? ` - ${event.venue_city}` : ''}${event.venue_state ? `, ${event.venue_state}` : ''}`
    : 'Location TBD'

  const cardToneClasses = isUsed
    ? 'border-2 border-amber-300 dark:border-amber-700 ring-2 ring-amber-200/80 dark:ring-amber-900/50'
    : ticket.status === 'refunded'
      ? 'border-2 border-red-200 dark:border-red-900/50'
      : ticket.status === 'voided'
        ? 'border-2 border-yellow-200 dark:border-yellow-900/50'
        : 'border border-gray-100 dark:border-gray-800'

  return (
    <div className={`bg-white dark:bg-gray-900 rounded-xl shadow-xl overflow-hidden max-w-[480px] mx-auto relative ${cardToneClasses}`}>
      {isUsed && (
        <div className="absolute right-4 top-4 z-20 rounded-full bg-amber-500 px-3 py-1 text-xs font-black uppercase tracking-widest text-white shadow-lg">
          Used
        </div>
      )}

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
            {dateStr} {timeStr && ` - ${timeStr}`}
          </p>
          <p className="text-gray-500 dark:text-gray-500 text-sm">{venue}</p>
        </div>

        {/* Entry Code - Prominent */}
        <div className={`border-2 rounded-xl p-6 mb-6 ${
          isUsed
            ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800'
            : 'bg-[#137fec]/10 border-[#137fec]/20'
        }`}>
          <p className={`text-xs font-bold tracking-widest uppercase mb-3 ${isUsed ? 'text-amber-700 dark:text-amber-300' : 'text-[#137fec]'}`}>
            ENTRY CODE
          </p>
          <p
            className={`text-5xl font-black font-mono tracking-wider ${isUsed ? 'text-amber-800 dark:text-amber-200' : 'text-[#137fec]'}`}
            style={{ userSelect: 'none', letterSpacing: '0.1em' }}
          >
            {entryCodeFormatted}
          </p>
          <p className={`text-xs mt-3 font-medium ${isUsed ? 'text-amber-700/90 dark:text-amber-300/90' : 'text-[#137fec]/80'}`}>
            {isUsed ? 'This ticket has already been scanned' : 'Show this code at the gate'}
          </p>
        </div>

        {/* QR Code */}
        {showQR && (
          <div className={`relative inline-block p-4 bg-white rounded-xl shadow-inner border border-gray-100 ${isUsed ? 'opacity-60 grayscale' : ''}`}>
            <div className="w-[250px] h-[250px] bg-white flex items-center justify-center mx-auto">
              <QRCodeSVG
                value={qrValue}
                size={250}
                level="M"
                includeMargin={false}
              />
            </div>
            {isUsed && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="rounded-full bg-amber-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-lg">
                  Already Used
                </span>
              </div>
            )}
            <div className="mt-4 flex flex-col items-center">
              <span className={`text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isInactive ? 'bg-gray-500' : 'bg-[#137fec] animate-pulse'}`}>
                {isInactive ? 'Entry closed' : 'Show this at entry'}
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

      {ticket.seat_info && (
        <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-900/40">
          <p className="text-sm font-semibold text-[#111418] dark:text-white">
            {t('ticketing.reservedSeating.seatDisplayCompact', {
              section: ticket.seat_info.section,
              row: ticket.seat_info.row,
              seat: ticket.seat_info.seat,
            })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ticket.seat_info.attributes?.accessible && (
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                {t('ticketing.reservedSeating.ticketCard.accessible')}
              </span>
            )}
            {ticket.seat_info.attributes?.obstructed_view && (
              <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                {t('ticketing.reservedSeating.ticketCard.obstructedView')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Status Badge */}
      {isInactive && (
        <div className="px-6 pb-6 text-center">
          <span
            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-black uppercase tracking-wide ${
              ticket.status === 'used'
                ? 'bg-amber-100 text-amber-900'
                : ticket.status === 'refunded'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {ticket.status === 'used' && 'Used'}
            {ticket.status === 'refunded' && 'Refunded'}
            {ticket.status === 'voided' && 'Voided'}
          </span>
          {isUsed && usedAtStr && (
            <p className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-200">
              Scanned {usedAtStr}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
