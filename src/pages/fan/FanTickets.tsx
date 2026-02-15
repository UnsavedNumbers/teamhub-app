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
import { getMyTicketOrders, getTicketsForOrder } from '../../data/services/ticketingService'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { showError, showSuccess } from '../../utils/toast'
import { QRCodeSVG } from 'qrcode.react'
import { getLink, RouteKeys } from '../../utils/routes'
import { useT } from '../../i18n/useI18n'
import '../../styles/fan.css'
import '../../styles/fan-layouts.css'
import type { TicketOrder } from '../../types/ticketing'

type TicketTab = 'upcoming' | 'past'
type TicketStatus = 'valid' | 'used' | 'expired' | 'transferred' | 'pending'

interface FanTicket {
  ticket_id: string
  event_id: string
  event_start_time: string
  event_name: string
  event_location: string | null
  venue_name?: string
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

// QR code refresh interval (30 seconds)
const QR_REFRESH_INTERVAL = 30000

const generateQRPayload = (qrCodeData: string, _timestamp: number): string => qrCodeData

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

      const mappedTickets: FanTicket[] = flatTickets.map((ticket: any) => {
        const event = ticket.ticketed_events
        const ticketType = ticket.ticket_types
        const eventLocation = [event?.venue_name, event?.venue_city, event?.venue_state]
          .filter(Boolean)
          .join(', ')

        const now = new Date()
        const eventDate = new Date(event?.starts_at || '')
        const isUsed = !!ticket.used_at
        const isPast = eventDate < now
        
        let status: TicketStatus = 'valid'
        if (isUsed) status = 'used'
        else if (isPast) status = 'expired'

        return {
          ticket_id: ticket.id,
          event_id: event?.id || '',
          event_start_time: event?.starts_at || '',
          event_name: event?.title || 'Event',
          event_location: eventLocation || null,
          venue_name: event?.venue_name || undefined,
          order_confirmation_code: ticket.entry_code || null,
          ticket_type_name: ticketType?.name || 'General Admission',
          seat_info: ticket.seat_info
            ? t('ticketing.reservedSeating.seatDisplay', {
              section: ticket.seat_info.section,
              row: ticket.seat_info.row,
              seat: ticket.seat_info.seat,
            })
            : undefined,
          seat_section: ticket.seat_info?.section,
          seat_row: ticket.seat_info?.row,
          seat_number: ticket.seat_info?.seat,
          seat_attributes: ticket.seat_info?.attributes,
          scanned_at: ticket.used_at || null,
          qr_code_data: ticket.entry_code || '',
          purchase_date: ticket.created_at,
          status,
        }
      })

