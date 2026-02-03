/**
 * Ticketing Service
 * 
 * Data access layer for ticketing system (events, tickets, orders, validation)
 */

import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { USE_FAKE_DATA } from '../config'
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
import { assertNotDemoMode } from '@/utils/demoMode'
import { classifySupabaseError, ValidationError } from '@/utils/supabaseErrorHandler'
import {
  createFakeCheckoutSession,
  getFakeMyTicketOrders,
  getFakeTicketedEvent,
  getFakeTicketedEvents,
  getFakeTicketOrderById,
  getFakeTicketTypes,
  getFakeTicketsForOrder,
} from '../fake/ticketingFakeService'

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
  if (USE_FAKE_DATA) {
    return getFakeTicketedEvents(filters)
  }

  try {
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
    if (error) throw error

    return normalizeSupabaseResponse<TicketedEvent[]>(data as unknown as TicketedEvent[], true)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticketed events')
  }
}

/**
 * Get ticketed event by ID (public - requires org_id for isolation)
 * This function MUST be used for public routes to ensure org isolation
 */
export async function getTicketedEventById(id: string, orgId: string) {
  if (!orgId) {
    throw new ValidationError('Organization ID is required for public event queries')
  }

  if (USE_FAKE_DATA) {
    const event = getFakeTicketedEvent(id, orgId)
    if (!event) throw new Error('Ticketed event not found')
    return event
  }

  try {
    const { data, error } = await supabase
      .from('ticketed_events')
      .select('*')
      .eq('id', id)
      .eq('org_id', orgId) // CRITICAL: Always filter by org_id for public routes
      .single()

    if (error) throw error

    return normalizeSupabaseResponse<TicketedEvent>(data as unknown as TicketedEvent, false)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticketed event')
  }
}

/**
 * Get ticketed event by ID (public - no org scope)
 * Only returns published events
 */
export async function getPublicTicketedEventById(id: string) {
  if (USE_FAKE_DATA) {
    const event = getFakeTicketedEvent(id, null)
    if (!event || event.status !== 'published') {
      throw new Error('Ticketed event not found')
    }
    return event
  }

  try {
    const { data, error } = await supabase
      .from('ticketed_events')
      .select('*')
      .eq('id', id)
      .eq('status', 'published')
      .single()

    if (error) throw error

    return normalizeSupabaseResponse<TicketedEvent>(data as unknown as TicketedEvent, false)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticketed event')
  }
}

/**
 * Get ticketed event by ID (admin/internal use - no org filter)
 * Only use this when org context is already enforced by RLS or admin context
 */
export async function getTicketedEventByIdAdmin(id: string) {
  if (USE_FAKE_DATA) {
    const event = getFakeTicketedEvent(id, null)
    if (!event) throw new Error('Ticketed event not found')
    return event
  }

  const { data } = await supabase
    .from('ticketed_events')
    .select('*')
    .eq('id', id)
    .single()

  return normalizeSupabaseResponse<TicketedEvent>(data as unknown as TicketedEvent, false)
}

// ============================================================================
// Ticket Types
// ============================================================================

/**
 * Get ticket types for an event (public - requires org_id for isolation)
 */
