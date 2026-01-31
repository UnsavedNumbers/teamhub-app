/**
 * useOrgSportSettings Hook
 * 
 * Manages org-level sport profile field customization.
 * Only accessible to org admins (enforced by RLS).
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useIsMounted } from './useIsMounted'
import {
    getOrgSportSettings,
    upsertOrgSportSettings,
    updateFieldOverride,
    removeFieldOverride,
} from '../data/services/orgSportSettingsService'
import type { OrgSportProfileSettings, FieldOverride } from '../types/athleteSportProfiles'
import type { SportCode } from '../types/sports'

interface UseOrgSportSettingsResult {
    settings: OrgSportProfileSettings | null
    loading: boolean
    error: Error | null
    updating: boolean
    updateSettings: (overrides: Record<string, FieldOverride>) => Promise<boolean>
    updateField: (fieldKey: string, override: FieldOverride) => Promise<boolean>
    removeField: (fieldKey: string) => Promise<boolean>
    refetch: () => void
}

/**
 * Hook to fetch and manage org sport settings
 * 
 * @param orgId - Organization ID
 * @param sportCode - Sport code
 * @returns Object containing settings, loading states, and mutation functions
 */
export function useOrgSportSettings(
    orgId: string | null,
    sportCode: SportCode | null
): UseOrgSportSettingsResult {
    const isMounted = useIsMounted()

    const [settings, setSettings] = useState<OrgSportProfileSettings | null>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [error, setError] = useState<Error | null>(null)
    const [trigger, setTrigger] = useState(0)

    const abortControllerRef = useRef<AbortController | null>(null)

    const refetch = useCallback(() => {
        setTrigger(prev => prev + 1)
    }, [])

    // Fetch settings
    useEffect(() => {
        if (!orgId || !sportCode) {
            if (isMounted.current) {
                setLoading(false)
                setSettings(null)
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

        const loadSettings = async () => {
            try {
                const { data, error: fetchError } = await getOrgSportSettings(orgId, sportCode)

                if (controller.signal.aborted) return
                if (!isMounted.current) return

                if (fetchError) {
                    throw fetchError
                }

                // null data means org uses defaults (not an error)
                setSettings(data)
                setError(null)
            } catch (err) {
                if (controller.signal.aborted) return
                if (!isMounted.current) return

                const error = err instanceof Error ? err : new Error('Failed to load org sport settings')
                setError(error)
                setSettings(null)
            } finally {
                if (controller.signal.aborted) return
                if (!isMounted.current) return

                setLoading(false)
            }
        }

        loadSettings()

        return () => {
            controller.abort()
            abortControllerRef.current = null
        }
    }, [orgId, sportCode, trigger, isMounted])

    // Update all settings (optimistic update)
    const updateSettings = useCallback(async (
        overrides: Record<string, FieldOverride>
    ): Promise<boolean> => {
        if (!orgId || !sportCode) {
            console.error('[useOrgSportSettings] Cannot update: missing orgId or sportCode')
            return false
        }

        setUpdating(true)
        setError(null)

        // Optimistic update
        const previousSettings = settings
        if (settings) {
            setSettings({
                ...settings,
                overrides,
                version: settings.version + 1,
                updated_at: new Date().toISOString(),
            })
        } else {
            // Create optimistic new settings
            setSettings({
                id: 'temp-id',
                org_id: orgId,
                sport_code: sportCode,
                overrides,
                version: 1,
                updated_by: null,
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            })
        }

        try {
            const { data, error: updateError } = await upsertOrgSportSettings(orgId, sportCode, overrides)

            if (!isMounted.current) return false

            if (updateError) {
                throw updateError
            }

            setSettings(data)
            setError(null)
            return true
        } catch (err) {
            if (!isMounted.current) return false

            // Rollback optimistic update
            setSettings(previousSettings)

            const error = err instanceof Error ? err : new Error('Failed to update org sport settings')
            setError(error)
            console.error('[useOrgSportSettings] Update failed:', error)
            return false
        } finally {
            if (isMounted.current) {
                setUpdating(false)
            }
        }
    }, [orgId, sportCode, settings, isMounted])

    // Update single field override
    const updateField = useCallback(async (
        fieldKey: string,
        override: FieldOverride
    ): Promise<boolean> => {
        if (!orgId || !sportCode) {
            console.error('[useOrgSportSettings] Cannot update field: missing orgId or sportCode')
            return false
        }

        setUpdating(true)
        setError(null)

        // Optimistic update
        const previousSettings = settings
        const currentOverrides = settings?.overrides || {}
        const updatedOverrides = {
            ...currentOverrides,
            [fieldKey]: override,
        }

        if (settings) {
            setSettings({
                ...settings,
                overrides: updatedOverrides,
                version: settings.version + 1,
                updated_at: new Date().toISOString(),
            })
        } else {
            setSettings({
                id: 'temp-id',
                org_id: orgId,
                sport_code: sportCode,
                overrides: updatedOverrides,
                version: 1,
                updated_by: null,
                updated_at: new Date().toISOString(),
                created_at: new Date().toISOString(),
            })
        }

        try {
            const { data, error: updateError } = await updateFieldOverride(orgId, sportCode, fieldKey, override)

            if (!isMounted.current) return false

            if (updateError) {
                throw updateError
            }

            setSettings(data)
            setError(null)
            return true
        } catch (err) {
            if (!isMounted.current) return false

            // Rollback optimistic update
            setSettings(previousSettings)

            const error = err instanceof Error ? err : new Error('Failed to update field override')
            setError(error)
            console.error('[useOrgSportSettings] Field update failed:', error)
            return false
        } finally {
            if (isMounted.current) {
                setUpdating(false)
            }
        }
    }, [orgId, sportCode, settings, isMounted])

    // Remove field override
    const removeField = useCallback(async (fieldKey: string): Promise<boolean> => {
        if (!orgId || !sportCode) {
            console.error('[useOrgSportSettings] Cannot remove field: missing orgId or sportCode')
            return false
        }

        if (!settings) {
            // No settings exist, nothing to remove
            return true
        }

        setUpdating(true)
        setError(null)

        // Optimistic update
        const previousSettings = settings
        const { [fieldKey]: removed, ...remainingOverrides } = settings.overrides

        if (Object.keys(remainingOverrides).length === 0) {
            // If no overrides remain, settings will be deleted
            setSettings(null)
        } else {
            setSettings({
                ...settings,
                overrides: remainingOverrides,
                version: settings.version + 1,
                updated_at: new Date().toISOString(),
            })
        }

        try {
            const { data, error: removeError } = await removeFieldOverride(orgId, sportCode, fieldKey)

            if (!isMounted.current) return false

            if (removeError) {
                throw removeError
            }

            setSettings(data)
            setError(null)
            return true
        } catch (err) {
            if (!isMounted.current) return false

            // Rollback optimistic update
            setSettings(previousSettings)

            const error = err instanceof Error ? err : new Error('Failed to remove field override')
            setError(error)
            console.error('[useOrgSportSettings] Field removal failed:', error)
            return false
        } finally {
            if (isMounted.current) {
                setUpdating(false)
            }
        }
    }, [orgId, sportCode, settings, isMounted])

    return {
        settings,
        loading,
        error,
        updating,
        updateSettings,
        updateField,
        removeField,
        refetch,
    }
}
