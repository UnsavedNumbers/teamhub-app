/**
 * Athlete Medical Service
 * 
 * Handles medical data for athletes (protected table with strict RLS).
 * Access is controlled by RLS policies and org settings.
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import { getAthleteSensitiveAccess } from './sensitiveAccessService'
import type {
    AthleteMedicalPrivate,
    EmergencyContact,
} from '../../types/athleteSportProfiles'
import { canAccessSensitiveData } from '../../utils/sensitiveAccess'

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
    console.groupCollapsed(`%cgetAthleteMedical: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.data('AthleteMedicalService.getAthleteMedical', 'Request', { athleteId })
    debug.perf.start('athleteMedicalService.getAthleteMedical')

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

        debug.perf.end('athleteMedicalService.getAthleteMedical')
        debug.data('AthleteMedicalService.getAthleteMedical', 'Response', { athleteId, hasData: !!data })
        console.groupEnd()
        return { data: data as unknown as AthleteMedicalPrivate, error: null }
    } catch (err) {
        debug.perf.end('athleteMedicalService.getAthleteMedical')
        debug.error('AthleteMedicalService.getAthleteMedical', 'Failed to get athlete medical data', { error: err, athleteId })
        console.groupEnd()
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
    console.groupCollapsed(`%cupsertAthleteMedical: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.flow('AthleteMedicalService.upsertAthleteMedical', 'Upserting medical data', { athleteId, hasNotes: !!medicalNotes, hasAllergies: !!allergies, hasEmergencyContact: !!emergencyContact })
    debug.perf.start('athleteMedicalService.upsertAthleteMedical')

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
            org_id: (athlete as any).org_id,
            medical_notes: medicalNotes,
            allergies: allergies,
            emergency_contact: emergencyContact,
            updated_by: userId,
            updated_at: new Date().toISOString(),
        } as any

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

        debug.perf.end('athleteMedicalService.upsertAthleteMedical')
        debug.flow('AthleteMedicalService.upsertAthleteMedical', 'Medical data upserted successfully', { athleteId })
        console.groupEnd()
        console.log(`[AthleteMedicalService] Upserted medical data for athlete ${athleteId}`)

        return { data: data as unknown as AthleteMedicalPrivate, error: null }
    } catch (err) {
        debug.perf.end('athleteMedicalService.upsertAthleteMedical')
        debug.error('AthleteMedicalService.upsertAthleteMedical', 'Failed to upsert medical data', { error: err, athleteId })
        console.groupEnd()
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
    console.groupCollapsed(`%cupdateMedicalNotes: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.flow('AthleteMedicalService.updateMedicalNotes', 'Updating medical notes', { athleteId, hasNotes: !!medicalNotes })
    debug.perf.start('athleteMedicalService.updateMedicalNotes')

    try {
        // Validate input
        if (!athleteId) {
            debug.perf.end('athleteMedicalService.updateMedicalNotes')
            debug.error('AthleteMedicalService.updateMedicalNotes', 'athleteId is required', { athleteId })
            console.groupEnd()
            throw new Error('athleteId is required')
        }

        // Get current data to preserve other fields
        const { data: current } = await getAthleteMedical(athleteId)

        const result = await upsertAthleteMedical(
            athleteId,
            medicalNotes,
            current?.allergies || null,
            current?.emergency_contact || null
        )
        debug.perf.end('athleteMedicalService.updateMedicalNotes')
        if (result.error) {
            debug.error('AthleteMedicalService.updateMedicalNotes', 'Failed to update medical notes', { error: result.error, athleteId })
        } else {
            debug.flow('AthleteMedicalService.updateMedicalNotes', 'Medical notes updated successfully', { athleteId })
        }
        console.groupEnd()
        return result
    } catch (err) {
        debug.perf.end('athleteMedicalService.updateMedicalNotes')
        debug.error('AthleteMedicalService.updateMedicalNotes', 'Exception updating medical notes', { error: err, athleteId })
        console.groupEnd()
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
    console.groupCollapsed(`%cupdateAllergies: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.flow('AthleteMedicalService.updateAllergies', 'Updating allergies', { athleteId, hasAllergies: !!allergies })
    debug.perf.start('athleteMedicalService.updateAllergies')

    try {
        // Validate input
        if (!athleteId) {
            throw new Error('athleteId is required')
        }

        // Get current data to preserve other fields
        const { data: current } = await getAthleteMedical(athleteId)

        const result = await upsertAthleteMedical(
            athleteId,
            current?.medical_notes || null,
            allergies,
            current?.emergency_contact || null
        )
        debug.perf.end('athleteMedicalService.updateAllergies')
        if (result.error) {
            debug.error('AthleteMedicalService.updateAllergies', 'Failed to update allergies', { error: result.error, athleteId })
        } else {
            debug.flow('AthleteMedicalService.updateAllergies', 'Allergies updated successfully', { athleteId })
        }
        console.groupEnd()
        return result
    } catch (err) {
        debug.perf.end('athleteMedicalService.updateAllergies')
        debug.error('AthleteMedicalService.updateAllergies', 'Exception updating allergies', { error: err, athleteId })
        console.groupEnd()
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
    console.groupCollapsed(`%cupdateEmergencyContact: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.flow('AthleteMedicalService.updateEmergencyContact', 'Updating emergency contact', { athleteId, hasContact: !!emergencyContact })
    debug.perf.start('athleteMedicalService.updateEmergencyContact')

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

        const result = await upsertAthleteMedical(
            athleteId,
            current?.medical_notes || null,
            current?.allergies || null,
            emergencyContact
        )
        debug.perf.end('athleteMedicalService.updateEmergencyContact')
        if (result.error) {
            debug.error('AthleteMedicalService.updateEmergencyContact', 'Failed to update emergency contact', { error: result.error, athleteId })
        } else {
            debug.flow('AthleteMedicalService.updateEmergencyContact', 'Emergency contact updated successfully', { athleteId })
        }
        console.groupEnd()
        return result
    } catch (err) {
        debug.perf.end('athleteMedicalService.updateEmergencyContact')
        debug.error('AthleteMedicalService.updateEmergencyContact', 'Exception updating emergency contact', { error: err, athleteId })
        console.groupEnd()
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
    console.groupCollapsed(`%cdeleteAthleteMedical: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.flow('AthleteMedicalService.deleteAthleteMedical', 'Deleting medical data', { athleteId })
    debug.perf.start('athleteMedicalService.deleteAthleteMedical')

    try {
        // Validate input
        if (!athleteId) {
            debug.perf.end('athleteMedicalService.deleteAthleteMedical')
            debug.error('AthleteMedicalService.deleteAthleteMedical', 'athleteId is required', { athleteId })
            console.groupEnd()
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

        debug.perf.end('athleteMedicalService.deleteAthleteMedical')
        debug.flow('AthleteMedicalService.deleteAthleteMedical', 'Medical data deleted successfully', { athleteId })
        console.groupEnd()
        console.log(`[AthleteMedicalService] Deleted medical data for athlete ${athleteId}`)

        return { data: null, error: null }
    } catch (err) {
        debug.perf.end('athleteMedicalService.deleteAthleteMedical')
        debug.error('AthleteMedicalService.deleteAthleteMedical', 'Failed to delete medical data', { error: err, athleteId })
        console.groupEnd()
        console.error('[AthleteMedicalService] Error deleting athlete medical data:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Check if current user has permission to view athlete medical data
 * This is a helper function - actual permission is enforced by RLS
 */
export async function canViewAthleteMedical(athleteId: string): Promise<boolean> {
    console.groupCollapsed(`%ccanViewAthleteMedical: ${athleteId}`, 'color: #666; font-weight: bold;');
    debug.data('AthleteMedicalService.canViewAthleteMedical', 'Checking permission', { athleteId })
    debug.perf.start('athleteMedicalService.canViewAthleteMedical')

    try {
        const { data } = await getAthleteSensitiveAccess(athleteId)
        const hasPermission = canAccessSensitiveData(data, 'medical', 'read')
        
        debug.perf.end('athleteMedicalService.canViewAthleteMedical')
        debug.data('AthleteMedicalService.canViewAthleteMedical', 'Permission check result', { athleteId, hasPermission })
        console.groupEnd()
        return hasPermission
    } catch (err) {
        debug.perf.end('athleteMedicalService.canViewAthleteMedical')
        debug.error('AthleteMedicalService.canViewAthleteMedical', 'Exception checking permission', { error: err, athleteId })
        console.groupEnd()
        console.error('[AthleteMedicalService] Error checking medical data permission:', err)
        return false
    }
}
