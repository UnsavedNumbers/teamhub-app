/**
 * Sports Service
 *
 * Provides CRUD operations for sports and programs.
 * Supports both fake data (demo mode) and real Supabase queries.
 * 
 * Note: System sports are identified by org_id IS NULL.
 * The deleted_at column does not exist in the schema, so deletes are hard deletes.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import { supabase } from '../../lib/supabase'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import type { UserContext } from '../fake/userContext'
import { logSportEvent } from '../../utils/eventLogger'
import {
    getSportById,
    getSportsForOrg,
    getProgramById,
    getProgramsForOrg,
    type FakeSport,
    type FakeProgram,
} from '../fake/fakeTeams'
import type {
    Sport,
    Program,
    CreateSportDTO,
    UpdateSportDTO,
    CreateProgramDTO,
    UpdateProgramDTO
} from '../types/organization'

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDelay(): Promise<void> {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

/**
 * Check if a sport is a system sport
 * System sports are identified by having org_id = NULL
 * @param sport - Sport object to check
 * @returns true if the sport is a system sport
 */
function isSystemSport(sport: { org_id: string | null } | null | undefined): boolean {
    return sport?.org_id === null || sport?.org_id === undefined
}

// ============================================================================
// Sports CRUD Operations
// ============================================================================

/**
 * Get all system sports (predefined sports available to all organizations)
 * System sports are identified by org_id IS NULL and is_system = true
 */
export async function getSystemSports(): Promise<{ data: Sport[]; error: Error | null }> {
    try {
        // System sports are identified by org_id IS NULL and is_system = true
        const { data, error } = await supabase
            .from('sports')
            .select('*')
            .is('org_id', null)
            .eq('is_system', true)
            .is('deleted_at', null) // Exclude soft-deleted sports
            .order('name')

        if (error) {
            // Check for network errors
            if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('timeout')) {
                return { data: [], error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.code === '42501') {
                return { data: [], error: new Error('Permission denied. You do not have access to view system sports.') }
            }
            throw error
        }

        // Normalize sports to ensure required fields
        const normalizedSports = (data || []).map((sport: any): Sport => ({
            id: sport.id,
            org_id: sport.org_id,
            name: sport.name || 'Unknown Sport',
            icon: sport.icon || null,
            color: sport.color || '#137fec',
            created_at: sport.created_at || new Date().toISOString(),
            updated_at: sport.updated_at || new Date().toISOString(),
            deleted_at: sport.deleted_at || null,
            is_system: sport.is_system ?? true,
        }))

        return { data: normalizedSports, error: null }
    } catch (err) {
        console.error('[sportsService] Error getting system sports:', err)
        // Handle network errors in catch block
        if (err instanceof Error) {
            if (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('timeout')) {
                return { data: [], error: new Error('Network error. Please check your internet connection and try again.') }
            }
            return { data: [], error: err }
        }
        return { data: [], error: new Error('An unexpected error occurred while loading system sports. Please try again.') }
    }
}

/**
 * Get all sports for an organization
 * Returns system sports that the organization has enabled via organization_sports
 */
