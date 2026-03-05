import { supabase } from '../../lib/supabase'

const supabaseAny = supabase as any

export interface UnifiedAthleteContextV2 {
  athlete_id?: string
  athlete_identity_id?: string
  identity_id?: string
  org_id?: string
  organization_id?: string
  role_scope?: 'team' | 'parent' | 'admin' | 'athlete' | 'fan' | string
  context_key?: string
  sport_filter?: string
  start_time?: string
  end_time?: string
  team_id?: string
}

export interface IdentityLinkV2Input {
  identity_id?: string | null
  athlete_id: string
  org_id?: string | null
  confidence_score?: number
  match_signals?: Record<string, unknown>
  is_reversible?: boolean
  source?: string
}

export interface SportFilterUpsertOptions {
  idempotencyKey?: string | null
  clientUpdatedAt?: string | null
}

type ServiceResult<T> = Promise<{ data: T | null; error: Error | null }>

function toError(error: unknown, fallback: string): Error {
  if (error instanceof Error) return error
  return new Error(fallback)
}

export async function getUnifiedAthleteProfileV2(
  context: UnifiedAthleteContextV2
): ServiceResult<Record<string, unknown>> {
  try {
    const { data, error } = await supabaseAny.rpc('get_unified_athlete_profile_v2', { p_context: context })
    if (error) throw error
    return { data: (data ?? null) as Record<string, unknown> | null, error: null }
  } catch (error) {
    return { data: null, error: toError(error, 'Failed to load unified athlete profile v2') }
  }
}

export async function getUnifiedAthleteScheduleV2(
  context: UnifiedAthleteContextV2
): ServiceResult<Record<string, unknown>> {
  try {
    const { data, error } = await supabaseAny.rpc('get_unified_athlete_schedule_v2', { p_context: context })
    if (error) throw error
    return { data: (data ?? null) as Record<string, unknown> | null, error: null }
  } catch (error) {
    return { data: null, error: toError(error, 'Failed to load unified athlete schedule v2') }
  }
}

export async function getUnifiedAthleteDocumentsV2(
  context: UnifiedAthleteContextV2
): ServiceResult<Record<string, unknown>> {
  try {
    const { data, error } = await supabaseAny.rpc('get_unified_athlete_documents_v2', { p_context: context })
    if (error) throw error
    return { data: (data ?? null) as Record<string, unknown> | null, error: null }
  } catch (error) {
    return { data: null, error: toError(error, 'Failed to load unified athlete documents v2') }
  }
}

export async function upsertSportFilterPreferenceV2(
  userId: string,
  context: UnifiedAthleteContextV2,
  sportFilter: string,
  options: SportFilterUpsertOptions = {}
): ServiceResult<Record<string, unknown>> {
  try {
    const { data, error } = await supabaseAny.rpc('upsert_sport_filter_preference_v2', {
      p_user_id: userId,
      p_context: context,
      p_sport_filter: sportFilter,
      p_idempotency_key: options.idempotencyKey ?? null,
      p_client_updated_at: options.clientUpdatedAt ?? null,
    })

    if (error) throw error
    return { data: (data ?? null) as Record<string, unknown> | null, error: null }
  } catch (error) {
    return { data: null, error: toError(error, 'Failed to save sport filter preference v2') }
  }
}

type DebounceEntry = {
  timeout: ReturnType<typeof setTimeout> | null
  pendingResolvers: Array<(value: { data: Record<string, unknown> | null; error: Error | null }) => void>
  pendingRejectors: Array<(reason?: unknown) => void>
  latestArgs: {
    userId: string
    context: UnifiedAthleteContextV2
    sportFilter: string
    options: SportFilterUpsertOptions
  } | null
}

const debouncedPreferenceWrites = new Map<string, DebounceEntry>()

function buildPreferenceDebounceKey(userId: string, context: UnifiedAthleteContextV2): string {
  return `${userId}:${context.context_key ?? JSON.stringify(context)}`
}

