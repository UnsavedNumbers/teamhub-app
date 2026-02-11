import { describe, test, expect } from 'vitest'
import { isValidUUID, validateUUID, isUUID } from '@/utils/uuid'

describe('isValidUUID', () => {
  test('returns false for null', () => {
    expect(isValidUUID(null)).toBe(false)
  })

  test('returns false for undefined', () => {
    expect(isValidUUID(undefined)).toBe(false)
  })

  test('returns false for empty string', () => {
    expect(isValidUUID('')).toBe(false)
  })

  test('returns false for non-string', () => {
    expect(isValidUUID(123)).toBe(false)
  })

  test('returns true for valid v4 UUID', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  test('returns true for uppercase UUID', () => {
    expect(isValidUUID('550E8400-E29B-41D4-A716-446655440000')).toBe(true)
  })

  test('returns false for v1 UUID (v4 variant check)', () => {
    expect(isValidUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(false)
  })

  test('returns false for malformed string', () => {
    expect(isValidUUID('not-a-uuid')).toBe(false)
    expect(isValidUUID('550e8400-e29b-41d4-a716')).toBe(false)
  })
})

describe('validateUUID', () => {
  test('does not throw for valid UUID', () => {
    expect(() => validateUUID('550e8400-e29b-41d4-a716-446655440000')).not.toThrow()
  })

  test('throws for invalid UUID with default field name', () => {
    expect(() => validateUUID('invalid')).toThrow(/Invalid ID: must be a valid UUID/)
  })

  test('throws for invalid UUID with custom field name', () => {
    expect(() => validateUUID(null, 'Organization')).toThrow(/Invalid Organization: must be a valid UUID/)
  })
})

describe('isUUID', () => {
  test('returns false for non-string', () => {
    expect(isUUID(123)).toBe(false)
  })

  test('returns false for invalid string', () => {
    expect(isUUID('invalid')).toBe(false)
  })

  test('returns true for valid UUID', () => {
    expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })
})