export async function getTicketTypesForEvent(ticketedEventId: string, orgId: string) {
  if (!orgId) {
    throw new ValidationError('Organization ID is required for public ticket type queries')
  }

  if (USE_FAKE_DATA) {
    return getFakeTicketTypes(ticketedEventId, orgId)
  }

  try {
    // First verify the event belongs to the org
    const { data: event, error: eventError } = await supabase
      .from('ticketed_events')
      .select('id, org_id')
      .eq('id', ticketedEventId)
      .eq('org_id', orgId)
      .single()

    if (eventError) throw eventError

    if (!event) {
      return normalizeSupabaseResponse<TicketType[]>([], true)
    }

    const { data, error } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('ticketed_event_id', ticketedEventId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return normalizeSupabaseResponse<TicketType[]>(data as unknown as TicketType[], true)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticket types')
  }
}

/**
 * Get ticket types for an event (public - no org scope)
 * Only returns types for published events
 */
export async function getPublicTicketTypesForEvent(ticketedEventId: string) {
  if (USE_FAKE_DATA) {
    return getFakeTicketTypes(ticketedEventId, null)
  }

  try {
    const { data: event, error: eventError } = await supabase
      .from('ticketed_events')
      .select('id, status')
      .eq('id', ticketedEventId)
      .eq('status', 'published')
      .single()

    if (eventError) throw eventError
    if (!event) {
      return normalizeSupabaseResponse<TicketType[]>([], true)
    }

    const { data, error } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('ticketed_event_id', ticketedEventId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error

    return normalizeSupabaseResponse<TicketType[]>(data as unknown as TicketType[], true)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticket types')
  }
}

/**
 * Get ticket types for an event (admin/internal use)
 */
export async function getTicketTypesForEventAdmin(ticketedEventId: string) {
  if (USE_FAKE_DATA) {
    return getFakeTicketTypes(ticketedEventId, null)
  }

  const { data } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('ticketed_event_id', ticketedEventId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return normalizeSupabaseResponse<TicketType[]>(data as unknown as TicketType[], true)
}

export async function createTicketType(
  insert: Database['public']['Tables']['ticket_types']['Insert'],
) {
  try {
    assertNotDemoMode('create ticket types')

    const { data, error } = await supabase
      .from('ticket_types')
      .insert(insert)
      .select('*')
      .single()

    if (error) {
      return createServiceResponse<TicketType>(null, error)
    }

    return createServiceResponse<TicketType>(data as unknown as TicketType, null)
  } catch (error: unknown) {
    return createServiceResponse<TicketType>(null, error as Error)
  }
}

// ============================================================================
// Ticket Orders
// ============================================================================

/**
 * Get ticket order by ID (public - requires org_id for isolation)
 */
export async function getTicketOrderById(orderId: string, orgId: string) {
  if (!orgId) {
    throw new ValidationError('Organization ID is required for public order queries')
  }

  if (USE_FAKE_DATA) {
    const order = getFakeTicketOrderById(orderId, orgId)
    if (!order) throw new Error('Order not found')
    return order
  }

  try {
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
      .eq('org_id', orgId) // CRITICAL: Always filter by org_id for public routes
      .single()

    if (error) throw error

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
    }), false)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticket order')
  }
}

/**
 * Get ticket order by ID (public - no org scope)
 */
export async function getPublicTicketOrderById(orderId: string) {
  if (USE_FAKE_DATA) {
    const order = getFakeTicketOrderById(orderId, null)
    if (!order) throw new Error('Order not found')
    return order
  }

  try {
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

    if (error) throw error

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
    }), false)
  } catch (error) {
    throw classifySupabaseError(error, 'Ticket order')
  }
}

/**
 * Get ticket order by ID (admin/internal use)
 */
export async function getTicketOrderByIdAdmin(orderId: string) {
  if (USE_FAKE_DATA) {
    const order = getFakeTicketOrderById(orderId, null)
    if (!order) throw new Error('Order not found')
    return order
  }

  const { data } = await supabase
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
  }), false)
}

// Note: getTicketOrderByIdAdmin uses SELECT * which includes all columns including Connect fields
// (stripe_connect_account_id, platform_fee_cents, org_revenue_cents, stripe_charge_id, stripe_application_fee_id, processed_at)

export async function getMyTicketOrders() {
  if (USE_FAKE_DATA) {
    return createServiceResponse<TicketOrder[]>(getFakeMyTicketOrders(), null)
  }

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

  const { data } = await supabase
    .from('ticket_orders')
    .select('*')
    .or(`purchaser_user_id.eq.${user.id}${userData?.email ? `,purchaser_email.eq.${userData.email}` : ''}`)
    .order('created_at', { ascending: false })

  return normalizeSupabaseResponse<TicketOrder[]>(data as unknown as TicketOrder[], true)
}

// ============================================================================
// Tickets
// ============================================================================

