/**
 * Staff and Fan Role Types
 * 
 * Types for Staff role (org-scoped with per-org permissions) and
 * Fan capabilities (platform-wide for all authenticated users).
 */

import type { EventVisibility } from '../constants/permissions'
import type { Ticket } from './ticketing'

// ============================================
// STAFF TYPES
// ============================================

/**
 * Staff permissions (per-org configurable)
 */
export interface StaffPermissions {
  can_scan_tickets?: boolean
  can_view_attendees?: boolean
  can_manage_events?: boolean
  can_view_financials?: boolean
  can_manage_roster?: boolean
  can_send_notifications?: boolean
  can_manage_staff?: boolean
}

/**
 * Organization member with staff role
 */
export interface StaffMember {
  id: string
  user_id: string
  org_id: string
  role: 'staff'
  permissions: StaffPermissions
  is_active: boolean
  created_at: string
  updated_at: string
  ended_at: string | null
  ended_reason: string | null
  revoked_by: string | null
  // Relations
  user?: {
    id: string
    email: string | null
    display_name: string | null
    first_name: string
    last_name: string
  }
}

/**
 * Staff member creation/update payload
 */
export interface StaffMemberInput {
  user_id: string
  org_id: string
  permissions?: StaffPermissions
}

/**
 * Staff member update payload
 */
export interface StaffMemberUpdate {
  permissions?: StaffPermissions
  is_active?: boolean
  ended_reason?: string
}

// ============================================
// FAN TYPES
// ============================================

/**
 * Fan follow relationship
 */
export interface FanOrgFollow {
  id: string
  user_id: string
  org_id: string
  source: 'manual' | 'post_purchase' | 'import'
  created_at: string
  // Relations
  org?: {
    id: string
    name: string
    slug: string | null
  }
}

/**
 * Fan event bookmark
 */
export interface FanEventBookmark {
  id: string
  user_id: string
  event_id: string
  created_at: string
  // Relations
  event?: {
    id: string
    title: string
    start_time: string
    end_time: string
    location: string | null
    timezone?: string
  }
}

/**
 * Purchase record (financial owner)
 */
export interface Purchase {
  id: string
  user_id: string
  org_id: string
  event_id: string
  total_amount: number
  currency: string
  payment_method: string | null
  payment_intent_id: string | null
  status: 'pending' | 'completed' | 'cancelled' | 'refunded' | 'partial_refund'
  refund_eligible: boolean
  created_at: string
  // Relations
  event?: {
    id: string
    title: string
    starts_at: string
  }
  tickets?: Ticket[]
}

/**
 * Ticket with transfer support
 */
export interface TransferableTicket {
  id: string
  purchase_id: string
  event_id: string
  org_id: string
  holder_user_id: string | null
  holder_email: string
  holder_name: string | null
  qr_token: string
  status: 'active' | 'used' | 'transferred' | 'refunded'
  scanned_at: string | null
  scanned_by: string | null
  transferred_at: string | null
  created_at: string
  updated_at: string
}

/**
 * Ticket transfer request
 */
export interface TicketTransferRequest {
  ticket_id: string
  holder_email: string
  holder_name?: string
}

/**
 * Ticket reservation (prevent overselling)
 */
export interface TicketReservation {
  id: string
  event_id: string
  user_id: string
  quantity: number
  expires_at: string
  status: 'pending' | 'completed' | 'expired'
  created_at: string
}

/**
 * Calendar event source
 */
export type CalendarEventSource = 'followed' | 'bookmarked' | 'ticketed'

/**
 * Calendar event (aggregated from multiple sources)
 */
export interface CalendarEvent {
  id: string
  title: string
  start_time: string
  end_time: string
  location: string | null
  timezone?: string
  source?: CalendarEventSource[]
  sources?: CalendarEventSource[]
  org_id: string
  org_name: string
  org_slug?: string
  visibility: EventVisibility | string
  event_type?: string
  description?: string | null
  // Relations
  event?: {
    id: string
    type: string
    description: string | null
  }
  ticketed_event?: {
    id: string
    venue_name: string | null
  }
}

/**
 * Fan calendar data (cached)
 */
export interface FanCalendarCache {
  id: string
  user_id: string
  calendar_data: {
    events: CalendarEvent[]
    generated_at: string
    expires_at: string
  }
  generated_at: string
  expires_at: string
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

/**
 * Follow org request
 */
export interface FollowOrgRequest {
  org_id: string
  source?: 'manual' | 'post_purchase' | 'import'
}

/**
 * Bookmark event request
 */
export interface BookmarkEventRequest {
  event_id: string
}

/**
 * Get calendar request
 */
export interface GetCalendarRequest {
  start_date?: string
  end_date?: string
  org_ids?: string[]
  sources?: CalendarEventSource[]
}

/**
 * Get calendar response
 */
export interface GetCalendarResponse {
  events: CalendarEvent[]
  generated_at: string
  from_cache: boolean
}

/**
 * Transfer ticket request
 */
export interface TransferTicketRequest {
  ticket_id: string
  holder_email: string
  holder_name?: string
}

/**
 * Reserve tickets request
 */
export interface ReserveTicketsRequest {
  event_id: string
  quantity: number
}

/**
 * Reserve tickets response
 */
export interface ReserveTicketsResponse {
  reservation_id: string
  expires_at: string
  quantity: number
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * User with org roles and fan capabilities
 */
export interface UserWithRoles {
  id: string
  email: string | null
  display_name: string | null
  is_active: boolean
  preferred_timezone: string
  org_roles: Array<{
    org_id: string
    org_name: string
    roles: Array<{
      role: string
      permissions?: StaffPermissions
      is_active: boolean
    }>
  }>
  fan_capabilities: {
    follows_count: number
    bookmarks_count: number
    tickets_count: number
  }
}
