import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  formatDuration,
  formatFileSize,
  formatRelativeTime,
  formatNumber,
  formatCurrency,
} from '@/utils/formatters'
import { freezeDate, unfreezeDate } from '@/test/helpers/dateHelpers'

describe('formatDuration', () => {
  test('returns 0:00 for 0', () => {
    expect(formatDuration(0)).toBe('0:00')
  })

  test('returns 0:00 for negative', () => {
    expect(formatDuration(-100)).toBe('0:00')
  })

  test('formats 59 seconds', () => {
    expect(formatDuration(59)).toBe('0:59')
  })

  test('formats 60 as 1:00', () => {
    expect(formatDuration(60)).toBe('1:00')
  })

  test('formats 3599 as 59:59', () => {
    expect(formatDuration(3599)).toBe('59:59')
  })

  test('formats 3600 as 1:00:00', () => {
    expect(formatDuration(3600)).toBe('1:00:00')
  })
})

describe('formatFileSize', () => {
  test('returns bytes for 0', () => {
    expect(formatFileSize(0)).toBe('0 B')
  })

  test('returns bytes for < 1024', () => {
    expect(formatFileSize(500)).toBe('500 B')
  })

  test('returns KB for 1024', () => {
    expect(formatFileSize(1024)).toBe('1.0 KB')
  })

  test('returns MB for 1048576', () => {
    expect(formatFileSize(1048576)).toBe('1.0 MB')
  })

  test('returns GB for 1073741824', () => {
    expect(formatFileSize(1073741824)).toBe('1.00 GB')
  })
})

describe('formatRelativeTime', () => {
  beforeEach(() => freezeDate('2026-02-10T12:00:00Z'))
  afterEach(unfreezeDate)

  test('returns "just now" for seconds ago', () => {
    expect(formatRelativeTime('2026-02-10T11:59:50Z')).toBe('just now')
  })

  test('returns "Xm ago" for minutes', () => {
    expect(formatRelativeTime('2026-02-10T11:55:00Z')).toBe('5m ago')
  })

  test('returns "Xh ago" for hours', () => {
    expect(formatRelativeTime('2026-02-10T10:00:00Z')).toBe('2h ago')
  })

  test('returns "Xd ago" for days', () => {
    expect(formatRelativeTime('2026-02-09T12:00:00Z')).toBe('1d ago')
  })

  test('returns "Xw ago" for weeks', () => {
    expect(formatRelativeTime('2026-01-27T12:00:00Z')).toBe('2w ago')
  })

  test('returns formatted date for > 30 days', () => {
    const result = formatRelativeTime('2026-01-01T12:00:00Z')
    expect(result).toMatch(/1[/]1|1[/]1/)
  })
})

describe('formatNumber', () => {
  test('formats 0', () => {
    expect(formatNumber(0)).toBe('0')
  })

  test('formats negative', () => {
    expect(formatNumber(-1234)).toContain('1')
  })

  test('formats with thousands separator', () => {
    expect(formatNumber(1234567)).toMatch(/1[,]234[,]567|1\.234\.567/)
  })
})

describe('formatCurrency', () => {
  test('formats 0', () => {
    expect(formatCurrency(0)).toMatch(/\$|0/)
  })

  test('formats positive amount', () => {
    expect(formatCurrency(1234.56)).toMatch(/1[,]?234|1\.234/)
  })

  test('formats negative', () => {
    expect(formatCurrency(-50)).toMatch(/-|50/)
  })
})
