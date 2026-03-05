import {
    FanOrgFollow,
    FanEventBookmark,
    Purchase,
    TransferableTicket,
    TicketTransferRequest,
    ReserveTicketsRequest,
    ReserveTicketsResponse,
    CalendarEvent,
    CalendarEventSource,
    GetCalendarRequest,
    GetCalendarResponse,
} from '../../types/staffAndFan'
import type { EntityProfile } from '../services/fanService'
import { supabase } from '../../lib/supabase'
import { resolveDemoUserId } from './userContext'
import { getFakeTicketOrdersWithRelations, getFakeTicketsForOrder } from './ticketingFakeService'
import { getFakeTicketedEventById, getFakeTicketingEvents } from './fakeTicketingEvents'
import { getOrganizationById, getOrganizationBySlug, fakeOrganizations } from './fakeOrganizations'
import { getTeamWithDetails, getTeamById, getSportById, fakeTeams, fakeTeamMembers } from './fakeTeams'
import { getChildById } from './fakeUsers'
import { loadBookmarks, saveBookmarks } from './demoStorage'
import { DEMO_ORG_A_ID, DEMO_ORG_B_ID, DEMO_TRANSACTION_DELAY_MS } from '../config'
import type { SearchEntityResult } from '../services/fanService'

// ============================================
// HELPERS
// ============================================

async function getCurrentUserId(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    const authUserId = session?.user?.id ?? null
    const demoUserId = resolveDemoUserId(session?.user?.email ?? null)
    return authUserId ?? demoUserId
}

function getDefaultBookmarks(userId: string, orgIds: string[]): FanEventBookmark[] {
    const ticketedEvents = getTicketedEventsForOrgIds(orgIds).slice(0, 3)
    return ticketedEvents.map((event, index) => ({
        id: `bookmark-${index}`,
        user_id: userId,
        event_id: event.id,
        created_at: new Date().toISOString(),
        event: {
            id: event.id,
            title: event.title,
            start_time: event.starts_at,
            end_time: event.ends_at || event.starts_at,
            location: event.venue_name ?? null,
            timezone: event.timezone,
        },
    }))
}

// Keep fan follows in memory so demo interactions feel real during a session
// but reset on browser refresh back to seeded demo data.
const runtimeFollowsByUser = new Map<string, FanOrgFollow[]>()

function getSeededFollows(userId: string): FanOrgFollow[] {
    const preferredOrgIds = [DEMO_ORG_A_ID, DEMO_ORG_B_ID]
    const preferredOrgs = preferredOrgIds
        .map((orgId) => getOrganizationById(orgId))
        .filter((org): org is NonNullable<typeof org> => Boolean(org))
    const fallbackOrgs = fakeOrganizations.slice(0, 2)
    const seededOrgs = preferredOrgs.length > 0 ? preferredOrgs : fallbackOrgs

    return seededOrgs.map((org, index) => ({
        id: `follow-demo-${index}`,
        user_id: userId,
        org_id: org.id,
        source: 'manual' as const,
        created_at: new Date().toISOString(),
        org: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            logo_url: org.logo_url ?? null,
            location_city: org.city ?? null,
            location_state: org.state ?? null,
        },
    }))
}

function getRuntimeFollows(userId: string): FanOrgFollow[] {
    const existing = runtimeFollowsByUser.get(userId)
    if (existing) return [...existing]

    const seeded = getSeededFollows(userId)
    runtimeFollowsByUser.set(userId, seeded)
    return [...seeded]
}

function setRuntimeFollows(userId: string, follows: FanOrgFollow[]): void {
    runtimeFollowsByUser.set(userId, [...follows])
}

function getFollowedOrgIds(follows: FanOrgFollow[]): string[] {
    const ids = follows.map((follow) => follow.org_id).filter(Boolean)
    if (ids.length > 0) {
        return Array.from(new Set(ids))
    }
    return [DEMO_ORG_A_ID, DEMO_ORG_B_ID]
}

function getTicketedEventsForOrgIds(orgIds: string[]) {
    return orgIds.flatMap((orgId) =>
        getFakeTicketingEvents(orgId, {
            page: 1,
            perPage: 200,
            fanVisibleOnly: true,
        }).data,
    )
}

