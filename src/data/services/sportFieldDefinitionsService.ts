/**
 * Sport Field Definitions Service
 * 
 * Handles fetching sport field definitions from the database.
 * Implements caching since field definitions rarely change.
 */

import { supabase } from '../../lib/supabase'
import type { SportFieldDefinition } from '../../types/athleteSportProfiles'
import type { SportCode, FieldGroup } from '../../types/sports'
import { getSportFieldCatalog, SPORT_FIELD_CATALOG, type FieldCatalogEntry } from '../../constants/sportFieldCatalog'

const isMissingTableError = (err: any) =>
    err?.code === 'PGRST205' ||
    typeof err?.message === 'string' && err.message.includes("Could not find the table 'public.sport_field_definitions'")

/**
 * Service response wrapper
 */
interface ServiceResponse<T> {
    data: T | null
    error: Error | null
}

const supabaseAny = supabase as any

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
        const { data, error } = await supabaseAny
            .from('sport_field_definitions')
            .select('*')
            .eq('sport_code', sportCode)
            .eq('is_enabled', true)
            .order('sort_order', { ascending: true })

        if (error) {
            const fallback = maybeFallbackFromCatalog(sportCode)
            if (fallback && isMissingTableError(error)) {
                console.warn('[SportFieldDefinitionsService] Falling back to catalog definitions because table is missing in schema cache')
                return { data: fallback, error: null }
            }
            throw error
        }

        let resolved: SportFieldDefinition[] = (data as SportFieldDefinition[] | null) && data.length > 0
            ? (data as SportFieldDefinition[])
            : []

        // If no rows with is_enabled filter, try without it (handles legacy rows with null/false)
        if (resolved.length === 0) {
            const { data: secondary, error: secondaryError } = await supabaseAny
                .from('sport_field_definitions')
                .select('*')
                .eq('sport_code', sportCode)
                .order('sort_order', { ascending: true })

            const secondaryResolved = secondary as SportFieldDefinition[] | null
            if (!secondaryError && secondaryResolved && secondaryResolved.length > 0) {
                console.warn('[SportFieldDefinitionsService] Fetched sport_field_definitions without is_enabled filter (some rows may be missing is_enabled=true)')
                resolved = secondaryResolved
            }
        }

        if (resolved.length === 0) {
            resolved = maybeFallbackFromCatalog(sportCode) || []
        }

        // Cache the results
        setCachedDefinitions(cacheKey, resolved)

        console.log(`[SportFieldDefinitionsService] Fetched ${resolved.length} field definitions for ${sportCode}`)

        return { data: resolved, error: null }
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
        const { data, error } = await supabaseAny
            .from('sport_field_definitions')
            .select('*')
            .eq('sport_code', sportCode)
            .eq('field_group', fieldGroup)
            .eq('is_enabled', true)
            .order('sort_order', { ascending: true })

        if (error) {
            const fallback = maybeFallbackFromCatalog(sportCode, fieldGroup)
            if (fallback && isMissingTableError(error)) {
                console.warn('[SportFieldDefinitionsService] Falling back to catalog definitions by group because table is missing in schema cache')
                return { data: fallback, error: null }
            }
            throw error
        }

        let resolved: SportFieldDefinition[] = (data as SportFieldDefinition[] | null) && data.length > 0
            ? (data as SportFieldDefinition[])
            : []

        // If no rows with is_enabled filter, try without it (handles legacy rows with null/false)
        if (resolved.length === 0) {
            const { data: secondary, error: secondaryError } = await supabaseAny
                .from('sport_field_definitions')
                .select('*')
                .eq('sport_code', sportCode)
                .eq('field_group', fieldGroup)
                .order('sort_order', { ascending: true })

            const secondaryResolved = secondary as SportFieldDefinition[] | null
            if (!secondaryError && secondaryResolved && secondaryResolved.length > 0) {
                console.warn('[SportFieldDefinitionsService] Fetched sport_field_definitions by group without is_enabled filter (some rows may be missing is_enabled=true)')
                resolved = secondaryResolved
            }
        }

        if (resolved.length === 0) {
            resolved = maybeFallbackFromCatalog(sportCode, fieldGroup) || []
        }

        // Cache the results
        setCachedDefinitions(cacheKey, resolved)

        console.log(`[SportFieldDefinitionsService] Fetched ${resolved.length} ${fieldGroup} field definitions for ${sportCode}`)

        return { data: resolved, error: null }
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
        const { data, error } = await supabaseAny
            .from('sport_field_definitions')
            .select('*')
            .eq('is_enabled', true)
            .order('sport_code', { ascending: true })
            .order('sort_order', { ascending: true })

        if (error) {
            const fallback = allCatalogAsDefinitions()
            if (fallback.length && isMissingTableError(error)) {
                console.warn('[SportFieldDefinitionsService] Falling back to catalog definitions for all sports because table is missing in schema cache')
                return { data: fallback, error: null }
            }
            throw error
        }

        let resolved: SportFieldDefinition[] = (data as SportFieldDefinition[] | null) && data.length > 0
            ? (data as SportFieldDefinition[])
            : []

        // If no rows with is_enabled filter, try without it (handles legacy rows with null/false)
        if (resolved.length === 0) {
            const { data: secondary, error: secondaryError } = await supabaseAny
                .from('sport_field_definitions')
                .select('*')
                .order('sport_code', { ascending: true })
                .order('sort_order', { ascending: true })

            const secondaryResolved = secondary as SportFieldDefinition[] | null
            if (!secondaryError && secondaryResolved && secondaryResolved.length > 0) {
                console.warn('[SportFieldDefinitionsService] Fetched all sport_field_definitions without is_enabled filter (some rows may be missing is_enabled=true)')
                resolved = secondaryResolved
            }
        }

        if (resolved.length === 0) {
            resolved = allCatalogAsDefinitions()
        }

        // Cache the results
        setCachedDefinitions(cacheKey, resolved)

        console.log(`[SportFieldDefinitionsService] Fetched ${resolved.length} total field definitions`)

        return { data: resolved, error: null }
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
        const { data, error } = await supabaseAny
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
            const fallback = maybeFallbackFromCatalog(sportCode)?.find(f => f.field_key === fieldKey)
            if (fallback) {
                return { data: fallback, error: null }
            }
            throw error
        }

        return { data: data as SportFieldDefinition | null, error: null }
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

    if (!cached || cached.length === 0 || !timestamp) return null

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
 * Fallback: use local catalog when Supabase table is missing/not yet migrated
 */
