/**
 * Athlete Sport Profiles Service
 * 
 * Handles CRUD operations for athlete sport-specific profiles.
 * Each athlete can have multiple sport profiles (one per sport per org).
 */

import { supabase } from '../../lib/supabase'
import type {
    AthleteSportProfile,
    CreateAthleteSportProfileDTO,
    UpdateAthleteSportProfileDTO,
} from '../../types/athleteSportProfiles'
import type { SportCode } from '../../types/sports'

/**
 * Service response wrapper
 */
interface ServiceResponse<T> {
    data: T | null
    error: Error | null
}

/**
 * Get a single sport profile for an athlete
 */
export async function getAthleteSportProfile(
    athleteId: string,
    sportCode: SportCode
): Promise<ServiceResponse<AthleteSportProfile>> {
    try {
        // Validate inputs
        if (!athleteId) {
            throw new Error('athleteId is required')
        }
        if (!sportCode) {
            throw new Error('sportCode is required')
        }

        const { data, error } = await supabase
            .from('athlete_sport_profiles')
            .select('*')
            .eq('athlete_id', athleteId)
            .eq('sport_code', sportCode)
            .single()

        if (error) {
            // Not found is not an error - return null data
            if (error.code === 'PGRST116') {
                return { data: null, error: null }
            }
            throw error
        }

        return { data, error: null }
    } catch (err) {
        console.error('[AthleteSportProfilesService] Error getting sport profile:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Get all sport profiles for an athlete
 */
export async function getAthleteSportProfiles(
    athleteId: string
): Promise<ServiceResponse<AthleteSportProfile[]>> {
    try {
        // Validate input
        if (!athleteId) {
            throw new Error('athleteId is required')
        }

        const { data, error } = await supabase
            .from('athlete_sport_profiles')
            .select('*')
            .eq('athlete_id', athleteId)
            .order('sport_code', { ascending: true })

        if (error) throw error

        return { data: data || [], error: null }
    } catch (err) {
        console.error('[AthleteSportProfilesService] Error getting sport profiles:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Upsert (create or update) athlete sport profile
 * Combines profile_data and equipment_data into a single operation
 */
export async function upsertAthleteSportProfile(
    athleteId: string,
    sportCode: SportCode,
    profileData: Record<string, unknown>,
    equipmentData: Record<string, unknown>
): Promise<ServiceResponse<AthleteSportProfile>> {
    try {
        // Validate inputs
        if (!athleteId) {
            throw new Error('athleteId is required')
        }
        if (!sportCode) {
            throw new Error('sportCode is required')
        }

        // Get athlete's org_id
        const { data: athlete, error: athleteError } = await supabase
            .from('athletes')
            .select('org_id')
            .eq('id', athleteId)
            .single()

        if (athleteError) throw athleteError
        if (!athlete) throw new Error('Athlete not found')

        // Get current user ID for audit trail
        const { data: { user } } = await supabase.auth.getUser()
        const userId = user?.id || null

        // Calculate completeness score (simplified - can be enhanced later)
        const completenessScore = calculateCompletenessScore(profileData, equipmentData)

        // Prepare upsert data
        const upsertData = {
            athlete_id: athleteId,
            org_id: athlete.org_id,
            sport_code: sportCode,
            profile_data: profileData,
            equipment_data: equipmentData,
            completeness_score: completenessScore,
            updated_by: userId,
            updated_at: new Date().toISOString(),
        }

        // Upsert (insert or update based on unique constraint)
        const { data, error } = await supabase
            .from('athlete_sport_profiles')
            .upsert(upsertData, {
                onConflict: 'org_id,athlete_id,sport_code',
            })
            .select()
            .single()

        if (error) throw error

        console.log(`[AthleteSportProfilesService] Upserted sport profile for athlete ${athleteId}, sport ${sportCode}`)

        return { data, error: null }
    } catch (err) {
        console.error('[AthleteSportProfilesService] Error upserting sport profile:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Update only profile_data (not equipment_data)
 */
export async function updateAthleteSportProfileData(
    athleteId: string,
    sportCode: SportCode,
    profileData: Record<string, unknown>
): Promise<ServiceResponse<AthleteSportProfile>> {
    try {
        // Validate inputs
        if (!athleteId) {
            throw new Error('athleteId is required')
        }
        if (!sportCode) {
            throw new Error('sportCode is required')
        }

        // Get current profile to merge data
        const { data: currentProfile } = await getAthleteSportProfile(athleteId, sportCode)

        const mergedProfileData = {
            ...(currentProfile?.profile_data || {}),
            ...profileData,
        }

        const equipmentData = currentProfile?.equipment_data || {}

        return await upsertAthleteSportProfile(athleteId, sportCode, mergedProfileData, equipmentData)
    } catch (err) {
        console.error('[AthleteSportProfilesService] Error updating profile data:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Update only equipment_data (not profile_data)
 */
export async function updateAthleteSportEquipmentData(
    athleteId: string,
    sportCode: SportCode,
    equipmentData: Record<string, unknown>
): Promise<ServiceResponse<AthleteSportProfile>> {
    try {
        // Validate inputs
        if (!athleteId) {
            throw new Error('athleteId is required')
        }
        if (!sportCode) {
            throw new Error('sportCode is required')
        }

        // Get current profile to merge data
        const { data: currentProfile } = await getAthleteSportProfile(athleteId, sportCode)

        const profileData = currentProfile?.profile_data || {}
        const mergedEquipmentData = {
            ...(currentProfile?.equipment_data || {}),
            ...equipmentData,
        }

        return await upsertAthleteSportProfile(athleteId, sportCode, profileData, mergedEquipmentData)
    } catch (err) {
        console.error('[AthleteSportProfilesService] Error updating equipment data:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Mark profile as verified by parent/guardian
 */
export async function markSportProfileAsVerified(
    athleteId: string,
    sportCode: SportCode
): Promise<ServiceResponse<AthleteSportProfile>> {
    try {
        // Validate inputs
        if (!athleteId) {
            throw new Error('athleteId is required')
        }
        if (!sportCode) {
            throw new Error('sportCode is required')
        }

        const { data: { user } } = await supabase.auth.getUser()
        const userId = user?.id || null

        const { data, error } = await supabase
            .from('athlete_sport_profiles')
            .update({
                last_verified_at: new Date().toISOString(),
                updated_by: userId,
                updated_at: new Date().toISOString(),
            })
            .eq('athlete_id', athleteId)
            .eq('sport_code', sportCode)
            .select()
            .single()

        if (error) throw error

        console.log(`[AthleteSportProfilesService] Marked sport profile as verified for athlete ${athleteId}, sport ${sportCode}`)

        return { data, error: null }
    } catch (err) {
        console.error('[AthleteSportProfilesService] Error marking profile as verified:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Delete athlete sport profile
 * Note: Only org admins should be able to do this (enforced by RLS)
 */
export async function deleteAthleteSportProfile(
    athleteId: string,
    sportCode: SportCode
): Promise<ServiceResponse<void>> {
    try {
        // Validate inputs
        if (!athleteId) {
            throw new Error('athleteId is required')
        }
        if (!sportCode) {
            throw new Error('sportCode is required')
        }

        const { error } = await supabase
            .from('athlete_sport_profiles')
            .delete()
            .eq('athlete_id', athleteId)
            .eq('sport_code', sportCode)

        if (error) throw error

        console.log(`[AthleteSportProfilesService] Deleted sport profile for athlete ${athleteId}, sport ${sportCode}`)

        return { data: null, error: null }
    } catch (err) {
        console.error('[AthleteSportProfilesService] Error deleting sport profile:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Calculate completeness score (0-100)
 * This is a simplified version - can be enhanced with org settings
 */
function calculateCompletenessScore(
    profileData: Record<string, unknown>,
    equipmentData: Record<string, unknown>
): number {
    const allData = { ...profileData, ...equipmentData }
    const totalFields = Object.keys(allData).length

    if (totalFields === 0) return 0

    const completedFields = Object.values(allData).filter(value => {
        if (value === null || value === undefined || value === '') return false
        if (Array.isArray(value) && value.length === 0) return false
        if (typeof value === 'object' && Object.keys(value).length === 0) return false
        return true
    }).length

    return Math.round((completedFields / totalFields) * 100)
}
