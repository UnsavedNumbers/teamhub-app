/**
 * Unit tests for timestamp parsing utilities
 */

import { describe, it, expect } from 'vitest'
import {
  parseTimestamps,
  toSeconds,
  isValidTimestamp,
  formatTimestamp,
  formatTimestampShort,
  tokenizeWithTimestamps
} from './timestamps'

describe('toSeconds', () => {
  it('converts m:ss format to seconds', () => {
    expect(toSeconds('1:23')).toBe(83)
    expect(toSeconds('0:07')).toBe(7)
    expect(toSeconds('5:00')).toBe(300)
  })

  it('converts mm:ss format to seconds', () => {
    expect(toSeconds('12:05')).toBe(725)
    expect(toSeconds('59:59')).toBe(3599)
  })

  it('converts h:mm:ss format to seconds', () => {
    expect(toSeconds('1:02:33')).toBe(3753)
    expect(toSeconds('0:01:00')).toBe(60)
    expect(toSeconds('2:30:45')).toBe(9045)
  })

  it('handles edge cases', () => {
    expect(toSeconds('0:00')).toBe(0)
    expect(toSeconds('0:00:00')).toBe(0)
  })
})

describe('isValidTimestamp', () => {
  it('validates m:ss format', () => {
    expect(isValidTimestamp('1:23')).toBe(true)
    expect(isValidTimestamp('0:07')).toBe(true)
    expect(isValidTimestamp('12:05')).toBe(true)
  })

  it('validates h:mm:ss format', () => {
    expect(isValidTimestamp('1:02:33')).toBe(true)
    expect(isValidTimestamp('0:01:00')).toBe(true)
  })

  it('rejects invalid seconds', () => {
    expect(isValidTimestamp('1:60')).toBe(false)
    expect(isValidTimestamp('1:99')).toBe(false)
    expect(isValidTimestamp('12:60')).toBe(false)
  })

  it('rejects invalid minutes in h:mm:ss', () => {
    expect(isValidTimestamp('1:60:00')).toBe(false)
    expect(isValidTimestamp('1:99:00')).toBe(false)
  })

  it('rejects single-digit seconds without padding', () => {
    expect(isValidTimestamp('1:2')).toBe(false)
    expect(isValidTimestamp('12:5')).toBe(false)
  })
})

describe('parseTimestamps', () => {
  it('parses single timestamp', () => {
    const result = parseTimestamps('At 1:23 we see a great play')
    expect(result).toHaveLength(1)
    expect(result[0].raw).toBe('1:23')
    expect(result[0].seconds).toBe(83)
    expect(result[0].startIndex).toBe(3)
    expect(result[0].endIndex).toBe(7)
  })

  it('parses multiple timestamps', () => {
    const result = parseTimestamps('0:07 great save, then at 1:23-1:35 defensive breakdown')
    expect(result).toHaveLength(3)
    expect(result[0].seconds).toBe(7)
    expect(result[1].seconds).toBe(83)
    expect(result[2].seconds).toBe(95)
  })

  it('parses timestamps with punctuation', () => {
    const result = parseTimestamps('(1:23), [12:05], 1:02:33.')
    expect(result).toHaveLength(3)
    expect(result[0].raw).toBe('1:23')
    expect(result[1].raw).toBe('12:05')
    expect(result[2].raw).toBe('1:02:33')
  })

  it('parses range timestamps separately', () => {
    const result = parseTimestamps('1:23-1:35 defensive breakdown')
    expect(result).toHaveLength(2)
    expect(result[0].seconds).toBe(83)
    expect(result[1].seconds).toBe(95)
  })

  it('ignores invalid timestamps', () => {
    const result = parseTimestamps('At 99:99 invalid, but 1:23 is valid')
    expect(result).toHaveLength(1)
    expect(result[0].seconds).toBe(83)
  })

  it('ignores dates', () => {
    const result = parseTimestamps('On 1/23/2026 we played')
    expect(result).toHaveLength(0)
  })

  it('ignores plain numbers', () => {
    const result = parseTimestamps('123 is not a timestamp')
    expect(result).toHaveLength(0)
  })

  it('handles empty string', () => {
    const result = parseTimestamps('')
    expect(result).toHaveLength(0)
  })
})

describe('tokenizeWithTimestamps', () => {
  it('tokenizes text with timestamps', () => {
    const result = tokenizeWithTimestamps('At 1:23 we see a great play')
    expect(result).toHaveLength(3)
    expect(result[0].type).toBe('text')
    expect(result[0].value).toBe('At ')
    expect(result[1].type).toBe('timestamp')
    expect(result[1].value).toBe('1:23')
    expect(result[1].seconds).toBe(83)
    expect(result[2].type).toBe('text')
    expect(result[2].value).toBe(' we see a great play')
  })

  it('handles multiple timestamps', () => {
    const result = tokenizeWithTimestamps('0:07 great save, then at 1:23')
    expect(result.length).toBeGreaterThan(1)
    const timestamps = result.filter(t => t.type === 'timestamp')
    expect(timestamps).toHaveLength(2)
    expect(timestamps[0].seconds).toBe(7)
    expect(timestamps[1].seconds).toBe(83)
  })

  it('handles text without timestamps', () => {
    const result = tokenizeWithTimestamps('This is plain text')
    expect(result).toHaveLength(1)
    expect(result[0].type).toBe('text')
    expect(result[0].value).toBe('This is plain text')
  })

  it('preserves punctuation around timestamps', () => {
    const result = tokenizeWithTimestamps('(1:23), [12:05]')
    expect(result.length).toBeGreaterThan(2)
    const timestamps = result.filter(t => t.type === 'timestamp')
    expect(timestamps[0].value).toContain('1:23')
    expect(timestamps[1].value).toContain('12:05')
  })
})

describe('formatTimestamp', () => {
  it('formats seconds as m:ss', () => {
    expect(formatTimestamp(83)).toBe('1:23')
    expect(formatTimestamp(7)).toBe('0:07')
    expect(formatTimestamp(300)).toBe('5:00')
  })

  it('formats seconds as h:mm:ss when >= 1 hour', () => {
    expect(formatTimestamp(3600)).toBe('1:00:00')
    expect(formatTimestamp(3753)).toBe('1:02:33')
    expect(formatTimestamp(9045)).toBe('2:30:45')
  })

  it('handles null/undefined', () => {
    expect(formatTimestamp(null)).toBe('--:--')
    expect(formatTimestamp(undefined)).toBe('--:--')
  })

  it('handles zero', () => {
    expect(formatTimestamp(0)).toBe('0:00')
  })
})

describe('formatTimestampShort', () => {
  it('formats as m:ss when < 1 hour', () => {
    expect(formatTimestampShort(83)).toBe('1:23')
    expect(formatTimestampShort(7)).toBe('0:07')
  })

  it('formats as h:mm:ss when >= 1 hour', () => {
    expect(formatTimestampShort(3600)).toBe('1:00:00')
    expect(formatTimestampShort(3753)).toBe('1:02:33')
  })
})
