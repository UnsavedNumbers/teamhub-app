/**
 * Ticket Access Page (QR Token Link)
 * 
 * Displays a single ticket with QR code from an encrypted access link.
 * Route: /portal/tickets/access?t={encrypted_payload}
 */

import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { decryptTicketAccessLink } from '@/data/services/ticketingService'
import { TicketQRCode } from '@/components/ticketing/TicketQRCode'
import { formatEntryCode } from '@/types/ticketing'
import { useT } from '@/i18n/useI18n'
import { Sun, AlertCircle, Loader2 } from 'lucide-react'

export default function TicketAccessPage() {
  const [searchParams] = useSearchParams()
  const t = useT()
  const encryptedPayload = searchParams.get('t')
  
  const [wakeLock, setWakeLock] = useState<WakeLockSentinel | null>(null)

  const { data, error, isLoading } = useQuery({
    queryKey: ['ticket-access', encryptedPayload],
    queryFn: () => decryptTicketAccessLink(encryptedPayload!),
    enabled: !!encryptedPayload,
  })

  const ticket = data?.data

  // Request screen wake lock to prevent dimming
  useEffect(() => {
    async function requestWakeLock() {
      if ('wakeLock' in navigator) {
        try {
          const lock = await navigator.wakeLock.request('screen')
          setWakeLock(lock)
          
          // Re-acquire wake lock when page becomes visible again
          const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && !wakeLock) {
              try {
                const newLock = await navigator.wakeLock.request('screen')
                setWakeLock(newLock)
              } catch {
                // Wake lock not available, continue without
              }
            }
          }
          
          document.addEventListener('visibilitychange', handleVisibilityChange)
          
          return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange)
            lock.release().catch(() => {})
          }
        } catch {
          // Wake lock not available, continue without
        }
      }
    }

    if (ticket) {
      requestWakeLock()
    }

    return () => {
      wakeLock?.release().catch(() => {})
    }
  }, [ticket, wakeLock])

  if (!encryptedPayload) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {t('ticketing.ticketAccess.invalidLink')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            {t('ticketing.ticketAccess.invalidLinkDesc')}
          </p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-[#137fec] animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{t('ticketing.ticketAccess.loadingTicket')}</p>
        </div>
      </div>
    )
  }

  if (error || !ticket) {
    const isExpired = error?.message?.includes('expired') || error?.message?.includes('Link expired')
    return (
      <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {error?.message || t('ticketing.ticketAccess.ticketNotFound')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {isExpired
              ? t('ticketing.ticketAccess.linkExpired')
              : t('ticketing.ticketAccess.unableToLoad')}
          </p>
        </div>
      </div>
    )
  }

  const eventDate = ticket.event_date ? new Date(ticket.event_date) : null
  const formattedDate = eventDate
    ? eventDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
    : 'TBD'
  const formattedTime = eventDate
    ? eventDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : ''

  return (
    <div className="min-h-screen bg-[#f6f7f8] dark:bg-[#101922] py-8 px-4">
      <div className="max-w-md mx-auto">
        {/* Brightness reminder */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 mb-6 flex items-center gap-2">
          <Sun className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <span className="text-sm text-amber-800 dark:text-amber-200">
            {t('ticketing.ticketAccess.increaseBrightness')}
          </span>
        </div>

        {/* Event info header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-2">
            {ticket.event_name}
          </h1>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-1">
            {formattedDate}
          </p>
          {formattedTime && (
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-2">
              {formattedTime}
            </p>
          )}
          <p className="text-gray-600 dark:text-gray-400">
            {ticket.event_location}
          </p>
        </header>

        {/* QR Code - prominently displayed */}
        <section className="mb-8">
          <TicketQRCode token={ticket.qr_token} size={220} />
        </section>

        {/* Ticket type badge */}
        <div className="text-center mb-6">
          <span className="inline-block bg-[#137fec] text-white px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider">
            {ticket.ticket_type_name}
          </span>
        </div>

        {/* Manual entry code fallback */}
        <section className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-bold tracking-widest uppercase text-gray-500 dark:text-gray-400 mb-2 text-center">
            {t('ticketing.ticketAccess.entryCode')}
          </p>
          <p className="text-3xl font-black font-mono text-[#137fec] tracking-wider text-center mb-2">
            {formatEntryCode(ticket.entry_code)}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {t('ticketing.ticketAccess.useIfQrFails')}
          </p>
        </section>

        {/* Ticket metadata */}
        <footer className="text-center text-sm text-gray-500 dark:text-gray-400 space-y-1">
          <p>Ticket #{ticket.id.slice(-8).toUpperCase()}</p>
          <p>{t('ticketing.ticketAccess.purchasedBy')} {ticket.purchaser_name}</p>
        </footer>
      </div>
    </div>
  )
}
