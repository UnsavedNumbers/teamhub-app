/**
 * Org Sport Profile Settings Service
 * 
 * Handles org-level customization of sport profile field requirements.
 * Only org admins can modify these settings (enforced by RLS).
 */

import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
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
    console.groupCollapsed(`%cgetOrgSportSettings: ${orgId} - ${sportCode}`, 'color: #666; font-weight: bold;');
    debug.data('OrgSportSettingsService.getOrgSportSettings', 'Request', { orgId, sportCode })
    debug.perf.start('orgSportSettingsService.getOrgSportSettings')

    try {
        // Validate inputs
        if (!orgId) {
            debug.perf.end('orgSportSettingsService.getOrgSportSettings')
            debug.error('OrgSportSettingsService.getOrgSportSettings', 'orgId is required', { orgId, sportCode })
            console.groupEnd()
            throw new Error('orgId is required')
        }
        if (!sportCode) {
            debug.perf.end('orgSportSettingsService.getOrgSportSettings')
            debug.error('OrgSportSettingsService.getOrgSportSettings', 'sportCode is required', { orgId, sportCode })
            console.groupEnd()
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
                debug.perf.end('orgSportSettingsService.getOrgSportSettings')
                debug.data('OrgSportSettingsService.getOrgSportSettings', 'Response (not found, using defaults)', { orgId, sportCode })
                console.groupEnd()
                return { data: null, error: null }
            }
            throw error
        }

        debug.perf.end('orgSportSettingsService.getOrgSportSettings')
        debug.data('OrgSportSettingsService.getOrgSportSettings', 'Response', { orgId, sportCode, hasData: !!data })
        console.groupEnd()
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
    console.groupCollapsed(`%cgetAllOrgSportSettings: ${orgId}`, 'color: #666; font-weight: bold;');
    debug.data('OrgSportSettingsService.getAllOrgSportSettings', 'Request', { orgId })
    debug.perf.start('orgSportSettingsService.getAllOrgSportSettings')

    try {
        // Validate input
        if (!orgId) {
            debug.perf.end('orgSportSettingsService.getAllOrgSportSettings')
            debug.error('OrgSportSettingsService.getAllOrgSportSettings', 'orgId is required', { orgId })
            console.groupEnd()
            throw new Error('orgId is required')
        }

        const { data, error } = await supabaseAny
            .from('org_sport_profile_settings')
            .select('*')
            .eq('org_id', orgId)
            .order('sport_code', { ascending: true })

        if (error) throw error

        debug.perf.end('orgSportSettingsService.getAllOrgSportSettings')
        debug.data('OrgSportSettingsService.getAllOrgSportSettings', 'Response', { orgId, settingCount: data?.length || 0 })
        console.groupEnd()
        return { data: (data as OrgSportProfileSettings[] | null) || [], error: null }
    } catch (err) {
        debug.perf.end('orgSportSettingsService.getAllOrgSportSettings')
        debug.error('OrgSportSettingsService.getAllOrgSportSettings', 'Failed to get all org sport settings', { error: err, orgId })
        console.groupEnd()
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

        debug.perf.end('orgSportSettingsService.upsertOrgSportSettings')
        debug.flow('OrgSportSettingsService.upsertOrgSportSettings', 'Settings upserted successfully', { orgId, sportCode })
        console.groupEnd()
        console.log(`[OrgSportSettingsService] Upserted org sport settings for org ${orgId}, sport ${sportCode}`)

        return { data: data as OrgSportProfileSettings | null, error: null }
    } catch (err) {
        debug.perf.end('orgSportSettingsService.upsertOrgSportSettings')
        debug.error('OrgSportSettingsService.upsertOrgSportSettings', 'Failed to upsert settings', { error: err, orgId, sportCode })
        console.groupEnd()
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

        const result = await upsertOrgSportSettings(orgId, sportCode, updatedOverrides)
        debug.perf.end('orgSportSettingsService.updateFieldOverride')
        if (result.error) {
            debug.error('OrgSportSettingsService.updateFieldOverride', 'Failed to update field override', { error: result.error, orgId, sportCode, fieldKey })
        } else {
            debug.flow('OrgSportSettingsService.updateFieldOverride', 'Field override updated successfully', { orgId, sportCode, fieldKey })
        }
        console.groupEnd()
        return result
    } catch (err) {
        debug.perf.end('orgSportSettingsService.updateFieldOverride')
        debug.error('OrgSportSettingsService.updateFieldOverride', 'Exception updating field override', { error: err, orgId, sportCode, fieldKey })
        console.groupEnd()
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
    console.groupCollapsed(`%cremoveFieldOverride: ${orgId} - ${sportCode} - ${fieldKey}`, 'color: #666; font-weight: bold;');
    debug.flow('OrgSportSettingsService.removeFieldOverride', 'Removing field override', { orgId, sportCode, fieldKey })
    debug.perf.start('orgSportSettingsService.removeFieldOverride')

    try {
        // Validate inputs
        if (!orgId) {
            debug.perf.end('orgSportSettingsService.removeFieldOverride')
            debug.error('OrgSportSettingsService.removeFieldOverride', 'orgId is required', { orgId, sportCode, fieldKey })
            console.groupEnd()
            throw new Error('orgId is required')
        }
        if (!sportCode) {
            debug.perf.end('orgSportSettingsService.removeFieldOverride')
            debug.error('OrgSportSettingsService.removeFieldOverride', 'sportCode is required', { orgId, sportCode, fieldKey })
            console.groupEnd()
            throw new Error('sportCode is required')
        }
        if (!fieldKey) {
            debug.perf.end('orgSportSettingsService.removeFieldOverride')
            debug.error('OrgSportSettingsService.removeFieldOverride', 'fieldKey is required', { orgId, sportCode, fieldKey })
            console.groupEnd()
            throw new Error('fieldKey is required')
        }

        // Get current settings
        const { data: currentSettings } = await getOrgSportSettings(orgId, sportCode)

        if (!currentSettings) {
            // No settings exist, nothing to remove
            debug.perf.end('orgSportSettingsService.removeFieldOverride')
            debug.data('OrgSportSettingsService.removeFieldOverride', 'No settings to remove', { orgId, sportCode, fieldKey })
            console.groupEnd()
            return { data: null, error: null }
        }

        // Remove the field override
        const existingOverrides = currentSettings.overrides || {}
        const { [fieldKey]: removed, ...remainingOverrides } = existingOverrides

        // If no overrides remain, delete the entire settings row
        if (Object.keys(remainingOverrides).length === 0) {
            const deleteResult = await deleteOrgSportSettings(orgId, sportCode)
            debug.perf.end('orgSportSettingsService.removeFieldOverride')
            if (deleteResult.error) {
                debug.error('OrgSportSettingsService.removeFieldOverride', 'Failed to delete settings', { error: deleteResult.error, orgId, sportCode, fieldKey })
                console.groupEnd()
                return { data: null, error: deleteResult.error }
            }
            debug.flow('OrgSportSettingsService.removeFieldOverride', 'Settings deleted (no overrides remaining)', { orgId, sportCode, fieldKey })
            console.groupEnd()
            return { data: null, error: null }
        }

        const result = await upsertOrgSportSettings(orgId, sportCode, remainingOverrides)
        debug.perf.end('orgSportSettingsService.removeFieldOverride')
        if (result.error) {
            debug.error('OrgSportSettingsService.removeFieldOverride', 'Failed to remove field override', { error: result.error, orgId, sportCode, fieldKey })
        } else {
            debug.flow('OrgSportSettingsService.removeFieldOverride', 'Field override removed successfully', { orgId, sportCode, fieldKey })
        }
        console.groupEnd()
        return result
    } catch (err) {
        debug.perf.end('orgSportSettingsService.removeFieldOverride')
        debug.error('OrgSportSettingsService.removeFieldOverride', 'Exception removing field override', { error: err, orgId, sportCode, fieldKey })
        console.groupEnd()
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

        debug.perf.end('orgSportSettingsService.deleteOrgSportSettings')
        debug.flow('OrgSportSettingsService.deleteOrgSportSettings', 'Settings deleted successfully', { orgId, sportCode })
        console.groupEnd()
        console.log(`[OrgSportSettingsService] Deleted org sport settings for org ${orgId}, sport ${sportCode}`)

        return { data: null, error: null }
    } catch (err) {
        debug.perf.end('orgSportSettingsService.deleteOrgSportSettings')
        debug.error('OrgSportSettingsService.deleteOrgSportSettings', 'Failed to delete settings', { error: err, orgId, sportCode })
        console.groupEnd()
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
    console.groupCollapsed(`%cisFieldRequired: ${orgId} - ${sportCode} - ${fieldKey}`, 'color: #666; font-weight: bold;');
    debug.data('OrgSportSettingsService.isFieldRequired', 'Request', { orgId, sportCode, fieldKey, defaultIsOptional })
    debug.perf.start('orgSportSettingsService.isFieldRequired')

    try {
        const { data: settings } = await getOrgSportSettings(orgId, sportCode)

        if (!settings || !settings.overrides[fieldKey]) {
            // No override, use default
            const isRequired = !defaultIsOptional
            debug.perf.end('orgSportSettingsService.isFieldRequired')
            debug.data('OrgSportSettingsService.isFieldRequired', 'Response (using default)', { orgId, sportCode, fieldKey, isRequired })
            console.groupEnd()
            return isRequired
        }

        const override = settings.overrides[fieldKey]

        // If override explicitly sets is_required, use that
        if (override.is_required !== undefined) {
            debug.perf.end('orgSportSettingsService.isFieldRequired')
            debug.data('OrgSportSettingsService.isFieldRequired', 'Response (using override)', { orgId, sportCode, fieldKey, isRequired: override.is_required })
            console.groupEnd()
            return override.is_required
        }

        // Otherwise, use default
        const isRequired = !defaultIsOptional
        debug.perf.end('orgSportSettingsService.isFieldRequired')
        debug.data('OrgSportSettingsService.isFieldRequired', 'Response (override without is_required, using default)', { orgId, sportCode, fieldKey, isRequired })
        console.groupEnd()
        return isRequired
    } catch (err) {
        debug.perf.end('orgSportSettingsService.isFieldRequired')
        debug.error('OrgSportSettingsService.isFieldRequired', 'Failed to check if field is required', { error: err, orgId, sportCode, fieldKey })
        console.groupEnd()
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
            debug.perf.end('orgSportSettingsService.isFieldEnabled')
            debug.data('OrgSportSettingsService.isFieldEnabled', 'Response (using default)', { orgId, sportCode, fieldKey, isEnabled: defaultIsEnabled })
            console.groupEnd()
            return defaultIsEnabled
        }

        const override = settings.overrides[fieldKey]

        // If override explicitly sets is_enabled, use that
        if (override.is_enabled !== undefined) {
            debug.perf.end('orgSportSettingsService.isFieldEnabled')
            debug.data('OrgSportSettingsService.isFieldEnabled', 'Response (using override)', { orgId, sportCode, fieldKey, isEnabled: override.is_enabled })
            console.groupEnd()
            return override.is_enabled
        }

        // Otherwise, use default
        debug.perf.end('orgSportSettingsService.isFieldEnabled')
        debug.data('OrgSportSettingsService.isFieldEnabled', 'Response (override without is_enabled, using default)', { orgId, sportCode, fieldKey, isEnabled: defaultIsEnabled })
        console.groupEnd()
        return defaultIsEnabled
    } catch (err) {
        debug.perf.end('orgSportSettingsService.isFieldEnabled')
        debug.error('OrgSportSettingsService.isFieldEnabled', 'Failed to check if field is enabled', { error: err, orgId, sportCode, fieldKey })
        console.groupEnd()
        console.error('[OrgSportSettingsService] Error checking if field is enabled:', err)
        // On error, default to enabled (safer)
        return true
    }
}
