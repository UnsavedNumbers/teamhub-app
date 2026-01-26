/**
 * Sport Context Utilities
 *
 * Provides functions to determine the current sport context for displaying
 * sport-specific imagery. Implements cascading fallback logic to ensure
 * a sport is always determined.
 */

import type { UserContext } from '../data/fake/userContext'
import { getTeamDetails, getTeamsForParent } from '../data/services/teamsService'
import { getSports } from '../data/services/sportsService'
import { getEventDetails } from '../data/services/eventsService'
import { getAthletes } from '../data/services/familyService'
import type { CalendarEvent } from '../types/calendar'

export interface SportInfo {
    id: string
    name: string
    color: string
    icon?: string
}

/**
 * Get sport information from a team ID
 */
export async function getSportFromTeam(
    context: UserContext,
    teamId: string | null | undefined
): Promise<SportInfo | null> {
    // Validate inputs
    if (!teamId || typeof teamId !== 'string') {
        console.warn('[sportContext] Invalid teamId provided to getSportFromTeam:', teamId)
        return null
    }

    if (!context || !context.orgId) {
        console.warn('[sportContext] Invalid context provided to getSportFromTeam')
        return null
    }

    try {
        const { data: teamDetails, error } = await getTeamDetails(context, teamId)

        if (error) {
            console.warn('[sportContext] Error getting team details:', error)
            return null
        }

        if (!teamDetails) {
            console.warn('[sportContext] Team not found:', teamId)
            return null
        }

        // Team details should include sport
        const sport = (teamDetails as any).sport

        if (!sport) {
            console.warn('[sportContext] Team has no sport data:', teamId)
            return null
        }

        // Validate sport has required fields
        if (!sport.id || !sport.name) {
            console.warn('[sportContext] Sport missing required fields:', sport)
            return null
        }

        return {
            id: sport.id,
            name: sport.name,
            color: sport.color || 'var(--org-btn-primary-bg, #137fec)',
            icon: sport.icon || undefined,
        }
    } catch (err) {
        console.error('[sportContext] Error getting sport from team:', err)
        return null
    }
}

/**
 * Get sport information from an event ID
 */
export async function getSportFromEvent(
    context: UserContext,
    eventId: string | null | undefined
): Promise<SportInfo | null> {
    // Validate inputs
    if (!eventId || typeof eventId !== 'string') {
        console.warn('[sportContext] Invalid eventId provided to getSportFromEvent:', eventId)
        return null
    }

    if (!context || !context.orgId) {
        console.warn('[sportContext] Invalid context provided to getSportFromEvent')
        return null
    }

    try {
        const { data: event, error } = await getEventDetails(context, eventId)

        if (error) {
            console.warn('[sportContext] Error getting event details:', error)
            return null
        }

        if (!event) {
            console.warn('[sportContext] Event not found:', eventId)
            return null
        }

        if (!event.team_id) {
            console.warn('[sportContext] Event has no team_id:', eventId)
            return null
        }

        return await getSportFromTeam(context, event.team_id)
    } catch (err) {
        console.error('[sportContext] Error getting sport from event:', err)
        return null
    }
}

/**
 * Get the primary sport for a user (most common from their children's active teams)
 */
export async function getPrimarySportForUser(
    context: UserContext
): Promise<SportInfo | null> {
    try {
        // Get user's children
        const { data: children, error: childrenError } = await getAthletes(context)
        if (childrenError || !children || children.length === 0) {
            // Fallback: try to get first sport from org
            return await getFirstSportFromOrg(context)
        }

        // Get teams for parent (includes children's teams)
        const { data: teams, error: teamsError } = await getTeamsForParent(context)
        if (teamsError || !teams || teams.length === 0) {
            return await getFirstSportFromOrg(context)
        }

        // Count sport occurrences
        const sportCounts = new Map<string, { count: number; sport: SportInfo }>()

        for (const team of teams) {
            const teamDetails = await getTeamDetails(context, team.id)
            if (teamDetails.data) {
                const sport = (teamDetails.data as any).sport
                if (sport) {
                    const existing = sportCounts.get(sport.id)
                    if (existing) {
                        existing.count++
                    } else {
                        sportCounts.set(sport.id, {
                            count: 1,
                            sport: {
                                id: sport.id,
                                name: sport.name,
                                color: sport.color,
                                icon: sport.icon,
                            },
                        })
                    }
                }
            }
        }

        // Find most common sport
        let primarySport: SportInfo | null = null
        let maxCount = 0

        for (const { count, sport } of sportCounts.values()) {
            if (count > maxCount) {
                maxCount = count
                primarySport = sport
            }
        }

        if (primarySport) {
            return primarySport
        }

        // Fallback to first sport from org
        return await getFirstSportFromOrg(context)
    } catch (err) {
        console.warn('[sportContext] Error getting primary sport for user:', err)
        return await getFirstSportFromOrg(context)
    }
}

/**
 * Get the first available sport from the organization (fallback)
 */
async function getFirstSportFromOrg(context: UserContext): Promise<SportInfo | null> {
    try {
        const { data: sports, error } = await getSports(context)
        if (error || !sports || sports.length === 0) {
            console.warn('[sportContext] No sports available for org:', context.orgId)
            return null
        }

        const firstSport = sports[0]

        // Validate sport has required fields
        if (!firstSport.name) {
            console.warn('[sportContext] First sport has no name:', firstSport)
            return null
        }

        return {
            id: firstSport.id,
            name: firstSport.name,
            color: firstSport.color || 'var(--org-btn-primary-bg, #137fec)',
            icon: firstSport.icon || undefined,
        }
    } catch (err) {
        console.error('[sportContext] Error getting first sport from org:', err)
        return null
    }
}

/**
 * Get sport for a specific context (page type)
 * Implements cascading fallback: context sport → primary sport → first org sport → default
 */
export async function getSportForContext(
    context: UserContext,
    pageType: 'dashboard' | 'calendar' | 'eventDetail' | 'travel',
    eventId?: string
): Promise<SportInfo | null> {
    // Try context-specific sport first
    if (pageType === 'eventDetail' && eventId) {
        const sport = await getSportFromEvent(context, eventId)
        if (sport) return sport
    }

    // Fall back to primary sport
    const primarySport = await getPrimarySportForUser(context)
    if (primarySport) return primarySport

    // Fall back to first sport from org
    const firstSport = await getFirstSportFromOrg(context)
    if (firstSport) return firstSport

    // Final fallback: return null (caller should handle with default)
    return null
}

/**
 * Get primary sport from a list of events
 * Used for Calendar page when multiple events are visible
 */
export async function getPrimarySportFromEvents(
    context: UserContext,
    events: CalendarEvent[]
): Promise<SportInfo | null> {
    if (!events || events.length === 0) {
        return await getPrimarySportForUser(context)
    }

    // Count sport occurrences
    const sportCounts = new Map<string, { count: number; sport: SportInfo | null }>()

    for (const event of events) {
        if (!event.team_id) continue

        const sport = await getSportFromTeam(context, event.team_id)
        if (sport) {
            const existing = sportCounts.get(sport.id)
            if (existing) {
                existing.count++
            } else {
                sportCounts.set(sport.id, {
                    count: 1,
                    sport,
                })
            }
        }
    }

    // Find most common sport
    let primarySport: SportInfo | null = null
    let maxCount = 0

    for (const { count, sport } of sportCounts.values()) {
        if (sport && count > maxCount) {
            maxCount = count
            primarySport = sport
        }
    }

    if (primarySport) {
        return primarySport
    }

    // Fallback to user's primary sport
    return await getPrimarySportForUser(context)
}
