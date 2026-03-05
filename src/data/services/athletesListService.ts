/**
 * Athletes List Service
 * 
 * Handles CRUD operations for athletes in the admin list view.
 * - Bulk delete operations
 * - Individual delete operations
 * - Status filtering and updates
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type { Database } from '../../lib/database.types'
import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS, DEMO_ORG_A_ID } from '../config'
import type { UserContext } from '../fake/userContext'
import { getCoachTeamIds } from '../fake/userContext'
import { getTeamMembersForSeason, SEASON_SPRING_CURRENT_ID } from '../fake/fakeTeams'
import { fakeChildren, fakeFamilies, fakeTeamMembers, fakeSports, fakeTeams } from '../fake'

/**
 * Result type for operations
 */
export interface OperationResult<T = void> {
    success: boolean
    data?: T
    error?: string
}

/**
 * Athlete card data structure
 */
export interface AthleteCardData {
    id: string
    first_name: string
    last_name: string
    birthdate: string | null
    gender: string | null
    jersey_number: number | null
    photo_url: string | null
    has_profile_photo: boolean
    org_id: string
    primary_team: { id: string; name: string } | null
    primary_sport: { id: string; name: string } | null
    sports?: Array<{ id: string; name: string }>
    teams?: Array<{
        id: string
        name: string
        org_id: string | null
        sport_id: string | null
        sport_name: string | null
        season_id: string | null
        role: string | null
        position: string | null
        jersey_number: string | null
    }>
    roles?: string[]
    positions?: string[]
    jersey_numbers?: string[]
}

async function simulateDelay() {
    await new Promise(resolve => setTimeout(resolve, FAKE_DATA_DELAY_MS))
}

function uniqueStrings(values: Array<string | null | undefined>): string[] {
    return Array.from(
        new Set(
            values
                .map((value) => value?.trim())
                .filter((value): value is string => Boolean(value))
        )
    )
}

function uniqueItemsById<T extends { id: string }>(items: T[]): T[] {
    return Array.from(new Map(items.map((item) => [item.id, item])).values())
}

type AthleteRpcRow = Database['public']['Functions']['get_athletes_with_guardian_status']['Returns'][number]

interface AthleteSportRow {
    athlete_id: string
    sport: {
        id: string
        name: string
    } | null
}

interface TeamMembershipRow {
    athlete_id: string
    season_id: string | null
    role: string | null
    position: string | null
    jersey_number: string | number | null
    team: {
        id: string
        name: string
        org_id: string | null
        sport_id: string | null
        sport: {
            id: string
            name: string
        } | null
    } | null
}

function parseJerseyNumber(value: string | number | null | undefined): number | null {
    if (value == null) return null

    const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10)
    return Number.isFinite(parsed) ? parsed : null
}

/**
 * Get all athletes for an organization
 * Returns fake data if USE_FAKE_DATA is true
 * Filters athletes for coaches based on their assigned teams
 */
