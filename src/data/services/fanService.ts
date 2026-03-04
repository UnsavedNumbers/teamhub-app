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
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA } from '../config'
import { isInDemoSession } from '../../utils/demoMode'
import { resolveDemoUserId } from '../fake/userContext'
import { t } from '../../i18n'
import { getFakeTicketingEvents } from '../fake/fakeTicketingEvents'
import { getMockGalleriesForOrg } from '../fake/mockGalleries'
import { getOrganizationById } from '../fake/fakeOrganizations'
import { getAthleteProfileV2Fan } from './unifiedAthleteProfileV2Service'
import { readCalendarCache, writeCalendarCache } from '../../features/calendar/cache'
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

function getFanCalendarCacheScope(userId: string, request: GetCalendarRequest): string {
  const normalized = {
    start_date: request.start_date ?? null,
    end_date: request.end_date ?? null,
    org_ids: [...(request.org_ids ?? [])].sort(),
    sources: [...(request.sources ?? [])].sort(),
  }
  return `fan-calendar:${userId}:${JSON.stringify(normalized)}`
}

function shouldUseFakeData(): boolean {
  return USE_FAKE_DATA || isInDemoSession()
}

async function shouldUseFakeDataAsync(): Promise<boolean> {
  if (shouldUseFakeData()) return true

  try {
    const { data: { session } } = await supabase.auth.getSession()
    const email = session?.user?.email ?? null
    const metadata = (session?.user?.user_metadata ?? {}) as Record<string, unknown>

    if (resolveDemoUserId(email)) return true
    if (metadata.is_demo_session === true) return true
    if (typeof metadata.demo_code === 'string' && metadata.demo_code.trim().length > 0) return true
  } catch {
    // Fall through to false.
  }

  return false
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
  console.groupCollapsed(`%cfollowOrg: ${orgId}`, 'color: #666; font-weight: bold;');
  debug.flow('FanService.followOrg', 'Following organization', { orgId, source })
  debug.perf.start('fanService.followOrg')

  try {
    if (await shouldUseFakeDataAsync()) {
      const result = await fakeService.followOrg(orgId, source)
      debug.perf.end('fanService.followOrg')
      debug.flow('FanService.followOrg', 'Organization followed (fake)', { orgId, source })
      console.groupEnd()
      return result
    }
    const { error } = await supabaseAny.rpc('follow_org', {
      p_org_id: orgId,
      p_source: source,
    })

    if (error) throw error

    debug.perf.end('fanService.followOrg')
    debug.flow('FanService.followOrg', 'Organization followed successfully', { orgId, source })
    console.groupEnd()
    return { data: true, error: null }
  } catch (err) {
    debug.perf.end('fanService.followOrg')
    debug.error('FanService.followOrg', 'Failed to follow organization', { error: err, orgId, source })
    console.groupEnd()
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
  console.groupCollapsed(`%cunfollowOrg: ${orgId}`, 'color: #666; font-weight: bold;');
  debug.flow('FanService.unfollowOrg', 'Unfollowing organization', { orgId })
  debug.perf.start('fanService.unfollowOrg')

  try {
    if (await shouldUseFakeDataAsync()) {
      const result = await fakeService.unfollowOrg(orgId)
      debug.perf.end('fanService.unfollowOrg')
      debug.flow('FanService.unfollowOrg', 'Organization unfollowed (fake)', { orgId })
      console.groupEnd()
      return result
    }
    const { error } = await supabaseAny.rpc('unfollow_org', {
      p_org_id: orgId,
    })

    if (error) throw error

    debug.perf.end('fanService.unfollowOrg')
    debug.flow('FanService.unfollowOrg', 'Organization unfollowed successfully', { orgId })
    console.groupEnd()
    return { data: true, error: null }
  } catch (err) {
    debug.perf.end('fanService.unfollowOrg')
    debug.error('FanService.unfollowOrg', 'Failed to unfollow organization', { error: err, orgId })
    console.groupEnd()
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
  debug.data('FanService.getFollowedOrgs', 'Request')
  debug.perf.start('fanService.getFollowedOrgs')

  try {
    if (await shouldUseFakeDataAsync()) {
      const result = await fakeService.getFollowedOrgs()
      debug.perf.end('fanService.getFollowedOrgs')
      debug.data('FanService.getFollowedOrgs', 'Response (fake)', { orgCount: result.data.length })
      return result
    }

    const { data, error } = await supabaseAny.from('fan_org_follows')
      .select(`
        id,
        user_id,
        org_id,
        source,
        created_at,
        org:organizations(id, name, slug, logo_url, city, state)
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    const normalized = (data || []).map((follow: any) => ({
      ...follow,
      org: follow.org
        ? {
          id: follow.org.id,
          name: follow.org.name,
          slug: follow.org.slug,
          logo_url: follow.org.logo_url ?? null,
          location_city: follow.org.city ?? null,
          location_state: follow.org.state ?? null,
        }
        : undefined,
    }))

    debug.perf.end('fanService.getFollowedOrgs')
    debug.data('FanService.getFollowedOrgs', 'Response', { orgCount: normalized.length })
    return {
      data: normalized as FanOrgFollow[],
      error: null,
    }
  } catch (err) {
    debug.perf.end('fanService.getFollowedOrgs')
    debug.error('FanService.getFollowedOrgs', 'Failed to get followed orgs', { error: err })
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
  console.groupCollapsed(`%cbookmarkEvent: ${eventId}`, 'color: #666; font-weight: bold;');
  debug.flow('FanService.bookmarkEvent', 'Bookmarking event', { eventId })
  debug.perf.start('fanService.bookmarkEvent')

  try {
    if (await shouldUseFakeDataAsync()) {
      const result = await fakeService.bookmarkEvent(eventId)
      debug.perf.end('fanService.bookmarkEvent')
      debug.flow('FanService.bookmarkEvent', 'Event bookmarked (fake)', { eventId })
      console.groupEnd()
      return result
    }
    const { error } = await supabaseAny.rpc('bookmark_event', {
      p_event_id: eventId,
    })

    if (error) throw error

    debug.perf.end('fanService.bookmarkEvent')
    debug.flow('FanService.bookmarkEvent', 'Event bookmarked successfully', { eventId })
    console.groupEnd()
    return { data: true, error: null }
  } catch (err) {
    debug.perf.end('fanService.bookmarkEvent')
    debug.error('FanService.bookmarkEvent', 'Failed to bookmark event', { error: err, eventId })
    console.groupEnd()
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
  console.groupCollapsed(`%cremoveBookmark: ${eventId}`, 'color: #666; font-weight: bold;');
  debug.flow('FanService.removeBookmark', 'Removing bookmark', { eventId })
  debug.perf.start('fanService.removeBookmark')

  try {
    if (await shouldUseFakeDataAsync()) {
      const result = await fakeService.removeBookmark(eventId)
      debug.perf.end('fanService.removeBookmark')
      debug.flow('FanService.removeBookmark', 'Bookmark removed (fake)', { eventId })
      console.groupEnd()
      return result
    }
    const { error } = await supabaseAny.rpc('remove_bookmark', {
      p_event_id: eventId,
    })

    if (error) throw error

    debug.perf.end('fanService.removeBookmark')
    debug.flow('FanService.removeBookmark', 'Bookmark removed successfully', { eventId })
    console.groupEnd()
    return { data: true, error: null }
  } catch (err) {
    debug.perf.end('fanService.removeBookmark')
    debug.error('FanService.removeBookmark', 'Failed to remove bookmark', { error: err, eventId })
    console.groupEnd()
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
  debug.data('FanService.getBookmarkedEvents', 'Request')
  debug.perf.start('fanService.getBookmarkedEvents')

  try {
    if (await shouldUseFakeDataAsync()) {
      const result = await fakeService.getBookmarkedEvents()
      debug.perf.end('fanService.getBookmarkedEvents')
      debug.data('FanService.getBookmarkedEvents', 'Response (fake)', { bookmarkCount: result.data.length })
      return result
    }
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

    debug.perf.end('fanService.getBookmarkedEvents')
    debug.data('FanService.getBookmarkedEvents', 'Response', { bookmarkCount: data?.length || 0 })
    return {
      data: (data || []) as FanEventBookmark[],
      error: null,
    }
  } catch (err) {
    debug.perf.end('fanService.getBookmarkedEvents')
    debug.error('FanService.getBookmarkedEvents', 'Failed to get bookmarked events', { error: err })
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
  debug.data('FanService.getFanCalendar', 'Request', { request })
  debug.perf.start('fanService.getFanCalendar')

  try {
    if (await shouldUseFakeDataAsync()) {
      const result = await fakeService.getFanCalendar(request)
      debug.perf.end('fanService.getFanCalendar')
      debug.data('FanService.getFanCalendar', 'Response (fake)', { eventCount: result.data?.events?.length || 0 })
      return result
    }
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id

    if (!userId) {
      return {
        data: null,
        error: new Error(t('portal.fan.errors.authenticationRequired')),
      }
    }
    const cacheScope = getFanCalendarCacheScope(userId, request)
    const clientCache = readCalendarCache<GetCalendarResponse>(cacheScope)

    if (typeof navigator !== 'undefined' && !navigator.onLine && clientCache) {
      debug.perf.end('fanService.getFanCalendar')
      debug.data('FanService.getFanCalendar', 'Response (offline client cache)', {
        eventCount: clientCache.data.events.length,
      })
      return {
        data: {
          ...clientCache.data,
          from_cache: true,
        },
        error: null,
      }
    }

    // Check cache first (use maybeSingle to avoid error when no rows found)
    const { data: cacheData } = await supabaseAny.from('fan_calendar_cache')
      .select('calendar_data, generated_at, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (cacheData) {
      const cachedResponse: GetCalendarResponse = {
        events: cacheData.calendar_data.events as CalendarEvent[],
        generated_at: cacheData.generated_at,
        from_cache: true,
      }
      writeCalendarCache(cacheScope, cachedResponse)
      debug.perf.end('fanService.getFanCalendar')
      debug.data('FanService.getFanCalendar', 'Response (cached)', { eventCount: cacheData.calendar_data.events?.length || 0 })
      return {
        data: cachedResponse,
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

    // RPC returns { events: [...], generated_at: ... }
    const rpcResult = data as { events?: unknown[]; generated_at?: string } | null
    const events = Array.isArray(rpcResult?.events) ? rpcResult.events : []
    const response: GetCalendarResponse = {
      events: events as CalendarEvent[],
      generated_at: rpcResult?.generated_at || new Date().toISOString(),
      from_cache: false,
    }
    writeCalendarCache(cacheScope, response)

    debug.perf.end('fanService.getFanCalendar')
    debug.data('FanService.getFanCalendar', 'Response', { eventCount: events.length })
    return {
      data: response,
      error: null,
    }
  } catch (err) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (userId) {
        const fallback = readCalendarCache<GetCalendarResponse>(getFanCalendarCacheScope(userId, request))
        if (fallback) {
          debug.perf.end('fanService.getFanCalendar')
          debug.data('FanService.getFanCalendar', 'Response (stale client cache)', {
            eventCount: fallback.data.events.length,
          })
          return {
            data: {
              ...fallback.data,
              from_cache: true,
            },
            error: null,
          }
        }
      }
    } catch {
      // Ignore fallback read failures and return the original error below.
    }

    debug.perf.end('fanService.getFanCalendar')
    debug.error('FanService.getFanCalendar', 'Failed to get fan calendar', { error: err, request })
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
  console.groupCollapsed(`%ctransferTicket: ${request.ticket_id}`, 'color: #666; font-weight: bold;');
  debug.flow('FanService.transferTicket', 'Transferring ticket', { ticketId: request.ticket_id, holderEmail: request.holder_email })
  debug.perf.start('fanService.transferTicket')

  try {
    if (await shouldUseFakeDataAsync()) {
      const result = await fakeService.transferTicket(request)
      debug.perf.end('fanService.transferTicket')
      debug.flow('FanService.transferTicket', 'Ticket transferred (fake)', { ticketId: request.ticket_id })
      console.groupEnd()
      return result
    }
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
  if (await shouldUseFakeDataAsync()) return fakeService.reserveTickets(request)

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

    debug.perf.end('fanService.reserveTickets')
    debug.flow('FanService.reserveTickets', 'Tickets reserved successfully', { eventId: request.event_id, reservationId: data.id })
    console.groupEnd()
    return {
      data: {
        reservation_id: data.id,
        expires_at: data.expires_at,
        quantity: data.quantity,
      },
      error: null,
    }
  } catch (err) {
    debug.perf.end('fanService.reserveTickets')
    debug.error('FanService.reserveTickets', 'Failed to reserve tickets', { error: err, request })
    console.groupEnd()
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
  debug.data('FanService.getUserPurchases', 'Request')
  debug.perf.start('fanService.getUserPurchases')

  try {
    if (await shouldUseFakeDataAsync()) {
      const result = await fakeService.getUserPurchases()
      debug.perf.end('fanService.getUserPurchases')
      debug.data('FanService.getUserPurchases', 'Response (fake)', { purchaseCount: result.data.length })
      return result
    }
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

    debug.perf.end('fanService.getUserPurchases')
    debug.data('FanService.getUserPurchases', 'Response', { purchaseCount: data?.length || 0 })
    return {
      data: (data || []) as Purchase[],
      error: null,
    }
  } catch (err) {
    debug.perf.end('fanService.getUserPurchases')
    debug.error('FanService.getUserPurchases', 'Failed to get purchases', { error: err })
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
  source_entity_logo_url?: string | null
  created_at: string
  read: boolean
}

/**
 * Get fan feed (personalized home page content)
 */
export async function getFanFeed(): Promise<{ data: FanFeedItem[]; error: Error | null }> {
  debug.data('FanService.getFanFeed', 'Request')
  debug.perf.start('fanService.getFanFeed')

  try {
    if (await shouldUseFakeDataAsync()) {
      const now = new Date()
      const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString()
      const normalizePastIso = (iso: string | null | undefined, fallbackDaysAgo: number): string => {
        if (!iso) return daysAgo(fallbackDaysAgo)
        const parsed = new Date(iso)
        if (Number.isNaN(parsed.getTime())) return daysAgo(fallbackDaysAgo)
        if (parsed.getTime() > now.getTime()) return now.toISOString()
        return parsed.toISOString()
      }
      const followsResult = await fakeService.getFollowedOrgs()
      const followedOrgs = followsResult.data || []
      const fakeFeed: FanFeedItem[] = []

      followedOrgs.forEach((follow, followIndex) => {
        const orgId = follow.org_id
        const org = getOrganizationById(orgId)
        const orgName = org?.name || follow.org?.name || 'Organization'

        const ticketedEvents = getFakeTicketingEvents(orgId, {
          page: 1,
          perPage: 4,
          fanVisibleOnly: true,
          sortBy: 'created_at',
        }).data

        ticketedEvents.slice(0, 2).forEach((event, eventIndex) => {
          fakeFeed.push({
            id: `feed-${orgId}-event-${event.id}`,
            content_type: 'event',
            content_id: event.id,
            source_entity_type: 'org',
            source_entity_id: orgId,
            source_entity_name: orgName,
            source_entity_logo_url: org?.logo_url ?? null,
            created_at: normalizePastIso(event.updated_at || event.created_at, 1 + followIndex + eventIndex),
            read: eventIndex > 0,
          })
        })

        const galleries = getMockGalleriesForOrg(orgId).filter((gallery) => gallery.fans_can_see && (gallery.photo_count || 0) > 0)
        if (galleries.length > 0) {
          const gallery = galleries[0]
          fakeFeed.push({
            id: `feed-${orgId}-photo-${gallery.id}`,
            content_type: 'photo',
            content_id: gallery.id,
            source_entity_type: 'org',
            source_entity_id: orgId,
            source_entity_name: orgName,
            source_entity_logo_url: org?.logo_url ?? null,
            created_at: normalizePastIso(gallery.updated_at, 2 + followIndex),
            read: false,
          })
        }

        fakeFeed.push({
          id: `feed-${orgId}-announcement`,
          content_type: 'announcement',
          content_id: `announcement-${orgId}`,
          source_entity_type: 'org',
          source_entity_id: orgId,
          source_entity_name: orgName,
          source_entity_logo_url: org?.logo_url ?? null,
          created_at: daysAgo(3 + followIndex),
          read: followIndex > 0,
        })
      })

      fakeFeed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      debug.perf.end('fanService.getFanFeed')
      debug.data('FanService.getFanFeed', 'Response (fake)', { itemCount: fakeFeed.length })
      return { data: fakeFeed, error: null }
    }
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

    const feedItems = (data || []) as FanFeedItem[]
    const orgIds = Array.from(
      new Set(
        feedItems
          .filter((item) => item.source_entity_type === 'org')
          .map((item) => item.source_entity_id),
      ),
    )

    let orgLogoById = new Map<string, string | null>()
    if (orgIds.length > 0) {
      const followsResult = await getFollowedOrgs()
      orgLogoById = new Map(
        (followsResult.data || [])
          .map((follow) => [follow.org_id, follow.org?.logo_url ?? null]),
      )
    }

    return {
      data: feedItems.map((item) => ({
        ...item,
        source_entity_logo_url:
          item.source_entity_type === 'org'
            ? (orgLogoById.get(item.source_entity_id) ?? null)
            : item.source_entity_logo_url ?? null,
      })),
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
  if (await shouldUseFakeDataAsync()) return { data: true, error: null }

  try {
    const { error } = await supabaseAny.from('fan_feed')
      .update({ read: true })
      .eq('id', feedItemId)

    if (error) throw error

    debug.perf.end('fanService.markFeedItemRead')
    debug.flow('FanService.markFeedItemRead', 'Feed item marked as read successfully', { feedItemId })
    return { data: true, error: null }
  } catch (err) {
    debug.perf.end('fanService.markFeedItemRead')
    debug.error('FanService.markFeedItemRead', 'Failed to mark feed item as read', { error: err, feedItemId })
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
  parent_org_id?: string
  location_city?: string
  location_state?: string
  parent_org_name?: string
  sport?: string
  relevance_score: number
  isFollowing?: boolean
  logo_url?: string
}

/**
 * Search for entities (organizations, teams, athletes)
 */
export async function searchEntities(
  query: string,
  entityTypes: ('org' | 'team' | 'athlete')[] = ['org', 'team', 'athlete'],
  limit: number = 20
): Promise<{ data: SearchEntityResult[]; error: Error | null }> {
  console.groupCollapsed(`%csearchEntities: ${query}`, 'color: #666; font-weight: bold;');
  debug.data('FanService.searchEntities', 'Request', { query, entityTypes, limit })
  debug.perf.start('fanService.searchEntities')

  try {
    if (await shouldUseFakeDataAsync()) {
      const result = await fakeService.searchEntities(query, entityTypes, limit)
      debug.perf.end('fanService.searchEntities')
      debug.data('FanService.searchEntities', 'Response (fake)', { query, resultCount: result.data.length })
      console.groupEnd()
      return result
    }
    const { data, error } = await supabaseAny.rpc('search_entities', {
      p_query: query,
      p_entity_types: entityTypes,
      p_limit: limit,
    })

    if (error) throw error

    const results = data?.results || []

    debug.perf.end('fanService.searchEntities')
    debug.data('FanService.searchEntities', 'Response', { query, resultCount: results.length })
    console.groupEnd()
    return {
      data: results,
      error: null,
    }
  } catch (err) {
    debug.perf.end('fanService.searchEntities')
    debug.error('FanService.searchEntities', 'Failed to search entities', { error: err, query })
    console.groupEnd()
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
  logo_url?: string
  cover_url?: string
  follower_count?: number
  email?: string
  phone?: string
  // Org-specific fields
  slug?: string
  location_city?: string
  location_state?: string
  location_visible?: boolean
  website?: string
  // Team-specific fields
  sport?: string
  season?: string
  parent_org_name?: string
  // Athlete-specific fields
  jersey_number?: string
  position?: string
  current_teams?: string[]
  sports?: string[]
  org_id?: string
  org_name?: string
}

/**
 * Get organization profile
 */
export async function getOrgProfile(orgId: string): Promise<{ data: EntityProfile | null; error: Error | null }> {
  debug.data('FanService.getOrgProfile', 'Request', { orgId })
  debug.perf.start('fanService.getOrgProfile')

  try {
    if (await shouldUseFakeDataAsync()) {
      const result = await fakeService.getOrgProfile(orgId)
      debug.perf.end('fanService.getOrgProfile')
      debug.data('FanService.getOrgProfile', 'Response (fake)', { orgId, found: !!result.data })
      return result
    }
    const { data, error } = await supabaseAny.rpc('get_org_profile', {
      p_org_id: orgId,
    })

    if (error) throw error

    debug.perf.end('fanService.getOrgProfile')
    debug.data('FanService.getOrgProfile', 'Response', { orgId, orgName: data?.name })
    return {
      data: data as EntityProfile,
      error: null,
    }
  } catch (err) {
    debug.perf.end('fanService.getOrgProfile')
    debug.error('FanService.getOrgProfile', 'Failed to get org profile', { error: err, orgId })
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.getEntityProfileFailed')),
    }
  }
}

/**
 * Get organization profile by slug (lookup id then call getOrgProfile)
 */
export async function getOrgProfileBySlug(slug: string): Promise<{ data: EntityProfile | null; error: Error | null }> {
  debug.data('FanService.getOrgProfileBySlug', 'Request', { slug })
  debug.perf.start('fanService.getOrgProfileBySlug')

  try {
    if (await shouldUseFakeDataAsync()) {
      const result = await fakeService.getOrgProfileBySlug(slug)
      debug.perf.end('fanService.getOrgProfileBySlug')
      debug.data('FanService.getOrgProfileBySlug', 'Response (fake)', { slug, found: !!result.data })
      return result
    }
    const { data: orgRow, error: orgError } = await supabaseAny
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (orgError) throw orgError
    if (!orgRow || !orgRow.id) {
      return { data: null, error: new Error('Organization not found') }
    }

    return await getOrgProfile(orgRow.id)
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Failed to get organization by slug'),
    }
  }
}

/**
 * Get team profile
 */
export async function getTeamProfile(teamId: string): Promise<{ data: EntityProfile | null; error: Error | null }> {
  if (await shouldUseFakeDataAsync()) return fakeService.getTeamProfile(teamId)

  try {
    const { data, error } = await supabaseAny.rpc('get_team_profile', {
      p_team_id: teamId,
    })

    if (error) throw error

    debug.perf.end('fanService.getTeamProfile')
    debug.data('FanService.getTeamProfile', 'Response', { teamId, teamName: data?.name })
    return {
      data: data as EntityProfile,
      error: null,
    }
  } catch (err) {
    debug.perf.end('fanService.getTeamProfile')
    debug.error('FanService.getTeamProfile', 'Failed to get team profile', { error: err, teamId })
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.getEntityProfileFailed')),
    }
  }
}

/**
 * Get athlete profile
 */
export async function getAthleteProfile(athleteId: string): Promise<{ data: EntityProfile | null; error: Error | null }> {
  debug.data('FanService.getAthleteProfile', 'Request', { athleteId })
  debug.perf.start('fanService.getAthleteProfile')

  try {
    if (await shouldUseFakeDataAsync()) {
      const result = await fakeService.getAthleteProfile(athleteId)
      debug.perf.end('fanService.getAthleteProfile')
      debug.data('FanService.getAthleteProfile', 'Response (fake)', { athleteId, found: !!result.data })
      return result
    }
    // Prefer v2 fan RPC (supports identity IDs and athlete IDs), then fallback to legacy.
    const v2Result = await getAthleteProfileV2Fan(athleteId)
    if (v2Result.data && !v2Result.error) {
      const payload = v2Result.data as Record<string, any>
      if (!payload.error) {
        debug.perf.end('fanService.getAthleteProfile')
        debug.data('FanService.getAthleteProfile', 'Response (v2)', { athleteId, found: true })
        return {
          data: payload as EntityProfile,
          error: null,
        }
      }
    }

    const { data, error } = await supabaseAny.rpc('get_athlete_profile', { p_athlete_id: athleteId })
    if (error) throw error
    debug.perf.end('fanService.getAthleteProfile')
    debug.data('FanService.getAthleteProfile', 'Response (legacy)', { athleteId, found: !!data })
    return { data: data as EntityProfile, error: null }
  } catch (err) {
    debug.perf.end('fanService.getAthleteProfile')
    debug.error('FanService.getAthleteProfile', 'Failed to get athlete profile', { athleteId, error: err })
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
  if (await shouldUseFakeDataAsync()) return { data: null, error: null }

  try {
    const { data, error } = await supabaseAny.from('user_notification_preferences')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 = not found

    debug.perf.end('fanService.getNotificationPreferences')
    debug.data('FanService.getNotificationPreferences', 'Response', { found: !!data })
    return {
      data: data || null,
      error: null,
    }
  } catch (err) {
    debug.perf.end('fanService.getNotificationPreferences')
    debug.error('FanService.getNotificationPreferences', 'Failed to get preferences', { error: err })
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
  console.groupCollapsed(`%cupdateNotificationPreferences`, 'color: #666; font-weight: bold;');
  debug.flow('FanService.updateNotificationPreferences', 'Updating notification preferences', { preferences })
  debug.perf.start('fanService.updateNotificationPreferences')

  try {
    if (await shouldUseFakeDataAsync()) {
      debug.perf.end('fanService.updateNotificationPreferences')
      debug.flow('FanService.updateNotificationPreferences', 'Preferences updated (fake)')
      console.groupEnd()
      return { data: null, error: null }
    }
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

    debug.perf.end('fanService.updateNotificationPreferences')
    debug.flow('FanService.updateNotificationPreferences', 'Preferences updated successfully')
    console.groupEnd()
    return {
      data: data,
      error: null,
    }
  } catch (err) {
    debug.perf.end('fanService.updateNotificationPreferences')
    debug.error('FanService.updateNotificationPreferences', 'Failed to update preferences', { error: err })
    console.groupEnd()
    return {
      data: null,
      error: err instanceof Error ? err : new Error(t('portal.fan.errors.updateNotificationPreferencesFailed')),
    }
  }
}