export async function getTicketsForOrder(orderId: string) {
  if (USE_FAKE_DATA) {
    return getFakeTicketsForOrder(orderId)
  }

  try {
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

    if (error) throw error

    return normalizeSupabaseResponse<Array<Ticket & {
      ticket_types: Pick<TicketType, 'name' | 'description'>
      ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
    }>>(data as unknown as Array<Ticket & {
      ticket_types: Pick<TicketType, 'name' | 'description'>
      ticketed_events: Pick<TicketedEvent, 'id' | 'title' | 'starts_at' | 'ends_at' | 'venue_name' | 'venue_city' | 'venue_state'>
    }>, true)
  } catch (error) {
    throw classifySupabaseError(error, 'Tickets')
  }
}

/**
 * Get tickets by access token (public - requires org_id for isolation)
 * Magic links are org-scoped, so we verify the order belongs to the org
 */
export async function getTicketsByAccessToken(token: string, orgId: string) {
  if (!orgId) {
    throw new ValidationError('Organization ID is required for public ticket access queries')
  }

  if (USE_FAKE_DATA) {
    const tickets = getFakeTicketsForOrder(token)
    if (tickets.length === 0 || tickets[0].org_id !== orgId) {
      throw new Error('Invalid access token')
    }
    return tickets
  }

  // Hash token and lookup access link
  const tokenHash = await hashToken(token)

  const { data: accessLink } = await supabase
    .from('ticket_access_links')
    .select(`
      order_id, 
      expires_at, 
      used_at,
      ticket_orders!inner(org_id)
    `)
    .eq('token_hash', tokenHash)
    .eq('ticket_orders.org_id', orgId) // CRITICAL: Verify order belongs to org
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
// Ticket Access Link Decryption
// ============================================================================

export interface DecryptAccessLinkResponse {
  id: string
  entry_code: string
  qr_token: string
  status: string
  ticket_type_name: string
  event_id: string
  event_name: string
  event_date: string
  event_location: string
  purchaser_name: string
  purchaser_email: string
}

export async function decryptTicketAccessLink(
  encryptedPayload: string,
): Promise<{ data: DecryptAccessLinkResponse | null; error: Error | null }> {
  try {
    const response = await fetch(`${FUNCTIONS_URL}/tickets-decrypt-access`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ payload: encryptedPayload }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return createServiceResponse<DecryptAccessLinkResponse>(
        null,
        new Error(errorData.error || 'Failed to decrypt access link')
      )
    }

    const data = await response.json()
    return createServiceResponse<DecryptAccessLinkResponse>(data, null)
  } catch (error: any) {
    return createServiceResponse<DecryptAccessLinkResponse>(null, error)
  }
}

// ============================================================================
// Checkout
// ============================================================================

export async function createCheckoutSession(
  request: CreateCheckoutRequest,
): Promise<{ data: CreateCheckoutResponse | null; error: Error | null }> {
  try {
    if (!request.ticketed_event_id) {
      return createServiceResponse<CreateCheckoutResponse>(null, new ValidationError('Event is required'))
    }
    if (!request.items?.length) {
      return createServiceResponse<CreateCheckoutResponse>(null, new ValidationError('Select at least one ticket'))
    }
    const email = request.purchaser_email?.trim() || ''
    if (!email) {
      return createServiceResponse<CreateCheckoutResponse>(null, new ValidationError('Email is required'))
    }
    if (request.items.some(item => !item.ticket_type_id || item.quantity <= 0)) {
      return createServiceResponse<CreateCheckoutResponse>(null, new ValidationError('Ticket quantities must be greater than zero'))
    }

    if (USE_FAKE_DATA) {
      return createFakeCheckoutSession(request)
    }

    // Always include return_base_url when window is available (T3)
    const requestWithBaseUrl: CreateCheckoutRequest = {
      ...request,
      return_base_url: typeof window !== 'undefined' ? window.location.origin : request.return_base_url,
    }
    const session = await supabase.auth.getSession()
    const accessToken = session.data.session?.access_token
    const response = await fetch(`${FUNCTIONS_URL}/tickets-create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(requestWithBaseUrl),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      // #region agent log
      fetch('http://127.0.0.1:7249/ingest/60db3259-e52f-44db-9b11-aee7014e1393', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location: 'ticketingService.ts:createCheckoutSession',
          message: 'Checkout failed',
          data: { status: response.status, errorData, requestPayload: request },
          timestamp: Date.now(),
          sessionId: 'debug-session',
          hypothesisId: 'A',
        }),
      }).catch(() => {})
      // #endregion
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

// ============================================================================
// Resend Tickets
// ============================================================================

export interface ResendTicketsRequest {
  order_id: string
  email: string
}

export interface ResendTicketsResponse {
  success: boolean
  message: string
  tickets_resent: number
}

export async function resendTickets(
  request: ResendTicketsRequest,
): Promise<{ data: ResendTicketsResponse | null; error: Error | null }> {
  try {
    const response = await fetch(`${FUNCTIONS_URL}/resend-tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return createServiceResponse<ResendTicketsResponse>(
        null,
        new Error(errorData.error || 'Failed to resend tickets')
      )
    }

    const data = await response.json()
    return createServiceResponse<ResendTicketsResponse>(data, null)
  } catch (error: any) {
    return createServiceResponse<ResendTicketsResponse>(null, error)
  }
}