function mapTicketedEventToCalendarEvent(event: ReturnType<typeof getFakeTicketingEvents>['data'][number]): CalendarEvent {
    const org = getOrganizationById(event.org_id)
    const locationParts = [event.venue_name, event.venue_city, event.venue_state].filter(Boolean)

    return {
        id: event.id,
        title: event.title,
        start_time: event.starts_at,
        end_time: event.ends_at || event.starts_at,
        location: locationParts.length > 0 ? locationParts.join(', ') : null,
        timezone: event.timezone,
        source: ['ticketed'],
        sources: ['ticketed'],
        org_id: event.org_id,
        org_name: org?.name || 'Organization',
        org_slug: org?.slug || undefined,
        org_logo_url: org?.logo_url ?? null,
        visibility: event.visibility || 'public',
        event_type: event.event_type || 'event',
        description: event.description || event.event_description || null,
        event: {
            id: event.event_id || event.id,
            type: event.event_type || 'event',
            description: event.description || null,
        },
        ticketed_event: {
            id: event.id,
            venue_name: event.venue_name || null,
        },
    }
}

function mergeCalendarEventSources(target: CalendarEvent, incoming: CalendarEvent): CalendarEvent {
    const sourceSet = new Set<CalendarEventSource>()
    for (const source of [...(target.sources || []), ...(target.source || []), ...(incoming.sources || []), ...(incoming.source || [])]) {
        if (source) sourceSet.add(source)
    }
    const mergedSources = Array.from(sourceSet)
    return {
        ...target,
        ...incoming,
        source: mergedSources,
        sources: mergedSources,
    }
}

// ============================================
// FAN FOLLOWS (persisted)
// ============================================

export async function followOrg(
    orgId: string,
    source: 'manual' | 'post_purchase' | 'import' = 'manual'
): Promise<{ data: boolean; error: Error | null }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) return { data: false, error: new Error('Not authenticated') }

        const follows = getRuntimeFollows(userId)
        const exists = follows.find((f) => f.org_id === orgId)
        if (exists) return { data: true, error: null }

        const org = getOrganizationById(orgId)
        follows.push({
            id: `follow-${Date.now()}`,
            user_id: userId,
            org_id: orgId,
            source,
            created_at: new Date().toISOString(),
        org: {
            id: orgId,
            name: org?.name ?? 'Demo Organization',
            slug: org?.slug ?? 'demo-org',
            logo_url: org?.logo_url ?? null,
            location_city: org?.city ?? null,
            location_state: org?.state ?? null,
        },
        })
        setRuntimeFollows(userId, follows)
        return { data: true, error: null }
    } catch (err) {
        return {
            data: false,
            error: err instanceof Error ? err : new Error('Follow failed'),
        }
    }
}

export async function unfollowOrg(orgId: string): Promise<{ data: boolean; error: Error | null }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) return { data: false, error: new Error('Not authenticated') }

        const follows = getRuntimeFollows(userId).filter((f) => f.org_id !== orgId)
        setRuntimeFollows(userId, follows)
        return { data: true, error: null }
    } catch (err) {
        return {
            data: false,
            error: err instanceof Error ? err : new Error('Unfollow failed'),
        }
    }
}

export async function getFollowedOrgs(): Promise<{ data: FanOrgFollow[]; error: Error | null }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) {
            return {
                data: getSeededFollows('demo-fan'),
                error: null,
            }
        }

        const follows = getRuntimeFollows(userId)
        
        const enriched: FanOrgFollow[] = follows.map((f) => {
            const org = getOrganizationById(f.org_id)
            return {
                ...f,
                org: {
                    id: f.org_id,
                    name: org?.name ?? f.org?.name ?? 'Unknown',
                    slug: org?.slug ?? f.org?.slug ?? null,
                    logo_url: org?.logo_url ?? f.org?.logo_url ?? null,
                    location_city: org?.city ?? f.org?.location_city ?? null,
                    location_state: org?.state ?? f.org?.location_state ?? null,
                },
            }
        })
        return { data: enriched, error: null }
    } catch (err) {
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Failed to get follows'),
        }
    }
}

// ============================================
// FAN BOOKMARKS (persisted)
// ============================================

