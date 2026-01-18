/**
 * Seasons Service
 *
 * Provides CRUD operations for seasons (organization-scoped).
 * Supports both fake data and Supabase.
 */

import { USE_FAKE_DATA, FAKE_DATA_DELAY_MS } from '../config'
import { supabase } from '../../lib/supabase'
import type { UserContext } from '../fake/userContext'
import type { Season } from '../types/organization'
import { getSeasonById, getSeasonsForOrg } from '../fake/fakeTeams'

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

    if (error) throw error
    return { data: data as Season[], error: null }
  } catch (err) {
    console.error('[seasonsService] Error getting seasons:', err)
    return { data: [], error: err instanceof Error ? err : new Error('Unknown error') }
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
    return { data: data as Season, error: null }
  } catch (err) {
    console.error('[seasonsService] Error getting season:', err)
    return { data: null, error: err instanceof Error ? err : new Error('Unknown error') }
  }
}
