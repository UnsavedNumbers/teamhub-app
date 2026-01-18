/**
 * Sports Service
 *
 * Provides CRUD operations for sports and programs.
 * Supports both fake data (demo mode) and real Supabase queries.
 * Implements soft delete for sports and programs.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import { supabase } from '../../lib/supabase'
import type { UserContext } from '../fake/userContext'
import type { Database } from '../../lib/database.types'
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

// ============================================================================
// Sports CRUD Operations
// ============================================================================

/**
 * Get all sports for an organization (excluding deleted)
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
        const { data, error } = await supabase
            .from('sports')
            .select('*')
            .eq('org_id', context.orgId)
            .is('deleted_at', null)
            .order('name')

        if (error) throw error
        return { data: data as Sport[], error: null }
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
            .is('deleted_at', null)
            .single()

        if (error) throw error
        return { data: data as Sport, error: null }
    } catch (err) {
        console.error('[sportsService] Error getting sport:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Create a new sport
 */
export async function createSport(
    _context: UserContext,
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
        const { data, error } = await supabase
            .from('sports')
            .insert({
                org_id: dto.org_id,
                name: dto.name,
                icon: dto.icon || null,
                color: dto.color || '#137fec',
            } as Database['public']['Tables']['sports']['Insert'])
            .select()
            .single()

        if (error) throw error
        return { data: data as Sport, error: null }
    } catch (err) {
        console.error('[sportsService] Error creating sport:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Update a sport
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
        const updateData: any = {}
        if (dto.name !== undefined) updateData.name = dto.name
        if (dto.icon !== undefined) updateData.icon = dto.icon
        if (dto.color !== undefined) updateData.color = dto.color

        const { data, error } = await supabase
            .from('sports')
            .update(updateData as any)
            .eq('id', sportId)
            .eq('org_id', context.orgId)
            .is('deleted_at', null)
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
 * Soft delete a sport
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
        const { error } = await supabase
            .from('sports')
            .update({ deleted_at: new Date().toISOString() } as Database['public']['Tables']['sports']['Update'])
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
 * Get all programs for an organization (excluding deleted)
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
            .is('deleted_at', null)
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
            .is('deleted_at', null)
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
        const { data, error } = await supabase
            .from('programs')
            .insert({
                org_id: dto.org_id,
                sport_id: dto.sport_id,
                name: dto.name,
                gender_category: dto.gender_category,
                description: dto.description || null,
                age_min: dto.age_min || null,
                age_max: dto.age_max || null,
            } as Database['public']['Tables']['programs']['Insert'])
            .select()
            .single()

        if (error) throw error
        return { data: data as Program, error: null }
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
        const updateData: any = {}
        if (dto.name !== undefined) updateData.name = dto.name
        if (dto.gender_category !== undefined) updateData.gender_category = dto.gender_category
        if (dto.description !== undefined) updateData.description = dto.description
        if (dto.age_min !== undefined) updateData.age_min = dto.age_min
        if (dto.age_max !== undefined) updateData.age_max = dto.age_max

        const { data, error } = await supabase
            .from('programs')
            .update(updateData as Database['public']['Tables']['programs']['Update'])
            .eq('id', programId)
            .eq('org_id', _context.orgId)
            .is('deleted_at', null)
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
 * Soft delete a program
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
            .update({ deleted_at: new Date().toISOString() } as Database['public']['Tables']['programs']['Update'])
            .eq('id', programId)
            .eq('org_id', _context.orgId)

        if (error) throw error
        return { error: null }
    } catch (err) {
        console.error('[sportsService] Error deleting program:', err)
        return { error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
