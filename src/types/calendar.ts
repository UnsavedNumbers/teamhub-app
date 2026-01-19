/**
 * Calendar Domain Types
 * 
 * Centralized, validated TypeScript types for the calendar feature.
 * These types extend the database types with domain-specific models.
 */

// NOTE:
// The calendar domain uses expanded event/RSVP/recurrence types that may not be present
// in the currently checked-in generated `database.types.ts`. To keep `tsc` green while
// migrations land, we model these as explicit unions here.

export type EventType =
    | 'practice'
    | 'game'
    | 'tournament'
    | 'meeting'
    | 'tryout'
    | 'travel'
    | 'pickup_dropoff'
    | 'social'
    | 'blackout'

export type RSVPStatus = 'going' | 'late' | 'not_going' | 'unknown'

export type RSVPType = 'none' | 'general' | 'athlete'

export type GeneralRSVPStatus = 'going' | 'not_going' | 'maybe'

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly'

export type AttendanceStatus = 'going' | 'late' | 'not_going'

// ============================================================================
// Domain Models (with relations)
// ============================================================================

export interface CalendarEvent {
    id: string
    team_id: string
    season_id: string
    title: string
    type: EventType
    start_time: string // ISO 8601
    end_time: string // ISO 8601
    arrival_time: string | null
    timezone: string
    location: string | null // Legacy field, use event_location instead
    notes: string | null
    uniform_notes: string | null
    equipment_notes: string | null
    weather_dependent: boolean
    external_link: string | null
    is_cancelled: boolean
    cancellation_reason: string | null
    cancelled_at: string | null
    cancelled_by_user_id: string | null
    created_by_user_id: string | null
    created_at: string
    updated_at: string

    // Travel-related fields (for automatic travel detection)
    requires_travel?: boolean
    overnight?: boolean
    departure_time?: string | null
    return_time?: string | null
    hotel_name?: string | null
    hotel_address?: string | null
    hotel_phone?: string | null
    hotel_confirmation?: string | null
    transportation_notes?: string | null
    itinerary_file_path?: string | null
    meeting_locations?: MeetingLocation[] | null
    travel_override?: TravelOverride | null

    // Relations (loaded via joins)
    team?: {
        id: string
        name: string
        org_id: string
    }
    season?: {
        id: string
        name: string
    }
    event_location?: EventLocation | null
    rsvps?: EventRSVP[]
    rsvp_config?: EventRSVPConfig
    general_rsvps?: GeneralRSVP[]
    recurring_pattern?: RecurringEventPattern | null
    change_history?: EventChangeHistory[]
}

// Meeting location for travel events
export interface MeetingLocation {
    name: string
    address: string
    time?: string
    notes?: string | null
    maps_url?: string | null
}

// Travel override set by admin
export interface TravelOverride {
    is_travel: boolean
    reason: string
    overridden_by: string
    overridden_at: string
}

export interface EventLocation {
    id: string
    event_id: string
    name?: string | null
    venue_name: string | null
    address_line1: string | null
    address_line2: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    country: string
    latitude: number | null
    longitude: number | null
    maps_url?: string | null
    is_tbd: boolean
    is_virtual: boolean
    virtual_link: string | null
    created_at: string
    updated_at: string
}

export interface EventRSVP {
    id: string
    event_id: string
    child_id: string
    status: RSVPStatus
    responded_at: string | null
    responded_by_user_id: string | null
    note: string | null
    created_at: string
    updated_at: string

    // Relations
    child?: {
        id: string
        first_name: string
        last_name: string
    }
}

export interface EventRSVPConfig {
    enabled: boolean
    type: RSVPType | null
}

export interface GeneralRSVP {
    id: string
    event_id: string
    user_id: string
    status: GeneralRSVPStatus
    note: string | null
    responded_at: string | null
    created_at: string
    updated_at: string
}

export interface RecurringEventPattern {
    id: string
    parent_event_id: string
    frequency: RecurrenceFrequency
    days_of_week: number[] // 0=Sunday, 1=Monday, ..., 6=Saturday
    end_date: string | null // ISO date string
    max_occurrences: number | null
    exception_dates: string[] // ISO date strings
    created_at: string
    updated_at: string
}

export interface RecurringEventInstance {
    id: string
    pattern_id: string
    event_id: string
    occurrence_date: string // ISO date string
    is_exception: boolean
    created_at: string
}

export interface EventChangeHistory {
    id: string
    event_id: string
    changed_by_user_id: string
    change_type: 'created' | 'updated' | 'cancelled' | 'restored' | 'rescheduled' | 'deleted'
    field_name: string | null
    old_value: string | null
    new_value: string | null
    notification_sent: boolean
    notification_sent_at: string | null
    created_at: string
}

// ============================================================================
// View Models (for UI state)
// ============================================================================

export interface CalendarFilters {
    childIds: string[]
    teamIds: string[]
    eventTypes: EventType[]
    startDate: Date
    endDate: Date
    showCancelled: boolean
}

export type CalendarViewMode = 'agenda' | 'week' | 'month'

export interface CalendarViewState {
    mode: CalendarViewMode
    currentDate: Date
    filters: CalendarFilters
}

// ============================================================================
// Form Data Types (for create/edit operations)
// ============================================================================

export interface EventFormData {
    title: string
    type: EventType
    team_id: string
    season_id: string
    start_time: string // datetime-local format
    end_time: string // datetime-local format
    arrival_time: string // datetime-local format
    timezone: string
    notes: string
    uniform_notes: string
    equipment_notes: string
    weather_dependent: boolean
    external_link: string
    location: EventLocationFormData
    recurring: RecurringEventFormData | null
    rsvp_enabled: boolean
    rsvp_type: RSVPType | null
}