export async function getSports(
    context: UserContext
): Promise<{ data: Sport[] | FakeSport[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        const sports = getSportsForOrg(context.orgId)
        return { data: sports, error: null }
    }

    try {
        // Validate context
        if (!context.orgId) {
            return { data: [], error: new Error('Organization ID is required') }
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(context.orgId)) {
            return { data: [], error: new Error('Invalid organization ID format') }
        }

        // Get sports linked to this organization via organization_sports junction table
        const { data, error } = await supabase
            .from('organization_sports')
            .select(`
                sport:sports(*)
            `)
            .eq('org_id', context.orgId)

        if (error) {
            // Check for network errors
            if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('timeout')) {
                return { data: [], error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.code === '42501') {
                return { data: [], error: new Error('Permission denied. You do not have access to view sports for this organization.') }
            }
            throw error
        }

        // Get organization customizations for these sports
        const sportIds = (data || []).map((row: any) => row.sport?.id).filter(Boolean)
        let customizations: Record<string, { icon_path: string | null; color: string | null }> = {}
        
        if (sportIds.length > 0) {
            const { data: customizationsData, error: customizationsError } = await supabase
                .from('organization_sport_customizations' as any)
                .select('sport_id, icon_path, color')
                .eq('org_id', context.orgId)
                .in('sport_id', sportIds)

            if (!customizationsError && customizationsData && Array.isArray(customizationsData)) {
                type CustomizationRow = { sport_id: string; icon_path: string | null; color: string | null }
                customizations = (customizationsData as unknown as CustomizationRow[]).reduce((acc, cust) => {
                    acc[cust.sport_id] = { icon_path: cust.icon_path, color: cust.color }
                    return acc
                }, {} as Record<string, { icon_path: string | null; color: string | null }>)
            }
        }

        // Extract sports from the joined data and apply customizations
        const sportsMap = new Map<string, Sport>()
        ;(data || []).forEach((row: any) => {
            const sport = row.sport
            if (sport && sport.id && !sportsMap.has(sport.id)) {
                const customization = customizations[sport.id]
                // Ensure required fields have defaults, apply customizations
                const normalizedSport: Sport = {
                    id: sport.id,
                    org_id: sport.org_id,
                    name: sport.name || 'Unknown Sport',
                    icon: customization?.icon_path || sport.icon || null,
                    color: customization?.color || sport.color || '#137fec',
                    created_at: sport.created_at || new Date().toISOString(),
                    updated_at: sport.updated_at || new Date().toISOString(),
                    deleted_at: sport.deleted_at || null,
                    is_system: sport.is_system ?? (sport.org_id === null),
                }
                sportsMap.set(sport.id, normalizedSport)
            }
        })
        const sports = Array.from(sportsMap.values()).sort((a: Sport, b: Sport) => a.name.localeCompare(b.name))

        return { data: sports as Sport[], error: null }
    } catch (err) {
        console.error('[sportsService] Error getting sports:', err)
        // Handle network errors in catch block
        if (err instanceof Error) {
            if (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('timeout')) {
                return { data: [], error: new Error('Network error. Please check your internet connection and try again.') }
            }
            return { data: [], error: err }
        }
        return { data: [], error: new Error('An unexpected error occurred while loading sports. Please try again.') }
    }
}

/**
 * Get a single sport by ID
 */
