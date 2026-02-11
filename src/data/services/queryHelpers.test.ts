import { describe, test, expect, vi } from 'vitest'
import { buildEventQuery, buildCalendarEventQuery } from '@/data/services/queryHelpers'

const chain = { select: vi.fn(() => chain), eq: vi.fn(() => chain), single: vi.fn() }
const mockFrom = vi.fn(() => chain)

const mockSupabase = {
  from: mockFrom,
}

describe('buildEventQuery', () => {
  test('returns query builder with select', () => {
    const result = buildEventQuery(mockSupabase as never)
    expect(mockFrom).toHaveBeenCalledWith('events')
    expect(result).toBeDefined()
  })

  test('accepts custom base table', () => {
    buildEventQuery(mockSupabase as never, 'custom_events')
    expect(mockFrom).toHaveBeenCalledWith('custom_events')
  })
})

describe('buildCalendarEventQuery', () => {
  test('returns query builder', () => {
    const result = buildCalendarEventQuery(mockSupabase as never)
    expect(result).toBeDefined()
    expect(mockFrom).toHaveBeenCalledWith('events')
  })
})