export async function getAthletes(orgId: string, context?: UserContext): Promise<OperationResult<AthleteCardData[]>> {
    console.groupCollapsed(`%cgetAthletes: ${orgId}`, 'color: #666; font-weight: bold;')
    debug.data('AthletesListService.getAthletes', 'Request', { orgId })
    debug.perf.start('athletesListService.getAthletes')

    try {
        if (USE_FAKE_DATA) {
            await simulateDelay()

            // Get athletes for this org using fakeChildren (same as familyService)
            // When USE_FAKE_DATA is true, use DEMO_ORG_A_ID instead of the real orgId
            const fakeOrgId = DEMO_ORG_A_ID
            let athletesForOrg = fakeChildren
                .filter(c => fakeFamilies.find(f => f.id === c.family_id)?.org_id === fakeOrgId)
            
            // Filter athletes for coaches - only show athletes on teams they're assigned to
            if (context && context.roles.includes('coach') && !context.roles.includes('org_admin')) {
                const assignedTeamIds = await getCoachTeamIds(context)
                console.log('[AthletesListService] Coach filtering:', {
                    userId: context.userId,
                    roles: context.roles,
                    assignedTeamIds,
                    athletesBeforeFilter: athletesForOrg.length
                })
                
                if (assignedTeamIds.length > 0) {
                    const athleteIds = new Set<string>()
                    for (const teamId of assignedTeamIds) {
                        const members = getTeamMembersForSeason(teamId, SEASON_SPRING_CURRENT_ID)
                        console.log(`[AthletesListService] Team ${teamId} has ${members.length} members:`, members.map(m => m.athlete_id))
                        members.forEach((m) => athleteIds.add(m.athlete_id))
                    }
                    console.log('[AthletesListService] Total unique athlete IDs:', athleteIds.size, Array.from(athleteIds))
                    athletesForOrg = athletesForOrg.filter((c) => athleteIds.has(c.id))
                    console.log('[AthletesListService] Athletes after filter:', athletesForOrg.length)
                } else {
                    // Coach with no assigned teams sees no athletes
                    console.log('[AthletesListService] Coach has no assigned teams')
                    athletesForOrg = []
                }
            }

            // Enrich with team and sport data
            const enriched: AthleteCardData[] = athletesForOrg.map(athlete => {
                const memberships = fakeTeamMembers
                    .filter((tm) => tm.athlete_id === athlete.id && tm.status === 'active')
                    .map((membership) => {
                        const team = fakeTeams.find((candidate) => candidate.id === membership.team_id)
                        const sport = team
                            ? fakeSports.find((candidate) => candidate.id === team.sport_id)
                            : null

                        if (!team) return null

                        return {
                            id: team.id,
                            name: team.name,
                            org_id: team.org_id ?? orgId,
                            sport_id: sport?.id ?? team.sport_id ?? null,
                            sport_name: sport?.name ?? null,
                            season_id: membership.season_id,
                            role: membership.role,
                            position: membership.position,
                            jersey_number: membership.jersey_number,
                        }
                    })
                    .filter((membership): membership is NonNullable<typeof membership> => Boolean(membership))

                const sports = uniqueItemsById(
                    memberships
                        .filter((membership) => membership.sport_id && membership.sport_name)
                        .map((membership) => ({
                            id: membership.sport_id as string,
                            name: membership.sport_name as string,
                        }))
                )

                const primaryTeam = memberships[0]
                    ? { id: memberships[0].id, name: memberships[0].name }
                    : null
                const primarySport = sports[0]
                    ? { id: sports[0].id, name: sports[0].name }
                    : null
                const jerseyNumbers = uniqueStrings([
                    athlete.jersey_number,
                    ...memberships.map((membership) => membership.jersey_number),
                ])

                return {
                    id: athlete.id,
                    first_name: athlete.first_name,
                    last_name: athlete.last_name,
                    birthdate: athlete.date_of_birth,
                    gender: athlete.gender,
                    jersey_number: athlete.jersey_number ? parseInt(athlete.jersey_number, 10) || null : null,
                    photo_url: athlete.photo_url,
                    has_profile_photo: !!athlete.photo_url,
                    org_id: orgId,
                    primary_team: primaryTeam,
                    primary_sport: primarySport,
                    sports,
                    teams: memberships,
                    roles: uniqueStrings(memberships.map((membership) => membership.role)),
                    positions: uniqueStrings(memberships.map((membership) => membership.position)),
                    jersey_numbers: jerseyNumbers,
                }
            })

            debug.perf.end('athletesListService.getAthletes')
            debug.data('AthletesListService.getAthletes', 'Response (fake)', { athleteCount: enriched.length })
            console.groupEnd()
            return { success: true, data: enriched }
        }

        // Real Supabase query
        const { data, error } = await supabase
            .rpc('get_athletes_with_guardian_status', {
                p_org_id: orgId,
                p_limit: 10000,
                p_offset: 0
            })

        if (error) {
            debug.perf.end('athletesListService.getAthletes')
            debug.error('AthletesListService.getAthletes', 'Failed to get athletes', { error, orgId })
            console.groupEnd()
            throw error
        }

        if (!data || data.length === 0) {
            debug.perf.end('athletesListService.getAthletes')
            debug.data('AthletesListService.getAthletes', 'Response', { athleteCount: 0 })
            console.groupEnd()
            return { success: true, data: [] }
        }

        const athleteRows: AthleteRpcRow[] = data || []
        const athleteIds = athleteRows.map((athlete) => athlete.athlete_id)

        const [{ data: sportsData }, { data: teamMembershipsData }] = await Promise.all([
            supabase
                .from('athlete_sports')
                .select(`
                    athlete_id,
                    sport_id,
                    sport:sports(id, name)
                `)
                .in('athlete_id', athleteIds)
                .eq('org_id', orgId)
                .eq('sport_type', 'plays'),
            supabase
                .from('team_memberships')
                .select(`
                    athlete_id,
                    team_id,
                    season_id,
                    role,
                    position,
                    jersey_number,
                    team:teams!team_memberships_team_id_fkey(
                        id,
                        name,
                        org_id,
                        sport_id,
                        sport:sports(id, name)
                    )
                `)
                .in('athlete_id', athleteIds)
                .eq('status', 'active')
                .order('created_at', { ascending: false }),
        ])

        const sportsMap = new Map<string, Array<{ id: string; name: string }>>()
        const teamsMap = new Map<string, NonNullable<AthleteCardData['teams']>>()

        const athleteSportsRows = (sportsData || []) as AthleteSportRow[]
        const teamMembershipRows = (teamMembershipsData || []) as TeamMembershipRow[]

        athleteSportsRows.forEach((row) => {
            if (!row?.athlete_id || !row?.sport?.id || !row?.sport?.name) return
            const currentSports = sportsMap.get(row.athlete_id) ?? []
            currentSports.push({
                id: row.sport.id,
                name: row.sport.name,
            })
            sportsMap.set(row.athlete_id, uniqueItemsById(currentSports))
        })

        teamMembershipRows.forEach((row) => {
            const team = row?.team
            if (!row?.athlete_id || !team?.id || !team?.name) return
            if (team.org_id && team.org_id !== orgId) return

            const currentTeams = teamsMap.get(row.athlete_id) ?? []
            currentTeams.push({
                id: team.id,
                name: team.name,
                org_id: typeof team.org_id === 'string' ? team.org_id : null,
                sport_id: typeof team.sport?.id === 'string' ? team.sport.id : typeof team.sport_id === 'string' ? team.sport_id : null,
                sport_name: typeof team.sport?.name === 'string' ? team.sport.name : null,
                season_id: typeof row.season_id === 'string' ? row.season_id : null,
                role: typeof row.role === 'string' ? row.role : null,
                position: typeof row.position === 'string' ? row.position : null,
                jersey_number: row.jersey_number != null ? String(row.jersey_number) : null,
            })
            teamsMap.set(row.athlete_id, uniqueItemsById(currentTeams))

            if (typeof team.sport?.id === 'string' && typeof team.sport?.name === 'string') {
                const currentSports = sportsMap.get(row.athlete_id) ?? []
                currentSports.push({
                    id: team.sport.id,
                    name: team.sport.name,
                })
                sportsMap.set(row.athlete_id, uniqueItemsById(currentSports))
            }
        })

        const enrichedAthletes: AthleteCardData[] = athleteRows.map((d) => {
            const teams = teamsMap.get(d.athlete_id) ?? []
            const sports = sportsMap.get(d.athlete_id) ?? []
            const primaryTeam = teams[0]
                ? { id: teams[0].id, name: teams[0].name }
                : null
            const primarySport = sports[0]
                ? { id: sports[0].id, name: sports[0].name }
                : null

            const jerseyNumber = parseJerseyNumber(d.jersey_number)

            return {
                id: d.athlete_id,
                first_name: d.first_name,
                last_name: d.last_name,
                birthdate: d.birthdate,
                gender: d.gender,
                jersey_number: jerseyNumber,
                photo_url: null,
                has_profile_photo: d.has_profile_photo,
                org_id: orgId,
                primary_team: primaryTeam,
                primary_sport: primarySport,
                sports,
                teams,
                roles: uniqueStrings(teams.map((team) => team.role)),
                positions: uniqueStrings(teams.map((team) => team.position)),
                jersey_numbers: uniqueStrings([
                    jerseyNumber != null ? String(jerseyNumber) : null,
                    ...teams.map((team) => team.jersey_number),
                ]),
            }
        })

        debug.perf.end('athletesListService.getAthletes')
        debug.data('AthletesListService.getAthletes', 'Response', { athleteCount: enrichedAthletes.length })
        console.groupEnd()
        return { success: true, data: enrichedAthletes }
    } catch (err) {
        debug.perf.end('athletesListService.getAthletes')
        debug.error('AthletesListService.getAthletes', 'Exception getting athletes', { error: err, orgId })
        console.groupEnd()
        const message = err instanceof Error ? err.message : 'Unknown error occurred'
        console.error('[AthletesListService] Error getting athletes:', err)
        return { success: false, error: message, data: [] }
    }
}

