/**
 * Athletes List Service
 * 
 * Handles CRUD operations for athletes in the admin list view.
 * - Bulk delete operations
 * - Individual delete operations
 * - Status filtering and updates
 */

import { supabase } from '../../lib/supabase'

/**
 * Result type for operations
 */
export interface OperationResult<T = void> {
    success: boolean
    data?: T
    error?: string
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
    try {
        if (!athleteId) {
            return { success: false, error: 'Athlete ID is required' }
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
            console.error('[AthletesListService] Error deleting athlete:', athleteError)
            return { success: false, error: 'Failed to delete athlete. Please try again.' }
        }

        console.log(`[AthletesListService] Athlete ${athleteId} deleted successfully`)
        return { success: true }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred'
        console.error('[AthletesListService] Unexpected error deleting athlete:', err)
        return { success: false, error: message }
    }
}

/**
 * Delete multiple athletes in bulk
 */
export async function deleteAthletes(athleteIds: string[]): Promise<OperationResult<{ deletedCount: number }>> {
    try {
        if (!athleteIds || athleteIds.length === 0) {
            return { success: false, error: 'No athletes selected' }
        }

        let deletedCount = 0

        for (const athleteId of athleteIds) {
            const result = await deleteAthlete(athleteId)
            if (result.success) {
                deletedCount++
            }
        }

        console.log(`[AthletesListService] Deleted ${deletedCount}/${athleteIds.length} athletes`)
        return { success: true, data: { deletedCount } }
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred'
        console.error('[AthletesListService] Error in bulk delete:', err)
        return { success: false, error: message }
    }
}
