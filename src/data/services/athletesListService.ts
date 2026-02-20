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
import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS, DEMO_ORG_A_ID } from '../config'
import { fakeChildren, fakeFamilies, fakeTeamMembers, fakeSports, fakeTeams } from '../fake'
import { getTeamMembersForSeason, SEASON_SPRING_CURRENT_ID } from '../fake/relationships'

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
}

async function simulateDelay() {
    await new Promise(resolve => setTimeout(resolve, FAKE_DATA_DELAY_MS))
}

/**
 * Get all athletes for an organization
 * Returns fake data if USE_FAKE_DATA is true
 */
export async function getAthletes(orgId: string): Promise<OperationResult<AthleteCardData[]>> {
    console.groupCollapsed(`%cgetAthletes: ${orgId}`, 'color: #666; font-weight: bold;')
    debug.data('AthletesListService.getAthletes', 'Request', { orgId })
    debug.perf.start('athletesListService.getAthletes')

    try {
        if (USE_FAKE_DATA) {
            await simulateDelay()

            // Get athletes for this org using fakeChildren (same as familyService)
            // When USE_FAKE_DATA is true, use DEMO_ORG_A_ID instead of the real orgId
            const fakeOrgId = DEMO_ORG_A_ID
            const athletesForOrg = fakeChildren
                .filter(c => fakeFamilies.find(f => f.id === c.family_id)?.org_id === fakeOrgId)

            // Enrich with team and sport data
            const enriched: AthleteCardData[] = athletesForOrg.map(athlete => {
                // Find primary team membership
                const teamMembership = fakeTeamMembers.find(
                    tm => tm.athlete_id === athlete.id && tm.role !== 'inactive'
                )
                const team = teamMembership
                    ? fakeTeams.find(t => t.id === teamMembership.team_id)
                    : null

                // Find primary sport from team
                const sport = team
                    ? fakeSports.find(s => s.id === team.sport_id)
                    : null

                return {
                    id: athlete.id,
                    first_name: athlete.first_name,
                    last_name: athlete.last_name,
                    birthdate: athlete.date_of_birth,
                    gender: athlete.gender,
                    jersey_number: athlete.jersey_number,
                    photo_url: athlete.photo_url,
                    has_profile_photo: !!athlete.photo_url,
                    org_id: orgId,
                    primary_team: team ? { id: team.id, name: team.name } : null,
                    primary_sport: sport ? { id: sport.id, name: sport.name } : null,
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

        // Enrich data with team and sport info
        const enrichedAthletes = await Promise.all(
            (data || []).map(async (d: any) => {
                // Get primary team
                const { data: teamMembership } = await supabase
                    .from('team_memberships')
                    .select('team:teams(id, name)')
                    .eq('athlete_id', d.athlete_id)
                    .eq('status', 'active')
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle()

                // Get primary sport
                const { data: athleteSport } = await supabase
                    .from('athlete_sports')
                    .select('sport:sports(id, name)')
                    .eq('athlete_id', d.athlete_id)
                    .eq('is_primary', true)
                    .limit(1)
                    .maybeSingle()

                return {
                    id: d.athlete_id,
                    first_name: d.first_name,
                    last_name: d.last_name,
                    birthdate: d.birthdate,
                    gender: d.gender,
                    jersey_number: d.jersey_number,
                    photo_url: null,
                    has_profile_photo: d.has_profile_photo,
                    org_id: orgId,
                    primary_team: teamMembership?.team,
                    primary_sport: athleteSport?.sport,
                } as AthleteCardData
            })
        )

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
