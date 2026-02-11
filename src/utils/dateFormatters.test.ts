import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { formatDate, formatRelativeDate, formatDateRange } from '@/utils/dateFormatters'
import { freezeDate, unfreezeDate } from '@/test/helpers/dateHelpers'

describe('formatDate', () => {
  test('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—')
  })

  test('returns em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—')
  })

  test('returns em dash for invalid date string', () => {
    expect(formatDate('invalid')).toBe('—')
  })

  test('formats with short style', () => {
    const result = formatDate('2026-02-10T12:00:00Z', 'short')
    expect(result).toMatch(/02\/10\/2026|2\/10\/2026/)
  })

  test('formats with long style', () => {
    const result = formatDate('2026-02-10', 'long')
    expect(result).toMatch(/February|Feb/)
  })

  test('accepts Date object', () => {
    const result = formatDate(new Date(2026, 1, 10))
    expect(result).toMatch(/02\/10\/2026|2\/10\/2026/)
  })
})

describe('formatRelativeDate', () => {
  beforeEach(() => freezeDate('2026-02-10T12:00:00Z'))
  afterEach(unfreezeDate)

  test('returns Today for same day', () => {
    expect(formatRelativeDate('2026-02-10T12:00:00Z')).toBe('Today')
  })

  test('returns Yesterday for previous day', () => {
    expect(formatRelativeDate('2026-02-09T12:00:00Z')).toBe('Yesterday')
  })

  test('returns days ago for within week', () => {
    expect(formatRelativeDate('2026-02-05T12:00:00Z')).toBe('5 days ago')
  })

  test('returns weeks ago for within 30 days', () => {
    const result = formatRelativeDate('2026-01-20T12:00:00Z')
    expect(result).toMatch(/week/)
  })

  test('returns formatted date for > 30 days', () => {
    const result = formatRelativeDate('2025-12-01T12:00:00Z')
    expect(result).toMatch(/12|1/).toMatch(/01|1/)
  })
})

describe('formatDateRange', () => {
  test('returns em dash when both null', () => {
    expect(formatDateRange(null, null)).toBe('—')
  })

  test('returns start only when end null', () => {
    const result = formatDateRange('2026-02-10', null)
    expect(result).toContain('to —')
  })

  test('returns end only when start null', () => {
    const result = formatDateRange(null, '2026-02-15')
    expect(result).toContain('— to')
  })

  test('returns range for valid dates', () => {
    const result = formatDateRange('2026-02-10', '2026-02-15')
    expect(result).toContain(' - ')
  })
})