export async function bookmarkEvent(eventId: string): Promise<{ data: boolean; error: Error | null }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) return { data: false, error: new Error('Not authenticated') }

        let bookmarks = loadBookmarks(userId)
        if (bookmarks.length === 0) {
            const followedOrgIds = getFollowedOrgIds(getRuntimeFollows(userId))
            bookmarks = getDefaultBookmarks(userId, followedOrgIds)
            saveBookmarks(userId, bookmarks)
        }

        const exists = bookmarks.find((b) => b.event_id === eventId)
        if (exists) return { data: true, error: null }

        const followedOrgIds = getFollowedOrgIds(getRuntimeFollows(userId))
        const ticketedEvents = getTicketedEventsForOrgIds(followedOrgIds)
        const ticketedMatch = ticketedEvents.find((te) => te.id === eventId)
        if (!ticketedMatch) return { data: false, error: new Error('Event not found') }

        const eventInfo = {
            id: ticketedMatch.id,
            title: ticketedMatch.title,
            start_time: ticketedMatch.starts_at,
            end_time: ticketedMatch.ends_at || ticketedMatch.starts_at,
            location: ticketedMatch.venue_name ?? null,
            timezone: ticketedMatch.timezone,
        }

        bookmarks.push({
            id: `bookmark-${Date.now()}`,
            user_id: userId,
            event_id: eventId,
            created_at: new Date().toISOString(),
            event: eventInfo,
        })
        saveBookmarks(userId, bookmarks)
        return { data: true, error: null }
    } catch (err) {
        return {
            data: false,
            error: err instanceof Error ? err : new Error('Bookmark failed'),
        }
    }
}

export async function removeBookmark(eventId: string): Promise<{ data: boolean; error: Error | null }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) return { data: false, error: new Error('Not authenticated') }

        const bookmarks = loadBookmarks(userId).filter((b) => b.event_id !== eventId)
        saveBookmarks(userId, bookmarks)
        return { data: true, error: null }
    } catch (err) {
        return {
            data: false,
            error: err instanceof Error ? err : new Error('Remove bookmark failed'),
        }
    }
}

export async function getBookmarkedEvents(): Promise<{ data: FanEventBookmark[]; error: Error | null }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) return { data: [], error: null }

        let bookmarks = loadBookmarks(userId)
        if (bookmarks.length === 0) {
            const followedOrgIds = getFollowedOrgIds(getRuntimeFollows(userId))
            bookmarks = getDefaultBookmarks(userId, followedOrgIds)
            saveBookmarks(userId, bookmarks)
        }

        const enriched: FanEventBookmark[] = bookmarks.map((b) => {
            const followedOrgIds = getFollowedOrgIds(getRuntimeFollows(userId))
            const ticketedEvents = getTicketedEventsForOrgIds(followedOrgIds)
            const te = ticketedEvents.find((e) => e.id === b.event_id)
            return {
                ...b,
                event: b.event ?? (te
                    ? {
                        id: te.id,
                        title: te.title,
                        start_time: te.starts_at,
                        end_time: te.ends_at || te.starts_at,
                        location: te.venue_name ?? null,
                        timezone: te.timezone,
                    }
                    : undefined),
            }
        })
        return { data: enriched, error: null }
    } catch (err) {
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Failed to get bookmarks'),
        }
    }
}

// ============================================
// FAN CALENDAR
// ============================================

