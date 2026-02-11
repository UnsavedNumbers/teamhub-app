import { describe, test, expect } from 'vitest'
import { toUUID, toNumber, toInteger, toDate, toString, toBoolean } from '@/utils/typeConverters'

describe('toUUID', () => {
  test('returns null for non-string', () => {
    expect(toUUID(123)).toBeNull()
  })

  test('returns null for invalid string', () => {
    expect(toUUID('not-uuid')).toBeNull()
  })

  test('returns value for valid UUID', () => {
    expect(toUUID('550e8400-e29b-41d4-a716-446655440000')).toBe('550e8400-e29b-41d4-a716-446655440000')
  })
})

describe('toNumber', () => {
  test('returns number as-is', () => {
    expect(toNumber(42)).toBe(42)
  })

  test('returns default for NaN', () => {
    expect(toNumber(NaN)).toBe(0)
  })

  test('parses string to number', () => {
    expect(toNumber('3.14')).toBe(3.14)
  })

  test('returns default for invalid string', () => {
    expect(toNumber('abc')).toBe(0)
  })

  test('returns custom default', () => {
    expect(toNumber('xyz', 100)).toBe(100)
  })
})

describe('toInteger', () => {
  test('floors number', () => {
    expect(toInteger(3.9)).toBe(3)
  })

  test('parses string to integer', () => {
    expect(toInteger('42')).toBe(42)
  })

  test('returns default for invalid string', () => {
    expect(toInteger('abc')).toBe(0)
  })
})

describe('toDate', () => {
  test('returns Date for valid string', () => {
    const d = toDate('2026-02-10')
    expect(d).toBeInstanceOf(Date)
    expect(d?.getFullYear()).toBe(2026)
  })

  test('returns null for invalid string', () => {
    expect(toDate('invalid')).toBeNull()
  })

  test('returns Date for Date input', () => {
    const input = new Date('2026-02-10')
    expect(toDate(input)).toEqual(input)
  })

  test('returns null for NaN Date', () => {
    expect(toDate(new Date('invalid'))).toBeNull()
  })
})

describe('toString', () => {
  test('returns default for null', () => {
    expect(toString(null)).toBe('')
  })

  test('returns default for undefined', () => {
    expect(toString(undefined)).toBe('')
  })

  test('returns string as-is', () => {
    expect(toString('hello')).toBe('hello')
  })

  test('converts number to string', () => {
    expect(toString(42)).toBe('42')
  })

  test('converts boolean to string', () => {
    expect(toString(true)).toBe('true')
  })

  test('stringifies object', () => {
    expect(toString({ a: 1 })).toBe('{"a":1}')
  })
})

describe('toBoolean', () => {
  test('returns boolean as-is', () => {
    expect(toBoolean(true)).toBe(true)
    expect(toBoolean(false)).toBe(false)
  })

  test('parses "true" string', () => {
    expect(toBoolean('true')).toBe(true)
    expect(toBoolean('TRUE')).toBe(true)
  })

  test('parses "false" string', () => {
    expect(toBoolean('false')).toBe(false)
  })

  test('parses "yes"/"no"', () => {
    expect(toBoolean('yes')).toBe(true)
    expect(toBoolean('no')).toBe(false)
  })

  test('parses "1"/"0"', () => {
    expect(toBoolean('1')).toBe(true)
    expect(toBoolean('0')).toBe(false)
  })

  test('number: non-zero is true', () => {
    expect(toBoolean(1)).toBe(true)
    expect(toBoolean(0)).toBe(false)
  })

  test('returns default for unknown', () => {
    expect(toBoolean(null)).toBe(false)
    expect(toBoolean(null, true)).toBe(true)
  })
})