export async function getSport(
    context: UserContext,
    sportId: string
): Promise<{ data: Sport | FakeSport | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        const sport = getSportById(sportId)
        return { data: sport || null, error: null }
    }

    try {
        const { data, error } = await supabase
            .from('sports')
            .select('*')
            .eq('id', sportId)
            .eq('org_id', context.orgId)
            .single()

        if (error) throw error
        return { data: data as Sport, error: null }
    } catch (err) {
        console.error('[sportsService] Error getting sport:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Link a system sport to an organization
 * Organizations can only link to predefined system sports
 */
export async function createSport(
    dto: CreateSportDTO
): Promise<{ data: Sport | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            data: null,
            error: new Error('Create operations are not available in demo mode. Please sign in to add sports to your organization.')
        }
    }

    try {
        // Validate input
        if (!dto.org_id || !dto.org_id.trim()) {
            return { data: null, error: new Error('Organization ID is required') }
        }

        // Validate UUID format for org_id
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(dto.org_id)) {
            return { data: null, error: new Error('Invalid organization ID format') }
        }

        // Find the system sport by name (case-insensitive)
        const normalizedName = dto.name.trim()
        if (!normalizedName || normalizedName.length > 100) {
            return { data: null, error: new Error('Invalid sport name: must be between 1 and 100 characters') }
        }

        // Find the system sport (org_id IS NULL and is_system = true)
        const { data: systemSports, error: findError } = await supabase
            .from('sports')
            .select('*')
            .is('org_id', null)
            .eq('is_system', true)
            .ilike('name', normalizedName)
            .limit(1)
            .maybeSingle()

        if (findError) {
            // Check for network errors
            if (findError.message?.includes('network') || findError.message?.includes('fetch') || findError.message?.includes('timeout')) {
                return { data: null, error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (findError.message?.includes('row-level security') || findError.message?.includes('RLS') || findError.code === '42501') {
                return { data: null, error: new Error('Permission denied. You do not have access to view system sports.') }
            }
            console.error('[sportsService] Error finding system sport:', findError)
            return { data: null, error: new Error(`Failed to find sport: ${findError.message || 'Unknown error'}`) }
        }

        if (!systemSports) {
            return { data: null, error: new Error('Sport not found. Please select from the available system sports.') }
        }

        // Check if already linked
        const { data: existingLink, error: checkError } = await supabase
            .from('organization_sports')
            .select('*')
            .eq('org_id', dto.org_id)
            .eq('sport_id', systemSports.id)
            .maybeSingle()

        if (checkError) {
            // Check for network errors
            if (checkError.message?.includes('network') || checkError.message?.includes('fetch') || checkError.message?.includes('timeout')) {
                return { data: null, error: new Error('Network error. Please check your internet connection and try again.') }
            }
            console.error('[sportsService] Error checking existing link:', checkError)
            // Continue - this might be a permission issue, but we'll try to insert anyway
        }

        if (existingLink) {
            // Already linked - return success with the sport data
            return { data: systemSports as Sport, error: null }
        }

        // Link the system sport to the organization
        const { data: linkData, error: linkError } = await supabase
            .from('organization_sports')
            .insert({
                org_id: dto.org_id,
                sport_id: systemSports.id,
            })
            .select()
            .single()

        if (linkError) {
            // Check for network errors
            if (linkError.message?.includes('network') || linkError.message?.includes('fetch') || linkError.message?.includes('timeout')) {
                return { data: null, error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (linkError.message?.includes('row-level security') || linkError.message?.includes('RLS') || linkError.code === '42501') {
                return { data: null, error: new Error('Permission denied. You do not have permission to add sports to this organization.') }
            }
            // Check for constraint violations (duplicate key)
            if (linkError.code === '23505' || linkError.message?.includes('duplicate key') || linkError.message?.includes('unique constraint')) {
                // This shouldn't happen since we checked above, but handle gracefully
                return { data: systemSports as Sport, error: null }
            }
            // Check for foreign key violations
            if (linkError.code === '23503' || linkError.message?.includes('foreign key')) {
                return { data: null, error: new Error('Invalid organization or sport. Please refresh the page and try again.') }
            }
            console.error('[sportsService] Error linking sport:', linkError)
            return { data: null, error: new Error(`Failed to add sport: ${linkError.message || 'Unknown error'}`) }
        }

        if (!linkData) {
            return { data: null, error: new Error('Failed to create sport link. Please try again.') }
        }

        // Log audit event (best effort - don't fail if logging fails)
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await logSportEvent(
                'SPORT_LINKED',
                dto.org_id,
                systemSports.id,
                user?.id,
                'org_admin',
                {
                    sport_name: systemSports.name,
                    sport_id: systemSports.id,
                }
            )
        } catch (logError) {
            console.error('[sportsService] Failed to log SPORT_LINKED event:', logError)
            // Continue - audit logging failure shouldn't break the operation
        }

        return { data: systemSports as Sport, error: null }
    } catch (err) {
        console.error('[sportsService] Error linking sport:', err)
        // Handle network errors in catch block
        if (err instanceof Error) {
            if (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('timeout')) {
                return { data: null, error: new Error('Network error. Please check your internet connection and try again.') }
            }
            return { data: null, error: err }
        }
        return { data: null, error: new Error('An unexpected error occurred. Please try again.') }
    }
}

/**
 * Update a sport
 * Note: System sports cannot be updated. Only organization-specific customizations can be updated.
 */
export async function updateSport(
    context: UserContext,
    sportId: string,
    dto: UpdateSportDTO
): Promise<{ data: Sport | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            data: null,
            error: new Error('Update operations are not available in demo mode')
        }
    }

    try {
        // Check if this is a system sport (org_id IS NULL)
        const { data: sport, error: fetchError } = await supabase
            .from('sports')
            .select('org_id')
            .eq('id', sportId)
            .single()

        if (fetchError) throw fetchError

        // System sports cannot be updated (system sports have org_id = NULL)
        if (isSystemSport(sport)) {
            return { data: null, error: new Error('System sports cannot be modified. They are predefined for consistency.') }
        }

        // For legacy org-specific sports, allow updates
        const updateData: any = {}
        if (dto.name !== undefined) {
            const normalizedName = dto.name.trim()
            if (!normalizedName || normalizedName.length > 100) {
                return { data: null, error: new Error('Invalid sport name: must be between 1 and 100 characters') }
            }
            updateData.name = normalizedName
        }
        if (dto.icon !== undefined) updateData.icon = dto.icon
        if (dto.color !== undefined) updateData.color = dto.color

        const { data, error } = await supabase
            .from('sports')
            .update(updateData)
            .eq('id', sportId)
            .eq('org_id', context.orgId)
            .select()
            .single()

        if (error) throw error
        return { data: data as Sport, error: null }
    } catch (err) {
        console.error('[sportsService] Error updating sport:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Unlink a sport from an organization
 * For system sports (org_id IS NULL), this removes the link.
 * For org-specific sports, this performs a hard delete.
 */
export async function deleteSport(
    context: UserContext,
    sportId: string
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: new Error('Delete operations are not available in demo mode. Please sign in to remove sports from your organization.') }
    }

    try {
        // Validate input
        if (!sportId || !sportId.trim()) {
            return { error: new Error('Sport ID is required') }
        }

        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(sportId)) {
            return { error: new Error('Invalid sport ID format') }
        }

        if (!context.orgId) {
            return { error: new Error('Organization ID is required') }
        }

        // Check if this is a system sport (org_id IS NULL)
        const { data: sport, error: fetchError } = await supabase
            .from('sports')
            .select('org_id, is_system')
            .eq('id', sportId)
            .maybeSingle()

        if (fetchError) {
            // Check for network errors
            if (fetchError.message?.includes('network') || fetchError.message?.includes('fetch') || fetchError.message?.includes('timeout')) {
                return { error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (fetchError.message?.includes('row-level security') || fetchError.message?.includes('RLS') || fetchError.code === '42501') {
                return { error: new Error('Permission denied. You do not have access to view this sport.') }
            }
            if (fetchError.code === 'PGRST116') {
                return { error: new Error('Sport not found.') }
            }
            console.error('[sportsService] Error fetching sport:', fetchError)
            return { error: new Error(`Failed to find sport: ${fetchError.message || 'Unknown error'}`) }
        }

        if (!sport) {
            return { error: new Error('Sport not found.') }
        }

        // For system sports, remove the organization link
        if (isSystemSport(sport)) {
            const { error: unlinkError } = await supabase
                .from('organization_sports')
                .delete()
                .eq('sport_id', sportId)
                .eq('org_id', context.orgId)

            if (unlinkError) {
                // Check for network errors
                if (unlinkError.message?.includes('network') || unlinkError.message?.includes('fetch') || unlinkError.message?.includes('timeout')) {
                    return { error: new Error('Network error. Please check your internet connection and try again.') }
                }
                // Check for RLS/permission errors
                if (unlinkError.message?.includes('row-level security') || unlinkError.message?.includes('RLS') || unlinkError.code === '42501') {
                    return { error: new Error('Permission denied. You do not have permission to remove sports from this organization.') }
                }
                // Check for foreign key violations (sport might be in use)
                if (unlinkError.code === '23503' || unlinkError.message?.includes('foreign key')) {
                    return { error: new Error('Cannot remove sport: It is currently in use by programs, teams, or other entities.') }
                }
                console.error('[sportsService] Error unlinking sport:', unlinkError)
                return { error: new Error(`Failed to remove sport: ${unlinkError.message || 'Unknown error'}`) }
            }

            // Log audit event (best effort - don't fail if logging fails)
            try {
                const { data: { user } } = await supabase.auth.getUser()
                await logSportEvent(
                    'SPORT_UNLINKED',
                    context.orgId,
                    sportId,
                    user?.id,
                    'org_admin',
                    {
                        sport_id: sportId,
                    }
                )
            } catch (logError) {
                console.error('[sportsService] Failed to log SPORT_UNLINKED event:', logError)
                // Continue - audit logging failure shouldn't break the operation
            }

            return { error: null }
        }

        // For org-specific sports, hard delete (deleted_at column doesn't exist)
        const { error } = await supabase
            .from('sports')
            .delete()
            .eq('id', sportId)
            .eq('org_id', context.orgId)

        if (error) {
            // Check for network errors
            if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('timeout')) {
                return { error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.code === '42501') {
                return { error: new Error('Permission denied. You do not have permission to delete this sport.') }
            }
            // Check for trigger errors (deletion blocked due to children)
            if (error.code === 'P0001' || error.message?.includes('Cannot delete sport')) {
                // Database trigger error - sport has programs
                return { error: new Error(error.message || 'Cannot delete sport: It contains programs and cannot be removed.') }
            }
            // Check for foreign key violations
            if (error.code === '23503' || error.message?.includes('foreign key')) {
                return { error: new Error('Cannot delete sport: It is currently in use by programs, teams, or other entities.') }
            }
            console.error('[sportsService] Error deleting sport:', error)
            return { error: new Error(`Failed to delete sport: ${error.message || 'Unknown error'}`) }
        }
        return { error: null }
    } catch (err) {
        console.error('[sportsService] Error deleting sport:', err)
        // Handle network errors in catch block
        if (err instanceof Error) {
            if (err.message?.includes('network') || err.message?.includes('fetch') || err.message?.includes('timeout')) {
                return { error: new Error('Network error. Please check your internet connection and try again.') }
            }
            return { error: err }
        }
        return { error: new Error('An unexpected error occurred. Please try again.') }
    }
}

// ============================================================================
// Sport Icon Upload and Customization
// ============================================================================

/**
 * Upload sport icon to storage
 * Path: sports/{org_id}/{sport_id}/icon.{ext}
 */
export async function uploadSportIcon(
    context: UserContext,
    sportId: string,
    file: File
): Promise<{ path: string | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            path: null,
            error: new Error('Icon upload is not available in demo mode')
        }
    }

    try {
        if (!context.orgId) {
            return { path: null, error: new Error('Organization ID is required') }
        }

        if (!sportId) {
            return { path: null, error: new Error('Sport ID is required') }
        }

        // Validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml']
        if (!allowedTypes.includes(file.type)) {
            return { path: null, error: new Error('Invalid file type. Please upload a PNG, JPEG, WebP, or SVG image.') }
        }

        // Validate file size (max 5MB)
        const maxSize = 5 * 1024 * 1024 // 5MB
        if (file.size > maxSize) {
            return { path: null, error: new Error('File size exceeds 5MB limit. Please upload a smaller image.') }
        }

        const fileExt = file.name.split('.').pop() || 'png'
        const filePath = `sports/${context.orgId}/${sportId}/icon.${fileExt}`

        const { error: uploadError } = await supabase.storage
            .from('organization-assets')
            .upload(filePath, file, { upsert: true })

        if (uploadError) {
            // Check for network errors
            if (uploadError.message?.includes('network') || uploadError.message?.includes('fetch') || uploadError.message?.includes('timeout')) {
                return { path: null, error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (uploadError.message?.includes('row-level security') || uploadError.message?.includes('RLS') || uploadError.message?.includes('permission')) {
                return { path: null, error: new Error('Permission denied. You do not have permission to upload sport icons.') }
            }
            throw uploadError
        }

        // Update or create customization record
        const { error: updateError } = await supabase
            .from('organization_sport_customizations' as any)
            .upsert({
                org_id: context.orgId,
                sport_id: sportId,
                icon_path: filePath,
            }, {
                onConflict: 'org_id,sport_id'
            })

        if (updateError) {
            console.error('[sportsService] Error updating customization:', updateError)
            // Don't fail - the file was uploaded, we can update the customization later
        }

        // Log audit event
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await logSportEvent(
                'SPORT_ICON_UPLOADED',
                context.orgId,
                sportId,
                user?.id,
                'org_admin',
                {
                    icon_path: filePath,
                    file_size: file.size,
                    file_type: file.type,
                }
            )
        } catch (logError) {
            console.error('[sportsService] Failed to log SPORT_ICON_UPLOADED event:', logError)
        }

        return { path: filePath, error: null }
    } catch (err) {
        console.error('[sportsService] Error uploading sport icon:', err)
        return { path: null, error: err instanceof Error ? err : new Error('Unknown error uploading icon') }
    }
}

/**
 * Get public URL for sport icon
 */
export function getSportIconUrl(iconPath: string | null): string | null {
    if (!iconPath) return null
    
    const { data } = supabase.storage
        .from('organization-assets')
        .getPublicUrl(iconPath)
    
    return data.publicUrl
}

/**
 * Delete sport icon
 */
export async function deleteSportIcon(
    context: UserContext,
    sportId: string
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: new Error('Icon deletion is not available in demo mode') }
    }

    try {
        if (!context.orgId) {
            return { error: new Error('Organization ID is required') }
        }

        // Get customization to find icon path
        const { data: customization, error: fetchError } = await supabase
            .from('organization_sport_customizations' as any)
            .select('icon_path')
            .eq('org_id', context.orgId)
            .eq('sport_id', sportId)
            .maybeSingle()

        if (fetchError) {
            console.error('[sportsService] Error fetching customization:', fetchError)
        }

        // Delete file from storage if it exists
        type CustomizationRow = { icon_path: string | null }
        const customizationRow = customization && !('error' in customization) 
            ? (customization as unknown as CustomizationRow)
            : null
        if (customizationRow?.icon_path) {
            const { error: deleteError } = await supabase.storage
                .from('organization-assets')
                .remove([customizationRow.icon_path])

            if (deleteError) {
                console.error('[sportsService] Error deleting icon file:', deleteError)
                // Continue - try to update customization anyway
            }
        }

        // Remove icon_path from customization (keep color if exists)
        const { error: updateError } = await supabase
            .from('organization_sport_customizations' as any)
            .update({ icon_path: null } as any)
            .eq('org_id', context.orgId)
            .eq('sport_id', sportId)

        if (updateError) {
            // If no customization exists, that's fine - nothing to delete
            if (updateError.code !== 'PGRST116') {
                throw updateError
            }
        }

        // Log audit event
        try {
            const { data: { user } } = await supabase.auth.getUser()
            await logSportEvent(
                'SPORT_ICON_DELETED',
                context.orgId,
                sportId,
                user?.id,
                'org_admin',
                {}
            )
        } catch (logError) {
            console.error('[sportsService] Failed to log SPORT_ICON_DELETED event:', logError)
        }

        return { error: null }
    } catch (err) {
        console.error('[sportsService] Error deleting sport icon:', err)
        return { error: err instanceof Error ? err : new Error('Unknown error deleting icon') }
    }
}

