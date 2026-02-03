/**
 * Staff and Fan Service
 * 
 * Provides API functions for:
 * - Staff role management (add, update, revoke, list)
 * - Fan capabilities (follows, bookmarks, calendar)
 * - Ticket transfers
 * - Ticket reservations
 */

import { supabase } from '../../lib/supabase'
import { USE_FAKE_DATA } from '../config'
import { t } from '../../i18n'
import type {
  StaffMember,
  StaffMemberInput,
  StaffMemberUpdate,
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
import type { UserContext } from '../fake/userContext'

const supabaseAny = supabase as any

// ============================================
// STAFF MANAGEMENT
// ============================================

/**
 * Add staff member to organization
 */
export async function addStaffMember(
  context: UserContext,
  input: StaffMemberInput
): Promise<{ data: StaffMember | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    return {
      data: null,
      error: new Error(t('staffAndFan.errors.staffManagementNotAvailable' as any)),
    }
  }

  try {
    const { error } = await supabaseAny.rpc('add_org_role_with_permissions', {
      p_user_id: input.user_id,
      p_org_id: input.org_id,
      p_role: 'staff',
      p_permissions: input.permissions || null,
    })

    if (error) throw error

    // Fetch the created staff member
    return getStaffMember(context, input.org_id, input.user_id)
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.addStaffMemberFailed' as any)),
    }
  }
}

/**
 * Get staff member by org and user ID
 */
export async function getStaffMember(
  context: UserContext,
  orgId: string,
  userId: string
): Promise<{ data: StaffMember | null; error: Error | null }> {
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select(
        `
        id,
        user_id,
        org_id,
        role,
        permissions,
        is_active,
        created_at,
        updated_at,
        ended_at,
        ended_reason,
        revoked_by,
        user:users(id, email, display_name, first_name, last_name)
        `
      )
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .eq('role', 'staff' as any)
      .single()

    if (error) throw error

    return {
      data: data as StaffMember,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.getStaffMemberFailed' as any)),
    }
  }
}

/**
 * List all staff for an organization
 */
export async function getOrgStaff(
  _context: UserContext,
  orgId: string
): Promise<{ data: StaffMember[]; error: Error | null }> {
  try {
    const { data, error } = await supabaseAny.rpc('get_org_staff', {
      p_org_id: orgId,
    })

    if (error) throw error

    return {
      data: (data || []) as StaffMember[],
      error: null,
    }
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.getOrgStaffFailed' as any)),
    }
  }
}

/**
 * Update staff permissions
 */
export async function updateStaffPermissions(
  context: UserContext,
  orgId: string,
  userId: string,
  permissions: StaffMemberUpdate['permissions']
): Promise<{ data: StaffMember | null; error: Error | null }> {
  try {
    const { error } = await supabaseAny.rpc('update_staff_permissions', {
      p_org_id: orgId,
      p_user_id: userId,
      p_permissions: permissions || {},
    })

    if (error) throw error

    return getStaffMember(context, orgId, userId)
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.updateStaffPermissionsFailed' as any)),
    }
  }
}

/**
 * Revoke staff access
 */
export async function revokeStaffAccess(
  context: UserContext,
  orgId: string,
  userId: string,
  reason?: string
): Promise<{ data: boolean; error: Error | null }> {
  try {
    const { error } = await supabaseAny.rpc('revoke_staff_access', {
      p_org_id: orgId,
      p_user_id: userId,
      p_reason: reason || null,
    })

    if (error) throw error

    return { data: true, error: null }
  } catch (err) {
    return {
      data: false,
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.revokeStaffAccessFailed' as any)),
    }
  }
}

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
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.followOrgFailed' as any)),
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
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.unfollowOrgFailed' as any)),
    }
  }
}

/**
 * Get followed organizations
 */
export async function getFollowedOrgs(): Promise<{ data: FanOrgFollow[]; error: Error | null }> {
  try {
    const { data, error } = await supabaseAny
      .from('fan_org_follows')
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
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.getFollowedOrgsFailed' as any)),
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
      error: new Error(t('staffAndFan.errors.bookmarkNotAvailable' as any)),
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
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.bookmarkEventFailed' as any)),
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
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.removeBookmarkFailed' as any)),
    }
  }
}

/**
 * Get bookmarked events
 */
export async function getBookmarkedEvents(): Promise<{ data: FanEventBookmark[]; error: Error | null }> {
  try {
    const { data, error } = await supabaseAny
      .from('fan_event_bookmarks')
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
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.getBookmarkedEventsFailed' as any)),
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
        error: new Error(t('staffAndFan.errors.authenticationRequired' as any)),
      }
    }

    // Check cache first
    const { data: cacheData } = await supabaseAny
      .from('fan_calendar_cache')
      .select('calendar_data, generated_at, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (cacheData) {
      return {
        data: {
          events: (cacheData as any).calendar_data.events as CalendarEvent[],
          generated_at: (cacheData as any).generated_at,
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
        events: (data || []) as unknown as CalendarEvent[],
        generated_at: new Date().toISOString(),
        from_cache: false,
      },
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.getFanCalendarFailed' as any)),
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
    const { data: ticketData, error: ticketError } = await supabaseAny
      .from('tickets')
      .select('*')
      .eq('id', request.ticket_id)
      .single()

    if (ticketError) throw ticketError

    return {
      data: ticketData as unknown as TransferableTicket,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.transferTicketFailed' as any)),
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

    const { data, error } = await supabaseAny
      .from('ticket_reservations')
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
        reservation_id: (data as any).id,
        expires_at: (data as any).expires_at,
        quantity: (data as any).quantity,
      },
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.reserveTicketsFailed' as any)),
    }
  }
}

/**
 * Get user's purchases
 */
export async function getUserPurchases(): Promise<{ data: Purchase[]; error: Error | null }> {
  try {
    const { data, error } = await supabaseAny
      .from('purchases')
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
      error: err instanceof Error ? err : new Error(t('staffAndFan.errors.getPurchasesFailed' as any)),
    }
  }
}
