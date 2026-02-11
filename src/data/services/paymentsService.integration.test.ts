import { describe, test, expect, vi, beforeEach } from 'vitest'
import { getFees } from '@/data/services/paymentsService'

const mockContext = { userId: 'u1', orgId: 'org-1', roles: [], permissions: {} } as never

const { state, createChain, mockFrom } = vi.hoisted(() => {
  const state = { chainResult: { data: [] as unknown, error: null as unknown } }
  const c = {
    eq: () => c,
    neq: () => c,
    order: () => c,
    then: (fn: (val: unknown) => unknown) => Promise.resolve(state.chainResult).then(fn),
  }
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => c),
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

describe('paymentsService integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.chainResult = { data: [], error: null }
  })

  describe('getFees', () => {
    test('returns fees when Supabase succeeds', async () => {
      const mockData = [{ id: 'f1', name: 'Registration', org_id: 'org-1' }]
      state.chainResult = { data: mockData, error: null }

      const result = await getFees(mockContext)

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
    })

    test('returns empty array when no fees', async () => {
      state.chainResult = { data: [], error: null }

      const result = await getFees(mockContext)

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })
  })
})