export async function getFanCalendar(
    request: GetCalendarRequest = {}
): Promise<{ data: GetCalendarResponse | null; error: Error | null }> {
    try {
        const userId = await getCurrentUserId()
        const follows = userId ? getRuntimeFollows(userId) : getSeededFollows('demo-fan')
        let orgIds = getFollowedOrgIds(follows)

        if (request.org_ids && request.org_ids.length > 0) {
            const allowed = new Set(request.org_ids)
            orgIds = orgIds.filter((orgId) => allowed.has(orgId))
        }

        const eventById = new Map<string, CalendarEvent>()
        const upsert = (event: CalendarEvent) => {
            const existing = eventById.get(event.id)
            if (!existing) {
                eventById.set(event.id, event)
                return
            }
            eventById.set(event.id, mergeCalendarEventSources(existing, event))
        }

        const ticketedEvents = getTicketedEventsForOrgIds(orgIds).map(mapTicketedEventToCalendarEvent)
        ticketedEvents.forEach(upsert)

        if (userId) {
            const purchases = await getUserPurchases()
            const purchaseEvents = (purchases.data ?? []).filter((purchase) => purchase.event && purchase.status === 'completed')
            for (const purchase of purchaseEvents) {
                if (!purchase.event) continue
                const org = getOrganizationById(purchase.org_id)
                upsert({
                    id: purchase.event.id,
                    title: purchase.event.title,
                    start_time: purchase.event.starts_at,
                    end_time: purchase.event.starts_at,
                    location: null,
                    timezone: 'America/Chicago',
                    source: ['ticketed'],
                    sources: ['ticketed'],
                    org_id: purchase.org_id,
                    org_name: org?.name || 'Organization',
                    org_slug: org?.slug || undefined,
                    org_logo_url: org?.logo_url ?? null,
                    visibility: 'public',
                    event_type: 'event',
                    description: null,
                    event: {
                        id: purchase.event.id,
                        type: 'event',
                        description: null,
                    },
                    ticketed_event: {
                        id: purchase.event.id,
                        venue_name: null,
                    },
                })
            }
        }

        let calendarEvents = Array.from(eventById.values())

        if (request.start_date) {
            const start = new Date(request.start_date)
            if (!Number.isNaN(start.getTime())) {
                calendarEvents = calendarEvents.filter((event) => new Date(event.start_time) >= start)
            }
        }

        if (request.end_date) {
            const end = new Date(request.end_date)
            if (!Number.isNaN(end.getTime())) {
                calendarEvents = calendarEvents.filter((event) => new Date(event.start_time) <= end)
            }
        }

        if (request.sources && request.sources.length > 0) {
            const allowedSources = new Set<CalendarEventSource>(request.sources)
            calendarEvents = calendarEvents.filter((event) => {
                const sources = event.sources || event.source || []
                return sources.some((source) => allowedSources.has(source))
            })
        }

        calendarEvents.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())

        return {
            data: {
                events: calendarEvents,
                generated_at: new Date().toISOString(),
                from_cache: false,
            },
            error: null,
        }
    } catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Failed to get calendar'),
        }
    }
}

// ============================================
// TICKET TRANSFERS
// ============================================

export async function transferTicket(
    request: TicketTransferRequest
): Promise<{ data: TransferableTicket | null; error: Error | null }> {
    await new Promise((r) => setTimeout(r, DEMO_TRANSACTION_DELAY_MS))
    return {
        data: {
            id: request.ticket_id,
            purchase_id: 'purch-fake',
            event_id: 'event-fake',
            org_id: 'org-fake',
            holder_user_id: null,
            holder_email: request.holder_email,
            holder_name: request.holder_name || null,
            qr_token: 'fake-qr',
            status: 'transferred',
            scanned_at: null,
            scanned_by: null,
            transferred_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        },
        error: null,
    }
}

// ============================================
// TICKET RESERVATIONS
// ============================================

export async function reserveTickets(
    request: ReserveTicketsRequest
): Promise<{ data: ReserveTicketsResponse | null; error: Error | null }> {
    const expiresAt = new Date()
    expiresAt.setMinutes(expiresAt.getMinutes() + 10)

    return {
        data: {
            reservation_id: `res-${Date.now()}`,
            expires_at: expiresAt.toISOString(),
            quantity: request.quantity,
        },
        error: null,
    }
}

// ============================================
// USER PURCHASES
// ============================================

