/**
 * Org Sport Profile Settings Service
 * 
 * Handles org-level customization of sport profile field requirements.
 * Only org admins can modify these settings (enforced by RLS).
 */

import { supabase } from '../../lib/supabase'
import type {
    OrgSportProfileSettings,
    FieldOverride,
} from '../../types/athleteSportProfiles'
import type { SportCode } from '../../types/sports'

/**
 * Service response wrapper
 */
interface ServiceResponse<T> {
    data: T | null
    error: Error | null
}

const supabaseAny = supabase as any

/**
 * Get org sport profile settings for a specific sport
 */
export async function getOrgSportSettings(
    orgId: string,
    sportCode: SportCode
): Promise<ServiceResponse<OrgSportProfileSettings>> {
    try {
        // Validate inputs
        if (!orgId) {
            throw new Error('orgId is required')
        }
        if (!sportCode) {
            throw new Error('sportCode is required')
        }

        const { data, error } = await supabaseAny
            .from('org_sport_profile_settings')
            .select('*')
            .eq('org_id', orgId)
            .eq('sport_code', sportCode)
            .single()

        if (error) {
            // Not found is not an error - return null data (org uses defaults)
            if (error.code === 'PGRST116') {
                return { data: null, error: null }
            }
            throw error
        }

        return { data: data as OrgSportProfileSettings | null, error: null }
    } catch (err) {
        console.error('[OrgSportSettingsService] Error getting org sport settings:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Get all org sport profile settings for an org
 */
export async function getAllOrgSportSettings(
    orgId: string
): Promise<ServiceResponse<OrgSportProfileSettings[]>> {
    try {
        // Validate input
        if (!orgId) {
            throw new Error('orgId is required')
        }

        const { data, error } = await supabaseAny
            .from('org_sport_profile_settings')
            .select('*')
            .eq('org_id', orgId)
            .order('sport_code', { ascending: true })

        if (error) throw error

        return { data: (data as OrgSportProfileSettings[] | null) || [], error: null }
    } catch (err) {
        console.error('[OrgSportSettingsService] Error getting all org sport settings:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Upsert org sport profile settings
 * Creates or updates settings for a specific sport
 */
export async function upsertOrgSportSettings(
    orgId: string,
    sportCode: SportCode,
    overrides: Record<string, FieldOverride>
): Promise<ServiceResponse<OrgSportProfileSettings>> {
    try {
        // Validate inputs
        if (!orgId) {
            throw new Error('orgId is required')
        }
        if (!sportCode) {
            throw new Error('sportCode is required')
        }
        if (!overrides || typeof overrides !== 'object') {
            throw new Error('overrides must be a valid object')
        }

        // Get current user ID for audit trail
        const { data: { user } } = await supabase.auth.getUser()
        const userId = user?.id || null

        // Prepare upsert data
        const upsertData = {
            org_id: orgId,
            sport_code: sportCode,
            overrides: overrides,
            updated_by: userId,
            updated_at: new Date().toISOString(),
        }

        // Upsert (insert or update based on unique constraint)
        // Version will be auto-incremented by database trigger
        const { data, error } = await supabaseAny
            .from('org_sport_profile_settings')
            .upsert(upsertData, {
                onConflict: 'org_id,sport_code',
            })
            .select()
            .single()

        if (error) throw error

        console.log(`[OrgSportSettingsService] Upserted org sport settings for org ${orgId}, sport ${sportCode}`)

        return { data: data as OrgSportProfileSettings | null, error: null }
    } catch (err) {
        console.error('[OrgSportSettingsService] Error upserting org sport settings:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Update a single field override
 * Merges with existing overrides
 */
export async function updateFieldOverride(
    orgId: string,
    sportCode: SportCode,
    fieldKey: string,
    override: FieldOverride
): Promise<ServiceResponse<OrgSportProfileSettings>> {
    try {
        // Validate inputs
        if (!orgId) {
            throw new Error('orgId is required')
        }
        if (!sportCode) {
            throw new Error('sportCode is required')
        }
        if (!fieldKey) {
            throw new Error('fieldKey is required')
        }

        // Get current settings
        const { data: currentSettings } = await getOrgSportSettings(orgId, sportCode)

        // Merge overrides
        const existingOverrides = currentSettings?.overrides || {}
        const updatedOverrides = {
            ...existingOverrides,
            [fieldKey]: override,
        }

        return await upsertOrgSportSettings(orgId, sportCode, updatedOverrides)
    } catch (err) {
        console.error('[OrgSportSettingsService] Error updating field override:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Remove a field override (revert to default)
 */
export async function removeFieldOverride(
    orgId: string,
    sportCode: SportCode,
    fieldKey: string
): Promise<ServiceResponse<OrgSportProfileSettings>> {
    try {
        // Validate inputs
        if (!orgId) {
            throw new Error('orgId is required')
        }
        if (!sportCode) {
            throw new Error('sportCode is required')
        }
        if (!fieldKey) {
            throw new Error('fieldKey is required')
        }

        // Get current settings
        const { data: currentSettings } = await getOrgSportSettings(orgId, sportCode)

        if (!currentSettings) {
            // No settings exist, nothing to remove
            return { data: null, error: null }
        }

        // Remove the field override
        const existingOverrides = currentSettings.overrides || {}
        const { [fieldKey]: removed, ...remainingOverrides } = existingOverrides

        // If no overrides remain, delete the entire settings row
        if (Object.keys(remainingOverrides).length === 0) {
            const deleteResult = await deleteOrgSportSettings(orgId, sportCode)
            if (deleteResult.error) {
                return { data: null, error: deleteResult.error }
            }
            return { data: null, error: null }
        }

        return await upsertOrgSportSettings(orgId, sportCode, remainingOverrides)
    } catch (err) {
        console.error('[OrgSportSettingsService] Error removing field override:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Delete all org sport settings for a sport
 * This reverts all fields to their defaults
 */
export async function deleteOrgSportSettings(
    orgId: string,
    sportCode: SportCode
): Promise<ServiceResponse<void>> {
    try {
        // Validate inputs
        if (!orgId) {
            throw new Error('orgId is required')
        }
        if (!sportCode) {
            throw new Error('sportCode is required')
        }

        const { error } = await supabaseAny
            .from('org_sport_profile_settings')
            .delete()
            .eq('org_id', orgId)
            .eq('sport_code', sportCode)

        if (error) throw error

        console.log(`[OrgSportSettingsService] Deleted org sport settings for org ${orgId}, sport ${sportCode}`)

        return { data: null, error: null }
    } catch (err) {
        console.error('[OrgSportSettingsService] Error deleting org sport settings:', err)
        return { data: null, error: err as Error }
    }
}

/**
 * Check if a field is required for an org
 * Considers both default field definition and org overrides
 */
export async function isFieldRequired(
    orgId: string,
    sportCode: SportCode,
    fieldKey: string,
    defaultIsOptional: boolean
): Promise<boolean> {
    try {
        const { data: settings } = await getOrgSportSettings(orgId, sportCode)

        if (!settings || !settings.overrides[fieldKey]) {
            // No override, use default
            return !defaultIsOptional
        }

        const override = settings.overrides[fieldKey]

        // If override explicitly sets is_required, use that
        if (override.is_required !== undefined) {
            return override.is_required
        }

        // Otherwise, use default
        return !defaultIsOptional
    } catch (err) {
        console.error('[OrgSportSettingsService] Error checking if field is required:', err)
        // On error, default to optional (safer)
        return false
    }
}

/**
 * Check if a field is enabled for an org
 * Considers both default field definition and org overrides
 */
export async function isFieldEnabled(
    orgId: string,
    sportCode: SportCode,
    fieldKey: string,
    defaultIsEnabled: boolean
): Promise<boolean> {
    try {
        const { data: settings } = await getOrgSportSettings(orgId, sportCode)

        if (!settings || !settings.overrides[fieldKey]) {
            // No override, use default
            return defaultIsEnabled
        }

        const override = settings.overrides[fieldKey]

        // If override explicitly sets is_enabled, use that
        if (override.is_enabled !== undefined) {
            return override.is_enabled
        }

        // Otherwise, use default
        return defaultIsEnabled
    } catch (err) {
        console.error('[OrgSportSettingsService] Error checking if field is enabled:', err)
        // On error, default to enabled (safer)
        return true
    }
}
