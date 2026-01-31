/**
 * useAthleteUniversalFields Hook
 * 
 * Manages universal athlete profile fields (height, weight, sizes, etc.)
 * Includes unit conversion helpers for user-friendly input.
 */

import { useState, useCallback } from 'react'
import { useIsMounted } from './useIsMounted'
import {
    updateAthleteUniversalFields,
    feetInchesToCm,
    cmToFeetInches,
    lbsToKg,
    kgToLbs,
} from '../data/services/athletesService'
import type { UpdateAthleteUniversalFieldsDTO } from '../data/services/athletesService'
import type { Athlete } from '../types/family'

interface UseAthleteUniversalFieldsResult {
    updating: boolean
    error: Error | null
    updateFields: (fields: UpdateAthleteUniversalFieldsDTO) => Promise<boolean>
    updateHeight: (heightCm: number | null) => Promise<boolean>
    updateHeightImperial: (feet: number, inches: number) => Promise<boolean>
    updateWeight: (weightKg: number | null) => Promise<boolean>
    updateWeightImperial: (lbs: number) => Promise<boolean>
    updateShoeSize: (
        value: number | null,
        system: 'us' | 'eu' | 'uk' | null,
        width?: 'narrow' | 'standard' | 'wide' | null
    ) => Promise<boolean>
    updateClothingSizes: (tshirtSize: string | null, shortsSize: string | null) => Promise<boolean>
    updateDominantHand: (hand: 'left' | 'right' | 'ambidextrous' | null) => Promise<boolean>
    // Conversion helpers
    convertHeightToImperial: (cm: number) => { feet: number; inches: number }
    convertHeightToMetric: (feet: number, inches: number) => number
    convertWeightToImperial: (kg: number) => number
    convertWeightToMetric: (lbs: number) => number
}

/**
 * Hook to manage athlete universal profile fields
 * 
 * @param athleteId - Athlete ID
 * @param onSuccess - Optional callback after successful update
 * @returns Object containing update functions and conversion helpers
 */
export function useAthleteUniversalFields(
    athleteId: string | null,
    onSuccess?: (athlete: Athlete) => void
): UseAthleteUniversalFieldsResult {
    const isMounted = useIsMounted()

    const [updating, setUpdating] = useState(false)
    const [error, setError] = useState<Error | null>(null)

    // Generic update function
    const updateFields = useCallback(async (
        fields: UpdateAthleteUniversalFieldsDTO
    ): Promise<boolean> => {
        if (!athleteId) {
            console.error('[useAthleteUniversalFields] Cannot update: missing athleteId')
            return false
        }

        setUpdating(true)
        setError(null)

        try {
            const { data, error: updateError } = await updateAthleteUniversalFields(athleteId, fields)

            if (!isMounted.current) return false

            if (updateError) {
                throw updateError
            }

            if (data && onSuccess) {
                onSuccess(data)
            }

            setError(null)
            return true
        } catch (err) {
            if (!isMounted.current) return false

            const error = err instanceof Error ? err : new Error('Failed to update athlete fields')
            setError(error)
            console.error('[useAthleteUniversalFields] Update failed:', error)
            return false
        } finally {
            if (isMounted.current) {
                setUpdating(false)
            }
        }
    }, [athleteId, onSuccess, isMounted])

    // Update height (metric)
    const updateHeight = useCallback(async (heightCm: number | null): Promise<boolean> => {
        return updateFields({ height_cm: heightCm })
    }, [updateFields])

    // Update height (imperial)
    const updateHeightImperial = useCallback(async (feet: number, inches: number): Promise<boolean> => {
        const heightCm = feetInchesToCm(feet, inches)
        return updateFields({ height_cm: heightCm })
    }, [updateFields])

    // Update weight (metric)
    const updateWeight = useCallback(async (weightKg: number | null): Promise<boolean> => {
        return updateFields({ weight_kg: weightKg })
    }, [updateFields])

    // Update weight (imperial)
    const updateWeightImperial = useCallback(async (lbs: number): Promise<boolean> => {
        const weightKg = lbsToKg(lbs)
        return updateFields({ weight_kg: weightKg })
    }, [updateFields])

    // Update shoe size
    const updateShoeSize = useCallback(async (
        value: number | null,
        system: 'us' | 'eu' | 'uk' | null,
        width?: 'narrow' | 'standard' | 'wide' | null
    ): Promise<boolean> => {
        return updateFields({
            shoe_size_value: value,
            shoe_size_system: system,
            shoe_width: width,
        })
    }, [updateFields])

    // Update clothing sizes
    const updateClothingSizes = useCallback(async (
        tshirtSize: string | null,
        shortsSize: string | null
    ): Promise<boolean> => {
        return updateFields({
            tshirt_size: tshirtSize,
            shorts_size: shortsSize,
        })
    }, [updateFields])

    // Update dominant hand
    const updateDominantHand = useCallback(async (
        hand: 'left' | 'right' | 'ambidextrous' | null
    ): Promise<boolean> => {
        return updateFields({ dominant_hand: hand })
    }, [updateFields])

    // Conversion helpers (pure functions, no state updates)
    const convertHeightToImperial = useCallback((cm: number) => {
        return cmToFeetInches(cm)
    }, [])

    const convertHeightToMetric = useCallback((feet: number, inches: number) => {
        return feetInchesToCm(feet, inches)
    }, [])

    const convertWeightToImperial = useCallback((kg: number) => {
        return kgToLbs(kg)
    }, [])

    const convertWeightToMetric = useCallback((lbs: number) => {
        return lbsToKg(lbs)
    }, [])

    return {
        updating,
        error,
        updateFields,
        updateHeight,
        updateHeightImperial,
        updateWeight,
        updateWeightImperial,
        updateShoeSize,
        updateClothingSizes,
        updateDominantHand,
        convertHeightToImperial,
        convertHeightToMetric,
        convertWeightToImperial,
        convertWeightToMetric,
    }
}