export function debouncedUpsertSportFilterPreferenceV2(
  userId: string,
  context: UnifiedAthleteContextV2,
  sportFilter: string,
  options: SportFilterUpsertOptions = {},
  delayMs = 300
): Promise<{ data: Record<string, unknown> | null; error: Error | null }> {
  const key = buildPreferenceDebounceKey(userId, context)
  const existing = debouncedPreferenceWrites.get(key) ?? {
    timeout: null,
    pendingResolvers: [],
    pendingRejectors: [],
    latestArgs: null,
  }

  existing.latestArgs = { userId, context, sportFilter, options }

  return new Promise((resolve, reject) => {
    existing.pendingResolvers.push(resolve)
    existing.pendingRejectors.push(reject)

    if (existing.timeout) {
      clearTimeout(existing.timeout)
    }

    existing.timeout = setTimeout(async () => {
      const args = existing.latestArgs
      if (!args) {
        const value = { data: null, error: new Error('Missing debounced write payload') }
        existing.pendingResolvers.forEach((resolver) => resolver(value))
        debouncedPreferenceWrites.delete(key)
        return
      }

      try {
        const result = await upsertSportFilterPreferenceV2(
          args.userId,
          args.context,
          args.sportFilter,
          args.options
        )
        existing.pendingResolvers.forEach((resolver) => resolver(result))
      } catch (error) {
        existing.pendingRejectors.forEach((rejector) => rejector(error))
      } finally {
        debouncedPreferenceWrites.delete(key)
      }
    }, Math.max(delayMs, 0))

    debouncedPreferenceWrites.set(key, existing)
  })
}

export async function createIdentityLinkV2(
  payload: IdentityLinkV2Input
): ServiceResult<Record<string, unknown>> {
  try {
    const { data, error } = await supabaseAny.rpc('create_identity_link_v2', {
      p_identity_id: payload.identity_id ?? null,
      p_athlete_id: payload.athlete_id,
      p_org_id: payload.org_id ?? null,
      p_confidence_score: payload.confidence_score ?? 1,
      p_match_signals: payload.match_signals ?? {},
      p_is_reversible: payload.is_reversible ?? true,
      p_source: payload.source ?? 'manual',
    })

    if (error) throw error
    return { data: (data ?? null) as Record<string, unknown> | null, error: null }
  } catch (error) {
    return { data: null, error: toError(error, 'Failed to create identity link v2') }
  }
}

export async function resolveAthleteIdentityLinkV2(
  identityId: string,
  candidateId: string,
  decision: 'approve' | 'reject' | 'unlink',
  orgId?: string,
  notes?: string
): ServiceResult<Record<string, unknown>> {
  try {
    const { data, error } = await supabaseAny.rpc('resolve_athlete_identity_link_v2', {
      p_identity_id: identityId,
      p_candidate_id: candidateId,
      p_decision: decision,
      p_org_id: orgId ?? null,
      p_notes: notes ?? null,
    })
    if (error) throw error
    return { data: (data ?? null) as Record<string, unknown> | null, error: null }
  } catch (error) {
    return { data: null, error: toError(error, 'Failed to resolve identity link v2') }
  }
}

export async function listIdentityMergeInboxV2(
  orgId: string
): ServiceResult<Record<string, unknown>> {
  try {
    const { data, error } = await supabaseAny.rpc('list_identity_merge_inbox_v2', { p_org_id: orgId })
    if (error) throw error
    return { data: (data ?? null) as Record<string, unknown> | null, error: null }
  } catch (error) {
    return { data: null, error: toError(error, 'Failed to list identity merge inbox v2') }
  }
}

export async function getAthleteProfileV2Fan(
  athleteIdentityId: string
): ServiceResult<Record<string, unknown>> {
  try {
    const { data, error } = await supabaseAny.rpc('get_athlete_profile_v2_fan', {
      p_athlete_identity_id: athleteIdentityId,
    })
    if (error) throw error
    return { data: (data ?? null) as Record<string, unknown> | null, error: null }
  } catch (error) {
    return { data: null, error: toError(error, 'Failed to load fan athlete profile v2') }
  }
}

export async function runV2WriteOutboxReconciliation(
  batchSize = 100
): ServiceResult<Record<string, unknown>> {
  try {
    const { data, error } = await supabaseAny.rpc('run_v2_write_outbox_reconciliation', {
      p_batch_size: batchSize,
    })
    if (error) throw error
    return { data: (data ?? null) as Record<string, unknown> | null, error: null }
  } catch (error) {
    return { data: null, error: toError(error, 'Failed to run v2 outbox reconciliation') }
  }
}

export async function runIdentityBackfillChunkV2(
  chunkSize = 500,
  orgId?: string
): ServiceResult<Record<string, unknown>> {
  try {
    const { data, error } = await supabaseAny.rpc('run_identity_backfill_chunk_v2', {
      p_chunk_size: chunkSize,
      p_org_id: orgId ?? null,
    })
    if (error) throw error
    return { data: (data ?? null) as Record<string, unknown> | null, error: null }
  } catch (error) {
    return { data: null, error: toError(error, 'Failed to run identity backfill chunk v2') }
  }
}