      setTickets(mappedTickets)
    } catch (err) {
      showError('Failed to load tickets')
    }
    
    setLoading(false)
  }

  // Filter tickets by tab and search
  const filteredTickets = tickets.filter(ticket => {
    const eventDate = new Date(ticket.event_start_time)
    const now = new Date()
    
    // Tab filter
    const matchesTab = 
      (activeTab === 'upcoming' && eventDate >= now) ||
      (activeTab === 'past' && eventDate < now)
    
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
    navigate(`/fan/tickets/${ticket.ticket_id}`)
  }

  // Count tickets for wallet display
  const totalActiveTickets = tickets.filter(t => 
    new Date(t.event_start_time) >= new Date() && t.status === 'valid'
  ).length

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
          <button className="fan-tickets-tab">
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
                {activeTab === 'upcoming' ? 'No upcoming tickets' : 'No past tickets'}
              </h3>
              <p className="fan-tickets-empty-text">
                {activeTab === 'upcoming' 
                  ? 'When you purchase tickets, they will appear here'
                  : 'Your past event tickets will be shown here'
                }
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
              <button className="fan-wallet-action">
                <span className="material-symbols-outlined">move_up</span>
                <span>Transfer Ticket</span>
                <span className="material-symbols-outlined fan-wallet-arrow">east</span>
              </button>
              <button className="fan-wallet-action">
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
            <button className="fan-help-button">Support Center</button>
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
  const [showQR, setShowQR] = useState(false)
  const [qrTimestamp, setQrTimestamp] = useState(Date.now())
  const [refreshCountdown, setRefreshCountdown] = useState(30)
  const qrIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // Dynamic QR code refresh
  useEffect(() => {
    if (showQR && ticket.status === 'valid') {
      // Start QR refresh interval
      qrIntervalRef.current = setInterval(() => {
        setQrTimestamp(Date.now())
        setRefreshCountdown(30)
      }, QR_REFRESH_INTERVAL)

      // Countdown timer
      countdownRef.current = setInterval(() => {
        setRefreshCountdown(prev => Math.max(0, prev - 1))
      }, 1000)

      return () => {
        if (qrIntervalRef.current) clearInterval(qrIntervalRef.current)
        if (countdownRef.current) clearInterval(countdownRef.current)
      }
    }
  }, [showQR, ticket.status])

  const qrPayload = generateQRPayload(ticket.qr_code_data, qrTimestamp)

  return (
    <div className="fan-ticket-card-horizontal">
      <div className="fan-ticket-date-sidebar" onClick={onClick}>
        <span className="fan-ticket-month">{formatMonth(ticket.event_start_time)}</span>
        <span className="fan-ticket-day">{formatDay(ticket.event_start_time)}</span>
        <span className="fan-ticket-weekday">{formatWeekday(ticket.event_start_time)}</span>
      </div>
      
      <div className="fan-ticket-card-content" onClick={onClick}>
        <div className="fan-ticket-card-main">
          {/* Event Info */}
          <div className="fan-ticket-info">
            <p className="fan-ticket-category">{ticket.ticket_type_name}</p>
            <h3 className="fan-ticket-event-name">{ticket.event_name}</h3>
            <div className="fan-ticket-details">
              {ticket.event_location && (
                <span className="fan-ticket-detail">
                  <span className="material-symbols-outlined">location_on</span>
                  {ticket.event_location}
                </span>
              )}
              {ticket.seat_info && (
                <span className="fan-ticket-detail">
                  <span className="material-symbols-outlined">event_seat</span>
                  {ticket.seat_info}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="fan-ticket-card-actions">
        <button 
          className="fan-btn fan-btn-primary"
          onClick={(e) => { e.stopPropagation(); setShowQR(!showQR); }}
        >
          <span className="material-symbols-outlined">qr_code_2</span>
          View QR Code
        </button>
      </div>

      {/* Expandable QR Section */}
      {showQR && (
        <div className="fan-ticket-qr-expanded">
          <div className="fan-qr-container">
            <QRCodeSVG
              value={qrPayload}
              size={200}
              level="H"
              includeMargin={true}
            />
            {ticket.status === 'valid' && (
              <div className="fan-qr-refresh-indicator">
                <span className="material-symbols-outlined">refresh</span>
                Refreshes in {refreshCountdown}s
              </div>
            )}
          </div>
          <p className="fan-qr-instructions">
            Show this QR code at the venue for entry
          </p>
        </div>
      )}
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
  const [ticket, setTicket] = useState<FanTicket | null>(null)
  const [loading, setLoading] = useState(true)
  const [qrTimestamp, setQrTimestamp] = useState(Date.now())
  const [refreshCountdown, setRefreshCountdown] = useState(30)
  const [showTransferModal, setShowTransferModal] = useState(false)

  // QR code auto-refresh
  useEffect(() => {
    if (ticket?.status === 'valid') {
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
  }, [ticket?.status])

  useEffect(() => {
    loadTicketDetail()
  }, [ticketId])

  const loadTicketDetail = async () => {
    setLoading(true)
    // In a real implementation, fetch the specific ticket
    // For now, we'll load all tickets and find the one we need
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
      
      const foundTicket = flatTickets.find((t: any) => t.id === ticketId)
      
      if (foundTicket) {
        const event = foundTicket.ticketed_events
        const ticketType = foundTicket.ticket_types
        const eventLocation = [event?.venue_name, event?.venue_city, event?.venue_state]
          .filter(Boolean)
          .join(', ')

        const now = new Date()
        const eventDate = new Date(event?.starts_at || '')
        const isUsed = !!foundTicket.used_at
        const isPast = eventDate < now
        
        let status: TicketStatus = 'valid'
        if (isUsed) status = 'used'
        else if (isPast) status = 'expired'

        setTicket({
          ticket_id: foundTicket.id,
          event_id: event?.id || '',
          event_start_time: event?.starts_at || '',
          event_name: event?.title || 'Event',
          event_location: eventLocation || null,
          venue_name: event?.venue_name || undefined,
          order_confirmation_code: foundTicket.entry_code || null,
          ticket_type_name: ticketType?.name || 'General Admission',
          seat_info: foundTicket.seat_info
            ? t('ticketing.reservedSeating.seatDisplay', {
              section: foundTicket.seat_info.section,
              row: foundTicket.seat_info.row,
              seat: foundTicket.seat_info.seat,
            })
            : undefined,
          seat_section: foundTicket.seat_info?.section,
          seat_row: foundTicket.seat_info?.row,
          seat_number: foundTicket.seat_info?.seat,
          seat_attributes: foundTicket.seat_info?.attributes,
          scanned_at: foundTicket.used_at || null,
          qr_code_data: foundTicket.entry_code || '',
          purchase_date: foundTicket.created_at,
          status,
        })
      }
    } catch (err) {
      showError('Failed to load ticket details')
    }
    setLoading(false)
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

  if (loading) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="large" />
      </div>
    )
  }

  if (!ticket) {
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

  const qrPayload = generateQRPayload(ticket.qr_code_data, qrTimestamp)

  return (
    <>
      {/* Back Button */}
      <button 
        className="fan-back-btn"
        onClick={() => navigate(getLink(RouteKeys.FAN_TICKETS))}
      >
        <span className="material-symbols-outlined">arrow_back</span>
        Back to Tickets
      </button>

      {/* Large QR Code */}
      <div className="fan-ticket-detail-qr">
        <div className="fan-qr-large">
          <QRCodeSVG
            value={qrPayload}
            size={280}
            level="H"
            includeMargin={true}
          />
        </div>
        {ticket.status === 'valid' && (
          <div className="fan-qr-refresh-indicator">
            <span className="material-symbols-outlined">refresh</span>
            Refreshes in {refreshCountdown}s
          </div>
        )}
      </div>

      {/* Event Details */}
      <div className="fan-ticket-detail-info">
        <h1 className="fan-ticket-detail-title">{ticket.event_name}</h1>
        
        <div className="fan-ticket-detail-section">
          <h3>Event Information</h3>
          <div className="fan-ticket-detail-row">
            <span className="material-symbols-outlined">event</span>
            <span>
              {new Date(ticket.event_start_time).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
          <div className="fan-ticket-detail-row">
            <span className="material-symbols-outlined">schedule</span>
            <span>
              {new Date(ticket.event_start_time).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                timeZoneName: 'short',
              })}
            </span>
          </div>
          {ticket.event_location && (
            <div className="fan-ticket-detail-row">
              <span className="material-symbols-outlined">location_on</span>
              <span>{ticket.event_location}</span>
            </div>
          )}
          <button className="fan-link-btn">
            <span className="material-symbols-outlined">directions</span>
            Get Directions
          </button>
        </div>

        <div className="fan-ticket-detail-section">
          <h3>Ticket Information</h3>
          <div className="fan-ticket-detail-row">
            <span className="fan-ticket-detail-label">Type</span>
            <span>{ticket.ticket_type_name}</span>
          </div>
          {ticket.holder_name && (
            <div className="fan-ticket-detail-row">
              <span className="fan-ticket-detail-label">Holder</span>
              <span>{ticket.holder_name}</span>
            </div>
          )}
          <div className="fan-ticket-detail-row">
            <span className="fan-ticket-detail-label">Confirmation</span>
            <span className="fan-ticket-confirmation-code">{ticket.order_confirmation_code}</span>
          </div>
          <div className="fan-ticket-detail-row">
            <span className="fan-ticket-detail-label">Status</span>
            <span className={`fan-status-badge fan-status-${ticket.status}`}>
              {ticket.status.charAt(0).toUpperCase() + ticket.status.slice(1)}
            </span>
          </div>
        </div>

        {ticket.purchase_date && (
          <div className="fan-ticket-detail-section">
            <h3>Purchase Details</h3>
            <div className="fan-ticket-detail-row">
              <span className="fan-ticket-detail-label">Purchased</span>
              <span>{new Date(ticket.purchase_date).toLocaleDateString()}</span>
            </div>
            {ticket.amount_paid !== undefined && (
              <div className="fan-ticket-detail-row">
                <span className="fan-ticket-detail-label">Amount</span>
                <span>${(ticket.amount_paid / 100).toFixed(2)}</span>
              </div>
            )}
            <button className="fan-link-btn">View Receipt</button>
          </div>
        )}

        {/* Actions */}
        <div className="fan-ticket-detail-actions">
          <button className="fan-btn fan-btn-primary">
            <span className="material-symbols-outlined">add_to_photos</span>
            Add to Wallet
          </button>
          
          {ticket.status === 'valid' && (
            <button 
              className="fan-btn fan-btn-secondary"
              onClick={() => setShowTransferModal(true)}
            >
              <span className="material-symbols-outlined">send</span>
              Transfer Ticket
            </button>
          )}
        </div>
      </div>

      {/* Transfer Modal */}
      {showTransferModal && (
        <TransferModal
          ticket={ticket}
          onClose={() => setShowTransferModal(false)}
          onTransfer={handleTransfer}
        />
      )}
    </>
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
              <button type="button" onClick={onClose} className="fan-btn fan-btn-secondary">
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