/**
 * Hook for height input with automatic unit conversion
 * 
 * @param initialHeightCm - Initial height in centimeters
 * @param unit - Preferred unit ('metric' or 'imperial')
 * @returns Object with display values and setters
 */
export function useHeightInput(
    initialHeightCm: number | null,
    unit: 'metric' | 'imperial' = 'imperial'
) {
    const [heightCm, setHeightCm] = useState<number | null>(initialHeightCm)
    const [feet, setFeet] = useState<number>(0)
    const [inches, setInches] = useState<number>(0)

    // Initialize imperial values from metric
    useState(() => {
        if (initialHeightCm) {
            const { feet: f, inches: i } = cmToFeetInches(initialHeightCm)
            setFeet(f)
            setInches(i)
        }
    })

    const setHeightMetric = useCallback((cm: number | null) => {
        setHeightCm(cm)
        if (cm) {
            const { feet: f, inches: i } = cmToFeetInches(cm)
            setFeet(f)
            setInches(i)
        }
    }, [])

    const setHeightImperial = useCallback((f: number, i: number) => {
        setFeet(f)
        setInches(i)
        setHeightCm(feetInchesToCm(f, i))
    }, [])

    return {
        // Metric
        heightCm,
        setHeightMetric,
        // Imperial
        feet,
        inches,
        setHeightImperial,
        // Current unit display
        displayValue: unit === 'metric' ? heightCm : { feet, inches },
    }
}

/**
 * Hook for weight input with automatic unit conversion
 * 
 * @param initialWeightKg - Initial weight in kilograms
 * @param unit - Preferred unit ('metric' or 'imperial')
 * @returns Object with display values and setters
 */
export function useWeightInput(
    initialWeightKg: number | null,
    unit: 'metric' | 'imperial' = 'imperial'
) {
    const [weightKg, setWeightKg] = useState<number | null>(initialWeightKg)
    const [weightLbs, setWeightLbs] = useState<number>(0)

    // Initialize imperial value from metric
    useState(() => {
        if (initialWeightKg) {
            setWeightLbs(kgToLbs(initialWeightKg))
        }
    })

    const setWeightMetric = useCallback((kg: number | null) => {
        setWeightKg(kg)
        if (kg) {
            setWeightLbs(kgToLbs(kg))
        }
    }, [])

    const setWeightImperial = useCallback((lbs: number) => {
        setWeightLbs(lbs)
        setWeightKg(lbsToKg(lbs))
    }, [])

    return {
        // Metric
        weightKg,
        setWeightMetric,
        // Imperial
        weightLbs,
        setWeightImperial,
        // Current unit display
        displayValue: unit === 'metric' ? weightKg : weightLbs,
    }
}
