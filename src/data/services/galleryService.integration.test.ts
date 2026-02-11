import { describe, test, expect, vi, beforeEach } from 'vitest'
import { getGalleriesForUser } from '@/data/services/galleryService'

const mockContext = { userId: 'u1', orgId: 'org-1', roles: [], permissions: {} } as never

const { state, mockFrom } = vi.hoisted(() => {
  const state = { chainResult: { data: [] as unknown, error: null as unknown } }
  const c = {
    eq: () => c,
    in: () => c,
    or: () => c,
    order: () => c,
    limit: () => c,
    range: () => c,
    then: (fn: (val: unknown) => unknown) => Promise.resolve(state.chainResult).then(fn),
  }
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => c),
  }))
  return { state, mockFrom }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: vi.fn().mockResolvedValue({ data: [], error: null }),
  },
  isSupabaseConfigured: true,
}))

vi.mock('@/data/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/config')>()
  return { ...actual, USE_FAKE_DATA: false, FAKE_DATA_DELAY_MS: 0 }
})

describe('galleryService integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.chainResult = { data: [], error: null }
  })

  describe('getGalleriesForUser', () => {
    test('returns galleries when Supabase succeeds', async () => {
      const mockData = [
        {
          id: 'g1',
          org_id: 'org-1',
          gallery_type: 'team',
          entity_id: 't1',
          name: 'Season Photos',
          allow_contributions: false,
          require_approval: false,
          fans_can_see: false,
          is_system_generated: false,
          cover_generated_at: null,
          cover_generation_status: null,
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
        },
      ]
      state.chainResult = { data: mockData, error: null }

      const result = await getGalleriesForUser(mockContext)

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0]).toMatchObject({ id: 'g1', name: 'Season Photos' })
    })

    test('returns empty array when no galleries', async () => {
      state.chainResult = { data: [], error: null }

      const result = await getGalleriesForUser(mockContext)

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })
  })
})
