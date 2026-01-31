/**
 * Athlete Medical Service
 * 
 * Handles medical data for athletes (protected table with strict RLS).
 * Access is controlled by RLS policies and org settings.
 */

import { supabase } from '../../lib/supabase'
import type {
    AthleteMedicalPrivate,
    EmergencyContact,
} from '../../types/athleteSportProfiles'

/**
 * Service response wrapper
 */
interface ServiceResponse<T> {
    data: T | null
    error: Error | null
}

/**
 * Get athlete medical data
 * Will return null if user doesn't have permission (RLS will block)
 */
export async function getAthleteMedical(
    athleteId: string
): Promise<ServiceResponse<AthleteMedicalPrivate>> {
    try {
        // Validate input
        if (!athleteId) {
            throw new Error('athleteId is required')
        }

        const { data, error } = await supabase
            .from('athlete_medical_private')
            .select('*')
            .eq('athlete_id', athleteId)
            .single()

        if (error) {
            // Not found is not an error - return null data
            if (error.code === 'PGRST116') {
                return { data: null, error: null }
            }

            // RLS denied - user doesn't have permission
            if (error.code === 'PGRST301' || error.message?.includes('permission')) {
                console.warn('[AthleteMedicalService] Permission denied for athlete medical data')
                return { data: null, error: new Error('Permission denied') }
            }

            throw error
        }

        return { data, error: null }
    } catch (err) {
        console.error('[AthleteMedicalService] Error getting athlete medical data:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Upsert athlete medical data
 * Creates or updates medical information
 */
export async function upsertAthleteMedical(
    athleteId: string,
    medicalNotes: string | null,
    allergies: string | null,
    emergencyContact: EmergencyContact | null
): Promise<ServiceResponse<AthleteMedicalPrivate>> {
    try {
        // Validate inputs
        if (!athleteId) {
            throw new Error('athleteId is required')
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

        // Prepare upsert data
        const upsertData = {
            athlete_id: athleteId,
            org_id: athlete.org_id,
            medical_notes: medicalNotes,
            allergies: allergies,
            emergency_contact: emergencyContact,
            updated_by: userId,
            updated_at: new Date().toISOString(),
        }

        // Upsert (insert or update based on primary key)
        const { data, error } = await supabase
            .from('athlete_medical_private')
            .upsert(upsertData, {
                onConflict: 'athlete_id',
            })
            .select()
            .single()

        if (error) {
            // RLS denied - user doesn't have permission
            if (error.code === 'PGRST301' || error.message?.includes('permission')) {
                throw new Error('Permission denied: You do not have access to update medical data for this athlete')
            }
            throw error
        }

        console.log(`[AthleteMedicalService] Upserted medical data for athlete ${athleteId}`)

        return { data, error: null }
    } catch (err) {
        console.error('[AthleteMedicalService] Error upserting athlete medical data:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Update only medical notes
 */
export async function updateMedicalNotes(
    athleteId: string,
    medicalNotes: string | null
): Promise<ServiceResponse<AthleteMedicalPrivate>> {
    try {
        // Validate input
        if (!athleteId) {
            throw new Error('athleteId is required')
        }

        // Get current data to preserve other fields
        const { data: current } = await getAthleteMedical(athleteId)

        return await upsertAthleteMedical(
            athleteId,
            medicalNotes,
            current?.allergies || null,
            current?.emergency_contact || null
        )
    } catch (err) {
        console.error('[AthleteMedicalService] Error updating medical notes:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Update only allergies
 */
export async function updateAllergies(
    athleteId: string,
    allergies: string | null
): Promise<ServiceResponse<AthleteMedicalPrivate>> {
    try {
        // Validate input
        if (!athleteId) {
            throw new Error('athleteId is required')
        }

        // Get current data to preserve other fields
        const { data: current } = await getAthleteMedical(athleteId)

        return await upsertAthleteMedical(
            athleteId,
            current?.medical_notes || null,
            allergies,
            current?.emergency_contact || null
        )
    } catch (err) {
        console.error('[AthleteMedicalService] Error updating allergies:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Update only emergency contact
 */
export async function updateEmergencyContact(
    athleteId: string,
    emergencyContact: EmergencyContact | null
): Promise<ServiceResponse<AthleteMedicalPrivate>> {
    try {
        // Validate input
        if (!athleteId) {
            throw new Error('athleteId is required')
        }

        // Validate emergency contact structure if provided
        if (emergencyContact) {
            if (!emergencyContact.name || !emergencyContact.relationship || !emergencyContact.phone) {
                throw new Error('Emergency contact must include name, relationship, and phone')
            }
        }

        // Get current data to preserve other fields
        const { data: current } = await getAthleteMedical(athleteId)

        return await upsertAthleteMedical(
            athleteId,
            current?.medical_notes || null,
            current?.allergies || null,
            emergencyContact
        )
    } catch (err) {
        console.error('[AthleteMedicalService] Error updating emergency contact:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Delete athlete medical data
 * Note: Only org admins should be able to do this (enforced by RLS)
 */
export async function deleteAthleteMedical(
    athleteId: string
): Promise<ServiceResponse<void>> {
    try {
        // Validate input
        if (!athleteId) {
            throw new Error('athleteId is required')
        }

        const { error } = await supabase
            .from('athlete_medical_private')
            .delete()
            .eq('athlete_id', athleteId)

        if (error) {
            // RLS denied - user doesn't have permission
            if (error.code === 'PGRST301' || error.message?.includes('permission')) {
                throw new Error('Permission denied: You do not have access to delete medical data for this athlete')
            }
            throw error
        }

        console.log(`[AthleteMedicalService] Deleted medical data for athlete ${athleteId}`)

        return { data: null, error: null }
    } catch (err) {
        console.error('[AthleteMedicalService] Error deleting athlete medical data:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Check if current user has permission to view athlete medical data
 * This is a helper function - actual permission is enforced by RLS
 */
export async function canViewAthleteMedical(athleteId: string): Promise<boolean> {
    try {
        const { data, error } = await getAthleteMedical(athleteId)

        // If we got data or a "not found" error, user has permission
        // If we got a permission error, user doesn't have permission
        if (error?.message === 'Permission denied') {
            return false
        }

        return true
    } catch (err) {
        console.error('[AthleteMedicalService] Error checking medical data permission:', err)
        return false
    }
}
