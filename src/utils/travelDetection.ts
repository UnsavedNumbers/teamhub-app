/**
 * Travel Detection Utility
 * 
 * Client-side travel detection logic that mirrors the database function.
 * Used for real-time UI feedback before saving to database.
 * 
 * Implements:
 * - Issue 7: Type-safe helpers for nullable travel fields
 * - Issue 4: Override conflict detection
 * - Issue 5: Multi-factor location detection
 * - Issue 10: Event type as high-confidence indicator
 */

import type { CalendarEvent, EventLocation, MeetingLocation, TravelOverride } from '../types/calendar'

// ============================================================================
// Types
// ============================================================================

export type TravelConfidence = 'high' | 'medium' | 'low'

export interface TravelDetectionResult {
    isTravel: boolean
    reasons: string[]
    confidence: TravelConfidence
    hasOverride: boolean
    overrideConflict: boolean
}

export interface HotelInfo {
    name: string | null
    address: string | null
    phone: string | null
    confirmation: string | null
}

// Re-export for convenience
export type { MeetingLocation, TravelOverride }

// Extended CalendarEvent with travel fields
export interface TravelEvent extends CalendarEvent {
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
}

export interface TravelTrip {
    tripId: string
    events: TravelEvent[]
    startDate: Date
    endDate: Date
    primaryLocation: string | null
    hotel: HotelInfo | null
    meetingLocations: MeetingLocation[] | null
}

// ============================================================================
// Helper Functions (Issue 7: Type-safe null handling)
// ============================================================================

/**
 * Type-safe extraction of hotel information from an event
 * Returns null if no hotel data is present
 */
export function getHotelInfo(event: TravelEvent): HotelInfo | null {
    if (!event.hotel_name && !event.hotel_address && !event.hotel_phone && !event.hotel_confirmation) {
        return null
    }

    return {
        name: event.hotel_name ?? null,
        address: event.hotel_address ?? null,
        phone: event.hotel_phone ?? null,
        confirmation: event.hotel_confirmation ?? null,
    }
}

/**
 * Parse meeting locations from event, handling null/undefined safely
 */
export function getMeetingLocations(event: TravelEvent): MeetingLocation[] {
    if (!event.meeting_locations || !Array.isArray(event.meeting_locations)) {
        return []
    }

    return event.meeting_locations
        .filter((loc): loc is MeetingLocation => {
            return loc != null &&
                typeof loc.name === 'string' &&
                typeof loc.address === 'string'
        })
}

/**
 * Get departure info with null safety
 */
export function getDepartureInfo(event: TravelEvent): { time: Date; notes: string } | null {
    if (!event.departure_time) return null

    return {
        time: new Date(event.departure_time),
        notes: event.transportation_notes ?? '',
    }
}

/**
 * Get return info with null safety
 */
export function getReturnInfo(event: TravelEvent): { time: Date } | null {
    if (!event.return_time) return null

    return {
        time: new Date(event.return_time),
    }
}

// ============================================================================
// Travel Detection Function
// ============================================================================

/**
 * Detect if an event is a travel event based on various indicators.
 * This mirrors the database is_travel_event() function for client-side use.
 * 
 * @param event - The event to check
 * @param orgPrimaryCity - Organization's primary city (optional)
 * @param orgPrimaryState - Organization's primary state (optional)
 * @returns Detection result with reasons and confidence level
 */
export function detectTravelEvent(
    event: TravelEvent,
    orgPrimaryCity?: string | null,
    orgPrimaryState?: string | null
): TravelDetectionResult {
    const reasons: string[] = []
    let confidence: TravelConfidence = 'low'
    let hasOverride = false
    let overrideConflict = false

    // Check override first (Issue 4)
    if (event.travel_override?.is_travel !== undefined) {
        hasOverride = true

        // Check if current attributes would give a different result
        const computedResult = computeTravelWithoutOverride(event, orgPrimaryCity, orgPrimaryState)
        if (computedResult.isTravel !== event.travel_override.is_travel) {
            overrideConflict = true
        }

        return {
            isTravel: event.travel_override.is_travel,
            reasons: [`Admin override: ${event.travel_override.reason || 'No reason provided'}`],
            confidence: 'high',
            hasOverride,
            overrideConflict,
        }
    }

    // Compute travel status from attributes
    const result = computeTravelWithoutOverride(event, orgPrimaryCity, orgPrimaryState)

    return {
        ...result,
        hasOverride: false,
        overrideConflict: false,
    }
}

