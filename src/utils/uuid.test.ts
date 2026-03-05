import { describe, test, expect } from 'vitest'
import { isValidUuid, requireUuid, isUuid } from '@/utils/uuid'

describe('isValidUuid', () => {
  test('returns false for null', () => {
    expect(isValidUuid(null)).toBe(false)
  })

  test('returns false for undefined', () => {
    expect(isValidUuid(undefined)).toBe(false)
  })

  test('returns false for empty string', () => {
    expect(isValidUuid('')).toBe(false)
  })

  test('returns false for non-string', () => {
    expect(isValidUuid(123)).toBe(false)
  })

  test('returns true for valid v4 UUID', () => {
    expect(isValidUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  test('returns true for uppercase UUID', () => {
    expect(isValidUuid('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
  })

  test('returns false for v1 UUID (v4 variant check)', () => {
    expect(isValidUuid('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(false)
  })

  test('returns false for malformed string', () => {
    expect(isValidUuid('not-a-uuid')).toBe(false)
    expect(isValidUuid('550e8400-e29b-41d4-a716')).toBe(false)
  })
})

describe('requireUuid', () => {
  test('does not throw for valid UUID', () => {
    expect(() => requireUuid('550e8400-e29b-41d4-a716-446655440000')).not.toThrow()
  })

  test('throws for invalid UUID with default field name', () => {
    expect(() => requireUuid('invalid')).toThrow(/Invalid id: expected UUID format/)
  })

  test('throws for invalid UUID with custom field name', () => {
    expect(() => requireUuid(null, 'Organization')).toThrow(/Invalid Organization: expected UUID format/)
  })
})

describe('isUuid', () => {
  test('returns false for non-string', () => {
    expect(isUuid(123 as unknown as string)).toBe(false)
  })

  test('returns false for invalid string', () => {
    expect(isUuid('invalid')).toBe(false)
  })

  test('returns true for valid UUID', () => {
    expect(isUuid('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })
})
