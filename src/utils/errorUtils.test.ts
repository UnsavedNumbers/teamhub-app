import { describe, test, expect } from 'vitest'
import {
  getErrorMessage,
  normalizeSupabaseError,
  isNotFoundError,
  classifyError,
} from '@/utils/errorUtils'

describe('getErrorMessage', () => {
  test('extracts message from Error', () => {
    expect(getErrorMessage(new Error('test msg'))).toBe('test msg')
  })

  test('returns string as-is', () => {
    expect(getErrorMessage('string error')).toBe('string error')
  })

  test('stringifies object', () => {
    expect(getErrorMessage({ code: 'X', message: 'Y' })).toContain('code')
  })
})

describe('normalizeSupabaseError', () => {
  test('returns message from Error', () => {
    expect(normalizeSupabaseError(new Error('db error'))).toBe('db error')
  })

  test('returns message from object with message', () => {
    expect(normalizeSupabaseError({ message: 'supabase error' })).toBe('supabase error')
  })

  test('returns default for unknown', () => {
    expect(normalizeSupabaseError(null)).toBe('An unexpected error occurred')
  })
})

describe('isNotFoundError', () => {
  test('returns true for PGRST116', () => {
    expect(isNotFoundError({ code: 'PGRST116' })).toBe(true)
  })

  test('returns true for "not found" message', () => {
    expect(isNotFoundError({ message: 'Resource not found' })).toBe(true)
  })

  test('returns true for "no rows"', () => {
    expect(isNotFoundError({ message: 'No rows returned' })).toBe(true)
  })

  test('returns true for 404 in message', () => {
    expect(isNotFoundError({ message: '404 error' })).toBe(true)
  })

  test('returns false for other error', () => {
    expect(isNotFoundError({ code: 'OTHER', message: 'Something else' })).toBe(false)
  })

  test('returns false for null', () => {
    expect(isNotFoundError(null)).toBe(false)
  })
})

describe('classifyError', () => {
  test('returns permission for RLS/permission errors', () => {
    expect(classifyError({ code: 'PGRST301' })).toBe('permission')
    expect(classifyError({ message: 'permission denied' })).toBe('permission')
  })

  test('returns not_found for not found errors', () => {
    expect(classifyError({ code: 'PGRST116' })).toBe('not_found')
  })

  test('returns network for network errors', () => {
    expect(classifyError({ message: 'network error' })).toBe('network')
  })

  test('returns validation for constraint errors', () => {
    expect(classifyError({ message: 'violates constraint' })).toBe('validation')
  })

  test('returns unknown for other', () => {
    expect(classifyError({ message: 'random' })).toBe('unknown')
  })
})