/**
 * Internal function to compute travel status without considering override
 */
function computeTravelWithoutOverride(
    event: TravelEvent,
    orgPrimaryCity?: string | null,
    orgPrimaryState?: string | null
): Omit<TravelDetectionResult, 'hasOverride' | 'overrideConflict'> {
    const reasons: string[] = []
    let confidence: TravelConfidence = 'low'

    // High confidence indicators

    // Rule 1: Explicit travel flag
    if (event.requires_travel === true) {
        reasons.push('Explicit travel flag set')
        confidence = 'high'
    }

    // Rule 2: Overnight flag
    if (event.overnight === true) {
        reasons.push('Overnight trip')
        confidence = 'high'
    }

    // Rule 3: Hotel information (Issue 7: null-safe check)
    const hotel = getHotelInfo(event)
    if (hotel) {
        reasons.push('Hotel information provided')
        confidence = 'high'
    }

    // Rule 4: Event type 'travel' is explicit (Issue 10)
    if (event.type === 'travel') {
        reasons.push('Event type: travel (explicit)')
        confidence = 'high'
    }

    // Medium confidence indicators

    // Rule 5: Tournament type suggests travel
    if (event.type === 'tournament') {
        reasons.push('Event type: tournament')
        if (confidence === 'low') confidence = 'medium'
    }

    // Rule 6: Travel times specified
    if (event.departure_time || event.return_time) {
        reasons.push('Travel times specified')
        if (confidence === 'low') confidence = 'medium'
    }

    // Rule 7: Transportation notes
    if (event.transportation_notes) {
        reasons.push('Transportation notes provided')
        if (confidence === 'low') confidence = 'medium'
    }

    // Rule 8: Itinerary file
    if (event.itinerary_file_path) {
        reasons.push('Itinerary file attached')
        if (confidence === 'low') confidence = 'medium'
    }

    // Rule 9: Meeting locations
    const meetingLocations = getMeetingLocations(event)
    if (meetingLocations.length > 0) {
        reasons.push(`${meetingLocations.length} meeting location(s) defined`)
        if (confidence === 'low') confidence = 'medium'
    }

    // Issue 5: Location-based detection (multi-factor, supporting indicator)
    if (orgPrimaryCity && orgPrimaryState && event.event_location) {
        const loc = event.event_location

        // Different state is strong indicator
        if (loc.state && loc.state !== orgPrimaryState) {
            reasons.push(`Location in different state: ${loc.state}`)
            if (confidence === 'low') confidence = 'medium'
        }
        // Different city + other indicators
        else if (loc.city && loc.city !== orgPrimaryCity) {
            // Only if other travel indicators present (same city different venue alone not enough)
            if (event.type === 'tournament' || event.overnight || hotel) {
                reasons.push(`Location outside primary area: ${loc.city}, ${loc.state || 'N/A'}`)
                if (confidence === 'low') confidence = 'medium'
            }
        }
    }
    // If org location missing, we skip location rule (graceful degradation)

    // Rule 10: Multi-day events (>24 hours)
    const startTime = new Date(event.start_time)
    const endTime = new Date(event.end_time)
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)

    if (durationHours > 24) {
        // Only consider if there's other supporting evidence
        if (event.event_location?.city && orgPrimaryCity &&
            event.event_location.city !== orgPrimaryCity) {
            reasons.push(`Multi-day event (${Math.round(durationHours)} hours) at different location`)
            if (confidence === 'low') confidence = 'medium'
        }
    }

    return {
        isTravel: reasons.length > 0,
        reasons,
        confidence,
    }
}

// ============================================================================
// Trip Grouping (Issue 3)
// ============================================================================

/**
 * Group travel events into trips based on proximity
 * Events are grouped if they:
 * - Have the same team_id
 * - Are within 7 days of each other
 * - Are in the same city (if available)
 * 
 * @param events - Array of travel events to group
 * @returns Array of grouped trips
 */
