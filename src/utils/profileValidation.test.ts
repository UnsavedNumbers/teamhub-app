import { describe, test, expect } from 'vitest'
import { isProfileComplete, getMissingProfileFields } from '@/utils/profileValidation'

describe('isProfileComplete', () => {
  test('returns true when all required fields present', () => {
    expect(isProfileComplete({ firstName: 'John', lastName: 'Doe', phone: '5551234567' } as never)).toBe(true)
  })

  test('returns false for null', () => {
    expect(isProfileComplete(null)).toBe(false)
  })

  test('returns false for undefined', () => {
    expect(isProfileComplete(undefined)).toBe(false)
  })

  test('returns false when firstName empty', () => {
    expect(isProfileComplete({ firstName: '', lastName: 'Doe', phone: '5551234567' } as never)).toBe(false)
  })

  test('returns false when lastName empty', () => {
    expect(isProfileComplete({ firstName: 'John', lastName: '', phone: '5551234567' } as never)).toBe(false)
  })

  test('returns false when phone empty', () => {
    expect(isProfileComplete({ firstName: 'John', lastName: 'Doe', phone: '' } as never)).toBe(false)
  })

  test('trims whitespace from fields', () => {
    expect(isProfileComplete({ firstName: '  John  ', lastName: '  Doe  ', phone: '  5551234567  ' } as never)).toBe(true)
  })
})

describe('getMissingProfileFields', () => {
  test('returns all for null', () => {
    expect(getMissingProfileFields(null)).toEqual(['firstName', 'lastName', 'phone'])
  })

  test('returns empty when complete', () => {
    expect(getMissingProfileFields({ firstName: 'John', lastName: 'Doe', phone: '555' } as never)).toEqual([])
  })

  test('returns missing fields', () => {
    expect(getMissingProfileFields({ firstName: '', lastName: 'Doe', phone: '' } as never)).toEqual(['firstName', 'phone'])
  })
})
