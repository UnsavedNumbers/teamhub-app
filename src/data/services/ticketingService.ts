/**
 * Ticketing Service
 * 
 * Data access layer for ticketing system (events, tickets, orders, validation)
 */

import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
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

  const { data } = await query

  return normalizeSupabaseResponse<TicketedEvent[]>(data as unknown as TicketedEvent[], true)
}

/**
 * Get ticketed event by ID (public - requires org_id for isolation)
 * This function MUST be used for public routes to ensure org isolation
 */
export async function getTicketedEventById(id: string, orgId: string) {
  if (!orgId) {
    throw new Error('orgId is required for public event queries')
  }

  const { data } = await supabase
    .from('ticketed_events')
    .select('*')
    .eq('id', id)
    .eq('org_id', orgId) // CRITICAL: Always filter by org_id for public routes
    .single()

  return normalizeSupabaseResponse<TicketedEvent>(data as unknown as TicketedEvent, false)
}

/**
 * Get ticketed event by ID (admin/internal use - no org filter)
 * Only use this when org context is already enforced by RLS or admin context
 */
export async function getTicketedEventByIdAdmin(id: string) {
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
    throw new Error('orgId is required for public ticket type queries')
  }

  // First verify the event belongs to the org
  const { data: event } = await supabase
    .from('ticketed_events')
    .select('id, org_id')
    .eq('id', ticketedEventId)
    .eq('org_id', orgId)
    .single()

  if (!event) {
    return normalizeSupabaseResponse<TicketType[]>([], true)
  }

  const { data } = await supabase
    .from('ticket_types')
    .select('*')
    .eq('ticketed_event_id', ticketedEventId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  return normalizeSupabaseResponse<TicketType[]>(data as unknown as TicketType[], true)
}

/**
 * Get ticket types for an event (admin/internal use)
 */
export async function getTicketTypesForEventAdmin(ticketedEventId: string) {
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
    throw new Error('orgId is required for public order queries')
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
    .eq('org_id', orgId) // CRITICAL: Always filter by org_id for public routes
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

/**
 * Get ticket order by ID (admin/internal use)
 */
export async function getTicketOrderByIdAdmin(orderId: string) {
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
  const { data } = await supabase
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
  }>, true)
}

/**
 * Get tickets by access token (public - requires org_id for isolation)
 * Magic links are org-scoped, so we verify the order belongs to the org
 */
export async function getTicketsByAccessToken(token: string, orgId: string) {
  if (!orgId) {
    throw new Error('orgId is required for public ticket access queries')
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
// Checkout
// ============================================================================

export async function createCheckoutSession(
  request: CreateCheckoutRequest,
): Promise<{ data: CreateCheckoutResponse | null; error: Error | null }> {
  try {
    // Always include return_base_url when window is available (T3)
    const requestWithBaseUrl: CreateCheckoutRequest = {
      ...request,
      return_base_url: typeof window !== 'undefined' ? window.location.origin : request.return_base_url,
    }
    
    const response = await fetch(`${FUNCTIONS_URL}/tickets-create-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
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