export function groupEventsIntoTrips(events: TravelEvent[]): TravelTrip[] {
    if (events.length === 0) return []

    // Sort events by start time
    const sortedEvents = [...events].sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    const trips: TravelTrip[] = []
    let currentTrip: TravelEvent[] = [sortedEvents[0]]

    for (let i = 1; i < sortedEvents.length; i++) {
        const lastEvent = currentTrip[currentTrip.length - 1]
        const currentEvent = sortedEvents[i]

        const lastEndDate = new Date(lastEvent.end_time)
        const currentStartDate = new Date(currentEvent.start_time)
        const daysBetween = (currentStartDate.getTime() - lastEndDate.getTime()) / (1000 * 60 * 60 * 24)

        // Check if same team
        const sameTeam = lastEvent.team_id === currentEvent.team_id

        // Check if same city (if location data available)
        const sameCity = !lastEvent.event_location?.city ||
            !currentEvent.event_location?.city ||
            lastEvent.event_location.city === currentEvent.event_location.city

        // Group if within 7 days, same team, and same/unknown city
        if (daysBetween <= 7 && sameTeam && sameCity) {
            currentTrip.push(currentEvent)
        } else {
            // Start new trip
            trips.push(createTrip(currentTrip))
            currentTrip = [currentEvent]
        }
    }

    // Don't forget the last trip
    if (currentTrip.length > 0) {
        trips.push(createTrip(currentTrip))
    }

    return trips
}

/**
 * Create a TravelTrip from a group of events
 */
function createTrip(events: TravelEvent[]): TravelTrip {
    const sortedEvents = [...events].sort((a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    )

    // Find first event with hotel info
    const eventWithHotel = sortedEvents.find(e => getHotelInfo(e) !== null)

    // Find first event with location
    const eventWithLocation = sortedEvents.find(e => e.event_location?.city)

    // Collect all meeting locations
    const allMeetingLocations: MeetingLocation[] = []
    for (const event of sortedEvents) {
        allMeetingLocations.push(...getMeetingLocations(event))
    }

    // Generate unique trip ID based on first event
    const tripId = `trip-${sortedEvents[0].id}-${sortedEvents.length}`

    // Primary location from first event with location data
    let primaryLocation: string | null = null
    if (eventWithLocation?.event_location) {
        const loc = eventWithLocation.event_location
        if (loc.venue_name) {
            primaryLocation = loc.venue_name
            if (loc.city) primaryLocation += `, ${loc.city}`
            if (loc.state) primaryLocation += `, ${loc.state}`
        } else if (loc.city) {
            primaryLocation = loc.city
            if (loc.state) primaryLocation += `, ${loc.state}`
        }
    }

    return {
        tripId,
        events: sortedEvents,
        startDate: new Date(sortedEvents[0].start_time),
        endDate: new Date(sortedEvents[sortedEvents.length - 1].end_time),
        primaryLocation,
        hotel: eventWithHotel ? getHotelInfo(eventWithHotel) : null,
        meetingLocations: allMeetingLocations.length > 0 ? allMeetingLocations : null,
    }
}

// ============================================================================
// Formatting Helpers
// ============================================================================

/**
 * Format a date range for display
 * Accepts both Date objects and ISO date strings
 */
export function formatTravelDateRange(startDate: Date | string, endDate: Date | string): string {
    // Convert strings to Date objects if needed
    const start = typeof startDate === 'string' ? new Date(startDate) : startDate
    const end = typeof endDate === 'string' ? new Date(endDate) : endDate

    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
    const yearOptions: Intl.DateTimeFormatOptions = { ...options, year: 'numeric' }

    const startStr = start.toLocaleDateString('en-US', options)
    const endStr = end.toLocaleDateString('en-US', yearOptions)

    // If same day, just show one date
    if (start.toDateString() === end.toDateString()) {
        return end.toLocaleDateString('en-US', yearOptions)
    }

    return `${startStr} - ${endStr}`
}

/**
 * Get a Google Maps link for an address
 */
export function getGoogleMapsLink(address: string): string {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

/**
 * Format hotel address for display
 */
export function formatHotelAddress(hotel: HotelInfo): string {
    const parts: string[] = []
    if (hotel.name) parts.push(hotel.name)
    if (hotel.address) parts.push(hotel.address)
    return parts.join(', ')
}
