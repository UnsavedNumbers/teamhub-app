import { describe, test, expect } from 'vitest'
import {
  safeString,
  safeDate,
  safeNumber,
  safeArray,
  safeBoolean,
  safeObject,
} from '@/utils/safeAccessors'

describe('safeString', () => {
  test('returns default for null', () => {
    expect(safeString(null)).toBe('—')
  })

  test('returns default for undefined', () => {
    expect(safeString(undefined)).toBe('—')
  })

  test('returns empty string for empty string', () => {
    expect(safeString('')).toBe('')
  })

  test('returns value for valid string', () => {
    expect(safeString('hello')).toBe('hello')
  })

  test('returns custom default', () => {
    expect(safeString(null, 'N/A')).toBe('N/A')
  })
})

describe('safeDate', () => {
  test('returns default for null', () => {
    expect(safeDate(null)).toBe('—')
  })

  test('returns default for undefined', () => {
    expect(safeDate(undefined)).toBe('—')
  })

  test('returns default for invalid date string', () => {
    expect(safeDate('invalid')).toBe('—')
  })

  test('returns formatted date for valid ISO string', () => {
    const result = safeDate('2026-02-10T12:00:00Z')
    expect(result).toMatch(/Feb|2\/10\/2026|10\/2\/2026/)
  })

  test('returns default for Date with NaN', () => {
    expect(safeDate(new Date('invalid'))).toBe('—')
  })

  test('accepts Date object', () => {
    const result = safeDate(new Date(2026, 1, 10))
    expect(result).toMatch(/Feb|2\/10\/2026/)
  })
})

describe('safeNumber', () => {
  test('returns default for null', () => {
    expect(safeNumber(null)).toBe(0)
  })

  test('returns default for undefined', () => {
    expect(safeNumber(undefined)).toBe(0)
  })

  test('returns default for NaN', () => {
    expect(safeNumber(NaN)).toBe(0)
  })

  test('returns 0 for 0 (not default)', () => {
    expect(safeNumber(0)).toBe(0)
  })

  test('returns negative number', () => {
    expect(safeNumber(-5)).toBe(-5)
  })

  test('returns valid number', () => {
    expect(safeNumber(42)).toBe(42)
  })

  test('returns custom default', () => {
    expect(safeNumber(null, 100)).toBe(100)
  })
})

describe('safeArray', () => {
  test('returns default for null', () => {
    expect(safeArray(null)).toEqual([])
  })

  test('returns default for undefined', () => {
    expect(safeArray(undefined)).toEqual([])
  })

  test('returns default for non-array', () => {
    expect(safeArray('not array' as never)).toEqual([])
  })

  test('returns empty array for empty array', () => {
    expect(safeArray([])).toEqual([])
  })

  test('returns populated array', () => {
    expect(safeArray([1, 2, 3])).toEqual([1, 2, 3])
  })

  test('returns custom default', () => {
    expect(safeArray(null, ['a'])).toEqual(['a'])
  })
})

describe('safeBoolean', () => {
  test('returns default for null', () => {
    expect(safeBoolean(null)).toBe(false)
  })

  test('returns default for undefined', () => {
    expect(safeBoolean(undefined)).toBe(false)
  })

  test('returns true for true', () => {
    expect(safeBoolean(true)).toBe(true)
  })

  test('returns false for false', () => {
    expect(safeBoolean(false)).toBe(false)
  })

  test('returns custom default', () => {
    expect(safeBoolean(null, true)).toBe(true)
  })
})

describe('safeObject', () => {
  test('returns default for null', () => {
    const def = { x: 1 }
    expect(safeObject(null, def)).toBe(def)
  })

  test('returns default for undefined', () => {
    const def = { x: 1 }
    expect(safeObject(undefined, def)).toBe(def)
  })

  test('returns value for valid object', () => {
    const obj = { a: 1, b: 2 }
    expect(safeObject(obj, {})).toBe(obj)
  })
})
