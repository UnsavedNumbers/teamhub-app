/**
 * Ticketing System Types
 * 
 * TypeScript types for the ticketing system (events, tickets, orders, validation)
 */

export type TicketedEventType = 'game' | 'tournament' | 'concert' | 'fundraiser' | 'other'
export type TicketedEventStatus = 'draft' | 'published' | 'cancelled' | 'completed'
export type TicketOrderStatus = 'pending_payment' | 'paid' | 'refunded' | 'cancelled'
export type TicketStatus = 'active' | 'used' | 'refunded' | 'voided'
export type TicketScanResult = 'valid' | 'already_used' | 'invalid' | 'wrong_event' | 'refunded' | 'voided' | 'not_found'
export type ScanMethod = 'qr' | 'manual'

export interface TicketedEvent {
  id: string
  org_id: string
  team_id: string | null
  event_id: string | null // Optional link to existing calendar event
  event_type: TicketedEventType
  title: string
  description: string | null
  starts_at: string
  ends_at: string
  timezone: string
  
  // Venue
  venue_name: string | null
  venue_address_line1: string | null
  venue_address_line2: string | null
  venue_city: string | null
  venue_state: string | null
  venue_postal_code: string | null
  venue_country: string | null
  venue_is_virtual: boolean
  venue_virtual_link: string | null
  
  // Sales window
  sales_start_at: string | null
  sales_end_at: string | null
  
  // Media
  cover_image_path: string | null
  
  // Status
  status: TicketedEventStatus
  
  created_at: string
  updated_at: string
}

export interface TicketType {
  id: string
  org_id: string
  ticketed_event_id: string
  name: string
  description: string | null
  price_cents: number
  currency: string
  capacity_total: number | null
  capacity_remaining: number | null
  sales_start_at: string | null
  sales_end_at: string | null
  sort_order: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TicketOrder {
  id: string
  org_id: string
  ticketed_event_id: string
  purchaser_user_id: string | null
  purchaser_email: string
  purchaser_name: string | null
  status: TicketOrderStatus
  subtotal_cents: number
  tax_cents: number
  fees_cents: number
  total_cents: number
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  receipt_email_sent_at: string | null
  // Stripe Connect fields (nullable for backward compatibility)
  stripe_connect_account_id: string | null
  platform_fee_cents: number | null
  org_revenue_cents: number | null
  stripe_charge_id: string | null
  stripe_application_fee_id: string | null
  processed_at: string | null
  created_at: string
  updated_at: string
}

export interface TicketOrderItem {
  id: string
  order_id: string
  ticket_type_id: string
  quantity: number
  unit_price_cents: number
  line_total_cents: number
  created_at: string
}

export interface Ticket {
  id: string
  org_id: string
  ticketed_event_id: string
  order_id: string
  ticket_type_id: string
  status: TicketStatus
  qr_token_hash: string
  entry_code: string // Normalized (uppercase, no dashes)
  used_at: string | null
  used_by_user_id: string | null
  created_at: string
  updated_at: string
}

export interface TicketScan {
  id: string
  org_id: string
  ticketed_event_id: string
  ticket_id: string | null
  scanner_user_id: string | null
  scan_result: TicketScanResult
  scanned_at: string
  client_device_id: string | null
  raw_payload_hash: string
  scan_method: ScanMethod | null
  created_at: string
}

export interface TicketAccessLink {
  id: string
  order_id: string
  email: string
  token_hash: string
  expires_at: string
  used_at: string | null
  created_at: string
}

export interface TicketStaffLink {
  id: string
  org_id: string
  ticketed_event_id: string
  token_hash: string
  expires_at: string
  created_by_user_id: string
  max_uses: number | null
  use_count: number
  created_at: string
}

// API Request/Response types
export interface CreateCheckoutRequest {
  ticketed_event_id: string
  items: Array<{
    ticket_type_id: string
    quantity: number
  }>
  purchaser_email: string
  org_slug?: string // Optional org slug for URL construction in checkout
}

export interface CreateCheckoutResponse {
  checkout_url: string
  order_id: string
}

export interface ValidateScanRequest {
  ticketed_event_id: string
  qr_token_raw?: string
  entry_code?: string
  client_device_id?: string
}

export interface ValidateScanResponse {
  result: TicketScanResult
  reason?: 'not_found' | 'wrong_event' | 'refunded' | 'voided' | 'invalid_status'
  message?: string
  ticket_type_name?: string | null
  event_confirmation?: string
  used_at?: string | null
  original_scanned_at?: string | null
  original_device_id?: string | null
  validated_count?: number
  remaining_capacity?: number | null
}

export interface StaffLinkExchangeRequest {
  token: string
}

export interface StaffLinkExchangeResponse {
  org_id: string
  ticketed_event_id: string
  event_title: string
  event_starts_at: string
  expires_at: string
  max_uses: number | null
  use_count: number
}

// Display helpers
export function formatEntryCode(code: string): string {
  const normalized = code.toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (normalized.length >= 12) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8)}`
  } else if (normalized.length >= 8) {
    return `${normalized.slice(0, 4)}-${normalized.slice(4)}`
  }
  return normalized
}

export function formatCurrency(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}
