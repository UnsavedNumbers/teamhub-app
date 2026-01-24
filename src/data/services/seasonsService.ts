/**
 * Seasons Service
 *
 * Provides CRUD operations for seasons (organization-scoped).
 * Supports both fake data and Supabase.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import { supabase } from '../../lib/supabase'
import type { UserContext } from '../fake/userContext'
import type { Season, CreateSeasonDTO, UpdateSeasonDTO } from '../types/organization'
import { getSeasonById, getSeasonsForOrg } from '../fake/fakeTeams'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'

async function simulateDelay(): Promise<void> {
  if (FAKE_DATA_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
  }
}

export async function getSeasons(
  context: UserContext
): Promise<{ data: Season[]; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: getSeasonsForOrg(context.orgId), error: null }
  }

  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('org_id', context.orgId)
      .order('start_date', { ascending: false })

    if (error) {
      console.error('[seasonsService] Supabase error getting seasons:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw error
    }
    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      org_id: row.org_id,
      team_id: row.team_id ?? null,
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
      is_active: row.is_active ?? false,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }))
    return { data: mapped, error: null }
  } catch (err) {
    console.error('[seasonsService] Error getting seasons:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    const errorDetails = err && typeof err === 'object' && 'details' in err ? (err as any).details : undefined
    return { 
      data: [], 
      error: err instanceof Error ? err : new Error(errorMessage + (errorDetails ? `: ${errorDetails}` : ''))
    }
  }
}

export async function getSeason(
  context: UserContext,
  seasonId: string
): Promise<{ data: Season | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: getSeasonById(seasonId) ?? null, error: null }
  }

  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', seasonId)
      .eq('org_id', context.orgId)
      .single()

    if (error) throw error
    type SeasonRow = Database['public']['Tables']['seasons']['Row'] & { id: string; name: string; start_date: string; end_date: string; is_active: boolean; org_id: string }
    const row = data as SeasonRow
    return {
      data: {
        id: row.id,
        org_id: row.org_id,
        team_id: row.team_id ?? null,
        name: row.name,
        start_date: row.start_date,
        end_date: row.end_date,
        is_active: row.is_active ?? false,
        created_at: row.created_at || '',
        updated_at: row.updated_at || '',
      },
      error: null,
    }
  } catch (err) {
    console.error('[seasonsService] Error getting season:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function createSeason(
  _context: UserContext,
  dto: CreateSeasonDTO
): Promise<{ data: Season | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return {
      data: {
        id: `demo-season-${Date.now()}`,
        org_id: dto.org_id,
        team_id: null,
        name: dto.name,
        start_date: dto.start_date,
        end_date: dto.end_date,
        is_active: dto.is_active ?? false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      error: null,
    }
  }

  try {
    const insertData = {
      org_id: dto.org_id,
      name: dto.name,
      start_date: dto.start_date,
      end_date: dto.end_date,
      is_active: dto.is_active ?? false,
      sport_id: dto.sport_id ?? null,
      program_id: dto.program_id ?? null,
      team_id: null,
    }
    const { data, error } = await supabase
      .from('seasons')
      .insert(insertData as any) // Type will be fixed after migration
      .select()
      .single()

    if (error) {
      console.error('[seasonsService] Supabase error creating season:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      throw error
    }

    const row = data as any
    return {
      data: {
        id: row.id,
        org_id: row.org_id,
        team_id: row.team_id ?? null,
        name: row.name,
        start_date: row.start_date,
        end_date: row.end_date,
        is_active: row.is_active ?? false,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      error: null,
    }
  } catch (err) {
    console.error('[seasonsService] Error creating season:', err)
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    const errorDetails = err && typeof err === 'object' && 'details' in err ? (err as any).details : undefined
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error(errorMessage + (errorDetails ? `: ${errorDetails}` : ''))
    }
  }
}

export async function updateSeason(
  context: UserContext,
  seasonId: string,
  dto: UpdateSeasonDTO
): Promise<{ data: Season | null; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { data: null, error: null }
  }

  try {
    type SeasonUpdate = Database['public']['Tables']['seasons']['Update']
    const updateData = {
      name: dto.name,
      start_date: dto.start_date,
      end_date: dto.end_date,
      is_active: dto.is_active,
      sport_id: dto.sport_id ?? null,
      program_id: dto.program_id ?? null,
      updated_at: new Date().toISOString(),
    } satisfies SeasonUpdate
    const { data, error } = await supabase
      .from('seasons')
      .update(updateData)
      .eq('id', seasonId)
      .eq('org_id', context.orgId)
      .select()
      .single()

    if (error) throw error
    const row = data as any

    return {
      data: {
        id: row.id,
        org_id: row.org_id,
        team_id: row.team_id ?? null,
        name: row.name,
        start_date: row.start_date,
        end_date: row.end_date,
        is_active: row.is_active ?? false,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Update season failed') }
  }
}

export async function deleteSeason(
  context: UserContext,
  seasonId: string
): Promise<{ error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    return { error: null }
  }

  try {
    const { error } = await supabase
      .from('seasons')
      .delete()
      .eq('id', seasonId)
      .eq('org_id', context.orgId)

    if (error) throw error
    return { error: null }
  } catch (err) {
    return { error: err instanceof Error ? err : new Error('Delete season failed') }
  }
}
