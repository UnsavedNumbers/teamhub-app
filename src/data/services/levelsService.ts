/**
 * Levels Service
 *
 * Provides CRUD operations for levels (eligibility groups).
 * Supports both fake data and Supabase.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import { supabase } from '../../lib/supabase'
import type { UserContext } from '../fake/userContext'
import type { Level, CreateLevelDTO, UpdateLevelDTO } from '../types/organization'
import { getLevelsForProgram, getLevelById, fakeLevels } from '../fake/fakeTeams'

// ============================================================================
// Helper Functions
// ============================================================================

async function simulateDelay(): Promise<void> {
    if (FAKE_DATA_DELAY_MS > 0) {
        await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
    }
}

// ============================================================================
// Levels CRUD Operations
// ============================================================================

/**
 * Get all levels for an organization or specific program
 */
export async function getLevels(
    context: UserContext,
    programId?: string
): Promise<{ data: Level[]; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        // If programId provided, filter by it
        // If not, return all for org
        // In fake data, all levels are for Demo Org, but we should be clean
        let levels = fakeLevels.filter(l => l.org_id === context.orgId)
        if (programId) {
            levels = levels.filter(l => l.program_id === programId)
        }
        return { data: levels, error: null }
    }

    try {
        let query = supabase
            .from('levels')
            .select('*')
            .eq('org_id', context.orgId)
            .is('deleted_at', null)
            .order('name')

        if (programId) {
            query = query.eq('program_id', programId)
        }

        const { data, error } = await query

        if (error) throw error
        return { data: data as Level[], error: null }
    } catch (err) {
        console.error('[levelsService] Error getting levels:', err)
        return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Get a single level by ID
 */
export async function getLevel(
    context: UserContext,
    levelId: string
): Promise<{ data: Level | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        const level = getLevelById(levelId)
        return { data: level || null, error: null }
    }

    try {
        const { data, error } = await supabase
            .from('levels')
            .select('*')
            .eq('id', levelId)
            .eq('org_id', context.orgId)
            .is('deleted_at', null)
            .single()

        if (error) throw error
        return { data: data as Level, error: null }
    } catch (err) {
        console.error('[levelsService] Error getting level:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Create a new level
 */
export async function createLevel(
    context: UserContext,
    dto: CreateLevelDTO
): Promise<{ data: Level | null; error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return {
            data: null,
            error: new Error('Create operations are not available in demo mode')
        }
    }

    try {
        const { data, error } = await supabase
            .from('levels')
            .insert({
                org_id: dto.org_id,
                program_id: dto.program_id,
                name: dto.name,
                level_type: dto.level_type,
                description: dto.description || null,
                age_min: dto.age_min || null,
                age_max: dto.age_max || null,
                grade_min: dto.grade_min || null,
                grade_max: dto.grade_max || null,
                skill_min: dto.skill_min || null,
                skill_max: dto.skill_max || null,
            })
            .select()
            .single()

        if (error) throw error
        return { data: data as Level, error: null }
    } catch (err) {
        console.error('[levelsService] Error creating level:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Update a level
 */
export async function updateLevel(
    context: UserContext,
    levelId: string,
    dto: UpdateLevelDTO
): Promise<{ data: Level | null; error: Error | null }> {
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
        if (dto.description !== undefined) updateData.description = dto.description
        if (dto.level_type !== undefined) updateData.level_type = dto.level_type
        if (dto.age_min !== undefined) updateData.age_min = dto.age_min
        if (dto.age_max !== undefined) updateData.age_max = dto.age_max
        if (dto.grade_min !== undefined) updateData.grade_min = dto.grade_min
        if (dto.grade_max !== undefined) updateData.grade_max = dto.grade_max
        if (dto.skill_min !== undefined) updateData.skill_min = dto.skill_min
        if (dto.skill_max !== undefined) updateData.skill_max = dto.skill_max

        const { data, error } = await supabase
            .from('levels')
            .update(updateData)
            .eq('id', levelId)
            .eq('org_id', context.orgId)
            .is('deleted_at', null)
            .select()
            .single()

        if (error) throw error
        return { data: data as Level, error: null }
    } catch (err) {
        console.error('[levelsService] Error updating level:', err)
        return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
    }
}

/**
 * Soft delete a level
 */
export async function deleteLevel(
    context: UserContext,
    levelId: string
): Promise<{ error: Error | null }> {
    if (USE_FAKE_DATA) {
        await simulateDelay()
        return { error: new Error('Delete operations are not available in demo mode') }
    }

    try {
        const { error } = await supabase
            .from('levels')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', levelId)
            .eq('org_id', context.orgId)

        if (error) throw error
        return { error: null }
    } catch (err) {
        console.error('[levelsService] Error deleting level:', err)
        return { error: err instanceof Error ? err : new Error('Unknown error') }
    }
}
