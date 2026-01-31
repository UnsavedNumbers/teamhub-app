/**
 * Ticketing Service
 * 
 * Data access layer for ticketing system (events, tickets, orders, validation)
 */

import { supabase } from '../../lib/supabase'
import type {
  TicketedEvent,
  TicketType,
  TicketOrder,
  TicketOrderItem,
  Ticket,
  CreateCheckoutRequest,
  CreateCheckoutResponse,
  ValidateScanRequest,
  ValidateScanResponse,
  StaffLinkExchangeRequest,
  StaffLinkExchangeResponse,
} from '../../types/ticketing'
import { normalizeSupabaseResponse, createServiceResponse } from './responseHelpers'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const FUNCTIONS_URL = `${SUPABASE_URL.replace('/rest/v1', '')}/functions/v1`

// ============================================================================
// Ticketed Events
// ============================================================================

export async function getTicketedEvents(filters?: {
  org_id?: string
  status?: 'published' | 'draft' | 'cancelled' | 'completed'
  upcoming_only?: boolean
}) {
  let query = supabase
    .from('ticketed_events')
    .select('*')
    .order('starts_at', { ascending: true })

  if (filters?.org_id) {
    query = query.eq('org_id', filters.org_id)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.upcoming_only) {
    query = query.gte('starts_at', new Date().toISOString())
  }

  const { data, error } = await query

  return normalizeSupabaseResponse<TicketedEvent[]>(data as unknown as TicketedEvent[], error)
}

export async function getTicketedEventById(id: string) {
  const { data, error } = await supabase
    .from('ticketed_events')
    .select('*')
    .eq('id', id)
    .single()

  return normalizeSupabaseResponse<TicketedEvent>(data as unknown as TicketedEvent, error)
}

// ============================================================================
// Ticket Types
// ============================================================================

export async function getTicketTypesForEvent(ticketedEventId: string) {
  const { data, error } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('ticketed_event_id', ticketedEventId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return normalizeSupabaseResponse<TicketType[]>(data as unknown as TicketType[], error)
}

// ============================================================================
// Ticket Orders
// ============================================================================

export async function getTicketOrderById(orderId: string) {
  const { data, error } = await supabase
    .from('ticket_orders')
    .select(`
      *,
      ticket_order_items (
        *,
        ticket_types (
          name,
          description
        )
      ),
      ticketed_events (
        id,
        title,
        starts_at,
        ends_at,
        venue_name,
        venue_city,
        venue_state
      )
    `)
    .eq('id', orderId)
    .single()

  return normalizeSupabaseResponse<TicketOrder & {
    ticket_order_items: Array<TicketOrderItem & {
      ticket_types: Pick<TicketType, 'name' | 'description'>
    }>
    ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
  }>(data as unknown as (TicketOrder & {
    ticket_order_items: Array<TicketOrderItem & {
      ticket_types: Pick<TicketType, 'name' | 'description'>
    }>
    ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
  }), error)
}

export async function getMyTicketOrders() {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return createServiceResponse<TicketOrder[]>(null, new Error('Not authenticated'))
  }

  // Get user email
  const { data: userData } = await supabase
    .from('users')
    .select('email')
    .eq('id', user.id)
    .single()

  const { data, error } = await supabase
    .from('ticket_orders')
    .select('*')
    .or(`purchaser_user_id.eq.${user.id}${userData?.email ? `,purchaser_email.eq.${userData.email}` : ''}`)
    .order('created_at', { ascending: false })

  return normalizeSupabaseResponse<TicketOrder[]>(data as unknown as TicketOrder[], error)
}

// ============================================================================
// Tickets
// ============================================================================

export async function getTicketsForOrder(orderId: string) {
  const { data, error } = await supabase
    .from('tickets')
    .select(`
      *,
      ticket_types (
        name,
        description
      ),
      ticketed_events (
        id,
        title,
        starts_at,
        ends_at,
        venue_name,
        venue_city,
        venue_state
      )
    `)
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  return normalizeSupabaseResponse<Array<Ticket & {
    ticket_types: Pick<TicketType, 'name' | 'description'>
    ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
  }>>(data as unknown as Array<Ticket & {
    ticket_types: Pick<TicketType, 'name' | 'description'>
    ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
  }>, error)
}

export async function getTicketsByAccessToken(token: string) {
  // Hash token and lookup access link
  const tokenHash = await hashToken(token)

  const { data: accessLink } = await supabase
    .from('ticket_access_links')
    .select('order_id, expires_at, used_at')
    .eq('token_hash', tokenHash)
    .single()

  if (!accessLink) {
    return createServiceResponse<Array<Ticket & {
      ticket_types: Pick<TicketType, 'name' | 'description'>
      ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
    }>>(null, new Error('Invalid access token'))
  }

  if (new Date(accessLink.expires_at) < new Date()) {
    return createServiceResponse<Array<Ticket & {
      ticket_types: Pick<TicketType, 'name' | 'description'>
      ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
    }>>(null, new Error('Access token expired'))
  }

  return getTicketsForOrder(accessLink.order_id)
}

async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(token)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ============================================================================
// Checkout
// ============================================================================

export async function createCheckoutSession(
  request: CreateCheckoutRequest,
): Promise<{ data: CreateCheckoutResponse | null; error: Error | null }> {
  try {
    const response = await fetch(`${FUNCTIONS_URL}/tickets-create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return createServiceResponse<CreateCheckoutResponse>(null, new Error(errorData.error || 'Failed to create checkout'))
    }

    const data = await response.json()
    return createServiceResponse<CreateCheckoutResponse>(data, null)
  } catch (error: any) {
    return createServiceResponse<CreateCheckoutResponse>(null, error)
  }
}

// ============================================================================
// Validation
// ============================================================================

export async function validateTicketScan(
  request: ValidateScanRequest,
  staffLinkToken?: string,
): Promise<{ data: ValidateScanResponse | null; error: Error | null }> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (staffLinkToken) {
      headers['X-Staff-Link-Token'] = staffLinkToken
    } else {
      const session = await supabase.auth.getSession()
      if (session.data.session?.access_token) {
        headers['Authorization'] = `Bearer ${session.data.session.access_token}`
      }
    }

    const response = await fetch(`${FUNCTIONS_URL}/tickets-validate-scan`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return createServiceResponse<ValidateScanResponse>(null, new Error(errorData.error || 'Validation failed'))
    }

    const data = await response.json()
    return createServiceResponse<ValidateScanResponse>(data, null)
  } catch (error: any) {
    return createServiceResponse<ValidateScanResponse>(null, error)
  }
}

// ============================================================================
// Staff Link Exchange
// ============================================================================

export async function exchangeStaffLink(
  request: StaffLinkExchangeRequest,
): Promise<{ data: StaffLinkExchangeResponse | null; error: Error | null }> {
  try {
    const response = await fetch(`${FUNCTIONS_URL}/tickets-staff-link-exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return createServiceResponse<StaffLinkExchangeResponse>(null, new Error(errorData.error || 'Invalid staff link'))
    }

    const data = await response.json()
    return createServiceResponse<StaffLinkExchangeResponse>(data, null)
  } catch (error: any) {
    return createServiceResponse<StaffLinkExchangeResponse>(null, error)
  }
}
