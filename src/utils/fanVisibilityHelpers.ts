/**
 * Fan Visibility Helper Functions
 * 
 * Utilities for managing fan visibility across different entity types
 */

import type { EventType } from '../types/calendar'

/**
 * Get default fan visibility for a new event based on organization settings
 * @param eventType - The type of event being created
 * @param orgDefaults - Organization-level fan visibility defaults (from organization_visibility_settings.fan_visibility_defaults)
 * @returns 'public' if visible to fans by default, 'private' otherwise
 */
export function getDefaultEventVisibility(
    eventType: EventType,
    orgDefaults?: Record<string, boolean> | null
): 'public' | 'private' {
    if (!orgDefaults) {
        return eventType === 'game' ? 'public' : 'private'
    }

    if (eventType === 'game' && orgDefaults.game === undefined) {
        return 'public'
    }

    // Check if this event type has a default setting
    const isVisibleByDefault = orgDefaults[eventType] === true
    return isVisibleByDefault ? 'public' : 'private'
}

/**
 * Map fan visibility toggle state to event visibility enum
 * @param isVisibleToFans - Toggle state (true = visible to fans)
 * @returns Event visibility value for database
 */
export function mapFanVisibilityToEventVisibility(isVisibleToFans: boolean): 'public' | 'private' {
    return isVisibleToFans ? 'public' : 'private'
}

/**
 * Map event visibility enum to fan visibility toggle state
 * @param visibility - Event visibility from database
 * @returns Toggle state (true = visible to fans)
 */
export function mapEventVisibilityToFanVisibility(visibility: string | null | undefined): boolean {
    return visibility === 'public'
}

/**
 * Map fan visibility toggle state to gallery visibility enum
 * @param isVisibleToFans - Toggle state (true = visible to fans)
 * @returns Gallery visibility value for database
 */
export function mapFanVisibilityToGalleryVisibility(isVisibleToFans: boolean): 'public' | 'private' {
    return isVisibleToFans ? 'public' : 'private'
}

/**
 * Map gallery visibility enum to fan visibility toggle state
 * @param visibility - Gallery visibility from database
 * @returns Toggle state (true = visible to fans)
 *
 * Note: Galleries with 'public', 'organization', 'team', or 'guardians' visibility
 * are potentially visible to fans/guardians (subject to RLS and fans_can_see flag).
 * Only 'private' galleries are definitely not visible.
 */
export function mapGalleryVisibilityToFanVisibility(visibility: string | null | undefined): boolean {
    if (!visibility) return false
    // Galleries that are NOT private are potentially visible to fans
    return visibility !== 'private'
}

/**
 * Validate fan visibility defaults object
 * @param defaults - Fan visibility defaults object
 * @returns Validated defaults object with only valid event types
 */
export function validateFanVisibilityDefaults(
    defaults: Record<string, boolean> | null | undefined
): Record<string, boolean> {
    if (!defaults) return {}

    const validEventTypes = [
        'practice',
        'game',
        'tournament',
        'meeting',
        'tryout',
        'travel',
        'pickup_dropoff',
        'social',
        'blackout'
    ]

    const validated: Record<string, boolean> = {}
    for (const [key, value] of Object.entries(defaults)) {
        if (validEventTypes.includes(key) && typeof value === 'boolean') {
            validated[key] = value
        }
    }

    return validated
}
