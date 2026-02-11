import { describe, test, expect } from 'vitest'
import {
  createServiceResponse,
  normalizeSupabaseResponse,
} from '@/data/services/responseHelpers'

describe('createServiceResponse', () => {
  test('returns data and no error on success', () => {
    const res = createServiceResponse({ id: '1' }, null)
    expect(res.data).toEqual({ id: '1' })
    expect(res.error).toBeNull()
    expect(res.isEmpty).toBe(false)
  })

  test('returns null data and error on failure', () => {
    const err = new Error('Failed')
    const res = createServiceResponse(null, err)
    expect(res.data).toBeNull()
    expect(res.error).toBe(err)
    expect(res.isEmpty).toBe(true)
  })

  test('isEmpty true for empty array', () => {
    const res = createServiceResponse([], null)
    expect(res.isEmpty).toBe(true)
    expect(res.data).toEqual([])
  })

  test('isEmpty false for non-empty array', () => {
    const res = createServiceResponse([{ id: '1' }], null)
    expect(res.isEmpty).toBe(false)
  })
})

describe('normalizeSupabaseResponse', () => {
  test('returns data when present', () => {
    const data = { id: '1' }
    expect(normalizeSupabaseResponse(data, false)).toBe(data)
  })

  test('returns empty array when null and isArray', () => {
    expect(normalizeSupabaseResponse(null, true)).toEqual([])
  })

  test('returns null when null and not isArray', () => {
    expect(normalizeSupabaseResponse(null, false)).toBeNull()
  })

  test('returns empty array when undefined and isArray', () => {
    expect(normalizeSupabaseResponse(undefined, true)).toEqual([])
  })
})
