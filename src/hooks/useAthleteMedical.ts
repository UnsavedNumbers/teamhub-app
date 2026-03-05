/**
 * useAthleteMedical Hook
 * 
 * Manages athlete medical data with strict permission enforcement.
 * Access is controlled by RLS policies.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useIsMounted } from './useIsMounted'
import {
    getAthleteMedical,
    upsertAthleteMedical,
} from '../data/services/athleteMedicalService'
import type { AthleteMedicalPrivate, EmergencyContact } from '../types/athleteSportProfiles'
import { getAthleteSensitiveAccess } from '../data/services/sensitiveAccessService'
import { canAccessSensitiveData } from '../utils/sensitiveAccess'

interface UseAthleteMedicalResult {
    medical: AthleteMedicalPrivate | null
    loading: boolean
    error: Error | null
    updating: boolean
    hasPermission: boolean
    canUpdate: boolean
    updateMedical: (
        medicalNotes: string | null,
        allergies: string | null,
        emergencyContact: EmergencyContact | null
    ) => Promise<boolean>
    refetch: () => void
}

/**
 * Hook to fetch and manage athlete medical data
 * 
 * @param athleteId - Athlete ID
 * @returns Object containing medical data, loading states, permission status, and mutation functions
 */
export function useAthleteMedical(athleteId: string | null): UseAthleteMedicalResult {
    const isMounted = useIsMounted()

    const [medical, setMedical] = useState<AthleteMedicalPrivate | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [hasPermission, setHasPermission] = useState(false)
    const [canUpdate, setCanUpdate] = useState(false)
    const [trigger, setTrigger] = useState(0)

    const abortControllerRef = useRef<AbortController | null>(null)

    const refetch = useCallback(() => {
        setTrigger(prev => prev + 1)
    }, [])

    // Fetch medical data
    useEffect(() => {
        if (!athleteId) {
            if (isMounted.current) {
                setLoading(false)
                setMedical(null)
                setError(null)
                setHasPermission(false)
                setCanUpdate(false)
            }
            return
        }

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        const controller = new AbortController()
        abortControllerRef.current = controller

        if (!isMounted.current) return

        setLoading(true)
        setError(null)

        const loadMedical = async () => {
            try {
                const { data: access } = await getAthleteSensitiveAccess(athleteId)
                const permission = canAccessSensitiveData(access, 'medical', 'read')
                const updatePermission = canAccessSensitiveData(access, 'medical', 'update')

                if (controller.signal.aborted) return
                if (!isMounted.current) return

                setHasPermission(permission)
                setCanUpdate(updatePermission)

                if (!permission) {
                    setMedical(null)
                    setError(new Error('You do not have permission to view medical data for this athlete'))
                    return
                }

                // Fetch medical data
                const { data, error: fetchError } = await getAthleteMedical(athleteId)

                if (controller.signal.aborted) return
                if (!isMounted.current) return

                if (fetchError) {
                    // Check if it's a permission error
                    if (fetchError.message === 'Permission denied') {
                        setHasPermission(false)
                        setMedical(null)
                        setError(fetchError)
                        return
                    }
                    throw fetchError
                }

                setMedical(data)
                setError(null)
            } catch (err) {
                if (controller.signal.aborted) return
                if (!isMounted.current) return

                const error = err instanceof Error ? err : new Error('Failed to load medical data')
                setError(error)
                setMedical(null)
                setHasPermission(false)
                setCanUpdate(false)
            } finally {
                if (controller.signal.aborted) return
                if (!isMounted.current) return

                setLoading(false)
            }
        }

        loadMedical()

        return () => {
            controller.abort()
            abortControllerRef.current = null
        }
    }, [athleteId, trigger, isMounted])

    // Update medical data (optimistic update)
    const updateMedical = useCallback(async (
        medicalNotes: string | null,
        allergies: string | null,
        emergencyContact: EmergencyContact | null
    ): Promise<boolean> => {
        if (!athleteId) {
            console.error('[useAthleteMedical] Cannot update: missing athleteId')
            return false
        }

        if (!hasPermission || !canUpdate) {
            console.error('[useAthleteMedical] Cannot update: no permission')
            setError(new Error('You do not have permission to update medical data for this athlete'))
            return false
        }

        setUpdating(true)
        setError(null)

        // Optimistic update
        const previousMedical = medical
        if (medical) {
            setMedical({
                ...medical,
                medical_notes: medicalNotes,
                allergies: allergies,
                emergency_contact: emergencyContact,
                updated_at: new Date().toISOString(),
            })
        } else {
            // Create optimistic new medical record
            setMedical({
                athlete_id: athleteId,
                org_id: '', // Will be filled by server
                medical_notes: medicalNotes,
                allergies: allergies,
                emergency_contact: emergencyContact,
                updated_by: null,
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            })
        }

        try {
            const { data, error: updateError } = await upsertAthleteMedical(
                athleteId,
                medicalNotes,
                allergies,
                emergencyContact
            )

            if (!isMounted.current) return false

            if (updateError) {
                // Check if it's a permission error
                if (updateError.message.includes('Permission denied')) {
                    setHasPermission(false)
                }
                throw updateError
            }

            setMedical(data)
            setError(null)
            return true
        } catch (err) {
            if (!isMounted.current) return false

            // Rollback optimistic update
            setMedical(previousMedical)

            const error = err instanceof Error ? err : new Error('Failed to update medical data')
            setError(error)
            console.error('[useAthleteMedical] Update failed:', error)
            return false
        } finally {
            if (isMounted.current) {
                setUpdating(false)
            }
        }
    }, [athleteId, medical, hasPermission, canUpdate, isMounted])

    return {
        medical,
        loading,
        error,
        updating,
        hasPermission,
        canUpdate,
        updateMedical,
        refetch,
    }
}
