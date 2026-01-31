/**
 * Sport Field Definitions Service
 * 
 * Handles fetching sport field definitions from the database.
 * Implements caching since field definitions rarely change.
 */

import { supabase } from '../../lib/supabase'
import type { SportFieldDefinition } from '../../types/athleteSportProfiles'
import type { SportCode, FieldGroup } from '../../types/sports'

/**
 * Service response wrapper
 */
interface ServiceResponse<T> {
    data: T | null
    error: Error | null
}

/**
 * In-memory cache for field definitions
 * Cache is cleared on page reload, which is acceptable for this use case
 */
const fieldDefinitionsCache = new Map<string, SportFieldDefinition[]>()
const CACHE_DURATION_MS = 1000 * 60 * 60 // 1 hour
const cacheTimestamps = new Map<string, number>()

/**
 * Get all field definitions for a specific sport
 */
export async function getSportFieldDefinitions(
    sportCode: SportCode
): Promise<ServiceResponse<SportFieldDefinition[]>> {
    try {
        // Validate input
        if (!sportCode) {
            throw new Error('sportCode is required')
        }

        // Check cache
        const cacheKey = `sport:${sportCode}`
        const cachedData = getCachedDefinitions(cacheKey)
        if (cachedData) {
            console.log(`[SportFieldDefinitionsService] Cache hit for ${sportCode}`)
            return { data: cachedData, error: null }
        }

        // Fetch from database
        const { data, error } = await supabase
            .from('sport_field_definitions')
            .select('*')
            .eq('sport_code', sportCode)
            .eq('is_enabled', true)
            .order('sort_order', { ascending: true })

        if (error) throw error

        // Cache the results
        setCachedDefinitions(cacheKey, data || [])

        console.log(`[SportFieldDefinitionsService] Fetched ${data?.length || 0} field definitions for ${sportCode}`)

        return { data: data || [], error: null }
    } catch (err) {
        console.error('[SportFieldDefinitionsService] Error getting sport field definitions:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Get field definitions for a specific sport and field group
 */
export async function getSportFieldDefinitionsByGroup(
    sportCode: SportCode,
    fieldGroup: FieldGroup
): Promise<ServiceResponse<SportFieldDefinition[]>> {
    try {
        // Validate inputs
        if (!sportCode) {
            throw new Error('sportCode is required')
        }
        if (!fieldGroup) {
            throw new Error('fieldGroup is required')
        }

        // Check cache
        const cacheKey = `sport:${sportCode}:group:${fieldGroup}`
        const cachedData = getCachedDefinitions(cacheKey)
        if (cachedData) {
            console.log(`[SportFieldDefinitionsService] Cache hit for ${sportCode} ${fieldGroup}`)
            return { data: cachedData, error: null }
        }

        // Fetch from database
        const { data, error } = await supabase
            .from('sport_field_definitions')
            .select('*')
            .eq('sport_code', sportCode)
            .eq('field_group', fieldGroup)
            .eq('is_enabled', true)
            .order('sort_order', { ascending: true })

        if (error) throw error

        // Cache the results
        setCachedDefinitions(cacheKey, data || [])

        console.log(`[SportFieldDefinitionsService] Fetched ${data?.length || 0} ${fieldGroup} field definitions for ${sportCode}`)

        return { data: data || [], error: null }
    } catch (err) {
        console.error('[SportFieldDefinitionsService] Error getting sport field definitions by group:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Get all field definitions for all sports
 * Use sparingly - prefer getSportFieldDefinitions for specific sports
 */
export async function getAllSportFieldDefinitions(): Promise<ServiceResponse<SportFieldDefinition[]>> {
    try {
        // Check cache
        const cacheKey = 'all_sports'
        const cachedData = getCachedDefinitions(cacheKey)
        if (cachedData) {
            console.log('[SportFieldDefinitionsService] Cache hit for all sports')
            return { data: cachedData, error: null }
        }

        // Fetch from database
        const { data, error } = await supabase
            .from('sport_field_definitions')
            .select('*')
            .eq('is_enabled', true)
            .order('sport_code', { ascending: true })
            .order('sort_order', { ascending: true })

        if (error) throw error

        // Cache the results
        setCachedDefinitions(cacheKey, data || [])

        console.log(`[SportFieldDefinitionsService] Fetched ${data?.length || 0} total field definitions`)

        return { data: data || [], error: null }
    } catch (err) {
        console.error('[SportFieldDefinitionsService] Error getting all sport field definitions:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Get a specific field definition by sport and field key
 */
export async function getFieldDefinitionByKey(
    sportCode: SportCode,
    fieldKey: string
): Promise<ServiceResponse<SportFieldDefinition>> {
    try {
        // Validate inputs
        if (!sportCode) {
            throw new Error('sportCode is required')
        }
        if (!fieldKey) {
            throw new Error('fieldKey is required')
        }

        // Try to get from cache first
        const { data: allFields } = await getSportFieldDefinitions(sportCode)
        if (allFields) {
            const field = allFields.find(f => f.field_key === fieldKey)
            if (field) {
                return { data: field, error: null }
            }
        }

        // If not in cache or cache miss, fetch directly
        const { data, error } = await supabase
            .from('sport_field_definitions')
            .select('*')
            .eq('sport_code', sportCode)
            .eq('field_key', fieldKey)
            .single()

        if (error) {
            // Not found is not an error - return null data
            if (error.code === 'PGRST116') {
                return { data: null, error: null }
            }
            throw error
        }

        return { data, error: null }
    } catch (err) {
        console.error('[SportFieldDefinitionsService] Error getting field definition by key:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Get profile field definitions for a sport
 */
export async function getSportProfileFields(
    sportCode: SportCode
): Promise<ServiceResponse<SportFieldDefinition[]>> {
    return getSportFieldDefinitionsByGroup(sportCode, 'profile')
}

/**
 * Get equipment field definitions for a sport
 */
export async function getSportEquipmentFields(
    sportCode: SportCode
): Promise<ServiceResponse<SportFieldDefinition[]>> {
    return getSportFieldDefinitionsByGroup(sportCode, 'equipment')
}

/**
 * Clear cache for a specific sport or all sports
 */
export function clearFieldDefinitionsCache(sportCode?: SportCode): void {
    if (sportCode) {
        const keysToDelete: string[] = []
        fieldDefinitionsCache.forEach((_, key) => {
            if (key.startsWith(`sport:${sportCode}`)) {
                keysToDelete.push(key)
            }
        })
        keysToDelete.forEach(key => {
            fieldDefinitionsCache.delete(key)
            cacheTimestamps.delete(key)
        })
        console.log(`[SportFieldDefinitionsService] Cleared cache for ${sportCode}`)
    } else {
        fieldDefinitionsCache.clear()
        cacheTimestamps.clear()
        console.log('[SportFieldDefinitionsService] Cleared all cache')
    }
}

/**
 * Helper: Get cached definitions if valid
 */
function getCachedDefinitions(cacheKey: string): SportFieldDefinition[] | null {
    const cached = fieldDefinitionsCache.get(cacheKey)
    const timestamp = cacheTimestamps.get(cacheKey)

    if (!cached || !timestamp) return null

    const age = Date.now() - timestamp
    if (age > CACHE_DURATION_MS) {
        // Cache expired
        fieldDefinitionsCache.delete(cacheKey)
        cacheTimestamps.delete(cacheKey)
        return null
    }

    return cached
}

/**
 * Helper: Set cached definitions
 */
function setCachedDefinitions(cacheKey: string, data: SportFieldDefinition[]): void {
    fieldDefinitionsCache.set(cacheKey, data)
    cacheTimestamps.set(cacheKey, Date.now())
}
