import { describe, test, expect, vi, beforeEach } from 'vitest'
import { getAttendanceSettings } from '@/data/services/attendanceService'

const mockContext = { userId: 'u1', orgId: 'org-1', roles: [], permissions: {} } as never

const { state, mockFrom } = vi.hoisted(() => {
  const state = { chainResult: { data: null as unknown, error: null as unknown } }
  const chain = {
    eq: () => ({ single: () => Promise.resolve(state.chainResult) }),
  }
  const mockFrom = vi.fn(() => ({
    select: vi.fn(() => chain),
  }))
  return { state, mockFrom }
})

vi.mock('@/lib/supabase', () => ({
  supabase: { from: mockFrom },
  isSupabaseConfigured: true,
}))

vi.mock('@/data/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/config')>()
  return { ...actual, USE_FAKE_DATA: false, FAKE_DATA_DELAY_MS: 0 }
})

describe('attendanceService integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.chainResult = { data: null, error: null }
  })

  describe('getAttendanceSettings', () => {
    test('returns settings when found', async () => {
      const mockSettings = {
        org_id: 'org-1',
        enable_coach_reminders: true,
        submission_deadline_hours: 24,
        lock_after_days: 7,
        required_for_practice: true,
        required_for_game: true,
        required_for_meeting: false,
        parent_visibility: {},
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      }
      state.chainResult = { data: mockSettings, error: null }

      const result = await getAttendanceSettings(mockContext)

      expect(result.error).toBeNull()
      expect(result.data).toMatchObject({ org_id: 'org-1' })
    })
  })
})
