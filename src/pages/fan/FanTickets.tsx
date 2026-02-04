/**
 * Fan Tickets Page
 * 
 * View and manage tickets for events the fan has purchased or been assigned.
 * Features dynamic QR codes that refresh every 30 seconds for security.
 * 
 * URL/ROUTE: /fan/tickets
 * Design: FanConnect Minimalist Light
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../../i18n/useI18n'
import { transferTicket } from '../../data/services/fanService'
import { getMyTicketOrders, getTicketsForOrder } from '../../data/services/ticketingService'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { showError, showSuccess } from '../../utils/toast'
import { QRCodeSVG } from 'qrcode.react'
import { getLink, RouteKeys } from '../../utils/routes'
import '../../styles/fan.css'
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
  holder_name?: string
  scanned_at: string | null
  qr_code_data: string
  purchase_date?: string
  amount_paid?: number
  status: TicketStatus
}

// QR code refresh interval (30 seconds)
const QR_REFRESH_INTERVAL = 30000

// HMAC key for QR code generation (in production, this would come from server)
const generateQRPayload = (ticketId: string, timestamp: number): string => {
  // In production: ticket_id + timestamp + HMAC signature from server
  return JSON.stringify({
    ticket_id: ticketId,
    timestamp,
    version: 1,
  })
}

export default function FanTickets() {
  const navigate = useNavigate()
  const { t } = useI18n()
  
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
          venue_name: event?.venue_name,
          order_confirmation_code: ticket.entry_code || null,
          ticket_type_name: ticketType?.name || 'General Admission',
          scanned_at: ticket.used_at || null,
          qr_code_data: ticket.entry_code || '',
          purchase_date: ticket.created_at,
          amount_paid: ticket.price_paid,
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

  const openTransferModal = (ticket: FanTicket) => {
    setSelectedTicket(ticket)
    setShowTransferModal(true)
  }

  // Navigate to ticket detail
  const handleTicketClick = (ticket: FanTicket) => {
    navigate(`/fan/tickets/${ticket.ticket_id}`)
  }

  if (loading) {
    return (
      <div className="fan-loading-page">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <>
      {/* Page Header */}
      <div className="fan-page-header">
        <h1 className="fan-page-title">My Tickets</h1>
        <p className="fan-page-subtitle">View and manage your event tickets</p>
      </div>

      {/* Tab Navigation */}
      <div className="fan-tabs">
        <button 
          className={`fan-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          Upcoming
          {tickets.filter(t => new Date(t.event_start_time) >= new Date()).length > 0 && (
            <span className="fan-tab-badge">
              {tickets.filter(t => new Date(t.event_start_time) >= new Date()).length}
            </span>
          )}
        </button>
        <button 
          className={`fan-tab ${activeTab === 'past' ? 'active' : ''}`}
          onClick={() => setActiveTab('past')}
        >
          Past
        </button>
      </div>

      {/* Search Bar */}
      <div className="fan-search-bar">
        <span className="material-symbols-outlined">search</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tickets by event or confirmation code..."
          className="fan-search-input"
        />
      </div>

      {/* Tickets List */}
      <div className="fan-tickets-list">
        {filteredTickets.length === 0 ? (
          <div className="fan-empty-state">
            <span className="material-symbols-outlined">
              {searchQuery ? 'search_off' : 'confirmation_number'}
            </span>
            <h3>{searchQuery ? 'No tickets found' : activeTab === 'upcoming' ? 'No upcoming tickets' : 'No past tickets'}</h3>
            <p>
              {searchQuery 
                ? 'Try adjusting your search' 
                : activeTab === 'upcoming' 
                  ? 'When you purchase tickets, they will appear here'
                  : 'Your past event tickets will be shown here'
              }
            </p>
          </div>
        ) : (
          filteredTickets.map((ticket) => (
            <TicketCard
              key={ticket.ticket_id}
              ticket={ticket}
              onClick={() => handleTicketClick(ticket)}
              onTransfer={() => openTransferModal(ticket)}
            />
          ))
        )}
      </div>

      {/* Transfer Modal */}
      {showTransferModal && selectedTicket && (
        <TransferModal
          ticket={selectedTicket}
          onClose={() => { setShowTransferModal(false); setSelectedTicket(null); }}
          onTransfer={handleTransfer}
        />
      )}
    </>
  )
}

/**
 * Ticket Card Component
 */
interface TicketCardProps {
  ticket: FanTicket
  onClick: () => void
  onTransfer: () => void
}

function TicketCard({ ticket, onClick, onTransfer }: TicketCardProps) {
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

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    })
  }

  const getStatusBadge = () => {
    switch (ticket.status) {
      case 'valid':
        return <span className="fan-status-badge fan-status-valid">Valid</span>
      case 'used':
        return <span className="fan-status-badge fan-status-used">Used</span>
      case 'expired':
        return <span className="fan-status-badge fan-status-expired">Expired</span>
      case 'transferred':
        return <span className="fan-status-badge fan-status-transferred">Transferred</span>
      default:
        return <span className="fan-status-badge">Pending</span>
    }
  }

  const qrPayload = generateQRPayload(ticket.ticket_id, qrTimestamp)

  return (
    <div className="fan-ticket-card">
      <div className="fan-ticket-card-content" onClick={onClick}>
        <div className="fan-ticket-card-main">
          {/* Event Info */}
          <div className="fan-ticket-info">
            <h3 className="fan-ticket-event-name">{ticket.event_name}</h3>
            <div className="fan-ticket-details">
              <span className="fan-ticket-detail">
                <span className="material-symbols-outlined">event</span>
                {formatDateTime(ticket.event_start_time)}
              </span>
              {ticket.event_location && (
                <span className="fan-ticket-detail">
                  <span className="material-symbols-outlined">location_on</span>
                  {ticket.event_location}
                </span>
              )}
            </div>
            <div className="fan-ticket-meta">
              <span className="fan-ticket-type">{ticket.ticket_type_name}</span>
              {ticket.seat_info && (
                <span className="fan-ticket-seat">{ticket.seat_info}</span>
              )}
              {getStatusBadge()}
            </div>
          </div>

          {/* QR Preview */}
          <div className="fan-ticket-qr-preview">
            <span className="material-symbols-outlined">qr_code_2</span>
          </div>
        </div>

        {/* Confirmation Code */}
        {ticket.order_confirmation_code && (
          <div className="fan-ticket-confirmation">
            <span className="fan-ticket-confirmation-label">Confirmation</span>
            <span className="fan-ticket-confirmation-code">{ticket.order_confirmation_code}</span>
          </div>
        )}
      </div>

      {/* Expandable QR Section */}
      <div className="fan-ticket-actions">
        <button 
          className="fan-ticket-action-btn"
          onClick={(e) => { e.stopPropagation(); setShowQR(!showQR); }}
        >
          <span className="material-symbols-outlined">qr_code</span>
          {showQR ? 'Hide QR' : 'Show QR'}
        </button>
        
        {ticket.status === 'valid' && (
          <button 
            className="fan-ticket-action-btn"
            onClick={(e) => { e.stopPropagation(); onTransfer(); }}
          >
            <span className="material-symbols-outlined">send</span>
            Transfer
          </button>
        )}
        
        <button className="fan-ticket-action-btn">
          <span className="material-symbols-outlined">add_to_photos</span>
          Add to Wallet
        </button>
      </div>

      {/* QR Code Display */}
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

/**
 * Ticket Detail Page Component
 * Accessed via /fan/tickets/:ticketId
 */
export function FanTicketDetail() {
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
          venue_name: event?.venue_name,
          order_confirmation_code: foundTicket.entry_code || null,
          ticket_type_name: ticketType?.name || 'General Admission',
          scanned_at: foundTicket.used_at || null,
          qr_code_data: foundTicket.entry_code || '',
          purchase_date: foundTicket.created_at,
          amount_paid: foundTicket.price_paid,
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
        <LoadingSpinner size="lg" />
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

  const qrPayload = generateQRPayload(ticket.ticket_id, qrTimestamp)

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
                {loading ? <LoadingSpinner size="sm" /> : 'Transfer Ticket'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
