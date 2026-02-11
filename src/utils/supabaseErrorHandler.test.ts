import { describe, test, expect } from 'vitest'
import {
  RLSError,
  NotFoundError,
  NetworkError,
  ValidationError,
  UnknownSupabaseError,
  classifySupabaseError,
} from '@/utils/supabaseErrorHandler'

describe('Error classes', () => {
  test('RLSError has correct properties', () => {
    const err = new RLSError()
    expect(err.name).toBe('RLSError')
    expect(err.message).toContain('Access denied')
    expect(err.code).toBe('RLS_ERROR')
  })

  test('NotFoundError has correct properties', () => {
    const err = new NotFoundError('Event')
    expect(err.name).toBe('NotFoundError')
    expect(err.message).toContain('Event not found')
    expect(err.code).toBe('NOT_FOUND')
  })

  test('NetworkError has correct properties', () => {
    const err = new NetworkError()
    expect(err.name).toBe('NetworkError')
    expect(err.code).toBe('NETWORK_ERROR')
  })

  test('ValidationError has correct properties', () => {
    const err = new ValidationError('Invalid input')
    expect(err.name).toBe('ValidationError')
    expect(err.message).toBe('Invalid input')
  })

  test('UnknownSupabaseError has correct properties', () => {
    const err = new UnknownSupabaseError('ops')
    expect(err.name).toBe('UnknownSupabaseError')
    expect(err.message).toBe('ops')
  })
})

describe('classifySupabaseError', () => {
  test('returns RLSError for 42501', () => {
    const result = classifySupabaseError({ code: '42501', message: 'denied' })
    expect(result).toBeInstanceOf(RLSError)
  })

  test('returns RLSError for RLS message', () => {
    const result = classifySupabaseError({ message: 'row-level security policy' })
    expect(result).toBeInstanceOf(RLSError)
  })

  test('returns NotFoundError for PGRST116', () => {
    const result = classifySupabaseError({ code: 'PGRST116', message: 'not found' })
    expect(result).toBeInstanceOf(NotFoundError)
  })

  test('returns NotFoundError for "not found" message', () => {
    const result = classifySupabaseError({ message: 'resource not found' })
    expect(result).toBeInstanceOf(NotFoundError)
  })

  test('returns NetworkError for network message', () => {
    const result = classifySupabaseError({ message: 'Failed to fetch' })
    expect(result).toBeInstanceOf(NetworkError)
  })

  test('returns ValidationError for 23503', () => {
    const result = classifySupabaseError({ code: '23503', message: 'fk violation' })
    expect(result).toBeInstanceOf(ValidationError)
  })

  test('returns UnknownSupabaseError for plain Error', () => {
    const result = classifySupabaseError(new Error('random'))
    expect(result).toBeInstanceOf(UnknownSupabaseError)
  })

  test('returns UnknownSupabaseError for string', () => {
    const result = classifySupabaseError('string error')
    expect(result).toBeInstanceOf(UnknownSupabaseError)
  })

  test('returns UnknownSupabaseError for null', () => {
    const result = classifySupabaseError(null)
    expect(result).toBeInstanceOf(UnknownSupabaseError)
  })
})
