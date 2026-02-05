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
import { fakeEvents } from './fakeEvents'

// ============================================
// IN-MEMORY STATE
// ============================================

let fakeBookmarks: FanEventBookmark[] = fakeEvents.slice(0, 3).map((event, index) => ({
    id: `bookmark-${index}`,
    user_id: 'user-001',
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

const fakeFollows: FanOrgFollow[] = []

// ============================================
// FAN FOLLOWS
// ============================================

export async function followOrg(
    orgId: string,
    source: 'manual' | 'post_purchase' | 'import' = 'manual'
): Promise<{ data: boolean; error: Error | null }> {
    const exists = fakeFollows.find((f) => f.org_id === orgId)
    if (!exists) {
        fakeFollows.push({
            id: `follow-${Date.now()}`,
            user_id: 'user-001',
            org_id: orgId,
            source,
            created_at: new Date().toISOString(),
            org: {
                id: orgId,
                name: 'Demo Organization',
                slug: 'demo-org',
            },
        })
    }
    return { data: true, error: null }
}

export async function unfollowOrg(orgId: string): Promise<{ data: boolean; error: Error | null }> {
    const index = fakeFollows.findIndex((f) => f.org_id === orgId)
    if (index !== -1) {
        fakeFollows.splice(index, 1)
    }
    return { data: true, error: null }
}

export async function getFollowedOrgs(): Promise<{ data: FanOrgFollow[]; error: Error | null }> {
    return { data: [...fakeFollows], error: null }
}

// ============================================
// FAN BOOKMARKS
// ============================================

export async function bookmarkEvent(eventId: string): Promise<{ data: boolean; error: Error | null }> {
    const exists = fakeBookmarks.find((b) => b.event_id === eventId)
    if (!exists) {
        const event = fakeEvents.find((e) => e.id === eventId)
        if (event) {
            fakeBookmarks.push({
                id: `bookmark-${Date.now()}`,
                user_id: 'user-001',
                event_id: eventId,
                created_at: new Date().toISOString(),
                event: {
                    id: event.id,
                    title: event.title,
                    start_time: event.start_time,
                    end_time: event.end_time,
                    location: event.location,
                },
            })
        }
    }
    return { data: true, error: null }
}

export async function removeBookmark(eventId: string): Promise<{ data: boolean; error: Error | null }> {
    const initialLength = fakeBookmarks.length
    fakeBookmarks = fakeBookmarks.filter((b) => b.event_id !== eventId)

    if (fakeBookmarks.length === initialLength) {
        // It might be that we passed a bookmarkId instead of eventId? 
        // The service signature says eventId.
        // In the UI check: handleRemoveBookmark(bookmark.event_id)
        // So passing eventId is correct.
    }
    return { data: true, error: null }
}

export async function getBookmarkedEvents(): Promise<{ data: FanEventBookmark[]; error: Error | null }> {
    return { data: [...fakeBookmarks], error: null }
}

// ============================================
// FAN CALENDAR
// ============================================

export async function getFanCalendar(
    _request: GetCalendarRequest = {}
): Promise<{ data: GetCalendarResponse | null; error: Error | null }> {
    // Return some fake events mixed from fakeEvents
    return {
        data: {
            events: fakeEvents.slice(0, 5) as unknown as CalendarEvent[], // Type assertion needed if types strictly mismatch, but they should be close
            generated_at: new Date().toISOString(),
            from_cache: false,
        },
        error: null,
    }
}

// ============================================
// TICKET TRANSFERS
// ============================================

export async function transferTicket(
    request: TicketTransferRequest
): Promise<{ data: TransferableTicket | null; error: Error | null }> {
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

export async function getUserPurchases(): Promise<{ data: Purchase[]; error: Error | null }> {
    return {
        data: [],
        error: null,
    }
}

// ============================================
// ENTITY PROFILES (FAKE)
// ============================================

export async function getOrgProfile(orgId: string): Promise<{ data: any | null; error: Error | null }> {
    return {
        data: {
            id: orgId,
            name: 'Demo Organization',
            slug: 'demo-org',
            description: 'A demo youth sports organization',
            location_city: 'Springfield',
            location_state: 'IL',
            location_visible: true,
            website: 'https://example.com',
            email: 'contact@example.com',
            phone: '(555) 123-4567',
            logo_url: null,
            cover_url: null,
            privacy_level: 'public',
            is_following: false,
            follower_count: 42,
            created_at: new Date().toISOString(),
        },
        error: null,
    }
}

export async function getTeamProfile(teamId: string): Promise<{ data: any | null; error: Error | null }> {
    return {
        data: {
            id: teamId,
            name: 'Demo Team',
            description: 'A demo team',
            sport: 'Basketball',
            season: '2024-2025',
            gender: 'coed',
            age_group: 'U12',
            logo_url: null,
            cover_url: null,
            parent_org_id: 'org-fake',
            parent_org_name: 'Demo Organization',
            parent_org_slug: 'demo-org',
            visible_to_fans: true,
            is_following: false,
            follower_count: 42,
            created_at: new Date().toISOString(),
        },
        error: null,
    }
}

export async function getAthleteProfile(athleteId: string): Promise<{ data: any | null; error: Error | null }> {
    return {
        data: {
            id: athleteId,
            first_name: 'John',
            last_name: 'Doe',
            full_name: 'John Doe',
            jersey_number: '23',
            position: 'Guard',
            height: '5\'10"',
            weight: '150',
            graduation_year: 2026,
            bio: 'A dedicated athlete',
            profile_photo_url: null,
            cover_url: null,
            org_id: 'org-fake',
            org_name: 'Demo Organization',
            org_slug: 'demo-org',
            privacy_level: 'public',
            current_teams: ['Demo Team'],
            created_at: new Date().toISOString(),
        },
        error: null,
    }
}
