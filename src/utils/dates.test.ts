import { describe, test, expect } from 'vitest'
import {
  addDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isSameDay,
  isSameMonth,
} from '@/utils/dates'

describe('addDays', () => {
  test('adds positive days', () => {
    const d = new Date(2026, 1, 10) // Feb 10 local
    expect(addDays(d, 5).getDate()).toBe(15)
  })

  test('subtracts with negative', () => {
    const d = new Date(2026, 1, 10) // Feb 10 local
    expect(addDays(d, -3).getDate()).toBe(7)
  })

  test('adds zero returns same date', () => {
    const d = new Date(2026, 1, 10)
    expect(addDays(d, 0).getTime()).toBe(d.getTime())
  })

  test('crosses month boundary', () => {
    const d = new Date(2026, 0, 30) // Jan 30 local
    const result = addDays(d, 5)
    expect(result.getMonth()).toBe(1)
    expect(result.getDate()).toBe(4)
  })
})

describe('startOfWeek', () => {
  test('Sunday input returns same date at midnight', () => {
    const d = new Date('2026-02-08') // Sunday
    const result = startOfWeek(d)
    expect(result.getDay()).toBe(0)
    expect(result.getHours()).toBe(0)
  })

  test('mid-week returns prior Sunday', () => {
    const d = new Date('2026-02-11') // Wednesday
    const result = startOfWeek(d)
    expect(result.getDay()).toBe(0)
  })
})

describe('endOfWeek', () => {
  test('returns Saturday 23:59:59', () => {
    const d = new Date('2026-02-10')
    const result = endOfWeek(d)
    expect(result.getDay()).toBe(6)
    expect(result.getHours()).toBe(23)
  })
})

describe('startOfMonth', () => {
  test('returns first day of month', () => {
    const d = new Date('2026-02-15')
    const result = startOfMonth(d)
    expect(result.getDate()).toBe(1)
    expect(result.getMonth()).toBe(1)
  })
})

describe('endOfMonth', () => {
  test('Jan has 31 days', () => {
    const d = new Date('2026-01-15')
    const result = endOfMonth(d)
    expect(result.getDate()).toBe(31)
  })

  test('Feb regular year has 28 days', () => {
    const d = new Date('2025-02-15')
    const result = endOfMonth(d)
    expect(result.getDate()).toBe(28)
  })

  test('Feb leap year has 29 days', () => {
    const d = new Date('2024-02-15')
    const result = endOfMonth(d)
    expect(result.getDate()).toBe(29)
  })

  test('Apr has 30 days', () => {
    const d = new Date('2026-04-15')
    const result = endOfMonth(d)
    expect(result.getDate()).toBe(30)
  })
})

describe('isSameDay', () => {
  test('returns true for same day', () => {
    expect(isSameDay(new Date('2026-02-10T09:00'), new Date('2026-02-10T18:00'))).toBe(true)
  })

  test('returns false for different days', () => {
    expect(isSameDay(new Date('2026-02-10'), new Date('2026-02-11'))).toBe(false)
  })

  test('returns false for different months', () => {
    expect(isSameDay(new Date('2026-02-10'), new Date('2026-03-10'))).toBe(false)
  })
})

describe('isSameMonth', () => {
  test('returns true for same month', () => {
    expect(isSameMonth(new Date(2026, 1, 1), new Date(2026, 1, 28))).toBe(true)
  })

  test('returns false for different months', () => {
    expect(isSameMonth(new Date(2026, 1, 10), new Date(2026, 2, 10))).toBe(false)
  })
})
