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
import type { Database } from '../../lib/database.types'
import type { UserContext } from '../fake/userContext'
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
 * System sports are identified by org_id IS NULL
 */
export async function getSystemSports(): Promise<{ data: Sport[]; error: Error | null }> {
    try {
        const { data, error } = await supabase
            .from('sports')
            .select('*')
            .is('org_id', null)
            .order('name')

        if (error) throw error
        return { data: data as Sport[], error: null }
    } catch (err) {
        console.error('[sportsService] Error getting system sports:', err)
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
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
        // Get sports linked to this organization via organization_sports junction table
        const { data, error } = await supabase
            .from('organization_sports')
            .select(`
                sport:sports(*)
            `)
            .eq('org_id', context.orgId)

        if (error) throw error

        // Extract sports from the joined data
        const sports = (data || [])
            .map((row: any) => row.sport)
            .filter((sport: any) => sport)
            .sort((a: Sport, b: Sport) => a.name.localeCompare(b.name))

        return { data: sports as Sport[], error: null }
    } catch (err) {
        console.error('[sportsService] Error getting sports:', err)
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
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
            error: new Error('Create operations are not available in demo mode')
        }
    }

    try {
        // Find the system sport by name (case-insensitive)
        const normalizedName = dto.name.trim()
        if (!normalizedName || normalizedName.length > 100) {
            return { data: null, error: new Error('Invalid sport name: must be between 1 and 100 characters') }
        }

        // Find the system sport (org_id IS NULL)
        const { data: systemSports, error: findError } = await supabase
            .from('sports')
            .select('*')
            .is('org_id', null)
            .ilike('name', normalizedName)
            .limit(1)
            .single()

        if (findError || !systemSports) {
            return { data: null, error: new Error('Sport not found. Please select from the available system sports.') }
        }

        // Check if already linked
        const { data: existingLink } = await supabase
            .from('organization_sports')
            .select('*')
            .eq('org_id', dto.org_id)
            .eq('sport_id', systemSports.id)
            .single()

        if (existingLink) {
            return { data: systemSports as Sport, error: null }
        }

        // Link the system sport to the organization
        const { data: _, error: linkError } = await supabase
            .from('organization_sports')
            .insert({
                org_id: dto.org_id,
                sport_id: systemSports.id,
            })
            .select()
            .single()

        if (linkError) throw linkError

        return { data: systemSports as Sport, error: null }
    } catch (err) {
        console.error('[sportsService] Error linking sport:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
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
        return { error: new Error('Delete operations are not available in demo mode') }
    }

    try {
        // Check if this is a system sport (org_id IS NULL)
        const { data: sport, error: fetchError } = await supabase
            .from('sports')
            .select('org_id')
            .eq('id', sportId)
            .single()

        if (fetchError) throw fetchError

        // For system sports, remove the organization link
        if (isSystemSport(sport)) {
            const { error: unlinkError } = await supabase
                .from('organization_sports')
                .delete()
                .eq('sport_id', sportId)
                .eq('org_id', context.orgId)

            if (unlinkError) throw unlinkError
            return { error: null }
        }

        // For org-specific sports, hard delete (deleted_at column doesn't exist)
        const { error } = await supabase
            .from('sports')
            .delete()
            .eq('id', sportId)
            .eq('org_id', context.orgId)

        if (error) throw error
        return { error: null }
    } catch (err) {
        console.error('[sportsService] Error deleting sport:', err)
        return { error: err instanceof Error ? err : new Error('Unknown error') }
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

        if (error) throw error
        return { error: null }
    } catch (err) {
        console.error('[sportsService] Error deleting program:', err)
        return { error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