/**
 * Delete a single athlete and all associated data
 * 
 * Deletes:
 * - team_memberships
 * - athlete_sports
 * - athlete_guardians
 * - athlete_medical_private
 * - gallery_photo_tags
 * - athlete record itself
 */
export async function deleteAthlete(athleteId: string): Promise<OperationResult<void>> {
    console.groupCollapsed(`%cdeleteAthlete: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.flow('AthletesListService.deleteAthlete', 'Deleting athlete', { athleteId })
    debug.perf.start('athletesListService.deleteAthlete')

    try {
        if (!athleteId) {
            debug.perf.end('athletesListService.deleteAthlete')
            debug.error('AthletesListService.deleteAthlete', 'athleteId is required', { athleteId })
            console.groupEnd()
            return { success: false, error: 'Athlete ID is required' }
        }

        if (USE_FAKE_DATA) {
            await simulateDelay()
            console.log(`[AthletesListService] Simulated delete for athlete ${athleteId}`)
            debug.perf.end('athletesListService.deleteAthlete')
            debug.flow('AthletesListService.deleteAthlete', 'Athlete deleted successfully (fake)', { athleteId })
            console.groupEnd()
            return { success: true }
        }

        // Delete in dependency order (reverse of creation)
        const operations = [
            supabase.from('team_memberships').delete().eq('athlete_id', athleteId),
            supabase.from('athlete_sports').delete().eq('athlete_id', athleteId),
            supabase.from('athlete_guardians').delete().eq('athlete_id', athleteId),
            supabase.from('athlete_medical_private').delete().eq('athlete_id', athleteId),
            supabase.from('gallery_photo_tags').delete().eq('athlete_id', athleteId),
        ]

        // Execute all deletions
        for (const op of operations) {
            const { error } = await op
            if (error) {
                console.error('[AthletesListService] Error during deletion:', error)
                // Continue with other deletions even if one fails
            }
        }

        // Finally delete the athlete record
        const { error: athleteError } = await supabase
            .from('athletes')
            .delete()
            .eq('id', athleteId)

        if (athleteError) {
            debug.perf.end('athletesListService.deleteAthlete')
            debug.error('AthletesListService.deleteAthlete', 'Failed to delete athlete record', { error: athleteError, athleteId })
            console.groupEnd()
            console.error('[AthletesListService] Error deleting athlete:', athleteError)
            return { success: false, error: 'Failed to delete athlete. Please try again.' }
        }

        debug.perf.end('athletesListService.deleteAthlete')
        debug.flow('AthletesListService.deleteAthlete', 'Athlete deleted successfully', { athleteId })
        console.groupEnd()
        console.log(`[AthletesListService] Athlete ${athleteId} deleted successfully`)
        return { success: true }
    } catch (err) {
        debug.perf.end('athletesListService.deleteAthlete')
        debug.error('AthletesListService.deleteAthlete', 'Exception deleting athlete', { error: err, athleteId })
        console.groupEnd()
        const message = err instanceof Error ? err.message : 'Unknown error occurred'
        console.error('[AthletesListService] Unexpected error deleting athlete:', err)
        return { success: false, error: message }
    }
}

/**
 * Delete multiple athletes in bulk
 */
export async function deleteAthletes(athleteIds: string[]): Promise<OperationResult<{ deletedCount: number }>> {
    console.groupCollapsed(`%cdeleteAthletes: ${athleteIds.length} athletes`, 'color: #666; font-weight: bold;');
    debug.flow('AthletesListService.deleteAthletes', 'Bulk deleting athletes', { athleteCount: athleteIds.length })
    debug.perf.start('athletesListService.deleteAthletes')

    try {
        if (!athleteIds || athleteIds.length === 0) {
            debug.perf.end('athletesListService.deleteAthletes')
            debug.error('AthletesListService.deleteAthletes', 'No athletes selected', { athleteIds })
            console.groupEnd()
            return { success: false, error: 'No athletes selected' }
        }

        if (USE_FAKE_DATA) {
            await simulateDelay()
            console.log(`[AthletesListService] Simulated bulk delete for ${athleteIds.length} athletes`)
            debug.perf.end('athletesListService.deleteAthletes')
            debug.flow('AthletesListService.deleteAthletes', 'Bulk delete completed (fake)', { athleteCount: athleteIds.length, deletedCount: athleteIds.length })
            console.groupEnd()
            return { success: true, data: { deletedCount: athleteIds.length } }
        }

        let deletedCount = 0

        for (const athleteId of athleteIds) {
            const result = await deleteAthlete(athleteId)
            if (result.success) {
                deletedCount++
            }
        }

        debug.perf.end('athletesListService.deleteAthletes')
        debug.flow('AthletesListService.deleteAthletes', 'Bulk delete completed', { athleteCount: athleteIds.length, deletedCount })
        console.groupEnd()
        console.log(`[AthletesListService] Deleted ${deletedCount}/${athleteIds.length} athletes`)
        return { success: true, data: { deletedCount } }
    } catch (err) {
        debug.perf.end('athletesListService.deleteAthletes')
        debug.error('AthletesListService.deleteAthletes', 'Exception in bulk delete', { error: err, athleteCount: athleteIds.length })
        console.groupEnd()
        const message = err instanceof Error ? err.message : 'Unknown error occurred'
        console.error('[AthletesListService] Error in bulk delete:', err)
        return { success: false, error: message }
    }
}