export interface EventLocationFormData {
    venue_name: string
    address_line1: string
    address_line2: string
    city: string
    state: string
    postal_code: string
    latitude: string // String for form input
    longitude: string // String for form input
    is_tbd: boolean
    is_virtual: boolean
    virtual_link: string
}

export interface RecurringEventFormData {
    enabled: boolean
    frequency: RecurrenceFrequency
    days_of_week: number[]
    end_date: string // date input format
    max_occurrences: string // String for form input
}

export type RecurringEditMode = 'this_only' | 'this_and_future' | 'all'

// ============================================================================
// Helper Types
// ============================================================================

export interface RSVPSummary {
    // For general RSVP
    general?: {
        going_count: number
        not_going_count: number
        maybe_count: number
        total_responses: number
        total_eligible: number
    }
    // For athlete RSVP
    athlete?: {
        going_count: number
        late_count: number
        not_going_count: number
        unknown_count: number
        total_children: number
        response_rate: number
    }
}

export interface EventConflict {
    event1: CalendarEvent
    event2: CalendarEvent
    child_id: string
    overlap_minutes: number
}

// ============================================================================
// Constants
// ============================================================================

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
    practice: 'Practice',
    game: 'Game',
    tournament: 'Tournament',
    meeting: 'Team Meeting',
    tryout: 'Tryout',
    travel: 'Travel',
    pickup_dropoff: 'Pickup/Dropoff',
    social: 'Social Event',
    blackout: 'No Practice',
}

export const EVENT_TYPE_COLORS: Record<EventType, string> = {
    practice: 'border-l-blue-500',
    game: 'border-l-green-500',
    tournament: 'border-l-amber-500',
    meeting: 'border-l-purple-500',
    tryout: 'border-l-pink-500',
    travel: 'border-l-indigo-500',
    pickup_dropoff: 'border-l-cyan-500',
    social: 'border-l-rose-500',
    blackout: 'border-l-slate-500',
}

export const RSVP_STATUS_LABELS: Record<RSVPStatus, string> = {
    going: 'Going',
    late: 'Running Late',
    not_going: 'Not Going',
    unknown: 'No Response',
}

export const RSVP_STATUS_COLORS: Record<RSVPStatus, string> = {
    going: 'text-green-600 bg-green-50',
    late: 'text-amber-600 bg-amber-50',
    not_going: 'text-red-600 bg-red-50',
    unknown: 'text-slate-600 bg-slate-50',
}

export const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday', short: 'Sun' },
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
]

// ============================================================================
// Validation Helpers
// ============================================================================

export function isValidTimezone(tz: string): boolean {
    try {
        Intl.DateTimeFormat(undefined, { timeZone: tz })
        return true
    } catch {
        return false
    }
}

export function isValidEventTimeOrder(
    startTime: string,
    endTime: string,
    arrivalTime?: string | null
): boolean {
    const start = new Date(startTime)
    const end = new Date(endTime)

    if (end <= start) {
        return false
    }

    if (arrivalTime) {
        const arrival = new Date(arrivalTime)
        if (arrival >= start) {
            return false
        }
    }

    return true
}

export function detectEventConflicts(
    events: CalendarEvent[],
    childId: string
): EventConflict[] {
    const conflicts: EventConflict[] = []
    const childEvents = events.filter(e =>
        e.rsvps?.some(r => r.child_id === childId && r.status !== 'not_going')
    )

    for (let i = 0; i < childEvents.length; i++) {
        for (let j = i + 1; j < childEvents.length; j++) {
            const event1 = childEvents[i]
            const event2 = childEvents[j]

            const start1 = new Date(event1.start_time)
            const end1 = new Date(event1.end_time)
            const start2 = new Date(event2.start_time)
            const end2 = new Date(event2.end_time)

            // Check for overlap
            if (start1 < end2 && start2 < end1) {
                const overlapStart = start1 > start2 ? start1 : start2
                const overlapEnd = end1 < end2 ? end1 : end2
                const overlapMinutes = (overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60)

                conflicts.push({
                    event1,
                    event2,
                    child_id: childId,
                    overlap_minutes: overlapMinutes,
                })
            }
        }
    }

    return conflicts
}

// ============================================================================
// Formatting Helpers
// ============================================================================

export function formatEventLocation(location: EventLocation | null): string {
    if (!location) return ''

    if (location.is_tbd) return 'Location TBD'
    if (location.is_virtual) return 'Virtual Event'

    const parts: string[] = []

    if (location.venue_name) parts.push(location.venue_name)
    if (location.address_line1) parts.push(location.address_line1)
    if (location.address_line2) parts.push(location.address_line2)
    if (location.city) parts.push(location.city)
    if (location.state) parts.push(location.state)
    if (location.postal_code) parts.push(location.postal_code)

    return parts.join(', ')
}

export function getEventLocationMapsUrl(location: EventLocation | null): string | null {
    if (!location || location.is_tbd || location.is_virtual) return null

    if (location.latitude && location.longitude) {
        return `https://www.google.com/maps/search/?api=1&query=${location.latitude},${location.longitude}`
    }

    const address = formatEventLocation(location)
    if (address) {
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
    }

    return null
}

export function formatEventTimeRange(
    startTime: string,
    endTime: string,
    timezone: string
): string {
    const start = new Date(startTime)
    const end = new Date(endTime)

    const timeFormat: Intl.DateTimeFormatOptions = {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: timezone,
    }

    const startStr = start.toLocaleTimeString('en-US', timeFormat)
    const endStr = end.toLocaleTimeString('en-US', timeFormat)

    return `${startStr} - ${endStr}`
}

export function formatEventDate(dateStr: string, timezone: string): string {
    const date = new Date(dateStr)

    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: timezone,
    })
}
