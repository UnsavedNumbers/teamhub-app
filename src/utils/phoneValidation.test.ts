import { describe, test, expect } from 'vitest'
import { validatePhoneFormat, normalizePhone } from '@/utils/phoneValidation'

describe('validatePhoneFormat', () => {
  test('returns error for null', () => {
    expect(validatePhoneFormat(null as never)).toEqual({ valid: false, error: 'Phone number is required' })
  })

  test('returns error for empty string', () => {
    expect(validatePhoneFormat('')).toEqual({ valid: false, error: 'Phone number is required' })
  })

  test('returns error for whitespace only', () => {
    expect(validatePhoneFormat('   ')).toEqual({ valid: false, error: 'Phone number cannot be empty' })
  })

  test('returns error for too long', () => {
    expect(validatePhoneFormat('123456789012345678901')).toEqual({
      valid: false,
      error: 'Phone number is too long (maximum 20 characters)',
    })
  })

  test('returns error for fewer than 10 digits', () => {
    expect(validatePhoneFormat('123456789')).toEqual({
      valid: false,
      error: 'Phone number must contain at least 10 digits',
    })
  })

  test('returns error for all zeros', () => {
    expect(validatePhoneFormat('0000000000')).toEqual({
      valid: false,
      error: 'Phone number cannot be all zeros',
    })
  })

  test('returns error for repeating pattern', () => {
    expect(validatePhoneFormat('1111111111')).toEqual({
      valid: false,
      error: 'Phone number appears to be invalid (repeating pattern)',
    })
  })

  test('returns error for invalid chars', () => {
    expect(validatePhoneFormat('555-123-4567-xyz')).toEqual({
      valid: false,
      error: 'Phone number contains invalid characters',
    })
  })

  test('returns valid for US number', () => {
    expect(validatePhoneFormat('5551234567')).toEqual({ valid: true })
  })

  test('returns valid for formatted number', () => {
    expect(validatePhoneFormat('(555) 123-4567')).toEqual({ valid: true })
  })
})

describe('normalizePhone', () => {
  test('returns empty for null', () => {
    expect(normalizePhone(null as never)).toBe('')
  })

  test('returns empty for non-string', () => {
    expect(normalizePhone(123 as never)).toBe('')
  })

  test('returns digits only for formatted string', () => {
    expect(normalizePhone('(555) 123-4567')).toBe('5551234567')
  })

  test('returns digits for already digits', () => {
    expect(normalizePhone('5551234567')).toBe('5551234567')
  })
})
