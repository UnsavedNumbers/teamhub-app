/**
 * Sport Context Utilities
 *
 * Provides functions to determine the current sport context for displaying
 * sport-specific imagery. Implements cascading fallback logic to ensure
 * a sport is always determined.
 */

import type { UserContext } from '../data/fake/userContext'
import { getTeamDetails, getSports, getTeamsForParent } from '../data/services/teamsService'
import { getEventDetails } from '../data/services/eventsService'
import { getChildren } from '../data/services/familyService'
import type { CalendarEvent } from '../types/calendar'
import type { FakeTeam } from '../data/fake/fakeTeams'

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
    teamId: string
): Promise<SportInfo | null> {
    try {
        const { data: teamDetails, error } = await getTeamDetails(context, teamId)
        if (error || !teamDetails) {
            return null
        }

        // Team details should include sport
        const sport = (teamDetails as any).sport
        if (!sport) {
            return null
        }

        return {
            id: sport.id,
            name: sport.name,
            color: sport.color,
            icon: sport.icon,
        }
    } catch (err) {
        console.warn('[sportContext] Error getting sport from team:', err)
        return null
    }
}

/**
 * Get sport information from an event ID
 */
export async function getSportFromEvent(
    context: UserContext,
    eventId: string
): Promise<SportInfo | null> {
    try {
        const { data: event, error } = await getEventDetails(context, eventId)
        if (error || !event || !event.team_id) {
            return null
        }

        return await getSportFromTeam(context, event.team_id)
    } catch (err) {
        console.warn('[sportContext] Error getting sport from event:', err)
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
        const { data: children, error: childrenError } = await getChildren(context)
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
            return null
        }

        const firstSport = sports[0]
        return {
            id: firstSport.id,
            name: firstSport.name,
            color: firstSport.color,
            icon: firstSport.icon,
        }
    } catch (err) {
        console.warn('[sportContext] Error getting first sport from org:', err)
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
