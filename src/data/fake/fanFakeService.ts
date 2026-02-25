import {
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
import type { EntityProfile } from '../services/fanService'
import { fakeEvents } from './fakeEvents'
import { supabase } from '../../lib/supabase'
import { resolveDemoUserId } from './userContext'
import { getFakeTicketOrdersWithRelations, getFakeTicketsForOrder } from './ticketingFakeService'
import { getFakeTicketedEventById, getFakeTicketingEvents } from './fakeTicketingEvents'
import { getOrganizationById, getOrganizationBySlug, fakeOrganizations } from './fakeOrganizations'
import { getTeamWithDetails, fakeTeams } from './fakeTeams'
import { getChildById } from './fakeUsers'
import { loadBookmarks, saveBookmarks, loadFollows, saveFollows } from './demoStorage'
import { DEMO_ORG_A_ID, DEMO_TRANSACTION_DELAY_MS } from '../config'
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

function getDefaultBookmarks(userId: string): FanEventBookmark[] {
    return fakeEvents.slice(0, 3).map((event, index) => ({
        id: `bookmark-${index}`,
        user_id: userId,
        event_id: event.id,
        created_at: new Date().toISOString(),
        event: {
            id: event.id,
            title: event.title,
            start_time: event.start_time,
            end_time: event.end_time,
            location: event.location,
            timezone: event.timezone,
        },
    }))
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

        const follows = loadFollows(userId)
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
            },
        })
        saveFollows(userId, follows)
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

        const follows = loadFollows(userId).filter((f) => f.org_id !== orgId)
        saveFollows(userId, follows)
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
        if (!userId) return { data: [], error: null }

        let follows = loadFollows(userId)
        
        // Initialize with demo data if empty (for demo mode)
        if (follows.length === 0) {
            // Add a few demo organizations to follow
            const demoOrgs = fakeOrganizations.slice(0, 2) // Follow first 2 demo orgs
            follows = demoOrgs.map((org, index) => ({
                id: `follow-demo-${index}`,
                user_id: userId,
                org_id: org.id,
                source: 'manual' as const,
                created_at: new Date().toISOString(),
                org: {
                    id: org.id,
                    name: org.name,
                    slug: org.slug,
                },
            }))
            saveFollows(userId, follows)
        }
        
        const enriched: FanOrgFollow[] = follows.map((f) => {
            const org = getOrganizationById(f.org_id)
            return {
                ...f,
                org: {
                    id: f.org_id,
                    name: org?.name ?? f.org?.name ?? 'Unknown',
                    slug: org?.slug ?? f.org?.slug ?? null,
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
            bookmarks = getDefaultBookmarks(userId)
            saveBookmarks(userId, bookmarks)
        }

        const exists = bookmarks.find((b) => b.event_id === eventId)
        if (exists) return { data: true, error: null }

        const ticketedResult = getFakeTicketingEvents(DEMO_ORG_A_ID, {
            page: 1,
            perPage: 200,
            fanVisibleOnly: true,
        })
        const ticketedMatch = ticketedResult.data.find((te) => te.id === eventId)
        const event = fakeEvents.find((e) => e.id === eventId)
        if (!event && !ticketedMatch) return { data: false, error: new Error('Event not found') }

        const eventInfo = ticketedMatch
            ? {
                id: ticketedMatch.id,
                title: ticketedMatch.title,
                start_time: ticketedMatch.starts_at,
                end_time: ticketedMatch.ends_at,
                location: ticketedMatch.venue_name ?? null,
                timezone: ticketedMatch.timezone,
            }
            : event
                ? {
                    id: event.id,
                    title: event.title,
                    start_time: event.start_time,
                    end_time: event.end_time,
                    location: event.location,
                    timezone: event.timezone,
                }
                : { id: eventId, title: 'Event', start_time: '', end_time: '', location: null, timezone: '' }

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
            bookmarks = getDefaultBookmarks(userId)
            saveBookmarks(userId, bookmarks)
        }

        const enriched: FanEventBookmark[] = bookmarks.map((b) => {
            const fe = fakeEvents.find((e) => e.id === b.event_id)
            const ticketedEvents = getFakeTicketingEvents(DEMO_ORG_A_ID, { page: 1, perPage: 200, fanVisibleOnly: true })
            const te = ticketedEvents.data.find((e) => e.id === b.event_id)
            const event = fe ?? te
            return {
                ...b,
                event: b.event ?? (event
                    ? {
                        id: event.id,
                        title: event.title,
                        start_time: 'start_time' in event ? event.start_time : (event as any).starts_at,
                        end_time: 'end_time' in event ? event.end_time : (event as any).ends_at,
                        location: 'location' in event ? event.location : (event as any).venue_name ?? null,
                        timezone: event.timezone,
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
    _request: GetCalendarRequest = {}
): Promise<{ data: GetCalendarResponse | null; error: Error | null }> {
    try {
        const userId = await getCurrentUserId()
        const calendarEvents: CalendarEvent[] = [...(fakeEvents.slice(0, 5) as unknown as CalendarEvent[])]

        if (userId) {
            const purchases = await getUserPurchases()
            const purchaseEvents = (purchases.data ?? []).filter((p) => p.event && p.status === 'completed')
            for (const p of purchaseEvents) {
                if (p.event && !calendarEvents.some((e) => e.id === p.event!.id)) {
                    calendarEvents.push({
                        id: p.event.id,
                        title: p.event.title,
                        start_time: p.event.starts_at,
                        end_time: p.event.starts_at,
                        location: null,
                        timezone: 'America/Chicago',
                    } as CalendarEvent)
                }
            }
        }

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

        const purchases: Purchase[] = await Promise.all(
            userOrders.map(async (order) => {
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
        const follows = userId ? loadFollows(userId) : []

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
        const follows = userId ? loadFollows(userId) : []

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
        const follows = userId ? loadFollows(userId) : []
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
                    parent_org_name: org?.name,
                    sport: teamDetails?.sport?.name,
                    relevance_score: queryLower ? (team.name.toLowerCase().startsWith(queryLower) ? 0.9 : 0.6) : 0.4,
                    isFollowing,
                })
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
