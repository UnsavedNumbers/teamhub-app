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
    request: GetCalendarRequest = {}
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
