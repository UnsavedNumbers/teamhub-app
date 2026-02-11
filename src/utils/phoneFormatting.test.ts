import { describe, test, expect } from 'vitest'
import { formatPhoneDisplay } from '@/utils/phoneFormatting'

describe('formatPhoneDisplay', () => {
  test('returns empty for null', () => {
    expect(formatPhoneDisplay(null)).toBe('')
  })

  test('returns empty for undefined', () => {
    expect(formatPhoneDisplay(undefined)).toBe('')
  })

  test('returns empty for empty string', () => {
    expect(formatPhoneDisplay('')).toBe('')
  })

  test('formats 10-digit as (XXX) XXX-XXXX', () => {
    expect(formatPhoneDisplay('5551234567')).toBe('(555) 123-4567')
  })

  test('formats 11-digit with leading 1 as +1 (XXX) XXX-XXXX', () => {
    expect(formatPhoneDisplay('15551234567')).toBe('+1 (555) 123-4567')
  })

  test('returns input as-is for short number', () => {
    expect(formatPhoneDisplay('555')).toBe('555')
  })
})
