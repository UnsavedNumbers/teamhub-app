/**
 * Fan Tickets Page
 * 
 * View and manage tickets for events the fan has purchased or been assigned.
 * Features dynamic QR codes that refresh every 30 seconds for security.
 * 
 * URL/ROUTE: /fan/tickets
 * Design: FanConnect Minimalist Light
 */

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { transferTicket } from '../../data/services/fanService'
import { getMyTicketOrders, getTicketsForOrder, requestTicketWalletPass } from '../../data/services/ticketingService'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { showError, showSuccess } from '../../utils/toast'
import { QRCodeSVG } from 'qrcode.react'
import { getLink, RouteKeys } from '../../utils/routes'
import { useOffline } from '../../hooks/useOffline'
import { useT } from '../../i18n/useI18n'
import '../../styles/fan.css'
import '../../styles/fan-layouts.css'
import type { TicketOrder } from '../../types/ticketing'

type TicketTab = 'upcoming' | 'past' | 'transferred'
type TicketStatus = 'valid' | 'used' | 'expired' | 'transferred' | 'pending'

interface FanTicket {
  ticket_id: string
  event_id: string
  event_start_time: string
  event_name: string
  event_location: string | null
  venue_name?: string
  venue_city?: string
  venue_state?: string
  order_confirmation_code: string | null
  ticket_type_name: string
  seat_info?: string
  seat_section?: string
  seat_row?: string
  seat_number?: string
  seat_attributes?: Record<string, unknown>
  holder_name?: string
  scanned_at: string | null
  qr_code_data: string
  purchase_date?: string
  amount_paid?: number
  status: TicketStatus
}

type FanTranslate = ReturnType<typeof useT>

// QR code refresh interval (30 seconds)
const QR_REFRESH_INTERVAL = 30000

const generateQRPayload = (qrCodeData: string, _timestamp: number): string => qrCodeData

const getPreferredWalletType = (): 'apple' | 'google' => {
  if (typeof navigator === 'undefined') {
    return 'google'
  }

  const ua = navigator.userAgent || ''
  const iOSLike = /iPad|iPhone|iPod/i.test(ua)
  const iPadDesktopMode = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1
  return iOSLike || iPadDesktopMode ? 'apple' : 'google'
}

const isActiveUpcomingTicket = (ticket: FanTicket, now: Date): boolean => {
  const eventDate = new Date(ticket.event_start_time)
  return eventDate >= now && ticket.status === 'valid'
}

const isPastTicket = (ticket: FanTicket, now: Date): boolean => {
  const eventDate = new Date(ticket.event_start_time)
  return eventDate < now
}

const mapRawTicketToFanTicket = (rawTicket: any, t: FanTranslate): FanTicket => {
  const event = rawTicket.ticketed_events
  const ticketType = rawTicket.ticket_types
  const eventLocation = [event?.venue_name, event?.venue_city, event?.venue_state]
    .filter(Boolean)
    .join(', ')

  const now = new Date()
  const eventDate = new Date(event?.starts_at || '')
  const usedAt = rawTicket.used_at ? new Date(rawTicket.used_at) : null
  const hasValidUsedAt = usedAt !== null && !Number.isNaN(usedAt.getTime()) && usedAt <= now
  const isUsed = hasValidUsedAt && eventDate <= now
  const isPast = eventDate < now
  const rawStatus = typeof rawTicket.status === 'string' ? rawTicket.status : null

  let status: TicketStatus = 'valid'
  if (rawStatus === 'transferred') status = 'transferred'
  else if (rawStatus === 'pending') status = 'pending'
  else if (isUsed) status = 'used'
  else if (isPast) status = 'expired'

  return {
    ticket_id: rawTicket.id,
    event_id: event?.id || '',
    event_start_time: event?.starts_at || '',
    event_name: event?.title || 'Event',
    event_location: eventLocation || null,
    venue_name: event?.venue_name || undefined,
    venue_city: event?.venue_city || undefined,
    venue_state: event?.venue_state || undefined,
    order_confirmation_code: rawTicket.entry_code || null,
    ticket_type_name: ticketType?.name || 'General Admission',
    seat_info: rawTicket.seat_info
      ? t('ticketing.reservedSeating.seatDisplay', {
        section: rawTicket.seat_info.section,
        row: rawTicket.seat_info.row,
        seat: rawTicket.seat_info.seat,
      })
      : undefined,
    seat_section: rawTicket.seat_info?.section,
    seat_row: rawTicket.seat_info?.row,
    seat_number: rawTicket.seat_info?.seat,
    seat_attributes: rawTicket.seat_info?.attributes,
    scanned_at: rawTicket.used_at || null,
    qr_code_data: rawTicket.entry_code || '',
    purchase_date: rawTicket.created_at,
    status,
  }
}

