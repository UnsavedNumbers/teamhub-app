import { describe, test, expect, vi, beforeEach } from 'vitest'
import { getAthleteById, updateAthleteUniversalFields } from '@/data/services/athletesService'

const mockSingle = vi.fn()
const mockUpdate = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockSingle })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({ single: mockUpdate })),
        })),
      })),
    })),
  },
}))

describe('athletesService integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAthleteById', () => {
    test('returns athlete when found', async () => {
      const athlete = { id: 'a1', first_name: 'John', last_name: 'Doe' }
      mockSingle.mockResolvedValueOnce({ data: athlete, error: null })

      const result = await getAthleteById('a1')

      expect(result.error).toBeNull()
      expect(result.data).toEqual(athlete)
    })

    test('returns null when not found (PGRST116)', async () => {
      mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })

      const result = await getAthleteById('a1')

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })
  })

  describe('updateAthleteUniversalFields', () => {
    test('updates and returns athlete', async () => {
      const updated = { id: 'a1', first_name: 'John', last_name: 'Doe', height_cm: 170 }
      mockUpdate.mockResolvedValueOnce({ data: updated, error: null })

      const result = await updateAthleteUniversalFields('a1', { height_cm: 170 })

      expect(result.error).toBeNull()
      expect(result.data).toEqual(updated)
    })
  })
})