/**
 * Update sport customization (icon and/or color)
 */
export async function updateSportCustomization(
    context: UserContext,
    sportId: string,
    updates: { icon_path?: string | null; color?: string | null }
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: new Error('Customization updates are not available in demo mode') }
    }

    try {
        if (!context.orgId) {
            return { error: new Error('Organization ID is required') }
        }

        // Validate color format if provided
        if (updates.color && !/^#[0-9A-Fa-f]{6}$/.test(updates.color)) {
            return { error: new Error('Invalid color format. Please use hex format (e.g., #137fec)') }
        }

        const updateData: any = {}
        if (updates.icon_path !== undefined) updateData.icon_path = updates.icon_path
        if (updates.color !== undefined) updateData.color = updates.color

        // Upsert customization
        const { error: upsertError } = await supabase
            .from('organization_sport_customizations' as any)
            .upsert({
                org_id: context.orgId,
                sport_id: sportId,
                ...updateData,
            }, {
                onConflict: 'org_id,sport_id'
            })

        if (upsertError) {
            // Check for network errors
            if (upsertError.message?.includes('network') || upsertError.message?.includes('fetch') || upsertError.message?.includes('timeout')) {
                return { error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (upsertError.message?.includes('row-level security') || upsertError.message?.includes('RLS') || upsertError.code === '42501') {
                return { error: new Error('Permission denied. You do not have permission to customize sports.') }
            }
            throw upsertError
        }

        // Log audit event
        try {
            const { data: { user } } = await supabase.auth.getUser()
            const eventType = updates.icon_path !== undefined && updates.color !== undefined
                ? 'SPORT_CUSTOMIZED'
                : updates.icon_path !== undefined
                ? 'SPORT_ICON_UPLOADED'
                : 'SPORT_CUSTOMIZATION_UPDATED'
            
            await logSportEvent(
                eventType,
                context.orgId,
                sportId,
                user?.id,
                'org_admin',
                {
                    icon_path: updates.icon_path,
                    color: updates.color,
                }
            )
        } catch (logError) {
            console.error('[sportsService] Failed to log customization event:', logError)
        }

        return { error: null }
    } catch (err) {
        console.error('[sportsService] Error updating sport customization:', err)
        return { error: err instanceof Error ? err : new Error('Unknown error updating customization') }
    }
}

// ============================================================================
// Programs CRUD Operations
// ============================================================================

/**
 * Get all programs for an organization
 */
export async function getPrograms(
    context: UserContext,
    sportId?: string
): Promise<{ data: Program[] | FakeProgram[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        let programs = getProgramsForOrg(context.orgId)
        if (sportId) {
            programs = programs.filter(p => p.sport_id === sportId)
        }
        return { data: programs, error: null }
    }

    try {
        let query = supabase
            .from('programs')
            .select('*')
            .eq('org_id', context.orgId)
            .order('name')

        if (sportId) {
            query = query.eq('sport_id', sportId)
        }

        const { data, error } = await query

        if (error) throw error
        return { data: data as Program[], error: null }
    } catch (err) {
        console.error('[sportsService] Error getting programs:', err)
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get a single program by ID
 */
export async function getProgram(
    context: UserContext,
    programId: string
): Promise<{ data: Program | FakeProgram | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        const program = getProgramById(programId)
        return { data: program || null, error: null }
    }

    try {
        const { data, error } = await supabase
            .from('programs')
            .select('*')
            .eq('id', programId)
            .eq('org_id', context.orgId)
            .single()

        if (error) throw error
        return { data: data as Program, error: null }
    } catch (err) {
        console.error('[sportsService] Error getting program:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Create a new program
 */
export async function createProgram(
    _context: UserContext,
    dto: CreateProgramDTO
): Promise<{ data: Program | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            data: null,
            error: new Error('Create operations are not available in demo mode')
        }
    }

    try {
        type ProgramInsert = Database['public']['Tables']['programs']['Insert']
        const insertData = {
            org_id: dto.org_id,
            sport_id: dto.sport_id,
            name: dto.name,
            gender_category: dto.gender_category,
            description: dto.description || null,
            age_min: dto.age_min || null,
            age_max: dto.age_max || null,
        } satisfies ProgramInsert
        const { data, error } = await supabase
            .from('programs')
            .insert(insertData)
            .select()
            .single()

        if (error) throw error
        return { data: data as unknown as Program, error: null }
    } catch (err) {
        console.error('[sportsService] Error creating program:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Update a program
 */
export async function updateProgram(
    context: UserContext,
    programId: string,
    dto: UpdateProgramDTO
): Promise<{ data: Program | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            data: null,
            error: new Error('Update operations are not available in demo mode')
        }
    }

    try {
        type ProgramUpdate = Database['public']['Tables']['programs']['Update']
        const updateData: ProgramUpdate = {}
        if (dto.name !== undefined) updateData.name = dto.name
        if (dto.gender_category !== undefined) updateData.gender_category = dto.gender_category
        if (dto.description !== undefined) updateData.description = dto.description
        if (dto.age_min !== undefined) updateData.age_min = dto.age_min
        if (dto.age_max !== undefined) updateData.age_max = dto.age_max

        const { data, error} = await supabase
            .from('programs')
            .update(updateData)
            .eq('id', programId)
            .eq('org_id', context.orgId)
            .select()
            .single()

        if (error) throw error
        return { data: data as Program, error: null }
    } catch (err) {
        console.error('[sportsService] Error updating program:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Delete a program
 * Note: deleted_at column doesn't exist, so this performs a hard delete
 * Will fail if program has levels (enforced by database trigger)
 */
export async function deleteProgram(
    context: UserContext,
    programId: string
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: new Error('Delete operations are not available in demo mode') }
    }

    try {
        const { error } = await supabase
            .from('programs')
            .delete()
            .eq('id', programId)
            .eq('org_id', context.orgId)

        if (error) {
            // Check for trigger errors (deletion blocked due to children)
            if (error.code === 'P0001' || error.message?.includes('Cannot delete program')) {
                // Database trigger error - program has levels
                return { error: new Error(error.message || 'Cannot delete program: It contains levels and cannot be removed.') }
            }
            // Check for network errors
            if (error.message?.includes('network') || error.message?.includes('fetch') || error.message?.includes('timeout')) {
                return { error: new Error('Network error. Please check your internet connection and try again.') }
            }
            // Check for RLS/permission errors
            if (error.message?.includes('row-level security') || error.message?.includes('RLS') || error.code === '42501') {
                return { error: new Error('Permission denied. You do not have permission to delete this program.') }
            }
            // Check for foreign key violations
            if (error.code === '23503' || error.message?.includes('foreign key')) {
                return { error: new Error('Cannot delete program: It is currently in use.') }
            }
            throw error
        }
        return { error: null }
    } catch (err) {
        console.error('[sportsService] Error deleting program:', err)
        return { error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