import { useDebugLifecycle } from '../../lib/debug/integrations/useDebugLifecycle'

export default function FanTickets() {
  useDebugLifecycle('FanTickets')
  
  const t = useT()
  const navigate = useNavigate()
  
  // Data state
  const [tickets, setTickets] = useState<FanTicket[]>([])
  const [loading, setLoading] = useState(true)
  
  // UI state
  const [activeTab, setActiveTab] = useState<TicketTab>('upcoming')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTicket, setSelectedTicket] = useState<FanTicket | null>(null)
  const [showTransferModal, setShowTransferModal] = useState(false)

  // Load tickets on mount
  useEffect(() => {
    loadTickets()
  }, [])

  const loadTickets = async () => {
    setLoading(true)
    
    try {
      const ordersResponse = await getMyTicketOrders()
      let orders: TicketOrder[] = []
      
      if (Array.isArray(ordersResponse)) {
        orders = ordersResponse
      } else if (ordersResponse.error) {
        showError(ordersResponse.error.message)
        setLoading(false)
        return
      } else {
        orders = ordersResponse.data || []
      }

      const ticketsByOrder = await Promise.all(orders.map((order) => getTicketsForOrder(order.id)))
      const flatTickets = ticketsByOrder.flat()

      const mappedTickets: FanTicket[] = flatTickets.map((ticket: any) => mapRawTicketToFanTicket(ticket, t))

      setTickets(mappedTickets)
    } catch (err) {
      showError('Failed to load tickets')
    }
    
    setLoading(false)
  }

  // Filter tickets by tab and search
  const filteredTickets = tickets.filter(ticket => {
    const now = new Date()
    const isActive = isActiveUpcomingTicket(ticket, now)
    const isPast = isPastTicket(ticket, now)

    // Tab filter
    const matchesTab =
      (activeTab === 'upcoming' && isActive) ||
      (activeTab === 'past' && isPast) ||
      (activeTab === 'transferred' && ticket.status === 'transferred')
    
    // Search filter
    const matchesSearch = searchQuery === '' || 
      ticket.event_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.venue_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.event_location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ticket.order_confirmation_code?.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesTab && matchesSearch
  }).sort((a, b) => {
    const dateA = new Date(a.event_start_time).getTime()
    const dateB = new Date(b.event_start_time).getTime()
    return activeTab === 'upcoming' ? dateA - dateB : dateB - dateA
  })

  // Transfer handlers
  const handleTransfer = async (ticketId: string, recipientEmail: string, recipientName?: string) => {
    const { error } = await transferTicket({
      ticket_id: ticketId,
      holder_email: recipientEmail,
      holder_name: recipientName,
    })
    
    if (error) {
      showError(error.message)
    } else {
      showSuccess('Ticket transferred successfully')
      setShowTransferModal(false)
      setSelectedTicket(null)
      loadTickets()
    }
  }

  // Navigate to ticket detail
  const handleTicketClick = (ticket: FanTicket) => {
    navigate(getLink(RouteKeys.FAN_TICKET_DETAIL, { ticketId: ticket.ticket_id }))
  }

  // Count tickets for wallet display
  const totalActiveTickets = tickets.filter(t => isActiveUpcomingTicket(t, new Date())).length
  const firstTransferableTicket = tickets.find((ticket) => ticket.status === 'valid') ?? null

  const openTransferForTicket = () => {
    if (!firstTransferableTicket) {
      showError(t('ticketing.wallet.noTransferableTicket'))
      return
    }
    setSelectedTicket(firstTransferableTicket)
    setShowTransferModal(true)
  }

  if (loading) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  return (
    <div className="fan-tickets-page">
      {/* Page Header - Matching Design */}
      <div className="fan-tickets-header">
        <span className="fan-tickets-label">Account Access</span>
        <h1 className="fan-tickets-title">My Tickets</h1>
      </div>

      {/* Search + Filters Row */}
      <div className="fan-tickets-controls">
        <div className="fan-tickets-search">
          <span className="material-symbols-outlined">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by event or venue..."
            className="fan-tickets-search-input"
          />
        </div>
        <div className="fan-tickets-tabs">
          <button 
            className={`fan-tickets-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
            onClick={() => setActiveTab('upcoming')}
          >
            Upcoming
          </button>
          <button 
            className={`fan-tickets-tab ${activeTab === 'past' ? 'active' : ''}`}
            onClick={() => setActiveTab('past')}
          >
            Past
          </button>
          <button
            className={`fan-tickets-tab ${activeTab === 'transferred' ? 'active' : ''}`}
            onClick={() => setActiveTab('transferred')}
          >
            Transferred
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="fan-tickets-layout">
        {/* Main Content - Ticket List */}
        <div className="fan-tickets-main">
          {filteredTickets.length === 0 ? (
            <div className="fan-tickets-empty">
              <div className="fan-tickets-empty-icon">
                <span className="material-symbols-outlined">confirmation_number</span>
              </div>
              <h3 className="fan-tickets-empty-title">
                {activeTab === 'upcoming'
                  ? 'No upcoming tickets'
                  : activeTab === 'past'
                    ? 'No past tickets'
                    : 'No transferred tickets'}
              </h3>
              <p className="fan-tickets-empty-text">
                {activeTab === 'upcoming'
                  ? 'When you purchase tickets, they will appear here'
                  : activeTab === 'past'
                    ? 'Your past event tickets will be shown here'
                    : 'Transferred tickets will appear here'}
              </p>
            </div>
          ) : (
            <div className="fan-tickets-list">
              {filteredTickets.map((ticket) => (
                <TicketCard
                  key={ticket.ticket_id}
                  ticket={ticket}
                  onClick={() => handleTicketClick(ticket)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar - Ticket Wallet */}
        <aside className="fan-tickets-sidebar">
          {/* Ticket Wallet Card */}
          <div className="fan-ticket-wallet">
            <h2 className="fan-wallet-title">Ticket Wallet</h2>
            <div className="fan-wallet-stats">
              <span className="fan-wallet-label">Total Active</span>
              <div className="fan-wallet-count">
                <span className="fan-wallet-number">{totalActiveTickets.toString().padStart(2, '0')}</span>
                <span className="fan-wallet-unit">Tickets</span>
              </div>
            </div>
            <div className="fan-wallet-actions">
              <button
                className="fan-wallet-action"
                onClick={openTransferForTicket}
                disabled={!firstTransferableTicket}
                type="button"
              >
                <span className="material-symbols-outlined">move_up</span>
                <span>Transfer Ticket</span>
                <span className="material-symbols-outlined fan-wallet-arrow">east</span>
              </button>
              <button
                className="fan-wallet-action"
                onClick={openTransferForTicket}
                disabled={!firstTransferableTicket}
                type="button"
              >
                <span className="material-symbols-outlined">redeem</span>
                <span>Send as Gift</span>
                <span className="material-symbols-outlined fan-wallet-arrow">east</span>
              </button>
            </div>
          </div>

          {/* Help Card */}
          <div className="fan-ticket-help">
            <h3 className="fan-help-title">Need Help?</h3>
            <p className="fan-help-text">
              Having trouble with your mobile tickets? Contact our stadium support team for immediate assistance.
            </p>
            <button
              className="fan-help-button"
              type="button"
              onClick={() => navigate(getLink(RouteKeys.PORTAL_HELP))}
            >
              Support Center
            </button>
          </div>
        </aside>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && selectedTicket && (
        <TransferModal
          ticket={selectedTicket}
          onClose={() => { setShowTransferModal(false); setSelectedTicket(null); }}
          onTransfer={handleTransfer}
        />
      )}
    </div>
  )
}

/**
 * Ticket Card Component
 */
interface TicketCardProps {
  ticket: FanTicket
  onClick: () => void
}

function TicketCard({ ticket, onClick }: TicketCardProps) {
  const venueLine1 = ticket.venue_name || ticket.event_location || 'Venue TBA'
  const venueLine2 = ticket.venue_name
    ? [ticket.venue_city, ticket.venue_state].filter(Boolean).join(', ')
    : null

  return (
    <div className="fan-ticket-card-horizontal">
      <div className="fan-ticket-card-top-row">
        <div className="fan-ticket-date-sidebar" onClick={onClick}>
          <span className="fan-ticket-month">{formatMonth(ticket.event_start_time)}</span>
          <span className="fan-ticket-day">{formatDay(ticket.event_start_time)}</span>
          <span className="fan-ticket-weekday">{formatWeekday(ticket.event_start_time)}</span>
        </div>
        
        <div className="fan-ticket-card-content">
          <div className="fan-ticket-card-main">
            {/* Event Info */}
            <div className="fan-ticket-info">
              <p className="fan-ticket-category">{ticket.ticket_type_name}</p>
              <h3 className="fan-ticket-event-name" onClick={onClick}>{ticket.event_name}</h3>
              <div className="fan-ticket-details">
                <div className="fan-ticket-location-block">
                  <span className="material-symbols-outlined">location_on</span>
                  <div className="fan-ticket-location-lines">
                    <span className="fan-ticket-venue-name">{venueLine1}</span>
                    {venueLine2 && (
                      <span className="fan-ticket-venue-city-state">{venueLine2}</span>
                    )}
                  </div>
                </div>
                {ticket.seat_info && (
                  <span className="fan-ticket-detail">
                    <span className="material-symbols-outlined">event_seat</span>
                    {ticket.seat_info}
                  </span>
                )}
              </div>
              <div className="fan-ticket-card-actions-inline">
                <button 
                  className="fan-btn fan-btn-primary"
                  onClick={(e) => { e.stopPropagation(); onClick() }}
                >
                  <span className="material-symbols-outlined">confirmation_number</span>
                  View Ticket
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const formatMonth = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short' })
}

const formatDay = (dateStr: string) => {
  return new Date(dateStr).getDate().toString()
}

const formatWeekday = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' })
}

/**
 * Ticket Detail Page Component
 * Accessed via /fan/tickets/:ticketId
 */
export function FanTicketDetail() {
  const t = useT()
  const { ticketId } = useParams<{ ticketId: string }>()
  const navigate = useNavigate()
  const { isOffline } = useOffline()
  const [eventTickets, setEventTickets] = useState<FanTicket[]>([])
  const [activeTicketIndex, setActiveTicketIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [qrTimestamp, setQrTimestamp] = useState(Date.now())
  const [refreshCountdown, setRefreshCountdown] = useState(30)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [isPreparingWallet, setIsPreparingWallet] = useState(false)
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const activeTicket = eventTickets[activeTicketIndex] ?? null

  useEffect(() => {
    if (activeTicket?.status === 'valid') {
      const qrInterval = setInterval(() => {
        setQrTimestamp(Date.now())
        setRefreshCountdown(30)
      }, QR_REFRESH_INTERVAL)

      const countdownInterval = setInterval(() => {
        setRefreshCountdown(prev => Math.max(0, prev - 1))
      }, 1000)

      return () => {
        clearInterval(qrInterval)
        clearInterval(countdownInterval)
      }
    }
  }, [activeTicket?.status, activeTicket?.ticket_id])

  useEffect(() => {
    loadTicketDetail()
  }, [ticketId])

  useEffect(() => {
    const carousel = carouselRef.current
    if (!carousel) return
    const offset = activeTicketIndex * carousel.clientWidth
    carousel.scrollTo({ left: offset, behavior: 'smooth' })
  }, [activeTicketIndex])

  const loadTicketDetail = async () => {
    setLoading(true)

    try {
      const ordersResponse = await getMyTicketOrders()
      let orders: TicketOrder[] = []

      if (Array.isArray(ordersResponse)) {
        orders = ordersResponse
      } else if (!ordersResponse.error) {
        orders = ordersResponse.data || []
      }

      const ticketsByOrder = await Promise.all(orders.map((order) => getTicketsForOrder(order.id)))
      const flatTickets = ticketsByOrder.flat()
      const mappedTickets: FanTicket[] = flatTickets.map((rawTicket: any) => mapRawTicketToFanTicket(rawTicket, t))
      const foundTicket = mappedTickets.find((candidate) => candidate.ticket_id === ticketId)

      if (!foundTicket) {
        setEventTickets([])
        setActiveTicketIndex(0)
        return
      }

      const siblingTickets = mappedTickets
        .filter((candidate) => candidate.event_id === foundTicket.event_id)
        .sort((a, b) => {
          const seatA = `${a.seat_section || ''}-${a.seat_row || ''}-${a.seat_number || ''}`.toLowerCase()
          const seatB = `${b.seat_section || ''}-${b.seat_row || ''}-${b.seat_number || ''}`.toLowerCase()
          return seatA.localeCompare(seatB)
        })

      const initialIndex = Math.max(0, siblingTickets.findIndex((candidate) => candidate.ticket_id === foundTicket.ticket_id))
      setEventTickets(siblingTickets)
      setActiveTicketIndex(initialIndex)
    } catch (err) {
      showError('Failed to load ticket details')
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async (ticketId: string, recipientEmail: string, recipientName?: string) => {
    const { error } = await transferTicket({
      ticket_id: ticketId,
      holder_email: recipientEmail,
      holder_name: recipientName,
    })

    if (error) {
      showError(error.message)
    } else {
      showSuccess('Ticket transferred successfully')
      setShowTransferModal(false)
      navigate(getLink(RouteKeys.FAN_TICKETS))
    }
  }

  const handleAddToWallet = async () => {
    if (!activeTicket) {
      showError(t('ticketing.wallet.ticketNotFound'))
      return
    }

    const walletType = getPreferredWalletType()
    setIsPreparingWallet(true)
    try {
      const response = await requestTicketWalletPass({
        ticket_id: activeTicket.ticket_id,
        wallet_type: walletType,
        entry_code: activeTicket.order_confirmation_code,
        event_title: activeTicket.event_name,
        event_starts_at: activeTicket.event_start_time,
        venue_name: activeTicket.venue_name ?? activeTicket.event_location ?? null,
        venue_city: activeTicket.venue_city ?? null,
        venue_state: activeTicket.venue_state ?? null,
      })

      if (response.error || !response.data) {
        throw response.error ?? new Error('Unable to generate wallet pass')
      }

      if (typeof window !== 'undefined') {
        if (response.data.action === 'download') {
          const anchor = document.createElement('a')
          anchor.href = response.data.url
          if (response.data.filename) {
            anchor.download = response.data.filename
          }
          anchor.rel = 'noopener noreferrer'
          document.body.appendChild(anchor)
          anchor.click()
          anchor.remove()
        } else {
          const openedWindow = window.open(response.data.url, '_blank', 'noopener,noreferrer')
          if (!openedWindow) {
            throw new Error('Unable to open wallet pass. Please allow pop-ups and try again.')
          }
        }
      }

      if (response.data.is_fallback) {
        showSuccess(
          walletType === 'google'
            ? t('ticketing.wallet.fallbackGoogle')
            : t('ticketing.wallet.fallbackApple'),
        )
      } else {
        showSuccess(t('ticketing.wallet.walletOpened'))
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : t('ticketing.wallet.walletOpenFailed'))
    } finally {
      setIsPreparingWallet(false)
    }
  }

  const handleCarouselScroll = () => {
    const carousel = carouselRef.current
    if (!carousel) return

    const width = carousel.clientWidth || 1
    const nextIndex = Math.round(carousel.scrollLeft / width)
    if (nextIndex !== activeTicketIndex && nextIndex >= 0 && nextIndex < eventTickets.length) {
      setActiveTicketIndex(nextIndex)
    }
  }

  const scrollToTicket = (index: number) => {
    const carousel = carouselRef.current
    const boundedIndex = Math.max(0, Math.min(index, eventTickets.length - 1))
    setActiveTicketIndex(boundedIndex)
    if (!carousel) return
    const offset = boundedIndex * carousel.clientWidth
    carousel.scrollTo({ left: offset, behavior: 'smooth' })
  }

  const formatTicketStatus = (status: TicketStatus): string => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  if (loading) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (!activeTicket) {
    return (
      <div className="fan-empty-state">
        <span className="material-symbols-outlined">error</span>
        <h3>Ticket not found</h3>
        <p>This ticket may have been transferred or deleted</p>
        <button
          className="fan-btn fan-btn-primary"
          onClick={() => navigate(getLink(RouteKeys.FAN_TICKETS))}
        >
          Back to Tickets
        </button>
      </div>
    )
  }

  const qrPayload = generateQRPayload(activeTicket.qr_code_data, qrTimestamp)
  const directionsUrl = activeTicket.event_location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(activeTicket.event_location)}`
    : null

  return (
    <div className="fan-ticket-detail-page">
      <button
        className="fan-ticket-back-btn"
        onClick={() => navigate(getLink(RouteKeys.FAN_TICKETS))}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Tickets
      </button>

      <header className="fan-ticket-detail-header">
        <span className="fan-ticket-detail-eyebrow">Mobile Ticketing</span>
        <h1 className="fan-ticket-detail-title">{activeTicket.event_name}</h1>
        <div className="fan-ticket-detail-meta">
          <span>
            <span className="material-symbols-outlined">event</span>
            {new Date(activeTicket.event_start_time).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
          <span>
            <span className="material-symbols-outlined">schedule</span>
            {new Date(activeTicket.event_start_time).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              timeZoneName: 'short',
            })}
          </span>
        </div>
      </header>

      {eventTickets.length > 1 && (
        <section className="fan-ticket-carousel-shell">
          <div className="fan-ticket-carousel-header">
            <p className="fan-ticket-carousel-title">Event Passes</p>
            <p className="fan-ticket-carousel-subtitle">Swipe to move between tickets for this event</p>
          </div>
          <div
            className="fan-ticket-carousel-viewport"
            ref={carouselRef}
            onScroll={handleCarouselScroll}
          >
            {eventTickets.map((eventTicket, index) => (
              <article key={eventTicket.ticket_id} className="fan-ticket-carousel-slide">
                <div className="fan-ticket-carousel-card">
                  <div className="fan-ticket-carousel-row">
                    <span className="fan-ticket-chip">Ticket {index + 1} of {eventTickets.length}</span>
                    <span className={`fan-ticket-status-pill fan-ticket-status-${eventTicket.status}`}>
                      {formatTicketStatus(eventTicket.status)}
                    </span>
                  </div>
                  <h3>{eventTicket.ticket_type_name}</h3>
                  <p>{eventTicket.seat_info || 'General Admission'}</p>
                  <p className="fan-ticket-carousel-code">
                    Confirmation {eventTicket.order_confirmation_code || 'N/A'}
                  </p>
                </div>
              </article>
            ))}
          </div>
          <div className="fan-ticket-carousel-controls">
            <button
              className="fan-ticket-carousel-nav"
              onClick={() => scrollToTicket(activeTicketIndex - 1)}
              disabled={activeTicketIndex <= 0}
            >
              <span className="material-symbols-outlined">arrow_back</span>
              Prev
            </button>
            <div className="fan-ticket-carousel-dots">
              {eventTickets.map((_, index) => (
                <button
                  key={`ticket-dot-${index}`}
                  className={`fan-ticket-carousel-dot ${index === activeTicketIndex ? 'active' : ''}`}
                  onClick={() => scrollToTicket(index)}
                  aria-label={`View ticket ${index + 1}`}
                />
              ))}
            </div>
            <button
              className="fan-ticket-carousel-nav"
              onClick={() => scrollToTicket(activeTicketIndex + 1)}
              disabled={activeTicketIndex >= eventTickets.length - 1}
            >
              Next
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </section>
      )}

      <div className="fan-ticket-detail-layout">
        <section className="fan-ticket-pass-card">
          <div className="fan-ticket-pass-header">
            <span className="fan-ticket-pass-label">Entry QR</span>
            <span className="fan-ticket-pass-index">{activeTicketIndex + 1}/{eventTickets.length}</span>
          </div>
          <div className="fan-ticket-pass-qr">
            <QRCodeSVG
              value={qrPayload}
              size={240}
              level="H"
              includeMargin={true}
            />
          </div>
          {activeTicket.status === 'valid' && (
            <div className="fan-qr-refresh-indicator">
              <span className="material-symbols-outlined">refresh</span>
              Refreshes in {refreshCountdown}s
            </div>
          )}
          {activeTicket.status !== 'valid' && (
            <div className={`fan-ticket-status-pill fan-ticket-status-${activeTicket.status}`}>
              {formatTicketStatus(activeTicket.status)}
            </div>
          )}
          <p className="fan-ticket-pass-note">Present this pass at the gate for admission.</p>
        </section>

        <section className="fan-ticket-detail-panels">
          <article className="fan-ticket-detail-section">
            <h3>Event Information</h3>
            <div className="fan-ticket-detail-row">
              <span className="material-symbols-outlined">location_on</span>
              <span>{activeTicket.event_location || 'Venue TBA'}</span>
            </div>
            {directionsUrl && (
              <a href={directionsUrl} target="_blank" rel="noreferrer" className="fan-link-btn">
                <span className="material-symbols-outlined">directions</span>
                Get Directions
              </a>
            )}
          </article>

          <article className="fan-ticket-detail-section">
            <h3>Ticket Information</h3>
            <div className="fan-ticket-detail-row">
              <span className="fan-ticket-detail-label">Type</span>
              <span>{activeTicket.ticket_type_name}</span>
            </div>
            {activeTicket.holder_name && (
              <div className="fan-ticket-detail-row">
                <span className="fan-ticket-detail-label">Holder</span>
                <span>{activeTicket.holder_name}</span>
              </div>
            )}
            {activeTicket.seat_info && (
              <div className="fan-ticket-detail-row">
                <span className="fan-ticket-detail-label">Seat</span>
                <span>{activeTicket.seat_info}</span>
              </div>
            )}
            <div className="fan-ticket-detail-row">
              <span className="fan-ticket-detail-label">Confirmation</span>
              <span className="fan-ticket-confirmation-code">{activeTicket.order_confirmation_code}</span>
            </div>
            <div className="fan-ticket-detail-row">
              <span className="fan-ticket-detail-label">Status</span>
              <span className={`fan-ticket-status-pill fan-ticket-status-${activeTicket.status}`}>
                {formatTicketStatus(activeTicket.status)}
              </span>
            </div>
          </article>

          {activeTicket.purchase_date && (
            <article className="fan-ticket-detail-section">
              <h3>Purchase Details</h3>
              <div className="fan-ticket-detail-row">
                <span className="fan-ticket-detail-label">Purchased</span>
                <span>{new Date(activeTicket.purchase_date).toLocaleDateString()}</span>
              </div>
              {activeTicket.amount_paid !== undefined && (
                <div className="fan-ticket-detail-row">
                  <span className="fan-ticket-detail-label">Amount</span>
                  <span>${(activeTicket.amount_paid / 100).toFixed(2)}</span>
                </div>
              )}
              <button className="fan-link-btn">View Receipt</button>
            </article>
          )}

          <article className="fan-ticket-detail-section fan-ticket-detail-actions">
            {isOffline && (
              <div className="fan-ticket-offline-banner">
                <span className="material-symbols-outlined">wifi_off</span>
                <span>{t('ticketing.wallet.offlineFallbackBanner')}</span>
              </div>
            )}
            <button
              className="fan-btn fan-btn-primary"
              onClick={handleAddToWallet}
              disabled={isPreparingWallet}
            >
              <span className="material-symbols-outlined">add_to_photos</span>
              {isPreparingWallet ? t('ticketing.wallet.preparingWallet') : t('ticketing.wallet.addToWallet')}
            </button>
            {activeTicket.status === 'valid' && (
              <button
                className="fan-btn fan-ticket-btn-secondary"
                onClick={() => setShowTransferModal(true)}
              >
                <span className="material-symbols-outlined">send</span>
                Transfer Ticket
              </button>
            )}
          </article>
        </section>
      </div>

      {showTransferModal && (
        <TransferModal
          ticket={activeTicket}
          onClose={() => setShowTransferModal(false)}
          onTransfer={handleTransfer}
        />
      )}
    </div>
  )
}