export async function getUserPurchases(): Promise<{ data: Purchase[]; error: Error | null }> {
    try {
        const userId = await getCurrentUserId()
        if (!userId) return { data: [], error: null }

        const allOrders = getFakeTicketOrdersWithRelations()
        const userOrders = allOrders.filter((o) => o.purchaser_user_id === userId)
        const followedOrgIds = getFollowedOrgIds(getRuntimeFollows(userId))

        const ordersWithCoverage = [...userOrders]
        const existingOrgIds = new Set(ordersWithCoverage.map((order) => order.org_id))
        for (const orgId of followedOrgIds) {
            if (existingOrgIds.has(orgId)) continue
            const fallbackOrder = allOrders.find((order) => order.org_id === orgId)
            if (!fallbackOrder) continue
            ordersWithCoverage.push(fallbackOrder)
            existingOrgIds.add(orgId)
        }

        const purchases: Purchase[] = await Promise.all(
            ordersWithCoverage.map(async (order) => {
                const event = getFakeTicketedEventById(order.ticketed_event_id, order.org_id)
                const tickets = getFakeTicketsForOrder(order.id)
                const statusMap = {
                    paid: 'completed' as const,
                    refunded: 'refunded' as const,
                    pending_payment: 'pending' as const,
                    cancelled: 'cancelled' as const,
                }
                return {
                    id: order.id,
                    user_id: userId,
                    org_id: order.org_id,
                    event_id: order.ticketed_event_id,
                    total_amount: order.total_cents / 100,
                    currency: 'USD',
                    payment_method: 'Visa ****4242',
                    payment_intent_id: order.stripe_payment_intent_id,
                    status: statusMap[order.status] ?? 'pending',
                    refund_eligible: order.status === 'paid',
                    created_at: order.created_at ?? new Date().toISOString(),
                    event: event
                        ? { id: event.id, title: event.title, starts_at: event.starts_at }
                        : undefined,
                    tickets: tickets as Purchase['tickets'],
                }
            }),
        )

        purchases.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

        return { data: purchases, error: null }
    } catch (err) {
        console.error('[fanFakeService] getUserPurchases error:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Failed to get purchases'),
        }
    }
}

// ============================================
// ENTITY PROFILES (real fake data)
// ============================================

export async function getOrgProfile(orgIdOrSlug: string): Promise<{ data: EntityProfile | null; error: Error | null }> {
    try {
        const userId = await getCurrentUserId()
        const follows = userId ? getRuntimeFollows(userId) : []

        let org = getOrganizationById(orgIdOrSlug)
        if (!org) org = getOrganizationBySlug(orgIdOrSlug)
        if (!org) return { data: null, error: null }

        const isFollowing = follows.some((f) => f.org_id === org!.id)
        const followerCount = 42

        const profile: EntityProfile = {
            id: org.id,
            name: org.name,
            description: `${org.name} - ${org.org_type} youth sports organization`,
            privacy_level: 'public',
            is_following: isFollowing,
            created_at: org.created_at,
            logo_url: org.logo_url ?? undefined,
            cover_url: undefined,
            follower_count: followerCount,
            email: org.email ?? undefined,
            phone: org.phone ?? undefined,
            slug: org.slug,
            location_city: org.city ?? undefined,
            location_state: org.state ?? undefined,
            location_visible: true,
            website: org.website ?? undefined,
        }
        return { data: profile, error: null }
    } catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Failed to get org profile'),
        }
    }
}

export async function getOrgProfileBySlug(slug: string): Promise<{ data: EntityProfile | null; error: Error | null }> {
    return getOrgProfile(slug)
}

export async function getTeamProfile(teamId: string): Promise<{ data: EntityProfile | null; error: Error | null }> {
    try {
        const userId = await getCurrentUserId()
        const follows = userId ? getRuntimeFollows(userId) : []

        const teamWithDetails = getTeamWithDetails(teamId)
        if (!teamWithDetails) return { data: null, error: null }

        const org = getOrganizationById(teamWithDetails.org_id)
        const isFollowing = follows.some((f) => f.org_id === teamWithDetails.org_id)
        const profile: EntityProfile = {
            id: teamWithDetails.id,
            name: teamWithDetails.name,
            description: teamWithDetails.sport?.name ? `${teamWithDetails.name} – ${teamWithDetails.sport.name}` : undefined,
            privacy_level: 'public',
            is_following: isFollowing,
            created_at: teamWithDetails.created_at,
            logo_url: undefined,
            cover_url: undefined,
            follower_count: 42,
            sport: teamWithDetails.sport?.name,
            season: teamWithDetails.activeSeason?.name,
            parent_org_name: org?.name,
        }
        return { data: profile, error: null }
    } catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Failed to get team profile'),
        }
    }
}

export async function getAthleteProfile(athleteId: string): Promise<{ data: EntityProfile | null; error: Error | null }> {
    try {
        const child = getChildById(athleteId)
        if (!child) return { data: null, error: null }

        const fullName = `${child.first_name} ${child.last_name}`
        const profile: EntityProfile = {
            id: child.id,
            name: fullName,
            description: `${fullName} - youth athlete`,
            privacy_level: 'public',
            is_following: false,
            created_at: child.created_at,
            logo_url: undefined,
            cover_url: undefined,
            follower_count: 0,
            jersey_number: child.jersey_number ?? undefined,
            current_teams: [],
        }
        return { data: profile, error: null }
    } catch (err) {
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Failed to get athlete profile'),
        }
    }
}

