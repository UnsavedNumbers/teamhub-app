/**
 * Fan Service
 * 
 * Provides API functions for fan capabilities:
 * - Follows (organizations, teams, athletes)
 * - Bookmarks (events)
 * - Calendar (aggregated fan calendar)
 * - Ticket transfers
 * - Ticket reservations
 * - Fan feed (home page)
 * - Discovery search
 * - Entity profiles
 * - Notification preferences
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
import * as fakeService from '../fake/fanFakeService'

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
  if (USE_FAKE_DATA) return fakeService.followOrg(orgId, source)

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
  if (USE_FAKE_DATA) return fakeService.unfollowOrg(orgId)

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
  if (USE_FAKE_DATA) return fakeService.getFollowedOrgs()

  try {
    const { data, error } = await supabaseAny.from('fan_org_follows')
      .select(`
        id,
        user_id,
        org_id,
        source,
        created_at,
        org:organizations(id, name, slug)
      `)
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
  if (USE_FAKE_DATA) return fakeService.bookmarkEvent(eventId)

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
  if (USE_FAKE_DATA) return fakeService.removeBookmark(eventId)

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
  if (USE_FAKE_DATA) return fakeService.getBookmarkedEvents()

  try {
    const { data, error } = await supabaseAny.from('fan_event_bookmarks')
      .select(`
        id,
        user_id,
        event_id,
        created_at,
        event:events(id, title, start_time, end_time, location, timezone)
      `)
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
  if (USE_FAKE_DATA) return fakeService.getFanCalendar(request)

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
  if (USE_FAKE_DATA) return fakeService.transferTicket(request)

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
  if (USE_FAKE_DATA) return fakeService.reserveTickets(request)

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
  if (USE_FAKE_DATA) return fakeService.getUserPurchases()

  try {
    const { data, error } = await supabaseAny.from('purchases')
      .select(`
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
      `)
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

// ============================================
// FAN FEED
// ============================================

export interface FanFeedItem {
  id: string
  content_type: 'event' | 'announcement' | 'photo' | 'video' | 'result'
  content_id: string
  source_entity_type: 'org' | 'team' | 'athlete'
  source_entity_id: string
  source_entity_name: string
  created_at: string
  read: boolean
}

/**
 * Get fan feed (personalized home page content)
 */
export async function getFanFeed(): Promise<{ data: FanFeedItem[]; error: Error | null }> {
  if (USE_FAKE_DATA) return { data: [], error: null }

  try {
    const { data, error } = await supabaseAny.from('fan_feed')
      .select(`
        id,
        content_type,
        content_id,
        source_entity_type,
        source_entity_id,
        source_entity_name,
        created_at,
        read
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error

    return {
      data: (data || []) as FanFeedItem[],
      error: null,
    }
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.getFanFeedFailed')),
    }
  }
}

/**
 * Mark feed item as read
 */
export async function markFeedItemRead(feedItemId: string): Promise<{ data: boolean; error: Error | null }> {
  if (USE_FAKE_DATA) return { data: true, error: null }

  try {
    const { error } = await supabaseAny.from('fan_feed')
      .update({ read: true })
      .eq('id', feedItemId)

    if (error) throw error

    return { data: true, error: null }
  } catch (err) {
    return {
      data: false,
      error: err instanceof Error ? err : new Error('Failed to mark feed item as read'),
    }
  }
}

// ============================================
// DISCOVERY & SEARCH
// ============================================

export interface SearchEntityResult {
  entity_type: 'org' | 'team' | 'athlete'
  id: string
  name: string
  slug?: string
  location_city?: string
  location_state?: string
  parent_org_name?: string
  sport?: string
  relevance_score: number
}

/**
 * Search for entities (organizations, teams, athletes)
 */
export async function searchEntities(
  query: string,
  entityTypes: ('org' | 'team' | 'athlete')[] = ['org', 'team', 'athlete'],
  limit: number = 20
): Promise<{ data: SearchEntityResult[]; error: Error | null }> {
  if (USE_FAKE_DATA) return { data: [], error: null }

  try {
    const { data, error } = await supabaseAny.rpc('search_entities', {
      p_query: query,
      p_entity_types: entityTypes,
      p_limit: limit,
    })

    if (error) throw error

    const results = data?.results || []

    return {
      data: results,
      error: null,
    }
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.searchFailed')),
    }
  }
}

// ============================================
// ENTITY PROFILES
// ============================================

export interface EntityProfile {
  id: string
  name: string
  description?: string
  privacy_level: 'public' | 'unlisted' | 'private'
  is_following: boolean
  created_at: string
  // Org-specific fields
  slug?: string
  location_city?: string
  location_state?: string
  website?: string
  // Team-specific fields
  sport?: string
  season?: string
  parent_org_name?: string
  // Athlete-specific fields
  jersey_number?: string
  position?: string
  current_teams?: string[]
}

/**
 * Get organization profile
 */
export async function getOrgProfile(orgId: string): Promise<{ data: EntityProfile | null; error: Error | null }> {
  if (USE_FAKE_DATA) return { data: null, error: null }

  try {
    const { data, error } = await supabaseAny.rpc('get_org_profile', {
      p_org_id: orgId,
    })

    if (error) throw error

    return {
      data: data as EntityProfile,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.getEntityProfileFailed')),
    }
  }
}

/**
 * Get team profile
 */
export async function getTeamProfile(_teamId: string): Promise<{ data: EntityProfile | null; error: Error | null }> {
  if (USE_FAKE_DATA) return { data: null, error: null }

  try {
    // TODO: Implement get_team_profile RPC function
    return {
      data: null,
      error: new Error('Team profiles not yet implemented'),
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.getEntityProfileFailed')),
    }
  }
}

/**
 * Get athlete profile
 */
export async function getAthleteProfile(_athleteId: string): Promise<{ data: EntityProfile | null; error: Error | null }> {
  if (USE_FAKE_DATA) return { data: null, error: null }

  try {
    // TODO: Implement get_athlete_profile RPC function
    return {
      data: null,
      error: new Error('Athlete profiles not yet implemented'),
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.getEntityProfileFailed')),
    }
  }
}

// ============================================
// NOTIFICATION PREFERENCES
// ============================================

export interface NotificationPreferences {
  id?: string
  user_id: string
  email_enabled: boolean
  push_enabled: boolean
  schedule_changes_channel: 'real_time' | 'digest' | 'off'
  ticket_updates_channel: 'real_time' | 'digest' | 'off'
  game_results_channel: 'real_time' | 'digest' | 'off'
  photos_added_channel: 'real_time' | 'digest' | 'off'
  announcements_channel: 'real_time' | 'digest' | 'off'
  quiet_hours_enabled: boolean
  quiet_hours_start?: string
  quiet_hours_end?: string
  muted_entities: string[]
}

/**
 * Get user notification preferences
 */
export async function getNotificationPreferences(): Promise<{ data: NotificationPreferences | null; error: Error | null }> {
  if (USE_FAKE_DATA) return { data: null, error: null }

  try {
    const { data, error } = await supabaseAny.from('user_notification_preferences')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found

    return {
      data: data || null,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to get notification preferences'),
    }
  }
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<{ data: NotificationPreferences | null; error: Error | null }> {
  if (USE_FAKE_DATA) return { data: null, error: null }

  try {
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    if (!userId) {
      return {
        data: null,
        error: new Error(t('portal.fan.errors.authenticationRequired')),
      }
    }

    const { data, error } = await supabaseAny.from('user_notification_preferences')
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return {
      data: data,
      error: null,
    }
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.updateNotificationPreferencesFailed')),
    }
  }
}