/**
 * Transfer Modal Component
 */
interface TransferModalProps {
  ticket: FanTicket
  onClose: () => void
  onTransfer: (ticketId: string, email: string, name?: string) => Promise<void>
}

function TransferModal({ ticket, onClose, onTransfer }: TransferModalProps) {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!email) {
      showError('Email is required')
      return
    }

    setLoading(true)
    await onTransfer(ticket.ticket_id, email, name || undefined)
    setLoading(false)
  }

  return (
    <div className="fan-modal-overlay">
      <div className="fan-modal">
        <div className="fan-modal-header">
          <h2>Transfer Ticket</h2>
          <button onClick={onClose} className="fan-modal-close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="fan-modal-body">
          <div className="fan-transfer-ticket-preview">
            <h3>{ticket.event_name}</h3>
            <p>
              {new Date(ticket.event_start_time).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="fan-form-group">
              <label htmlFor="email">Recipient Email *</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter recipient's email"
                className="fan-input"
              />
            </div>

            <div className="fan-form-group">
              <label htmlFor="name">Recipient Name (Optional)</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter recipient's name"
                className="fan-input"
              />
            </div>

            <p className="fan-transfer-warning">
              <span className="material-symbols-outlined">info</span>
              Once transferred, you will no longer have access to this ticket.
            </p>

            <div className="fan-modal-actions">
              <button type="button" onClick={onClose} className="fan-btn fan-ticket-btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="fan-btn fan-btn-primary">
                {loading ? <LoadingSpinner size="small" /> : 'Transfer Ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