function maybeFallbackFromCatalog(sportCode: SportCode, fieldGroup?: FieldGroup): SportFieldDefinition[] | null {
    const catalog = getSportFieldCatalog(sportCode)
    if (!catalog) return null

    const entries = fieldGroup
        ? catalog[fieldGroup] ?? []
        : [...catalog.profile, ...catalog.equipment]

    if (!entries.length) return null

    return entries.map((entry) => catalogEntryToDefinition(sportCode, entry))
}

/**
 * Fallback: return all catalog entries across sports
 */
function allCatalogAsDefinitions(): SportFieldDefinition[] {
    const defs: SportFieldDefinition[] = []
    for (const sportCode of Object.keys(SPORT_FIELD_CATALOG) as SportCode[]) {
        const catalog = SPORT_FIELD_CATALOG[sportCode]
        if (!catalog) continue
        const combined = [...catalog.profile, ...catalog.equipment]
        combined.forEach((entry) => defs.push(catalogEntryToDefinition(sportCode, entry)))
    }
    return defs
}

function catalogEntryToDefinition(sportCode: SportCode, entry: FieldCatalogEntry): SportFieldDefinition {
    return {
        id: `catalog:${sportCode}:${entry.key}`,
        sport_code: sportCode,
        field_key: entry.key,
        field_label: entry.label,
        field_group: entry.group,
        field_type: entry.type,
        enum_values: entry.enumValues ? [...entry.enumValues] : null,
        unit: entry.unit ?? null,
        help_text: entry.helpTextKey ? mapHelpText(entry.helpTextKey, entry) : null,
        is_optional: true,
        is_enabled: true,
        sort_order: entry.sortOrder,
        created_at: '1970-01-01T00:00:00.000Z',
    }
}

/**
 * Map a helpTextKey (or entry) to a sensible, human-friendly help string
 * This provides immediate readable help text when translations are not available.
 */
function mapHelpText(helpTextKey: string | undefined, entry: FieldCatalogEntry): string | null {
    if (!helpTextKey) return null

    // Prefer targeted mappings by entry key (more readable and contextual)
    switch (entry.key) {
        case 'years_experience':
            return 'Approximate number of years playing this sport.'
        case 'wingspan_in':
            return 'Measure fingertip to fingertip across outstretched arms (in inches).'
        case 'vertical_jump_in':
            return 'Measure the highest vertical reach or jump in inches.'
        case 'primary_position':
            return `Select the player\'s primary position for this sport.`
        case 'secondary_position':
        case 'secondary_positions':
            return `Select any secondary positions the player may play.`
        case 'shoe_size':
            return `Enter the player\'s shoe size.`
        case 'shoe_width':
            return `Select the player\'s shoe width (narrow, standard, wide).`
        case 'city':
            return `Enter the city of the player's address.`
        case 'state':
            return `Select the state (use the two-letter code if applicable).`
        case 'zip_code':
            return `Enter the postal / ZIP code.`
        case 'phone':
            return `Enter a phone number including area code.`
        case 'extension':
            return `Optional phone extension.`
        default:
            // Fallback: use the label to make a readable sentence
            return `Provide ${entry.label.toLowerCase()}.`
    }
}

/**
 * Helper: Set cached definitions
 */
function setCachedDefinitions(cacheKey: string, data: SportFieldDefinition[]): void {
    if (!data || data.length === 0) {
        fieldDefinitionsCache.delete(cacheKey)
        cacheTimestamps.delete(cacheKey)
        return
    }
    fieldDefinitionsCache.set(cacheKey, data)
    cacheTimestamps.set(cacheKey, Date.now())
}
