/**
 * Athletes Service
 * 
 * Handles operations on the athletes table, specifically for universal profile fields.
 * For sport-specific profiles, use athleteSportProfilesService.
 * For medical data, use athleteMedicalService.
 */

import { supabase } from '../../lib/supabase'
import type { Athlete } from '../../types/family'
import type { EmergencyContact } from '../../types/athleteSportProfiles'

/**
 * Service response wrapper
 */
interface ServiceResponse<T> {
    data: T | null
    error: Error | null
}

/**
 * DTO for updating universal athlete fields
 */
export interface UpdateAthleteUniversalFieldsDTO {
    height_cm?: number | null
    weight_kg?: number | null
    shoe_size_value?: number | null
    shoe_size_system?: 'us' | 'eu' | 'uk' | null
    shoe_width?: 'narrow' | 'standard' | 'wide' | null
    tshirt_size?: string | null
    shorts_size?: string | null
    dominant_hand?: 'left' | 'right' | 'ambidextrous' | null
    emergency_contact?: EmergencyContact | null
}

/**
 * Get athlete by ID
 */
export async function getAthleteById(
    athleteId: string
): Promise<ServiceResponse<Athlete>> {
    try {
        // Validate input
        if (!athleteId) {
            throw new Error('athleteId is required')
        }

        const { data, error } = await supabase
            .from('athletes')
            .select('*')
            .eq('id', athleteId)
            .single()

        if (error) {
            // Not found is not an error - return null data
            if (error.code === 'PGRST116') {
                return { data: null, error: null }
            }
            throw error
        }

        return { data: data as unknown as Athlete, error: null }
    } catch (err) {
        console.error('[AthletesService] Error getting athlete:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Update athlete universal profile fields
 * This updates only the universal fields, not sport-specific data
 */
export async function updateAthleteUniversalFields(
    athleteId: string,
    fields: UpdateAthleteUniversalFieldsDTO
): Promise<ServiceResponse<Athlete>> {
    try {
        // Validate inputs
        if (!athleteId) {
            throw new Error('athleteId is required')
        }

        if (!fields || typeof fields !== 'object' || Object.keys(fields).length === 0) {
            throw new Error('At least one field must be provided for update')
        }

        // Validate field values
        if (fields.height_cm !== undefined && fields.height_cm !== null) {
            if (fields.height_cm < 50 || fields.height_cm > 250) {
                throw new Error('height_cm must be between 50 and 250 cm')
            }
        }

        if (fields.weight_kg !== undefined && fields.weight_kg !== null) {
            if (fields.weight_kg < 5 || fields.weight_kg > 300) {
                throw new Error('weight_kg must be between 5 and 300 kg')
            }
        }

        if (fields.shoe_size_system !== undefined && fields.shoe_size_system !== null) {
            if (!['us', 'eu', 'uk'].includes(fields.shoe_size_system)) {
                throw new Error('shoe_size_system must be us, eu, or uk')
            }
        }

        if (fields.shoe_width !== undefined && fields.shoe_width !== null) {
            if (!['narrow', 'standard', 'wide'].includes(fields.shoe_width)) {
                throw new Error('shoe_width must be narrow, standard, or wide')
            }
        }

        if (fields.dominant_hand !== undefined && fields.dominant_hand !== null) {
            if (!['left', 'right', 'ambidextrous'].includes(fields.dominant_hand)) {
                throw new Error('dominant_hand must be left, right, or ambidextrous')
            }
        }

        // Validate emergency contact if provided
        if (fields.emergency_contact !== undefined && fields.emergency_contact !== null) {
            const ec = fields.emergency_contact
            if (!ec.name || !ec.relationship || !ec.phone) {
                throw new Error('Emergency contact must include name, relationship, and phone')
            }
        }

        // Prepare update data
        const updateData: Record<string, unknown> = {
            ...fields,
            updated_at: new Date().toISOString(),
        }

        // Update athlete
        const { data, error } = await supabase
            .from('athletes')
            .update(updateData)
            .eq('id', athleteId)
            .select()
            .single()

        if (error) throw error

        console.log(`[AthletesService] Updated universal fields for athlete ${athleteId}`)

        return { data: data as unknown as Athlete, error: null }
    } catch (err) {
        console.error('[AthletesService] Error updating athlete universal fields:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Update athlete height
 */
export async function updateAthleteHeight(
    athleteId: string,
    heightCm: number | null
): Promise<ServiceResponse<Athlete>> {
    return updateAthleteUniversalFields(athleteId, { height_cm: heightCm })
}

/**
 * Update athlete weight
 */
export async function updateAthleteWeight(
    athleteId: string,
    weightKg: number | null
): Promise<ServiceResponse<Athlete>> {
    return updateAthleteUniversalFields(athleteId, { weight_kg: weightKg })
}

/**
 * Update athlete shoe size
 */
export async function updateAthleteShoeSize(
    athleteId: string,
    shoeSizeValue: number | null,
    shoeSizeSystem: 'us' | 'eu' | 'uk' | null,
    shoeWidth?: 'narrow' | 'standard' | 'wide' | null
): Promise<ServiceResponse<Athlete>> {
    return updateAthleteUniversalFields(athleteId, {
        shoe_size_value: shoeSizeValue,
        shoe_size_system: shoeSizeSystem,
        shoe_width: shoeWidth,
    })
}

/**
 * Update athlete clothing sizes
 */
export async function updateAthleteClothingSizes(
    athleteId: string,
    tshirtSize: string | null,
    shortsSize: string | null
): Promise<ServiceResponse<Athlete>> {
    return updateAthleteUniversalFields(athleteId, {
        tshirt_size: tshirtSize,
        shorts_size: shortsSize,
    })
}

/**
 * Update athlete dominant hand
 */
export async function updateAthleteDominantHand(
    athleteId: string,
    dominantHand: 'left' | 'right' | 'ambidextrous' | null
): Promise<ServiceResponse<Athlete>> {
    return updateAthleteUniversalFields(athleteId, { dominant_hand: dominantHand })
}

/**
 * Update athlete emergency contact (in athletes table)
 * Note: For medical emergency contact, use athleteMedicalService
 */
export async function updateAthleteEmergencyContact(
    athleteId: string,
    emergencyContact: EmergencyContact | null
): Promise<ServiceResponse<Athlete>> {
    return updateAthleteUniversalFields(athleteId, { emergency_contact: emergencyContact })
}

/**
 * Helper: Convert height from feet/inches to centimeters
 */
export function feetInchesToCm(feet: number, inches: number): number {
    const totalInches = feet * 12 + inches
    return Math.round(totalInches * 2.54)
}

/**
 * Helper: Convert height from centimeters to feet/inches
 */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
    const totalInches = Math.round(cm / 2.54)
    const feet = Math.floor(totalInches / 12)
    const inches = totalInches % 12
    return { feet, inches }
}

/**
 * Helper: Convert weight from pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
    return Math.round(lbs * 0.453592 * 100) / 100 // Round to 2 decimal places
}

/**
 * Helper: Convert weight from kilograms to pounds
 */
export function kgToLbs(kg: number): number {
    return Math.round(kg / 0.453592 * 100) / 100 // Round to 2 decimal places
}

/**
 * Get athletes tagged in a gallery's photos
 * Returns unique athletes from gallery_photo_tags joined with athletes table
 */
export async function getAthletesByGallery(
    context: { orgId: string },
    galleryId: string
): Promise<ServiceResponse<Array<{
    id: string
    first_name: string
    last_name: string
    avatar_url?: string | null
}>>> {
    try {
        void context
        if (!galleryId) {
            return { data: [], error: null }
        }

        // First get photo IDs for this gallery
        const { data: photos, error: photosError } = await supabase
            .from('gallery_photos')
            .select('id')
            .eq('gallery_id', galleryId)

        if (photosError) {
            console.error('[AthletesService] Error getting photos:', photosError)
            return { data: [], error: null }
        }

        if (!photos || photos.length === 0) {
            return { data: [], error: null }
        }

        const photoIds = photos.map(p => p.id)

        // Then query gallery_photo_tags joined with athletes
        const { data, error } = await supabase
            .from('gallery_photo_tags')
            .select(`
                athlete:athletes!inner (
                    id,
                    first_name,
                    last_name
                )
            `)
            .in('photo_id', photoIds)

        if (error) {
            console.error('[AthletesService] Error getting athletes by gallery:', error)
            return { data: [], error: null }
        }

        // Extract unique athletes and flatten structure
        const athletesMap = new Map<string, {
            id: string
            first_name: string
            last_name: string
            avatar_url?: string | null
        }>()

        ;(data || []).forEach((item: any) => {
            if (item.athlete) {
                const athlete = item.athlete
                if (!athletesMap.has(athlete.id)) {
                    athletesMap.set(athlete.id, {
                        id: athlete.id,
                        first_name: athlete.first_name,
                        last_name: athlete.last_name,
                        avatar_url: null, // Avatar URL would need separate join
                    })
                }
            }
        })

        return { 
            data: Array.from(athletesMap.values()), 
            error: null 
        }
    } catch (err) {
        console.error('[AthletesService] Error getting athletes by gallery:', err)
        return { 
            data: null, 
            error: err as Error 
        }
    }
}
