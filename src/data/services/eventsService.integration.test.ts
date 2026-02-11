/**
 * Events Service Integration Tests
 * Tests API flows with mocked Supabase
 */

import { describe, test, expect, vi, beforeEach } from 'vitest'
import { getCalendarEvents } from '@/data/services/eventsService'

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
      gte: () => c,
      lte: () => c,
      eq: () => c,
      in: () => c,
      order: () => c,
      limit: () => c,
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

vi.mock('@/data/fake/userContext', () => ({
  getChildrenForUserId: () => ['c1'],
  getAssignedTeamsForCoach: () => [],
  getChildTeamMemberships: () => [],
  calculatePermissions: () => ({}),
  filterEventsByRole: (_: unknown, events: unknown[]) => events,
}))

vi.mock('@/data/fake/relationships', () => ({
  getChildrenForUserId: () => ['c1'],
  getAssignedTeamsForCoach: () => [],
  getChildTeamMemberships: () => [],
}))

describe('eventsService integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.chainResult = { data: [], error: null }
  })

  describe('getCalendarEvents', () => {
    test('returns events when Supabase succeeds', async () => {
      const mockData = [
        {
          id: 'e1',
          title: 'Practice',
          type: 'practice',
          start_time: '2026-01-15T10:00:00Z',
          end_time: '2026-01-15T11:00:00Z',
          team_id: 't1',
          season_id: 's1',
          team: { id: 't1', name: 'Team', org_id: 'o1' },
          season: { id: 's1', name: 'Season' },
        },
      ]
      state.chainResult = { data: mockData, error: null }

      const result = await getCalendarEvents(mockContext, { startDate: new Date(2026, 0, 1), endDate: new Date(2026, 1, 28) })

      expect(result.error).toBeNull()
      expect(result.data).toHaveLength(1)
      expect(result.data?.[0]).toMatchObject({ id: 'e1', title: 'Practice', type: 'practice' })
    })

    test('returns empty array when no events', async () => {
      state.chainResult = { data: [], error: null }

      const result = await getCalendarEvents(mockContext, {})

      expect(result.error).toBeNull()
      expect(result.data).toEqual([])
    })

    test('returns error when Supabase fails', async () => {
      state.chainResult = { data: null, error: { message: 'DB error' } }

      const result = await getCalendarEvents(mockContext, {})

      expect(result.error).toBeTruthy()
      expect(result.data).toEqual([])
    })
  })
})
