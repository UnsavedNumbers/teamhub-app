import { describe, test, expect } from 'vitest'
import { isValidUUID, isValidRouteId, getInvalidRouteIdError } from '@/utils/routeValidation'

describe('isValidUUID', () => {
  test('returns false for null', () => {
    expect(isValidUUID(null)).toBe(false)
  })

  test('returns false for undefined', () => {
    expect(isValidUUID(undefined)).toBe(false)
  })

  test('returns true for valid UUID', () => {
    expect(isValidUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  test('returns false for invalid', () => {
    expect(isValidUUID('not-uuid')).toBe(false)
  })
})

describe('isValidRouteId', () => {
  test('returns true for "new"', () => {
    expect(isValidRouteId('new')).toBe(true)
  })

  test('returns true for valid UUID', () => {
    expect(isValidRouteId('550e8400-e29b-41d4-a716-446655440000')).toBe(true)
  })

  test('returns false for invalid', () => {
    expect(isValidRouteId('invalid')).toBe(false)
  })

  test('returns false for null', () => {
    expect(isValidRouteId(null)).toBe(false)
  })
})

describe('getInvalidRouteIdError', () => {
  test('returns message for missing id', () => {
    expect(getInvalidRouteIdError(undefined, 'Organization')).toBe('Organization ID is required')
  })

  test('returns message for "new" where not allowed', () => {
    expect(getInvalidRouteIdError('new', 'item')).toContain('new')
  })

  test('returns message for invalid format', () => {
    expect(getInvalidRouteIdError('bad', 'Athlete')).toContain('Invalid Athlete ID format')
  })
})
