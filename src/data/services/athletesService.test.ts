import { describe, test, expect, vi, beforeEach } from 'vitest'
import { getAthleteById, updateAthleteUniversalFields } from '@/data/services/athletesService'

const mockSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ single: mockSingle })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({ single: vi.fn().mockResolvedValue({ data: null, error: null }) })),
        })),
      })),
    })),
  },
}))

describe('getAthleteById', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('returns error when athleteId empty', async () => {
    const res = await getAthleteById('')
    expect(res.error).toBeTruthy()
    expect(res.data).toBeNull()
  })

  test('returns data when found', async () => {
    const athlete = { id: 'a1', first_name: 'John', last_name: 'Doe' }
    mockSingle.mockResolvedValueOnce({ data: athlete, error: null })
    const res = await getAthleteById('a1')
    expect(res.data).toEqual(athlete)
    expect(res.error).toBeNull()
  })

  test('returns null data and no error when not found (PGRST116)', async () => {
    mockSingle.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
    const res = await getAthleteById('a1')
    expect(res.data).toBeNull()
    expect(res.error).toBeNull()
  })
})

describe('updateAthleteUniversalFields', () => {
  test('returns error when athleteId empty', async () => {
    const res = await updateAthleteUniversalFields('', { height_cm: 170 })
    expect(res.error).toBeTruthy()
    expect(res.data).toBeNull()
  })
})
