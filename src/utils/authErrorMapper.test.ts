import { describe, test, expect } from 'vitest'
import { mapAuthError, useAuthErrorMapper } from '@/utils/authErrorMapper'

const t = (key: string) => key

describe('mapAuthError', () => {
  test('returns default for null', () => {
    expect(mapAuthError(null, t)).toBe('errors.auth.default')
  })

  test('returns default for undefined', () => {
    expect(mapAuthError(undefined, t)).toBe('errors.auth.default')
  })

  test('maps invalid credentials', () => {
    expect(mapAuthError('Invalid login credentials', t)).toBe('errors.auth.invalidCredentials')
  })

  test('maps email not confirmed', () => {
    expect(mapAuthError('Email not confirmed', t)).toBe('errors.auth.emailNotConfirmed')
  })

  test('maps user already registered', () => {
    expect(mapAuthError('User already registered', t)).toBe('errors.auth.emailAlreadyRegistered')
  })

  test('maps weak password', () => {
    expect(mapAuthError('Password should be at least 6 characters', t)).toBe('errors.auth.weakPassword')
  })

  test('maps too many requests', () => {
    expect(mapAuthError('Too many requests', t)).toBe('errors.auth.tooManyRequests')
  })

  test('maps token expired', () => {
    expect(mapAuthError('Token has expired', t)).toBe('errors.auth.expiredToken')
  })

  test('maps Error object', () => {
    expect(mapAuthError(new Error('Invalid login credentials'), t)).toBe('errors.auth.invalidCredentials')
  })

  test('returns default for unknown error', () => {
    expect(mapAuthError('Something unknown', t)).toBe('errors.auth.default')
  })
})

describe('useAuthErrorMapper', () => {
  test('returns closure that delegates to mapAuthError', () => {
    const mapError = useAuthErrorMapper(t)
    expect(mapError('Invalid login credentials')).toBe('errors.auth.invalidCredentials')
  })
})
