/**
 * Seasons Service
 *
 * Provides CRUD operations for seasons (organization-scoped).
 * Supports both fake data and Supabase.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS, DEMO_ORG_A_ID } from '../config'
import { supabase } from '../../lib/supabase'
import { debug } from '../../lib/debug'
import type { UserContext } from '../fake/userContext'
import type { Season, CreateSeasonDTO, UpdateSeasonDTO } from '../types/organization'
import { getSeasonById, getSeasonsForOrg } from '../fake/fakeTeams'
import type { SupabaseExtended as Database } from '../../lib/supabase.extended.types'
import { deriveActorRoleFromRoles, logEvent } from '../../utils/eventLogger'

async function simulateDelay(): Promise<void> {
  if (FAKE_DATA_DELAY_MS > 0) {
    await new Promise((resolve) => setTimeout(resolve, FAKE_DATA_DELAY_MS))
  }
}

export interface GetSeasonsOptions {
  activeOnly?: boolean
}

export async function getSeasons(
  context: UserContext,
  options: GetSeasonsOptions = {}
): Promise<{ data: Season[]; error: Error | null }> {
  console.groupCollapsed(`%cgetSeasons: ${context.orgId}`, 'color: #666; font-weight: bold;');
  debug.data('SeasonsService.getSeasons', 'Request', { context: { userId: context.userId, orgId: context.orgId }, options })
  debug.perf.start('seasonsService.getSeasons')

  try {
    if (USE_FAKE_DATA) {
      await simulateDelay()
      const allSeasons = getSeasonsForOrg(DEMO_ORG_A_ID)
      const seasons = options.activeOnly ? allSeasons.filter(s => s.is_active) : allSeasons
      debug.perf.end('seasonsService.getSeasons')
      debug.data('SeasonsService.getSeasons', 'Response (fake)', { seasonCount: seasons.length, activeOnly: options.activeOnly })
      console.groupEnd()
      return { data: seasons, error: null }
    }
    let query = supabase
      .from('seasons')
      .select('*')
      .eq('org_id', context.orgId)

    // Filter by active status if requested
    if (options.activeOnly) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query.order('start_date', { ascending: false })

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
    debug.perf.end('seasonsService.getSeasons')
    debug.data('SeasonsService.getSeasons', 'Response', { seasonCount: mapped.length, activeOnly: options.activeOnly })
    console.groupEnd()
    return { data: mapped, error: null }
  } catch (err) {
    debug.perf.end('seasonsService.getSeasons')
    debug.error('SeasonsService.getSeasons', 'Failed to get seasons', { error: err, context: { userId: context.userId, orgId: context.orgId }, options })
    console.groupEnd()
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
  console.groupCollapsed(`%cgetSeason: ${seasonId}`, 'color: #666; font-weight: bold;');
  debug.data('SeasonsService.getSeason', 'Request', { seasonId, context: { userId: context.userId, orgId: context.orgId } })
  debug.perf.start('seasonsService.getSeason')

  try {
    if (USE_FAKE_DATA) {
      await simulateDelay()
      const season = getSeasonById(seasonId) ?? null
      debug.perf.end('seasonsService.getSeason')
      debug.data('SeasonsService.getSeason', 'Response (fake)', { seasonId, found: !!season })
      console.groupEnd()
      return { data: season, error: null }
    }
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', seasonId)
      .eq('org_id', context.orgId)
      .single()

    if (error) throw error
    type SeasonRow = Database['public']['Tables']['seasons']['Row'] & { id: string; name: string; start_date: string; end_date: string; is_active: boolean; org_id: string }
    const row = data as SeasonRow
    debug.perf.end('seasonsService.getSeason')
    debug.data('SeasonsService.getSeason', 'Response', { seasonId, seasonName: row.name })
    console.groupEnd()
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
    debug.perf.end('seasonsService.getSeason')
    debug.error('SeasonsService.getSeason', 'Failed to get season', { error: err, seasonId, context: { userId: context.userId, orgId: context.orgId } })
    console.groupEnd()
    console.error('[seasonsService] Error getting season:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}

export async function createSeason(
  context: UserContext,
  dto: CreateSeasonDTO
): Promise<{ data: Season | null; error: Error | null }> {
  console.groupCollapsed(`%ccreateSeason: ${dto.name}`, 'color: #666; font-weight: bold;');
  debug.flow('SeasonsService.createSeason', 'Creating season', { seasonName: dto.name, orgId: dto.org_id })
  debug.perf.start('seasonsService.createSeason')

  try {
    if (USE_FAKE_DATA) {
      await simulateDelay()
      debug.perf.end('seasonsService.createSeason')
      debug.flow('SeasonsService.createSeason', 'Season created (fake)', { seasonName: dto.name })
      console.groupEnd()
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
    const season: Season = {
      id: row.id,
      org_id: row.org_id,
      team_id: row.team_id ?? null,
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
      is_active: row.is_active ?? false,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }

    // Best-effort logging; do not block season creation.
    const logResult = await logEvent({
      category: 'SEASON',
      eventType: 'SEASON_CREATED',
      actorUserId: context.userId,
      actorRole: deriveActorRoleFromRoles(context.roles),
      orgId: row.org_id,
      targetEntityType: 'season',
      targetEntityId: row.id,
      metadata: {
        name: row.name,
        start_date: row.start_date,
        end_date: row.end_date,
        is_active: row.is_active ?? false,
        sport_id: row.sport_id ?? null,
        program_id: row.program_id ?? null,
        source: 'seasonsService.createSeason',
      },
    })
    if (logResult.error) {
      console.error('[seasonsService] Failed to log SEASON_CREATED event:', logResult.error)
    }

    debug.perf.end('seasonsService.createSeason')
    debug.flow('SeasonsService.createSeason', 'Season created successfully', { seasonId: season.id, seasonName: season.name })
    console.groupEnd()
    return {
      data: season,
      error: null,
    }
  } catch (err) {
    debug.perf.end('seasonsService.createSeason')
    debug.error('SeasonsService.createSeason', 'Failed to create season', { error: err, seasonName: dto.name, orgId: dto.org_id })
    console.groupEnd()
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
  console.groupCollapsed(`%cupdateSeason: ${seasonId}`, 'color: #666; font-weight: bold;');
  debug.flow('SeasonsService.updateSeason', 'Updating season', { seasonId, seasonName: dto.name })
  debug.perf.start('seasonsService.updateSeason')

  try {
    if (USE_FAKE_DATA) {
      await simulateDelay()
      debug.perf.end('seasonsService.updateSeason')
      debug.flow('SeasonsService.updateSeason', 'Season updated (fake)', { seasonId })
      console.groupEnd()
      return { data: null, error: null }
    }
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
    const season: Season = {
      id: row.id,
      org_id: row.org_id,
      team_id: row.team_id ?? null,
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
      is_active: row.is_active ?? false,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }

    // Best-effort logging; do not block season updates.
    const logResult = await logEvent({
      category: 'SEASON',
      eventType: 'SEASON_UPDATED',
      actorUserId: context.userId,
      actorRole: deriveActorRoleFromRoles(context.roles),
      orgId: row.org_id,
      targetEntityType: 'season',
      targetEntityId: row.id,
      metadata: {
        updates: {
          name: dto.name,
          start_date: dto.start_date,
          end_date: dto.end_date,
          is_active: dto.is_active,
          sport_id: dto.sport_id ?? null,
          program_id: dto.program_id ?? null,
        },
        source: 'seasonsService.updateSeason',
      },
    })
    if (logResult.error) {
      console.error('[seasonsService] Failed to log SEASON_UPDATED event:', logResult.error)
    }

    return {
      data: season,
      error: null,
    }
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error('Update season failed') }
  }
}

export async function isSeasonEmpty(
  _context: UserContext,
  seasonId: string
): Promise<{ isEmpty: boolean; error: Error | null }> {
  if (USE_FAKE_DATA) {
    await simulateDelay()
    // For fake data, assume seasons are empty
    return { isEmpty: true, error: null }
  }

  try {
    const { count, error } = await supabase
      .from('team_seasons')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', seasonId)

    if (error) throw error
    const isEmpty = (count ?? 0) === 0
    debug.perf.end('seasonsService.isSeasonEmpty')
    debug.data('SeasonsService.isSeasonEmpty', 'Response', { seasonId, isEmpty })
    return { isEmpty, error: null }
  } catch (err) {
    debug.perf.end('seasonsService.isSeasonEmpty')
    debug.error('SeasonsService.isSeasonEmpty', 'Failed to check if season is empty', { error: err, seasonId })
    console.error('[seasonsService] Error checking if season is empty:', err)
    return { isEmpty: false, error: err instanceof Error ? err : new Error('Failed to check if season is empty') }
  }
}

export async function deleteSeason(
  context: UserContext,
  seasonId: string
): Promise<{ error: Error | null }> {
  console.groupCollapsed(`%cdeleteSeason: ${seasonId}`, 'color: #666; font-weight: bold;');
  debug.flow('SeasonsService.deleteSeason', 'Deleting season', { seasonId })
  debug.perf.start('seasonsService.deleteSeason')

  try {
    if (USE_FAKE_DATA) {
      await simulateDelay()
      debug.perf.end('seasonsService.deleteSeason')
      debug.flow('SeasonsService.deleteSeason', 'Season deleted (fake)', { seasonId })
      console.groupEnd()
      return { error: null }
    }
    const { data: existingSeason } = await supabase
      .from('seasons')
      .select('id, org_id, name, start_date, end_date, is_active')
      .eq('id', seasonId)
      .eq('org_id', context.orgId)
      .maybeSingle()

    const { error } = await supabase
      .from('seasons')
      .delete()
      .eq('id', seasonId)
      .eq('org_id', context.orgId)

    if (error) throw error

    // Best-effort logging; do not block season deletion.
    const logResult = await logEvent({
      category: 'SEASON',
      eventType: 'SEASON_DELETED',
      actorUserId: context.userId,
      actorRole: deriveActorRoleFromRoles(context.roles),
      orgId: context.orgId,
      targetEntityType: 'season',
      targetEntityId: seasonId,
      metadata: {
        name: existingSeason?.name ?? null,
        start_date: existingSeason?.start_date ?? null,
        end_date: existingSeason?.end_date ?? null,
        is_active: existingSeason?.is_active ?? null,
        source: 'seasonsService.deleteSeason',
      },
    })
    if (logResult.error) {
      console.error('[seasonsService] Failed to log SEASON_DELETED event:', logResult.error)
    }

    debug.perf.end('seasonsService.deleteSeason')
    debug.flow('SeasonsService.deleteSeason', 'Season deleted successfully', { seasonId })
    console.groupEnd()
    return { error: null }
  } catch (err) {
    debug.perf.end('seasonsService.deleteSeason')
    debug.error('SeasonsService.deleteSeason', 'Failed to delete season', { error: err, seasonId })
    console.groupEnd()
    return { error: err instanceof Error ? err : new Error('Delete season failed') }
  }
}
