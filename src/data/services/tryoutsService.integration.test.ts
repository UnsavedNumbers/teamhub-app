import { describe, test, expect, vi, beforeEach } from 'vitest'
import { getTryouts } from '@/data/services/tryoutsService'

const mockContext = {
  userId: 'user-1',
  orgId: 'org-1',
  roles: ['guardian'],
  permissions: {},
} as never

const { state, createChain, mockFrom } = vi.hoisted(() => {
  const state = { chainResult: { data: [] as unknown, error: null as unknown } }
  function createChain(res: { data: unknown; error: unknown }) {
    const c = {
      eq: () => c,
      order: () => c,
      then: (fn: (val: unknown) => unknown) => Promise.resolve(res).then(fn),
    }
    return c
  }
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => createChain(state.chainResult)),
  }))
  return { state, createChain, mockFrom }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
  isSupabaseConfigured: true,
}))

vi.mock('@/data/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/config')>()
  return { ...actual, USE_FAKE_DATA: false, FAKE_DATA_DELAY_MS: 0 }
})

describe('tryoutsService integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.chainResult = { data: [], error: null }
  })

  describe('getTryouts', () => {
    test('returns tryouts when Supabase succeeds', async () => {
      const mockData = [
        {
          id: 't1',
          name: 'U12 Tryouts',
          org_id: 'org-1',
          tryout_date: '2026-05-15',
          start_time: '09:00',
          age_group: 'U12',
          entry_fee: 2500,
        },
      ]
      state.chainResult = { data: mockData, error: null }

      const result = await getTryouts(mockContext)

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0]).toMatchObject({ id: 't1', title: 'U12 Tryouts' })
    })

    test('returns empty array when no tryouts', async () => {
      state.chainResult = { data: [], error: null }

      const result = await getTryouts(mockContext)

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    test('returns error when orgId missing', async () => {
      const ctx = { ...mockContext, orgId: '' } as never

      const result = await getTryouts(ctx)

      expect(result.error).toBeTruthy()
      expect(result.data).toEqual([])
    })
  })
})