// ============================================
// ENTITY SEARCH
// ============================================

export async function searchEntities(
    query: string,
    entityTypes: ('org' | 'team' | 'athlete')[] = ['org', 'team', 'athlete'],
    limit: number = 20
): Promise<{ data: SearchEntityResult[]; error: Error | null }> {
    try {
        const userId = await getCurrentUserId()
        const follows = userId ? getRuntimeFollows(userId) : []
        const queryLower = query.toLowerCase().trim()
        const results: SearchEntityResult[] = []

        // Search organizations
        if (entityTypes.includes('org')) {
            const orgs = fakeOrganizations.filter((org) => {
                if (!queryLower) return true
                return (
                    org.name.toLowerCase().includes(queryLower) ||
                    org.city?.toLowerCase().includes(queryLower) ||
                    org.state?.toLowerCase().includes(queryLower) ||
                    org.slug?.toLowerCase().includes(queryLower)
                )
            })

            for (const org of orgs.slice(0, limit)) {
                const isFollowing = follows.some((f) => f.org_id === org.id)
                results.push({
                    entity_type: 'org',
                    id: org.id,
                    name: org.name,
                    slug: org.slug,
                    location_city: org.city ?? undefined,
                    location_state: org.state ?? undefined,
                    relevance_score: queryLower ? (org.name.toLowerCase().startsWith(queryLower) ? 1.0 : 0.7) : 0.5,
                    isFollowing,
                    logo_url: org.logo_url ?? undefined,
                })
            }
        }

        // Search teams
        if (entityTypes.includes('team') && results.length < limit) {
            const teams = fakeTeams.filter((team) => {
                if (!queryLower) return true
                return team.name.toLowerCase().includes(queryLower)
            })

            for (const team of teams.slice(0, limit - results.length)) {
                const teamDetails = getTeamWithDetails(team.id)
                const org = teamDetails ? getOrganizationById(teamDetails.org_id) : null
                const isFollowing = org ? follows.some((f) => f.org_id === org.id) : false

                results.push({
                    entity_type: 'team',
                    id: team.id,
                    name: team.name,
                    parent_org_id: org?.id,
                    parent_org_name: org?.name,
                    sport: teamDetails?.sport?.name,
                    relevance_score: queryLower ? (team.name.toLowerCase().startsWith(queryLower) ? 0.9 : 0.6) : 0.4,
                    isFollowing,
                })
            }
        }

        // Search athletes
        if (entityTypes.includes('athlete') && results.length < limit) {
            const seenAthletes = new Set<string>()
            for (const member of fakeTeamMembers) {
                if (seenAthletes.has(member.athlete_id)) continue
                seenAthletes.add(member.athlete_id)

                const athlete = getChildById(member.athlete_id)
                const team = getTeamById(member.team_id)
                if (!athlete || !team) continue

                const fullName = `${athlete.first_name} ${athlete.last_name}`.trim()
                const teamDetails = getTeamWithDetails(team.id)
                const org = getOrganizationById(team.org_id)
                const sport = teamDetails?.sport ?? (team.sport_id ? getSportById(team.sport_id) : undefined)

                if (queryLower) {
                    const matchesQuery =
                        fullName.toLowerCase().includes(queryLower) ||
                        team.name.toLowerCase().includes(queryLower) ||
                        (sport?.name?.toLowerCase().includes(queryLower) ?? false)
                    if (!matchesQuery) continue
                }

                const isFollowing = follows.some((f) => f.org_id === team.org_id)
                results.push({
                    entity_type: 'athlete',
                    id: athlete.id,
                    name: fullName,
                    parent_org_id: org?.id,
                    parent_org_name: org?.name,
                    sport: sport?.name,
                    relevance_score: queryLower
                        ? (fullName.toLowerCase().startsWith(queryLower) ? 0.95 : 0.55)
                        : 0.35,
                    isFollowing,
                })

                if (results.length >= limit) break
            }
        }

        // Sort by relevance score (highest first)
        results.sort((a, b) => b.relevance_score - a.relevance_score)

        return { data: results.slice(0, limit), error: null }
    } catch (err) {
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Failed to search entities'),
        }
    }
}
