/**
 * Athlete Sports Service
 *
 * Provides data access for athlete sports preferences.
 * Supports both fake data (demo mode) and real Supabase queries.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import { supabase } from '../../lib/supabase'

export type SportType = 'plays' | 'interested'

export interface AthleteSport {
    id: string
    athlete_id: string
    sport_id: string
    org_id: string
    sport_type: SportType
    created_at: string
    updated_at: string
}

export interface AthleteSportWithDetails extends AthleteSport {
    sport_name: string
}

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDelay(): Promise<void> {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

// ============================================================================
// Athlete Sports CRUD Operations
// ============================================================================

/**
 * Get all sports for an athlete
 */
export async function getAthleteSports(
    athleteId: string,
    orgId: string
): Promise<{ data: AthleteSportWithDetails[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { data: [], error: null }
    }

    try {
        const { data, error } = await supabase
            .from('athlete_sports')
            .select(`
                *,
                sport:sports(name)
            `)
            .eq('athlete_id', athleteId)
            .eq('org_id', orgId)
            .order('created_at', { ascending: true })

        if (error) throw error

        const sports = (data || []).map((row: any) => ({
            ...row,
            sport_name: row.sport?.name || 'Unknown Sport'
        })) as AthleteSportWithDetails[]

        return { data: sports, error: null }
    } catch (err) {
        console.error('[athleteSportsService] Error getting athlete sports:', err)
        return {
            data: [],
            error: err instanceof Error ? err : new Error('Unknown error')
        }
    }
}

/**
 * Update athlete's sports (replaces all existing sports)
 */
export async function updateAthleteSports(
    athleteId: string,
    orgId: string,
    sports: Array<{ sport_id: string; sport_type: SportType }>
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: null }
    }

    try {
        if (!orgId) {
            return { error: new Error('Organization is required to update sports.') }
        }

        // Remove duplicates
        const uniqueSports = [...new Map(
            sports.map(s => [`${s.sport_id}-${s.sport_type}`, s])
        ).values()]

        // Filter empty entries
        const validSports = uniqueSports.filter(s => s.sport_id && s.sport_id.trim())

        // Delete all existing sports for this athlete in this org
        const { error: deleteError } = await supabase
            .from('athlete_sports')
            .delete()
            .eq('athlete_id', athleteId)
            .eq('org_id', orgId)

        if (deleteError) throw deleteError

        // Insert new sports if any
        if (validSports.length > 0) {
            const inserts = validSports.map(s => ({
                athlete_id: athleteId,
                sport_id: s.sport_id.trim(),
                org_id: orgId,
                sport_type: (s.sport_type === 'plays' || s.sport_type === 'interested')
                    ? s.sport_type
                    : 'plays' as SportType
            }))

            const { error: insertError } = await supabase
                .from('athlete_sports')
                .insert(inserts)

            if (insertError) throw insertError
        }

        return { error: null }
    } catch (err) {
        console.error('[athleteSportsService] Error updating athlete sports:', err)
        
        // Check for permission errors
        if (err && typeof err === 'object' && 'code' in err) {
            if (err.code === 'PGRST301' || err.code === '42501') {
                return {
                    error: new Error('You do not have permission to update sports for this athlete. Only guardians can modify athlete sports.')
                }
            }
        }
        
        return {
            error: err instanceof Error ? err : new Error('Update failed')
        }
    }
}

/**
 * Add a single sport to an athlete
 */
export async function addAthleteSport(
    athleteId: string,
    sportId: string,
    orgId: string,
    sportType: SportType
): Promise<{ data: AthleteSport | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            data: {
                id: `demo-athlete-sport-${Date.now()}`,
                athlete_id: athleteId,
                sport_id: sportId,
                org_id: orgId,
                sport_type: sportType,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            },
            error: null
        }
    }

    try {
        const { data, error } = await supabase
            .from('athlete_sports')
            .insert({
                athlete_id: athleteId,
                sport_id: sportId,
                org_id: orgId,
                sport_type: sportType
            })
            .select()
            .single()

        if (error) throw error

        return { data: data as AthleteSport, error: null }
    } catch (err) {
        console.error('[athleteSportsService] Error adding athlete sport:', err)
        return {
            data: null,
            error: err instanceof Error ? err : new Error('Add failed')
        }
    }
}

/**
 * Remove a sport from an athlete
 */
export async function removeAthleteSport(
    athleteId: string,
    sportId: string,
    orgId: string,
    sportType?: SportType
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: null }
    }

    try {
        let query = supabase
            .from('athlete_sports')
            .delete()
            .eq('athlete_id', athleteId)
            .eq('sport_id', sportId)
            .eq('org_id', orgId)

        // If sportType is specified, only remove that specific type
        if (sportType) {
            query = query.eq('sport_type', sportType)
        }

        const { error } = await query

        if (error) throw error

        return { error: null }
    } catch (err) {
        console.error('[athleteSportsService] Error removing athlete sport:', err)
        return {
            error: err instanceof Error ? err : new Error('Remove failed')
        }
    }
}
