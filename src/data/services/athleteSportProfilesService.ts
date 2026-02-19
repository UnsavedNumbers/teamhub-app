/**
 * Athlete Sport Profiles Service
 * 
 * Handles CRUD operations for athlete sport-specific profiles.
 * Each athlete can have multiple sport profiles (one per sport per org).
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import {
    getSportProfileForAthlete,
    getSportProfilesForAthlete,
} from '../fake/fakeAthleteSportProfiles'
import type {
    AthleteSportProfile,
} from '../../types/athleteSportProfiles'
import type { SportCode } from '../../types/sports'

const isMissingTableError = (err: any) =>
    err?.code === 'PGRST205' ||
    (typeof err?.message === 'string' && err.message.includes("Could not find the table 'public.athlete_sport_profiles'"))

const missingTableError = () =>
    new Error(
        'Athlete sport profiles are not available because the table public.athlete_sport_profiles is missing. ' +
        'Run the migration 20260231000000_athlete_sport_profiles.sql (and related RLS/seed files) on your Supabase project.'
    )

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
async function simulateDelay(): Promise<void> {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

export async function getAthleteSportProfile(
    athleteId: string,
    sportCode: SportCode
): Promise<ServiceResponse<AthleteSportProfile>> {
    console.groupCollapsed(`%cgetAthleteSportProfile: ${athleteId} - ${sportCode}`, 'color: #666; font-weight: bold;');
    debug.data('AthleteSportProfilesService.getAthleteSportProfile', 'Request', { athleteId, sportCode })
    debug.perf.start('athleteSportProfilesService.getAthleteSportProfile')

    try {
        // Validate inputs
        if (!athleteId) {
            debug.perf.end('athleteSportProfilesService.getAthleteSportProfile')
            debug.error('AthleteSportProfilesService.getAthleteSportProfile', 'athleteId is required', { athleteId, sportCode })
            console.groupEnd()
            throw new Error('athleteId is required')
        }
        if (!sportCode) {
            debug.perf.end('athleteSportProfilesService.getAthleteSportProfile')
            debug.error('AthleteSportProfilesService.getAthleteSportProfile', 'sportCode is required', { athleteId, sportCode })
            console.groupEnd()
            throw new Error('sportCode is required')
        }

        if (USE_FAKE_DATA) {
            await simulateDelay()
            const profile = getSportProfileForAthlete(athleteId, sportCode)
            debug.perf.end('athleteSportProfilesService.getAthleteSportProfile')
            debug.data('AthleteSportProfilesService.getAthleteSportProfile', 'Response (fake)', { athleteId, sportCode, hasData: !!profile })
            console.groupEnd()
            return { data: profile, error: null }
        }

        const { data, error } = await supabase
            .from('athlete_sport_profiles')
            .select('*')
            .eq('athlete_id', athleteId)
            .eq('sport_code', sportCode)
            .maybeSingle()

        if (error) {
            // Not found is not an error - return null data
            if (error.code === 'PGRST116') {
                debug.perf.end('athleteSportProfilesService.getAthleteSportProfile')
                debug.data('AthleteSportProfilesService.getAthleteSportProfile', 'Response (not found)', { athleteId, sportCode })
                console.groupEnd()
                return { data: null, error: null }
            }
            if (isMissingTableError(error)) {
                debug.perf.end('athleteSportProfilesService.getAthleteSportProfile')
                debug.error('AthleteSportProfilesService.getAthleteSportProfile', 'Table missing', { athleteId, sportCode })
                console.groupEnd()
                return { data: null, error: missingTableError() }
            }
            throw error
        }

        debug.perf.end('athleteSportProfilesService.getAthleteSportProfile')
        debug.data('AthleteSportProfilesService.getAthleteSportProfile', 'Response', { athleteId, sportCode, hasData: !!data })
        console.groupEnd()
        return { data: (data ?? null) as unknown as AthleteSportProfile | null, error: null }
    } catch (err) {
        debug.perf.end('athleteSportProfilesService.getAthleteSportProfile')
        debug.error('AthleteSportProfilesService.getAthleteSportProfile', 'Failed to get sport profile', { error: err, athleteId, sportCode })
        console.groupEnd()
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

        if (USE_FAKE_DATA) {
            await simulateDelay()
            const profiles = getSportProfilesForAthlete(athleteId)
            debug.perf.end('athleteSportProfilesService.getAthleteSportProfiles')
            debug.data('AthleteSportProfilesService.getAthleteSportProfiles', 'Response (fake)', { athleteId, profileCount: profiles.length })
            console.groupEnd()
            return { data: profiles, error: null }
        }

        const { data, error } = await supabase
            .from('athlete_sport_profiles')
            .select('*')
            .eq('athlete_id', athleteId)
            .order('sport_code', { ascending: true })

        if (error) {
            if (isMissingTableError(error)) {
                debug.perf.end('athleteSportProfilesService.getAthleteSportProfiles')
                debug.error('AthleteSportProfilesService.getAthleteSportProfiles', 'Table missing', { athleteId })
                console.groupEnd()
                return { data: [], error: missingTableError() }
            }
            throw error
        }

        debug.perf.end('athleteSportProfilesService.getAthleteSportProfiles')
        debug.data('AthleteSportProfilesService.getAthleteSportProfiles', 'Response', { athleteId, profileCount: data?.length || 0 })
        console.groupEnd()
        return { data: (data || []) as unknown as AthleteSportProfile[], error: null }
    } catch (err) {
        debug.perf.end('athleteSportProfilesService.getAthleteSportProfiles')
        debug.error('AthleteSportProfilesService.getAthleteSportProfiles', 'Failed to get sport profiles', { error: err, athleteId })
        console.groupEnd()
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
    console.groupCollapsed(`%cupsertAthleteSportProfile: ${athleteId} - ${sportCode}`, 'color: #666; font-weight: bold;');
    debug.flow('AthleteSportProfilesService.upsertAthleteSportProfile', 'Upserting profile', { athleteId, sportCode, profileDataKeys: Object.keys(profileData).length, equipmentDataKeys: Object.keys(equipmentData).length })
    debug.perf.start('athleteSportProfilesService.upsertAthleteSportProfile')

    try {
        // Validate inputs
        if (!athleteId) {
            debug.perf.end('athleteSportProfilesService.upsertAthleteSportProfile')
            debug.error('AthleteSportProfilesService.upsertAthleteSportProfile', 'athleteId is required', { athleteId, sportCode })
            console.groupEnd()
            throw new Error('athleteId is required')
        }
        if (!sportCode) {
            debug.perf.end('athleteSportProfilesService.upsertAthleteSportProfile')
            debug.error('AthleteSportProfilesService.upsertAthleteSportProfile', 'sportCode is required', { athleteId, sportCode })
            console.groupEnd()
            throw new Error('sportCode is required')
        }

        // Get athlete's org_id
        const { data: athlete, error: athleteError } = await supabase
            .from('athletes')
            .select('org_id')
            .eq('id', athleteId)
            .single()

        if (athleteError) {
            if (isMissingTableError(athleteError)) {
                throw missingTableError()
            }
            throw athleteError
        }
        if (!athlete) throw new Error('Athlete not found')

        // Get current user ID for audit trail
        const { data: { user } } = await supabase.auth.getUser()
        const userId = user?.id || null

        // Calculate completeness score (simplified - can be enhanced later)
        const completenessScore = calculateCompletenessScore(profileData, equipmentData)

        // Prepare upsert data
        const upsertData = {
            athlete_id: athleteId,
            org_id: (athlete as any).org_id,
            sport_code: sportCode,
            profile_data: profileData as any,
            equipment_data: equipmentData as any,
            completeness_score: completenessScore,
            updated_by: userId,
            updated_at: new Date().toISOString(),
        } as any

        // Upsert (insert or update based on unique constraint)
        const { data, error } = await supabase
            .from('athlete_sport_profiles')
            .upsert(upsertData, {
                onConflict: 'org_id,athlete_id,sport_code',
            })
            .select()
            .maybeSingle()

        if (error) {
            if (isMissingTableError(error)) {
                debug.perf.end('athleteSportProfilesService.upsertAthleteSportProfile')
                debug.error('AthleteSportProfilesService.upsertAthleteSportProfile', 'Table missing', { athleteId, sportCode })
                console.groupEnd()
                throw missingTableError()
            }
            throw error
        }

        debug.perf.end('athleteSportProfilesService.upsertAthleteSportProfile')
        debug.flow('AthleteSportProfilesService.upsertAthleteSportProfile', 'Profile upserted successfully', { athleteId, sportCode })
        console.groupEnd()
        console.log(`[AthleteSportProfilesService] Upserted sport profile for athlete ${athleteId}, sport ${sportCode}`)

        return { data: (data ?? null) as unknown as AthleteSportProfile | null, error: null }
    } catch (err) {
        debug.perf.end('athleteSportProfilesService.upsertAthleteSportProfile')
        debug.error('AthleteSportProfilesService.upsertAthleteSportProfile', 'Failed to upsert profile', { error: err, athleteId, sportCode })
        console.groupEnd()
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

        const result = await upsertAthleteSportProfile(athleteId, sportCode, mergedProfileData, equipmentData)
        debug.perf.end('athleteSportProfilesService.updateAthleteSportProfileData')
        if (result.error) {
            debug.error('AthleteSportProfilesService.updateAthleteSportProfileData', 'Failed to update profile data', { error: result.error, athleteId, sportCode })
        } else {
            debug.flow('AthleteSportProfilesService.updateAthleteSportProfileData', 'Profile data updated successfully', { athleteId, sportCode })
        }
        console.groupEnd()
        return result
    } catch (err) {
        debug.perf.end('athleteSportProfilesService.updateAthleteSportProfileData')
        debug.error('AthleteSportProfilesService.updateAthleteSportProfileData', 'Exception updating profile data', { error: err, athleteId, sportCode })
        console.groupEnd()
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

        const result = await upsertAthleteSportProfile(athleteId, sportCode, profileData, mergedEquipmentData)
        debug.perf.end('athleteSportProfilesService.updateAthleteSportEquipmentData')
        if (result.error) {
            debug.error('AthleteSportProfilesService.updateAthleteSportEquipmentData', 'Failed to update equipment data', { error: result.error, athleteId, sportCode })
        } else {
            debug.flow('AthleteSportProfilesService.updateAthleteSportEquipmentData', 'Equipment data updated successfully', { athleteId, sportCode })
        }
        console.groupEnd()
        return result
    } catch (err) {
        debug.perf.end('athleteSportProfilesService.updateAthleteSportEquipmentData')
        debug.error('AthleteSportProfilesService.updateAthleteSportEquipmentData', 'Exception updating equipment data', { error: err, athleteId, sportCode })
        console.groupEnd()
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
    console.groupCollapsed(`%cmarkSportProfileAsVerified: ${athleteId} - ${sportCode}`, 'color: #666; font-weight: bold;');
    debug.flow('AthleteSportProfilesService.markSportProfileAsVerified', 'Marking profile as verified', { athleteId, sportCode })
    debug.perf.start('athleteSportProfilesService.markSportProfileAsVerified')

    try {
        // Validate inputs
        if (!athleteId) {
            debug.perf.end('athleteSportProfilesService.markSportProfileAsVerified')
            debug.error('AthleteSportProfilesService.markSportProfileAsVerified', 'athleteId is required', { athleteId, sportCode })
            console.groupEnd()
            throw new Error('athleteId is required')
        }
        if (!sportCode) {
            debug.perf.end('athleteSportProfilesService.markSportProfileAsVerified')
            debug.error('AthleteSportProfilesService.markSportProfileAsVerified', 'sportCode is required', { athleteId, sportCode })
            console.groupEnd()
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
            .maybeSingle()

        if (error) {
            if (isMissingTableError(error)) {
                debug.perf.end('athleteSportProfilesService.markSportProfileAsVerified')
                debug.error('AthleteSportProfilesService.markSportProfileAsVerified', 'Table missing', { athleteId, sportCode })
                console.groupEnd()
                throw missingTableError()
            }
            throw error
        }

        debug.perf.end('athleteSportProfilesService.markSportProfileAsVerified')
        debug.flow('AthleteSportProfilesService.markSportProfileAsVerified', 'Profile marked as verified successfully', { athleteId, sportCode })
        console.groupEnd()
        console.log(`[AthleteSportProfilesService] Marked sport profile as verified for athlete ${athleteId}, sport ${sportCode}`)

        return { data: (data ?? null) as unknown as AthleteSportProfile | null, error: null }
    } catch (err) {
        debug.perf.end('athleteSportProfilesService.markSportProfileAsVerified')
        debug.error('AthleteSportProfilesService.markSportProfileAsVerified', 'Failed to mark profile as verified', { error: err, athleteId, sportCode })
        console.groupEnd()
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

        if (error) {
            if (isMissingTableError(error)) {
                debug.perf.end('athleteSportProfilesService.deleteAthleteSportProfile')
                debug.error('AthleteSportProfilesService.deleteAthleteSportProfile', 'Table missing', { athleteId, sportCode })
                console.groupEnd()
                throw missingTableError()
            }
            throw error
        }

        debug.perf.end('athleteSportProfilesService.deleteAthleteSportProfile')
        debug.flow('AthleteSportProfilesService.deleteAthleteSportProfile', 'Profile deleted successfully', { athleteId, sportCode })
        console.groupEnd()
        console.log(`[AthleteSportProfilesService] Deleted sport profile for athlete ${athleteId}, sport ${sportCode}`)

        return { data: null, error: null }
    } catch (err) {
        debug.perf.end('athleteSportProfilesService.deleteAthleteSportProfile')
        debug.error('AthleteSportProfilesService.deleteAthleteSportProfile', 'Failed to delete profile', { error: err, athleteId, sportCode })
        console.groupEnd()
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
