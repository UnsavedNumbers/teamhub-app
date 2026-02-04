/**
 * Fan Service
 * 
 * Provides API functions for fan capabilities:
 * - Follows (organizations)
 * - Bookmarks (events)
 * - Calendar (aggregated fan calendar)
 * - Ticket transfers
 * - Ticket reservations
 */

import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import { t } from '../../i18n'
import type {
  FanOrgFollow,
  FanEventBookmark,
  Purchase,
  TransferableTicket,
  TicketTransferRequest,
  ReserveTicketsRequest,
  ReserveTicketsResponse,
  CalendarEvent,
  GetCalendarRequest,
  GetCalendarResponse,
} from '../../types/staffAndFan'

const supabaseAny = supabase as any

// ============================================
// FAN FOLLOWS
// ============================================

/**
 * Follow an organization
 */
export async function followOrg(
  orgId: string,
  source: 'manual' | 'post_purchase' | 'import' = 'manual'
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await supabaseAny.rpc('follow_org', {
      p_org_id: orgId,
      p_source: source,
    })

    if (error) throw error

    return { data: true, error: null }
  } catch (err) {
    return {
      data: false,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.followOrgFailed')),
    }
  }
}

/**
 * Unfollow an organization
 */
export async function unfollowOrg(orgId: string): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await supabaseAny.rpc('unfollow_org', {
      p_org_id: orgId,
    })

    if (error) throw error

    return { data: true, error: null }
  } catch (err) {
    return {
      data: false,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.unfollowOrgFailed')),
    }
  }
}

/**
 * Get followed organizations
 */
export async function getFollowedOrgs(): Promise<{ data: FanOrgFollow[]; error: Error | null }> {
  try {
    const { data, error } = await supabaseAny.from('fan_org_follows')
      .select(
        `
        id,
        user_id,
        org_id,
        source,
        created_at,
        org:organizations(id, name, slug)
        `
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      data: (data || []) as FanOrgFollow[],
      error: null,
    }
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.getFollowedOrgsFailed')),
    }
  }
}

// ============================================
// FAN BOOKMARKS
// ============================================

/**
 * Bookmark an event
 */
export async function bookmarkEvent(eventId: string): Promise<{ data: boolean; error: Error | null }> {
  if (USE_FAKE_DATA) {
    return {
      data: false,
      error: new Error(t('portal.fan.errors.bookmarkNotAvailable')),
    }
  }

  try {
    const { error } = await supabaseAny.rpc('bookmark_event', {
      p_event_id: eventId,
    })

    if (error) throw error

    return { data: true, error: null }
  } catch (err) {
    return {
      data: false,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.bookmarkEventFailed')),
    }
  }
}

/**
 * Remove bookmark
 */
export async function removeBookmark(eventId: string): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await supabaseAny.rpc('remove_bookmark', {
      p_event_id: eventId,
    })

    if (error) throw error

    return { data: true, error: null }
  } catch (err) {
    return {
      data: false,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.removeBookmarkFailed')),
    }
  }
}

/**
 * Get bookmarked events
 */
export async function getBookmarkedEvents(): Promise<{ data: FanEventBookmark[]; error: Error | null }> {
  try {
    const { data, error } = await supabaseAny.from('fan_event_bookmarks')
      .select(
        `
        id,
        user_id,
        event_id,
        created_at,
        event:events(id, title, start_time, end_time, location)
        `
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      data: (data || []) as FanEventBookmark[],
      error: null,
    }
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.getBookmarkedEventsFailed')),
    }
  }
}

// ============================================
// FAN CALENDAR
// ============================================

/**
 * Get aggregated fan calendar
 */
export async function getFanCalendar(
  request: GetCalendarRequest = {}
): Promise<{ data: GetCalendarResponse | null; error: Error | null }> {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    if (!userId) {
      return {
        data: null,
        error: new Error(t('portal.fan.errors.authenticationRequired')),
      }
    }

    // Check cache first
    const { data: cacheData } = await supabaseAny.from('fan_calendar_cache')
      .select('calendar_data, generated_at, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cacheData) {
      return {
        data: {
          events: cacheData.calendar_data.events as CalendarEvent[],
          generated_at: cacheData.generated_at,
          from_cache: true,
        },
        error: null,
      }
    }

    // Fetch live data
    const { data, error } = await supabaseAny.rpc('get_fan_calendar', {
      p_start_date: request.start_date || null,
      p_end_date: request.end_date || null,
      p_org_ids: request.org_ids || null,
      p_sources: request.sources || null,
    })

    if (error) throw error

    return {
      data: {
        events: (data || []) as CalendarEvent[],
        generated_at: new Date().toISOString(),
        from_cache: false,
      },
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.getFanCalendarFailed')),
    }
  }
}

// ============================================
// TICKET TRANSFERS
// ============================================

/**
 * Transfer ticket to another user
 */
export async function transferTicket(
  request: TicketTransferRequest
): Promise<{ data: TransferableTicket | null; error: Error | null }> {
  try {
    const { error } = await supabaseAny.rpc('transfer_ticket', {
      p_ticket_id: request.ticket_id,
      p_holder_email: request.holder_email,
      p_holder_name: request.holder_name || null,
    })

    if (error) throw error

    // Fetch updated ticket
    const { data: ticketData, error: ticketError } = await supabaseAny.from('tickets')
      .select('*')
      .eq('id', request.ticket_id)
      .single()

    if (ticketError) throw ticketError

    return {
      data: ticketData as TransferableTicket,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.transferTicketFailed')),
    }
  }
}

// ============================================
// TICKET RESERVATIONS
// ============================================

/**
 * Reserve tickets (10-minute hold)
 */
export async function reserveTickets(
  request: ReserveTicketsRequest
): Promise<{ data: ReserveTicketsResponse | null; error: Error | null }> {
  try {
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    const { data, error } = await supabaseAny.from('ticket_reservations')
      .insert({
        event_id: request.event_id,
        user_id: (await supabase.auth.getUser()).data.user?.id,
        quantity: request.quantity,
        expires_at: expiresAt.toISOString(),
        status: 'pending',
      })
      .select('id, expires_at, quantity')
      .single()

    if (error) throw error

    return {
      data: {
        reservation_id: data.id,
        expires_at: data.expires_at,
        quantity: data.quantity,
      },
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.reserveTicketsFailed')),
    }
  }
}

/**
 * Get user's purchases
 */
export async function getUserPurchases(): Promise<{ data: Purchase[]; error: Error | null }> {
  try {
    const { data, error } = await supabaseAny.from('purchases')
      .select(
        `
        id,
        user_id,
        org_id,
        event_id,
        total_amount,
        currency,
        payment_method,
        payment_intent_id,
        status,
        refund_eligible,
        created_at,
        event:ticketed_events(id, title, starts_at)
        `
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    return {
      data: (data || []) as Purchase[],
      error: null,
    }
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.getPurchasesFailed')),
    }
  }
}