// ============================================================================
// Staff Link Exchange
// ============================================================================

// ============================================================================
// Comp Ticket Generation
// ============================================================================

export interface GenerateCompTicketsRequest {
  event_id: string
  ticket_type_id: string
  quantity: number
  recipient_email: string
  recipient_name?: string
  notes?: string
}

export interface GenerateCompTicketsResponse {
  success: boolean
  order_id: string
  tickets_created: number
  message: string
}

export async function generateCompTickets(
  request: GenerateCompTicketsRequest,
): Promise<{ data: GenerateCompTicketsResponse | null; error: Error | null }> {
  try {
    const session = await supabase.auth.getSession()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (session.data.session?.access_token) {
      headers['Authorization'] = `Bearer ${session.data.session.access_token}`
    }

    const response = await fetch(`${FUNCTIONS_URL}/generate-comp-tickets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return createServiceResponse<GenerateCompTicketsResponse>(
        null,
        new Error(errorData.error || 'Failed to generate comp tickets')
      )
    }

    const data = await response.json()
    return createServiceResponse<GenerateCompTicketsResponse>(data, null)
  } catch (error: any) {
    return createServiceResponse<GenerateCompTicketsResponse>(null, error)
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

// ============================================================================
// Refunds
// ============================================================================

export async function processTicketOrderRefund(
  orderId: string,
  amountCents?: number,
): Promise<{ data: { refund_id: string; amount: number; status: string; message: string } | null; error: Error | null }> {
  try {
    const session = await supabase.auth.getSession()
    const response = await fetch(`${FUNCTIONS_URL}/tickets-process-refund`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session?.access_token || ''}`,
      },
      body: JSON.stringify({
        order_id: orderId,
        ...(amountCents !== undefined ? { amount_cents: amountCents } : {}),
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return createServiceResponse<{ refund_id: string; amount: number; status: string; message: string }>(
        null,
        new Error(errorData.error || 'Failed to process refund')
      )
    }

    const data = await response.json()
    return createServiceResponse<{ refund_id: string; amount: number; status: string; message: string }>(data, null)
  } catch (error: any) {
    return createServiceResponse<{ refund_id: string; amount: number; status: string; message: string }>(null, error)
  }
}

/**
 * Manually complete a stuck ticket order
 * Used when webhook fails and order is stuck in pending_payment
 */
export async function manuallyCompleteTicketOrder(
  orderId: string,
): Promise<{ data: { success: boolean; message: string; tickets_created: number } | null; error: Error | null }> {
  try {
    const session = await supabase.auth.getSession()
    const response = await fetch(`${FUNCTIONS_URL}/tickets-manual-complete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.data.session?.access_token || ''}`,
      },
      body: JSON.stringify({ order_id: orderId }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      return createServiceResponse<{ success: boolean; message: string; tickets_created: number }>(
        null,
        new Error(errorData.error || 'Failed to complete order')
      )
    }

    const data = await response.json()
    return createServiceResponse<{ success: boolean; message: string; tickets_created: number }>(data, null)
  } catch (error: any) {
    return createServiceResponse<{ success: boolean; message: string; tickets_created: number }>(null, error)
  }
}
