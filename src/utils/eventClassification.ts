/**
 * Event Classification Utilities
 * 
 * Implements the Events Page Logic spec for classifying events as Upcoming/Past/Canceled
 * with grace window handling.
 */

import type { CalendarEvent } from '../types/calendar'

/**
 * GRACE_WINDOW = 2 hours
 * Prevents events that just ended from instantly jumping to Past
 */
const GRACE_WINDOW_MS = 2 * 60 * 60 * 1000 // 2 hours in milliseconds

/**
 * Get current timestamp in user's timezone
 * For now, uses browser timezone. Could be enhanced to use user preference.
 */
export function getNow(): Date {
    return new Date()
}

/**
 * Check if an event is canceled
 */
export function isCanceled(event: CalendarEvent): boolean {
    return event.is_cancelled === true
}

/**
 * Check if an event is upcoming (with grace window)
 * 
 * Upcoming:
 * - start_at >= (NOW - GRACE_WINDOW)
 * - status != canceled
 */
export function isUpcoming(event: CalendarEvent, now: Date = getNow()): boolean {
    if (isCanceled(event)) {
        return false
    }
    
    const startTime = new Date(event.start_time).getTime()
    const nowTime = now.getTime()
    const graceThreshold = nowTime - GRACE_WINDOW_MS
    
    return startTime >= graceThreshold
}

/**
 * Check if an event is past (with grace window)
 * 
 * Past:
 * - end_at < (NOW - GRACE_WINDOW)
 * OR
 * - (no end_at AND start_at < (NOW - GRACE_WINDOW))
 */
export function isPast(event: CalendarEvent, now: Date = getNow()): boolean {
    const nowTime = now.getTime()
    const graceThreshold = nowTime - GRACE_WINDOW_MS
    
    if (event.end_time) {
        const endTime = new Date(event.end_time).getTime()
        return endTime < graceThreshold
    } else {
        // No end_at, use start_at
        const startTime = new Date(event.start_time).getTime()
        return startTime < graceThreshold
    }
}

/**
 * Classify an event into Upcoming, Past, or Canceled
 */
export type EventClassification = 'upcoming' | 'past' | 'canceled'

export function classifyEvent(event: CalendarEvent, now: Date = getNow()): EventClassification {
    if (isCanceled(event)) {
        return 'canceled'
    }
    
    if (isUpcoming(event, now)) {
        return 'upcoming'
    }
    
    return 'past'
}

/**
 * Filter events by classification
 */
export function filterByClassification(
    events: CalendarEvent[],
    classification: EventClassification | 'all',
    showCanceled: boolean = false,
    now: Date = getNow()
): CalendarEvent[] {
    return events.filter(event => {
        const eventClass = classifyEvent(event, now)
        
        if (classification === 'all') {
            // Show all non-canceled, or canceled if showCanceled is true
            return eventClass !== 'canceled' || showCanceled
        }
        
        if (classification === 'canceled') {
            return eventClass === 'canceled' && showCanceled
        }
        
        // For upcoming/past, exclude canceled unless showCanceled is true
        if (eventClass === 'canceled') {
            return showCanceled
        }
        
        return eventClass === classification
    })
}

/**
 * Count events by classification
 */
export function countByClassification(
    events: CalendarEvent[],
    _showCanceled: boolean = false,
    now: Date = getNow()
): { upcoming: number; past: number; canceled: number; total: number } {
    const counts = {
        upcoming: 0,
        past: 0,
        canceled: 0,
        total: events.length
    }
    
    events.forEach(event => {
        const classification = classifyEvent(event, now)
        
        if (classification === 'canceled') {
            counts.canceled++
        } else if (classification === 'upcoming') {
            counts.upcoming++
        } else {
            counts.past++
        }
    })
    
    return counts
}

/**
 * Get the next upcoming event (soonest first)
 */
export function getNextUpcomingEvent(
    events: CalendarEvent[],
    showCanceled: boolean = false,
    now: Date = getNow()
): CalendarEvent | null {
    const upcoming = filterByClassification(events, 'upcoming', showCanceled, now)
        .filter(e => !isCanceled(e))
        .sort((a, b) => {
            const aTime = new Date(a.start_time).getTime()
            const bTime = new Date(b.start_time).getTime()
            return aTime - bTime
        })
    
    return upcoming.length > 0 ? upcoming[0] : null
}
