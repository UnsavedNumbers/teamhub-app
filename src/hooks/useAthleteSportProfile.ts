/**
 * useAthleteSportProfile Hook
 * 
 * Manages athlete sport-specific profile data with CRUD operations.
 * Implements optimistic updates and proper error handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useIsMounted } from './useIsMounted'
import {
    getAthleteSportProfile,
    upsertAthleteSportProfile,
    deleteAthleteSportProfile,
} from '../data/services/athleteSportProfilesService'
import type { AthleteSportProfile } from '../types/athleteSportProfiles'
import type { SportCode } from '../types/sports'

interface UseAthleteSportProfileResult {
    profile: AthleteSportProfile | null
    loading: boolean
    error: Error | null
    updating: boolean
    updateProfile: (profileData: Record<string, unknown>, equipmentData: Record<string, unknown>) => Promise<boolean>
    deleteProfile: () => Promise<boolean>
    refetch: () => void
}

/**
 * Hook to fetch and manage athlete sport profile
 * 
 * @param athleteId - Athlete ID
 * @param sportCode - Sport code (e.g., 'soccer', 'basketball')
 * @returns Object containing profile, loading states, and mutation functions
 */
export function useAthleteSportProfile(
    athleteId: string | null,
    sportCode: SportCode | null
): UseAthleteSportProfileResult {
    const isMounted = useIsMounted()

    const [profile, setProfile] = useState<AthleteSportProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [trigger, setTrigger] = useState(0)

    // AbortController for race condition prevention
    const abortControllerRef = useRef<AbortController | null>(null)

    // Stable refetch function
    const refetch = useCallback(() => {
        setTrigger(prev => prev + 1)
    }, [])

    // Fetch profile
    useEffect(() => {
        if (!athleteId || !sportCode) {
            if (isMounted.current) {
                setLoading(false)
                setProfile(null)
                setError(null)
            }
            return
        }

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        const controller = new AbortController()
        abortControllerRef.current = controller

        if (!isMounted.current) return

        setLoading(true)
        setError(null)

        const loadProfile = async () => {
            try {
                const { data, error: fetchError } = await getAthleteSportProfile(athleteId, sportCode)

                if (controller.signal.aborted) return
                if (!isMounted.current) return

                if (fetchError) {
                    throw fetchError
                }

                setProfile(data)
                setError(null)
            } catch (err) {
                if (controller.signal.aborted) return
                if (!isMounted.current) return

                const error = err instanceof Error ? err : new Error('Failed to load sport profile')
                setError(error)
                setProfile(null)
            } finally {
                if (controller.signal.aborted) return
                if (!isMounted.current) return

                setLoading(false)
            }
        }

        loadProfile()

        return () => {
            controller.abort()
            abortControllerRef.current = null
        }
    }, [athleteId, sportCode, trigger, isMounted])

    // Update profile (optimistic update)
    const updateProfile = useCallback(async (
        profileData: Record<string, unknown>,
        equipmentData: Record<string, unknown>
    ): Promise<boolean> => {
        if (!athleteId || !sportCode) {
            console.error('[useAthleteSportProfile] Cannot update: missing athleteId or sportCode')
            return false
        }

        setUpdating(true)
        setError(null)

        // Optimistic update
        const previousProfile = profile
        if (profile) {
            setProfile({
                ...profile,
                profile_data: { ...profile.profile_data, ...profileData },
                equipment_data: { ...profile.equipment_data, ...equipmentData },
                updated_at: new Date().toISOString(),
            })
        }

        try {
            const { data, error: updateError } = await upsertAthleteSportProfile(
                athleteId,
                sportCode,
                profileData,
                equipmentData
            )

            if (!isMounted.current) return false

            if (updateError) {
                throw updateError
            }

            // Update with server response
            setProfile(data)
            setError(null)
            return true
        } catch (err) {
            if (!isMounted.current) return false

            // Rollback optimistic update
            setProfile(previousProfile)

            const error = err instanceof Error ? err : new Error('Failed to update sport profile')
            setError(error)
            console.error('[useAthleteSportProfile] Update failed:', error)
            return false
        } finally {
            if (isMounted.current) {
                setUpdating(false)
            }
        }
    }, [athleteId, sportCode, profile, isMounted])

    // Delete profile
    const deleteProfile = useCallback(async (): Promise<boolean> => {
        if (!athleteId || !sportCode) {
            console.error('[useAthleteSportProfile] Cannot delete: missing athleteId or sportCode')
            return false
        }

        setUpdating(true)
        setError(null)

        // Optimistic delete
        const previousProfile = profile
        setProfile(null)

        try {
            const { error: deleteError } = await deleteAthleteSportProfile(athleteId, sportCode)

            if (!isMounted.current) return false

            if (deleteError) {
                throw deleteError
            }

            setError(null)
            return true
        } catch (err) {
            if (!isMounted.current) return false

            // Rollback optimistic delete
            setProfile(previousProfile)

            const error = err instanceof Error ? err : new Error('Failed to delete sport profile')
            setError(error)
            console.error('[useAthleteSportProfile] Delete failed:', error)
            return false
        } finally {
            if (isMounted.current) {
                setUpdating(false)
            }
        }
    }, [athleteId, sportCode, profile, isMounted])

    return {
        profile,
        loading,
        error,
        updating,
        updateProfile,
        deleteProfile,
        refetch,
    }
}
