/**
 * useSportFieldDefinitions Hook
 * 
 * Fetches sport field definitions with built-in caching.
 * The service layer handles caching, so this hook is primarily for React state management.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useIsMounted } from './useIsMounted'
import {
    getSportFieldDefinitions,
    getSportProfileFields,
    getSportEquipmentFields,
    clearFieldDefinitionsCache,
} from '../data/services/sportFieldDefinitionsService'
import type { SportFieldDefinition } from '../types/athleteSportProfiles'
import type { SportCode, FieldGroup } from '../types/sports'

interface UseSportFieldDefinitionsResult {
    fields: SportFieldDefinition[]
    profileFields: SportFieldDefinition[]
    equipmentFields: SportFieldDefinition[]
    loading: boolean
    error: Error | null
    refetch: () => void
    clearCache: () => void
}

/**
 * Hook to fetch sport field definitions
 * 
 * @param sportCode - Sport code (e.g., 'soccer', 'basketball')
 * @returns Object containing field arrays, loading state, and utility functions
 */
export function useSportFieldDefinitions(
    sportCode: SportCode | null
): UseSportFieldDefinitionsResult {
    const isMounted = useIsMounted()

    const [fields, setFields] = useState<SportFieldDefinition[]>([])
    const [profileFields, setProfileFields] = useState<SportFieldDefinition[]>([])
    const [equipmentFields, setEquipmentFields] = useState<SportFieldDefinition[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [trigger, setTrigger] = useState(0)

    // AbortController for race condition prevention
    const abortControllerRef = useRef<AbortController | null>(null)

    // Stable refetch function
    const refetch = useCallback(() => {
        setTrigger(prev => prev + 1)
    }, [])

    // Clear cache and refetch
    const clearCache = useCallback(() => {
        if (sportCode) {
            clearFieldDefinitionsCache(sportCode)
        }
        refetch()
    }, [sportCode, refetch])

    // Fetch field definitions
    useEffect(() => {
        if (!sportCode) {
            if (isMounted.current) {
                setLoading(false)
                setFields([])
                setProfileFields([])
                setEquipmentFields([])
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

        const loadFields = async () => {
            try {
                // Fetch all fields, profile fields, and equipment fields in parallel
                const [allResult, profileResult, equipmentResult] = await Promise.all([
                    getSportFieldDefinitions(sportCode),
                    getSportProfileFields(sportCode),
                    getSportEquipmentFields(sportCode),
                ])

                if (controller.signal.aborted) return
                if (!isMounted.current) return

                // Check for errors
                if (allResult.error) throw allResult.error
                if (profileResult.error) throw profileResult.error
                if (equipmentResult.error) throw equipmentResult.error

                setFields(allResult.data || [])
                setProfileFields(profileResult.data || [])
                setEquipmentFields(equipmentResult.data || [])
                setError(null)
            } catch (err) {
                if (controller.signal.aborted) return
                if (!isMounted.current) return

                const error = err instanceof Error ? err : new Error('Failed to load field definitions')
                setError(error)
                setFields([])
                setProfileFields([])
                setEquipmentFields([])
            } finally {
                if (controller.signal.aborted) return
                if (!isMounted.current) return

                setLoading(false)
            }
        }

        loadFields()

        return () => {
            controller.abort()
            abortControllerRef.current = null
        }
    }, [sportCode, trigger, isMounted])

    return {
        fields,
        profileFields,
        equipmentFields,
        loading,
        error,
        refetch,
        clearCache,
    }
}

/**
 * Hook to fetch field definitions for a specific group
 * 
 * @param sportCode - Sport code
 * @param fieldGroup - Field group ('profile' or 'equipment')
 * @returns Object containing fields array and loading state
 */
export function useSportFieldDefinitionsByGroup(
    sportCode: SportCode | null,
    fieldGroup: FieldGroup | null
): {
    fields: SportFieldDefinition[]
    loading: boolean
    error: Error | null
    refetch: () => void
} {
    const isMounted = useIsMounted()

    const [fields, setFields] = useState<SportFieldDefinition[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)
    const [trigger, setTrigger] = useState(0)

    const abortControllerRef = useRef<AbortController | null>(null)

    const refetch = useCallback(() => {
        setTrigger(prev => prev + 1)
    }, [])

    useEffect(() => {
        if (!sportCode || !fieldGroup) {
            if (isMounted.current) {
                setLoading(false)
                setFields([])
                setError(null)
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

        const loadFields = async () => {
            try {
                const fetchFn = fieldGroup === 'profile' ? getSportProfileFields : getSportEquipmentFields
                const { data, error: fetchError } = await fetchFn(sportCode)

                if (controller.signal.aborted) return
                if (!isMounted.current) return

                if (fetchError) throw fetchError

                setFields(data || [])
                setError(null)
            } catch (err) {
                if (controller.signal.aborted) return
                if (!isMounted.current) return

                const error = err instanceof Error ? err : new Error('Failed to load field definitions')
                setError(error)
                setFields([])
            } finally {
                if (controller.signal.aborted) return
                if (!isMounted.current) return

                setLoading(false)
            }
        }

        loadFields()

        return () => {
            controller.abort()
            abortControllerRef.current = null
        }
    }, [sportCode, fieldGroup, trigger, isMounted])

    return {
        fields,
        loading,
        error,
        refetch,
    }
}
