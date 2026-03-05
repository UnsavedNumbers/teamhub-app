import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  debouncedUpsertSportFilterPreferenceV2,
  getUnifiedAthleteProfileV2,
  upsertSportFilterPreferenceV2,
} from './unifiedAthleteProfileV2Service'

const rpcMock = vi.fn()

vi.mock('../../lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
  },
}))

describe('unifiedAthleteProfileV2Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('loads unified athlete profile v2 via RPC', async () => {
    rpcMock.mockResolvedValueOnce({ data: { ok: true, athlete_id: 'ath-1' }, error: null })

    const result = await getUnifiedAthleteProfileV2({ athlete_id: 'ath-1', org_id: 'org-1' })

    expect(result.error).toBeNull()
    expect(result.data?.athlete_id).toBe('ath-1')
    expect(rpcMock).toHaveBeenCalledWith('get_unified_athlete_profile_v2', {
      p_context: { athlete_id: 'ath-1', org_id: 'org-1' },
    })
  })

  it('returns an error when upsert sport filter RPC fails', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })

    const result = await upsertSportFilterPreferenceV2('user-1', { context_key: 'k1' }, 'soccer')

    expect(result.data).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('debounces sport filter writes and keeps only the last value', async () => {
    vi.useFakeTimers()
    rpcMock.mockResolvedValue({ data: { ok: true, updated_at: '2026-02-27T00:00:00Z' }, error: null })

    const promiseA = debouncedUpsertSportFilterPreferenceV2(
      'user-1',
      { context_key: 'ctx-1', athlete_id: 'ath-1' },
      'soccer',
      {},
      200
    )
    const promiseB = debouncedUpsertSportFilterPreferenceV2(
      'user-1',
      { context_key: 'ctx-1', athlete_id: 'ath-1' },
      'basketball',
      {},
      200
    )

    await vi.advanceTimersByTimeAsync(220)
    const [resultA, resultB] = await Promise.all([promiseA, promiseB])

    expect(rpcMock).toHaveBeenCalledTimes(1)
    expect(rpcMock).toHaveBeenCalledWith('upsert_sport_filter_preference_v2', {
      p_user_id: 'user-1',
      p_context: { context_key: 'ctx-1', athlete_id: 'ath-1' },
      p_sport_filter: 'basketball',
      p_idempotency_key: null,
      p_client_updated_at: null,
    })
    expect(resultA.error).toBeNull()
    expect(resultB.error).toBeNull()
  })
})
